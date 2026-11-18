import type { Request } from 'express';
import { AssetMaintenanceService } from '../Services/asset_maintenance';
import { getActor } from '../Utils/route_handler';

const maintenance = new AssetMaintenanceService();

export class AssetMaintenanceController {
  async list(request: Request) {
    return maintenance.list(request.body);
  }
  async add(request: Request) {
    return maintenance.add(request.body, getActor(request));
  }
  async update(request: Request) {
    return maintenance.update(request.body, getActor(request));
  }
  async complete(request: Request) {
    return maintenance.complete(request.body, getActor(request));
  }
}
