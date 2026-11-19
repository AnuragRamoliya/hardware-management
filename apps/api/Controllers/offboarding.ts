import type { Request, Response } from 'express';
import fs from 'node:fs';
import { OffboardingService } from '../Services/offboarding.service';
import { OffboardingTasksService } from '../Services/offboarding_tasks.service';
import { getActor } from '../Utils/route_handler';
import { activity_logs } from '../Database/Schema';
import { AppError } from '../Config/app_error';

const offboardingService = new OffboardingService();
const tasksService = new OffboardingTasksService();

export class OffboardingController {
  async preview(req: Request) {
    return offboardingService.preview(Number(req.body.employee_id));
  }

  async initiate(req: Request) {
    return offboardingService.initiate(req.body, getActor(req));
  }

  async list(req: Request) {
    return offboardingService.list(req.body, {
      currentPage: req.body.currentPage,
      itemsPerPage: req.body.itemsPerPage,
    });
  }

  async get(req: Request) {
    return offboardingService.get(Number(req.params.id));
  }

  async update(req: Request) {
    return offboardingService.update(req.body, getActor(req));
  }

  async cancel(req: Request) {
    return offboardingService.cancel(req.body, getActor(req));
  }

  async complete(req: Request) {
    return offboardingService.complete(req.body, getActor(req));
  }

  async stats() {
    return offboardingService.getStats();
  }

  async activity(req: Request) {
    const caseId = req.body.case_id ? Number(req.body.case_id) : undefined;
    const where: Record<string, unknown> = { module: 'offboarding' };
    if (caseId) where.module_id = caseId;
    const rows = await activity_logs.findAll({
      where,
      order: [['createdAt', 'DESC']],
      limit: 100,
    });
    return { list: rows.map((r) => r.get({ plain: true })) };
  }

  // Task Queue Handlers
  async listTasks(req: Request) {
    return tasksService.list(
      req.body,
      {
        currentPage: req.body.currentPage,
        itemsPerPage: req.body.itemsPerPage,
      },
      getActor(req),
    );
  }

  async receiveTask(req: Request) {
    return tasksService.receive(req.body, getActor(req));
  }

  async bulkReceiveTasks(req: Request) {
    return tasksService.bulkReceive(req.body.items || [], getActor(req));
  }

  async completeTask(req: Request) {
    return tasksService.complete(req.body, getActor(req));
  }

  async waiveTask(req: Request) {
    return tasksService.waive(req.body, getActor(req));
  }

  async exceptionTask(req: Request) {
    return tasksService.exception(req.body, getActor(req));
  }

  async reassignTask(req: Request) {
    return tasksService.reassign(req.body, getActor(req));
  }

  async addTask(req: Request) {
    return tasksService.add(req.body, getActor(req));
  }

  async scanAsset(req: Request) {
    return tasksService.scan(String(req.body.asset_tag));
  }

  // PDF Streams
  async downloadClearance(req: Request, res: Response) {
    const filePath = await offboardingService.getClearancePdf(Number(req.params.id), getActor(req));
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'Clearance certificate file not found on disk.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Disposition', `inline; filename="Clearance_${req.params.id}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  async downloadHandoverReceipt(req: Request, res: Response) {
    const filePath = await offboardingService.getHandoverReceiptPdf(
      Number(req.params.id),
      getActor(req),
    );
    if (!fs.existsSync(filePath)) {
      throw new AppError(404, 'Handover receipt file not found on disk.');
    }
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.setHeader('Content-Disposition', `inline; filename="HandoverReceipt_${req.params.id}.pdf"`);
    fs.createReadStream(filePath).pipe(res);
  }

  // Portal
  async portalGet(req: Request) {
    return offboardingService.portalGet(getActor(req));
  }
}
