import type { Request } from 'express';
import type { RowAttributes } from '../Database/Schema';
import { SoftwareLicensesService } from '../Services/software_licenses';
import { getActor } from '../Utils/route_handler';

const service = new SoftwareLicensesService();

export class SoftwareLicensesController {
  async list(request: Request) { return service.list(request.body); }
  async add(request: Request) { return service.add(request.body, getActor(request)); }
  async update(request: Request) { return service.update(request.body, getActor(request)); }
  async options(request: Request) {
    const result = await service.list({ currentPage: 1, itemsPerPage: 50, filters: request.body.filters });
    return { rows: result.rows.map((item) => { const row = item as RowAttributes; return { value: row.id as string | number, label: 'License ' + String(row.id), subLabel: String(row.seats_available) + ' seats available' }; }), count: result.count, hasMore: false, page: 1 };
  }
}
