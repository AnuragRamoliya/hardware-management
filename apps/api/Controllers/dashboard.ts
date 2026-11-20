import type { Request } from 'express';
import { DashboardService } from '../Services/dashboard';
import { getActor } from './base_crud.controller';

const dashboard = new DashboardService();
export class DashboardController {
  async summary(req: Request) {
    const actor = getActor(req);
    return dashboard.summary(actor);
  }
}
