import type { Request } from 'express';
import { RequestService } from '../Services/request';
import { PortalRequestService } from '../Services/portal_request';
import { getActor } from '../Utils/route_handler';

const adminService = new RequestService();
const portalService = new PortalRequestService();

export class RequestsController {
  async list(req: Request) {
    return adminService.list(req.body, getActor(req));
  }

  async get(req: Request) {
    return adminService.get(Number(req.params.id));
  }

  async take(req: Request) {
    return adminService.take(Number(req.body.id), getActor(req));
  }

  async assign(req: Request) {
    return adminService.assign(Number(req.body.id), Number(req.body.assigned_to), getActor(req));
  }

  async bulkAssign(req: Request) {
    return adminService.bulkAssign(
      req.body.request_ids,
      Number(req.body.assigned_to),
      getActor(req),
    );
  }

  async review(req: Request) {
    return adminService.review(req.body, getActor(req));
  }

  async fulfil(req: Request) {
    return adminService.fulfil(req.body, getActor(req));
  }

  async close(req: Request) {
    return adminService.close(Number(req.body.id), req.body.notes, getActor(req));
  }

  async comment(req: Request) {
    return adminService.addComment(req.body, getActor(req));
  }

  async stats(req: Request) {
    return adminService.stats(getActor(req));
  }

  async options() {
    return adminService.options();
  }

  async export(req: Request) {
    return adminService.export(req.body, getActor(req));
  }
}

export class PortalRequestsController {
  async list(req: Request) {
    return portalService.list(req.body, getActor(req));
  }

  async get(req: Request) {
    return portalService.get(Number(req.params.id), getActor(req));
  }

  async add(req: Request) {
    return portalService.add(req.body, getActor(req));
  }

  async update(req: Request) {
    return portalService.update(req.body, getActor(req));
  }

  async cancel(req: Request) {
    return portalService.cancel(req.body, getActor(req));
  }

  async comment(req: Request) {
    return portalService.addComment(req.body, getActor(req));
  }

  async attachment(req: Request) {
    return portalService.addAttachment(req.body, getActor(req));
  }

  async options(req: Request) {
    return portalService.options(getActor(req));
  }
}
