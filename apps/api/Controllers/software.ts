import type { Request } from 'express';
import { SoftwareService } from '../Services/software';
import { getOptions } from '../Models/options';
import { getActor } from '../Utils/route_handler';

const softwareService = new SoftwareService();

export class SoftwareController {
  async list(request: Request) { return softwareService.list(request.body); }
  async add(request: Request) { return softwareService.add(request.body, getActor(request)); }
  async update(request: Request) { return softwareService.update(request.body, getActor(request)); }
  async get(request: Request) { return softwareService.get(Number(request.params.id)); }
  async delete(request: Request) {
    await softwareService.remove(Number(request.params.id), getActor(request));
    return { deleted: true };
  }
  async options(request: Request) { return getOptions('software', request.body); }
  async assign(request: Request) { return softwareService.assign(request.body, getActor(request)); }
  async revoke(request: Request) { return softwareService.revoke(request.body, getActor(request)); }
  async bulkAssign(request: Request) {
    const user = getActor(request);
    return Promise.all(request.body.items.map((item: Record<string, number | string>) => softwareService.assign(item as unknown as { software_id: number; employee_id: number; license_id?: number }, user)));
  }
  async usage(request: Request) { return softwareService.usage(Number(request.params.id)); }
}
