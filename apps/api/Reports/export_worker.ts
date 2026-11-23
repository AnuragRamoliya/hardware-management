import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Op } from 'sequelize';
import { export_jobs, users, notifications } from '../Database/Schema';
import { getReport } from './registry';
import { exportReportToCsv } from './exporters/csv_exporter';
import { exportReportToXlsx } from './exporters/xlsx_exporter';
import { exportReportToPdf } from './exporters/pdf_exporter';
import { RealtimeService } from '../Services/realtime.service';
import { REALTIME_EVENTS, EXPORT_JOB_STATUS } from '@hm/shared';
import { logger } from '../Config/logger';
import type { UserInfo } from '../Types/api';

export const SYNC_ROW_LIMIT = 5000;
export const MAX_EXPORT_ROWS = 200000;
export const EXPORTS_DIR = path.resolve(process.cwd(), 'storage/exports');

export class ExportWorker {
  private static instance: ExportWorker;
  private realtimeService = new RealtimeService();
  private isProcessing = false;
  private timer: NodeJS.Timeout | null = null;

  public static getInstance(): ExportWorker {
    if (!ExportWorker.instance) {
      ExportWorker.instance = new ExportWorker();
    }
    return ExportWorker.instance;
  }

  public ensureStorageDir(): void {
    if (!fs.existsSync(EXPORTS_DIR)) {
      fs.mkdirSync(EXPORTS_DIR, { recursive: true });
    }
  }

