import fs from 'node:fs';
import { export_jobs, users } from '../Database/Schema';
import { getReport, getReportsForRole, canRoleAccessReport } from '../Reports/registry';
import { exportWorker, SYNC_ROW_LIMIT, MAX_EXPORT_ROWS } from '../Reports/export_worker';
import { validateAndWhitelistFilters } from '../Reports/helpers';
import type { ReportDefinition, ReportRunOptions } from '../Reports/types';
import type { UserInfo } from '../Types/api';
import {
  type ReportMetadataDto,
  type ReportRunResultDto,
  type ExportJobDto,
  type ExportJobStatus,
  EXPORT_JOB_STATUS,
} from '@hm/shared';

interface ServiceError extends Error {
  status?: number;
}

function createError(message: string, status: number): ServiceError {
  const err: ServiceError = new Error(message);
  err.status = status;
  return err;
}

function getUserRole(actor: UserInfo): string {
  if (typeof actor.role === 'string') return actor.role;
  if (actor.role && typeof actor.role === 'object' && 'name' in actor.role) return actor.role.name;
  return actor.role_name || '';
}

export class ReportService {
  public getAvailableReports(userRole: string): ReportMetadataDto[] {
    const list = getReportsForRole(userRole);
    return list.map((r) => ({
      key: r.key,
      title: r.title,
      description: r.description,
      category: r.category,
      module: r.module,
      filters: r.filters,
      columns: r.columns,
      defaultSort: r.defaultSort,
    }));
  }

  public getReportMeta(reportKey: string, userRole: string): ReportMetadataDto {
    const rep = getReport(reportKey);
    if (!rep) {
      throw createError(`Report '${reportKey}' not found.`, 404);
    }
    if (!canRoleAccessReport(userRole, reportKey)) {
      throw createError(`Access forbidden to report '${reportKey}' for role '${userRole}'.`, 403);
    }

    return {
      key: rep.key,
      title: rep.title,
      description: rep.description,
      category: rep.category,
      module: rep.module,
      filters: rep.filters,
      columns: rep.columns,
      defaultSort: rep.defaultSort,
    };
  }

  public async runReport(
    reportKey: string,
    options: ReportRunOptions,
    actor: UserInfo,
  ): Promise<ReportRunResultDto> {
    const userRole = getUserRole(actor);
    const rep = getReport(reportKey);
    if (!rep) {
      throw createError(`Report '${reportKey}' not found.`, 404);
    }
    if (!canRoleAccessReport(userRole, reportKey)) {
      throw createError(`Access forbidden to report '${reportKey}' for role '${userRole}'.`, 403);
    }

    const validatedFilters = validateAndWhitelistFilters(rep, options.filters);
    return rep.run({ ...options, filters: validatedFilters }, actor);
  }

  public async exportReport(
    reportKey: string,
    format: string,
    options: ReportRunOptions,
    actor: UserInfo,
    preferAsync = false,
  ): Promise<{
    isAsync: boolean;
    jobId?: number;
    report?: ReportDefinition;
    stream?: AsyncIterable<Record<string, unknown>[]>;
    preview?: ReportRunResultDto;
  }> {
    const userRole = getUserRole(actor);
    const rep = getReport(reportKey);
    if (!rep) {
      throw createError(`Report '${reportKey}' not found.`, 404);
    }
    if (!canRoleAccessReport(userRole, reportKey)) {
      throw createError(`Access forbidden to report '${reportKey}' for role '${userRole}'.`, 403);
    }

    const validatedFilters = validateAndWhitelistFilters(rep, options.filters);

    const fmt = format.toLowerCase();
    if (!['csv', 'xlsx', 'pdf'].includes(fmt)) {
      throw createError(`Unsupported export format '${format}'. Valid: csv, xlsx, pdf.`, 400);
    }

    // Run quick preview with limit 1 to get row count
    const preview = await rep.run(
      { filters: validatedFilters, currentPage: 1, itemsPerPage: 1 },
      actor,
    );
    const totalCount = preview.count;

    if (totalCount > MAX_EXPORT_ROWS) {
      throw createError(
        `Requested export size (${totalCount} rows) exceeds maximum limit of ${MAX_EXPORT_ROWS} rows. Please apply filters.`,
        400,
      );
    }

    // Determine sync vs async
    const shouldRunAsync = preferAsync || totalCount > SYNC_ROW_LIMIT;

    if (shouldRunAsync) {
      const newJob = await export_jobs.create({
        report_key: reportKey,
        format: fmt,
        filters: validatedFilters,
        job_status: EXPORT_JOB_STATUS.QUEUED,
        progress: 0,
        row_count: totalCount,
        requested_by: actor.id,
        expires_at: new Date(Date.now() + 7 * 86400000),
      });

      const jobId = Number(newJob.get('id'));

      // Trigger background processing asynchronously
      setImmediate(() => {
        exportWorker.processNextJob().catch(() => {});
      });

      return {
        isAsync: true,
        jobId,
      };
    }

    // Return synchronous stream handles
    const stream = rep.stream({ filters: validatedFilters }, actor);
    return {
      isAsync: false,
      report: rep,
      stream,
      preview,
    };
  }

