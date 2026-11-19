import type { Request } from 'express';
import { OffboardingTemplateService } from '../Services/offboarding_template';
import { getActor } from '../Utils/route_handler';

const templateService = new OffboardingTemplateService();

export class OffboardingTemplateController {
  async list(req: Request) {
    return templateService.list(req.body, {
      currentPage: req.body.currentPage,
      itemsPerPage: req.body.itemsPerPage,
    });
  }

  async get(req: Request) {
    return templateService.get(Number(req.params.id));
  }

  async add(req: Request) {
    return templateService.add(req.body, getActor(req));
  }

  async update(req: Request) {
    return templateService.update(req.body, getActor(req));
  }

  async delete(req: Request) {
    return templateService.delete(Number(req.params.id), getActor(req));
  }

  async options() {
    return templateService.options();
  }
}
