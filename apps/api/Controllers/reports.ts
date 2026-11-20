import type { NextFunction, Request, Response } from 'express';
import { reportService } from '../Services/report.service';
import { getActor, getRequestBody } from './base_crud.controller';
import { roles } from '../Database/Schema';
import { exportReportToCsv } from '../Reports/exporters/csv_exporter';
import { exportReportToXlsx } from '../Reports/exporters/xlsx_exporter';
import { exportReportToPdf } from '../Reports/exporters/pdf_exporter';

async function resolveUserRole(req: Request): Promise<string> {
  const actor = getActor(req);
  if (!actor || !actor.role_id) return '';
  const roleRow = (await roles.findByPk(actor.role_id, {
    attributes: ['id', 'name'],
    raw: true,
  })) as { id: number; name: string } | null;
  return roleRow?.name || '';
}

export class ReportController {
  async list(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleName = await resolveUserRole(req);
      const reports = reportService.getAvailableReports(roleName);
      res.handler.success(reports);
    } catch (error) {
      next(error);
    }
  }

  async getMeta(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const roleName = await resolveUserRole(req);
      const key = String(req.params.key || '');
      const meta = reportService.getReportMeta(key, roleName);
      res.handler.success(meta);
    } catch (error) {
      next(error);
    }
  }

  async run(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = getActor(req);
      const roleName = await resolveUserRole(req);
      const actorWithRole = { ...actor, role: roleName };
      const body = getRequestBody(req);
      const key = String(req.params.key || '');

      const options = {
        filters: (body.filters || {}) as Record<string, unknown>,
        currentPage: Number(body.currentPage || body.page || 1),
        itemsPerPage: Number(body.itemsPerPage || body.pageSize || 20),
        sortBy: body.sortBy as Array<{ id: string; value: 'asc' | 'desc' | 'ASC' | 'DESC' }>,
      };

      const result = await reportService.runReport(key, options, actorWithRole);
      res.handler.success(result);
    } catch (error) {
      next(error);
    }
  }

  async export(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = getActor(req);
      const roleName = await resolveUserRole(req);
      const actorWithRole = { ...actor, role: roleName };
      const body = getRequestBody(req);

      const reportKey = String(req.params.key || '');
      const format = String(body.format || 'csv').toLowerCase();
      const preferAsync = Boolean(body.async);
      const filters = (body.filters || {}) as Record<string, unknown>;
      const options = { filters };

      const exportResult = await reportService.exportReport(
        reportKey,
        format,
        options,
        actorWithRole,
        preferAsync,
      );

      if (exportResult.isAsync) {
        res.handler.success({
          is_async: true,
          job_id: exportResult.jobId,
          message: 'Export job queued for background generation.',
        });
        return;
      }

      // Synchronous streaming to response
      const nowStr = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);
      const ext = format === 'xlsx' ? 'xlsx' : format === 'pdf' ? 'pdf' : 'csv';
      const fileName = `${reportKey}_${nowStr}.${ext}`;

      if (format === 'xlsx') {
        res.setHeader(
          'Content-Type',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        );
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        await exportReportToXlsx({
          report: exportResult.report!,
          stream: exportResult.stream!,
          output: res,
          summary: exportResult.preview?.summary,
          filters,
          generatedBy: `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || 'Staff',
        });
      } else if (format === 'pdf') {
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        await exportReportToPdf({
          report: exportResult.report!,
          stream: exportResult.stream!,
          output: res,
          summary: exportResult.preview?.summary,
          generatedBy: `${actor.first_name || ''} ${actor.last_name || ''}`.trim() || 'Staff',
        });
      } else {
        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
        await exportReportToCsv({
          report: exportResult.report!,
          stream: exportResult.stream!,
          output: res,
        });
      }
    } catch (error) {
      next(error);
    }
  }

  async listJobs(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = getActor(req);
      const roleName = await resolveUserRole(req);
      const jobs = await reportService.listUserJobs(actor.id, roleName);
      res.handler.success(jobs);
    } catch (error) {
      next(error);
    }
  }

  async getJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = getActor(req);
      const roleName = await resolveUserRole(req);
      const job = await reportService.getJob(Number(req.params.id), actor.id, roleName);
      res.handler.success(job);
    } catch (error) {
      next(error);
    }
  }

  async downloadJob(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const actor = getActor(req);
      const roleName = await resolveUserRole(req);
      const fileInfo = await reportService.getJobDownloadPath(
        Number(req.params.id),
        actor.id,
        roleName,
      );

      res.setHeader('Content-Type', fileInfo.mimeType);
      res.setHeader('Content-Disposition', `attachment; filename="${fileInfo.fileName}"`);
      res.download(fileInfo.filePath, fileInfo.fileName);
    } catch (error) {
      next(error);
    }
  }
}