  public start(intervalMs = 3000): void {
    this.ensureStorageDir();
    void this.recoverStaleJobs(0);
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.processNextJob().catch((err) => {
        logger.error('ExportWorker process error:', err);
      });
    }, intervalMs);
  }

  public async recoverStaleJobs(staleThresholdMs = 15 * 60 * 1000): Promise<number> {
    const cutoff = new Date(Date.now() - staleThresholdMs);
    const [affected] = await export_jobs.update(
      {
        job_status: EXPORT_JOB_STATUS.FAILED,
        error: 'Job terminated unexpectedly (stale job reaper recovery).',
      },
      {
        where: {
          job_status: EXPORT_JOB_STATUS.RUNNING,
          updatedAt: { [Op.lt]: cutoff },
        },
      },
    );
    return affected;
  }

  public stop(): void {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  public async processNextJob(): Promise<boolean> {
    if (this.isProcessing) return false;
    this.isProcessing = true;

    try {
      // Find oldest queued job
      const pendingJob = await export_jobs.findOne({
        where: {
          job_status: { [Op.in]: [EXPORT_JOB_STATUS.QUEUED, 'pending'] },
        },
        order: [['createdAt', 'ASC']],
      });

      if (!pendingJob) {
        this.isProcessing = false;
        return false;
      }

      const jobId = Number(pendingJob.get('id'));

      // Atomic claim
      const [affected] = await export_jobs.update(
        { job_status: EXPORT_JOB_STATUS.RUNNING, progress: 5 },
        {
          where: {
            id: jobId,
            job_status: { [Op.in]: [EXPORT_JOB_STATUS.QUEUED, 'pending'] },
          },
        },
      );

      if (affected === 0) {
        this.isProcessing = false;
        return false;
      }

      await this.runJob(jobId);
      return true;
    } catch (err) {
      logger.error('Error claiming export job:', err);
      return false;
    } finally {
      this.isProcessing = false;
    }
  }

  public async runJob(jobId: number): Promise<void> {
    const jobRecord = await export_jobs.findByPk(jobId, {
      include: [{ model: users, as: 'requester' }],
    });

    if (!jobRecord) return;

    const reportKey = String(jobRecord.get('report_key'));
    const format = String(jobRecord.get('format')).toLowerCase();
    const filters = (jobRecord.get('filters') as Record<string, unknown>) || {};
    const requestedBy = Number(jobRecord.get('requested_by'));
    const requester = jobRecord.get('requester') as Record<string, unknown> | null;

    const report = getReport(reportKey);
    if (!report) {
      await this.failJob(jobId, requestedBy, `Report definition '${reportKey}' not found.`);
      return;
    }

    const userActor: UserInfo = {
      id: requestedBy,
      role_id: Number(requester?.role_id || 0),
      first_name: String(requester?.first_name || 'User'),
      last_name: String(requester?.last_name || ''),
      email: String(requester?.email || ''),
    };

    // Emit started event
    this.realtimeService.publish({
      event: REALTIME_EVENTS.EXPORT_JOB_STARTED,
      rooms: `user:${requestedBy}`,
      data: {
        job_id: jobId,
        report_key: reportKey,
        format,
        status: EXPORT_JOB_STATUS.RUNNING,
        progress: 10,
      },
    });

    try {
      this.ensureStorageDir();
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const fileName = `export_${reportKey}_${jobId}_${Date.now()}.${ext}`;
      const filePath = path.join(EXPORTS_DIR, fileName);
      const writeStream = fs.createWriteStream(filePath);

      // Get report data stream
      const dataStream = report.stream({ filters }, userActor);

      // Initial run for summary metadata if available
      const preview = await report.run({ filters, currentPage: 1, itemsPerPage: 1 }, userActor);

      let result: { rowCount: number };
      if (format === 'xlsx') {
        result = await exportReportToXlsx({
          report,
          stream: dataStream,
          output: writeStream,
          summary: preview.summary,
          filters,
          generatedBy: requester?.first_name ? String(requester.first_name) : 'User',
        });
      } else if (format === 'pdf') {
        result = await exportReportToPdf({
          report,
          stream: dataStream,
          output: writeStream,
          summary: preview.summary,
          generatedBy: requester?.first_name ? String(requester.first_name) : 'User',
        });
      } else {
        result = await exportReportToCsv({
          report,
          stream: dataStream,
          output: writeStream,
        });
      }

      // Compute sha256 of completed file
      const fileBuffer = fs.readFileSync(filePath);
      const fileSha256 = crypto.createHash('sha256').update(fileBuffer).digest('hex');

      // Expires in 7 days
      const expiresAt = new Date(Date.now() + 7 * 86400000);

      await export_jobs.update(
        {
          job_status: EXPORT_JOB_STATUS.DONE,
          progress: 100,
          row_count: result.rowCount,
          file_path: filePath,
          file_sha256: fileSha256,
          expires_at: expiresAt,
        },
        { where: { id: jobId } },
      );

      // Create stored notification (F6)
      try {
        await notifications.create({
          recipient_user_id: requestedBy,
          category: 'report',
          kind: 'export_job_completed',
          record_type: 'export_job',
          record_id: jobId,
          title: 'Report Export Ready',
          message: `Your export for ${reportKey} (${format.toUpperCase()}) is ready for download.`,
          link: `/reports/${reportKey}`,
          priority: 2,
        });
      } catch (notifErr) {
        logger.warn('Failed to persist export completion notification:', notifErr);
      }

      // Emit completed and done events (F6) - no file path, no data
      const eventPayload = {
        job_id: jobId,
        report_key: reportKey,
        format,
        status: EXPORT_JOB_STATUS.DONE,
        progress: 100,
        row_count: result.rowCount,
        file_sha256: fileSha256,
      };

      this.realtimeService.publish({
        event: REALTIME_EVENTS.EXPORT_JOB_COMPLETED,
        rooms: `user:${requestedBy}`,
        data: eventPayload,
      });

      this.realtimeService.publish({
        event: REALTIME_EVENTS.EXPORT_JOB_DONE,
        rooms: `user:${requestedBy}`,
        data: eventPayload,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unknown export error';
      logger.error(`Export job ${jobId} failed:`, err);
      await this.failJob(jobId, requestedBy, msg);
    }
  }

  private async failJob(jobId: number, requestedBy: number, errorMessage: string): Promise<void> {
    await export_jobs.update(
      {
        job_status: EXPORT_JOB_STATUS.FAILED,
        error: errorMessage,
      },
      { where: { id: jobId } },
    );

    // Create stored failure notification (F6)
    try {
      await notifications.create({
        recipient_user_id: requestedBy,
        category: 'report',
        kind: 'export_job_failed',
        record_type: 'export_job',
        record_id: jobId,
        title: 'Report Export Failed',
        message: `Your export request failed: ${errorMessage}`,
        link: '/reports',
        priority: 2,
      });
    } catch (notifErr) {
      logger.warn('Failed to persist export failure notification:', notifErr);
    }

    this.realtimeService.publish({
      event: REALTIME_EVENTS.EXPORT_JOB_FAILED,
      rooms: `user:${requestedBy}`,
      data: {
        job_id: jobId,
        status: EXPORT_JOB_STATUS.FAILED,
        error: errorMessage,
      },
    });
  }

  public async cleanupExpiredExports(): Promise<number> {
    const expiredJobs = await export_jobs.findAll({
      where: {
        expires_at: { [Op.lt]: new Date() },
        job_status: { [Op.ne]: EXPORT_JOB_STATUS.EXPIRED },
      },
    });

    let cleaned = 0;
    for (const job of expiredJobs) {
      const fPath = String(job.get('file_path') || '');
      if (fPath && fs.existsSync(fPath)) {
        try {
          fs.unlinkSync(fPath);
          cleaned++;
        } catch (e) {
          logger.warn(`Failed to unlink expired export file ${fPath}:`, e);
        }
      }
      await job.update({
        job_status: EXPORT_JOB_STATUS.EXPIRED,
        file_path: null,
      });
    }
    return cleaned;
  }
}

export const exportWorker = ExportWorker.getInstance();
