import type { Request } from 'express';
import { AssetAssignmentService } from '../Services/asset_assignment';
import { getActor } from '../Utils/route_handler';

const assignments = new AssetAssignmentService();

export class AssetAssignmentsController {
  async assign(request: Request) { return assignments.assign(request.body, getActor(request)); }
  async returnAsset(request: Request) { return assignments.return(request.body, getActor(request)); }
  async transfer(request: Request) { return assignments.transfer(request.body, getActor(request)); }
  async bulkAssign(request: Request) { return assignments.bulkAssign(request.body.items, getActor(request), request.body.all_or_nothing !== false); }
  async bulkReturn(request: Request) { return assignments.bulkReturn(request.body.items, getActor(request), request.body.all_or_nothing !== false); }
  async history(request: Request) { return assignments.history(Number(request.body.asset_id)); }
}