  public async listUserJobs(userId: number, userRole: string): Promise<ExportJobDto[]> {
    const whereClause: Record<string, unknown> = {};
    if (userRole !== 'super_admin') {
      whereClause.requested_by = userId;
    }

    const jobs = await export_jobs.findAll({
      where: whereClause,
      order: [['createdAt', 'DESC']],
      limit: 50,
      include: [
        { model: users, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });

    return jobs.map((j) => {
      const plain = j.get({ plain: true }) as Record<string, unknown>;
      const rawStatus = String(plain.job_status);
      const normalizedStatus: ExportJobStatus =
        rawStatus === 'pending'
          ? EXPORT_JOB_STATUS.QUEUED
          : rawStatus === 'processing'
            ? EXPORT_JOB_STATUS.RUNNING
            : rawStatus === 'completed'
              ? EXPORT_JOB_STATUS.DONE
              : (rawStatus as ExportJobStatus);

      return {
        id: Number(plain.id),
        report_key: String(plain.report_key),
        format: String(plain.format) as 'csv' | 'xlsx' | 'pdf',
        filters: plain.filters as Record<string, unknown>,
        job_status: normalizedStatus,
        progress: Number(plain.progress || 0),
        row_count: plain.row_count != null ? Number(plain.row_count) : 0,
        file_path: plain.file_path ? 'available' : undefined,
        file_sha256: plain.file_sha256 ? String(plain.file_sha256) : undefined,
        error: plain.error ? String(plain.error) : undefined,
        requested_by: Number(plain.requested_by),
        expires_at: plain.expires_at ? String(plain.expires_at) : undefined,
        createdAt: String(plain.createdAt),
      };
    });
  }

  public async getJob(jobId: number, userId: number, userRole: string): Promise<ExportJobDto> {
    const job = await export_jobs.findByPk(jobId, {
      include: [
        { model: users, as: 'requester', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
    });

    if (!job) {
      throw createError(`Export job ${jobId} not found.`, 404);
    }

    const reqBy = Number(job.get('requested_by'));
    if (userRole !== 'super_admin' && reqBy !== userId) {
      throw createError('Access forbidden to this export job.', 403);
    }

    const plain = job.get({ plain: true }) as Record<string, unknown>;
    const rawStatus = String(plain.job_status);
    const normalizedStatus: ExportJobStatus =
      rawStatus === 'pending'
        ? EXPORT_JOB_STATUS.QUEUED
        : rawStatus === 'processing'
          ? EXPORT_JOB_STATUS.RUNNING
          : rawStatus === 'completed'
            ? EXPORT_JOB_STATUS.DONE
            : (rawStatus as ExportJobStatus);

    return {
      id: Number(plain.id),
      report_key: String(plain.report_key),
      format: String(plain.format) as 'csv' | 'xlsx' | 'pdf',
      filters: plain.filters as Record<string, unknown>,
      job_status: normalizedStatus,
      progress: Number(plain.progress || 0),
      row_count: plain.row_count != null ? Number(plain.row_count) : 0,
      file_path: plain.file_path ? 'available' : undefined,
      file_sha256: plain.file_sha256 ? String(plain.file_sha256) : undefined,
      error: plain.error ? String(plain.error) : undefined,
      requested_by: Number(plain.requested_by),
      expires_at: plain.expires_at ? String(plain.expires_at) : undefined,
      createdAt: String(plain.createdAt),
    };
  }

  public async getJobDownloadPath(
    jobId: number,
    userId: number,
    userRole: string,
  ): Promise<{ filePath: string; fileName: string; mimeType: string }> {
    const job = await export_jobs.findByPk(jobId);
    if (!job) {
      throw createError(`Export job ${jobId} not found.`, 404);
    }

    const reqBy = Number(job.get('requested_by'));
    if (userRole !== 'super_admin' && reqBy !== userId) {
      throw createError('Access forbidden to download this export file.', 403);
    }

    const st = String(job.get('job_status'));
    if (st === EXPORT_JOB_STATUS.EXPIRED) {
      throw createError('This export file has expired and is no longer available.', 410);
    }

    const expiresAt = job.get('expires_at');
    if (expiresAt && new Date(expiresAt as string | Date) < new Date()) {
      throw createError('This export file has expired and is no longer available.', 410);
    }

    if (st !== EXPORT_JOB_STATUS.DONE && st !== 'completed') {
      throw createError(`Export job is currently ${st}, not ready for download.`, 400);
    }

    const filePath = job.get('file_path') as string;
    if (!filePath || !fs.existsSync(filePath)) {
      throw createError('Export file has expired or was removed.', 410);
    }

    const format = String(job.get('format')).toLowerCase();
    const repKey = String(job.get('report_key'));
    const fileName = `${repKey}_export_${jobId}.${format}`;

    const mimeType =
      format === 'xlsx'
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        : format === 'pdf'
          ? 'application/pdf'
          : 'text/csv; charset=utf-8';

    return { filePath, fileName, mimeType };
  }
}

export const reportService = new ReportService();
