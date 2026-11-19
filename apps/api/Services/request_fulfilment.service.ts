import { Transaction } from 'sequelize';
import { REQUEST_TYPE, REQUEST_STATUS, MODULES } from '@hm/shared';
import { AppError } from '../Config/app_error';
import {
  sequelize,
  requests,
  request_status_history,
  employees,
  assets,
  notifications,
} from '../Database/Schema';
import { AssetAssignmentService } from './asset_assignment';
import { AssetMaintenanceService } from './asset_maintenance';
import { SoftwareService } from './software';
import { createActivityLog } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';

const plain = (val: import('sequelize').Model) =>
  val.get({ plain: true }) as Record<string, unknown>;

export interface FulfilInput {
  request_id: number;
  asset_id?: number; // For new_hardware
  new_asset_id?: number; // For change_replace_hardware
  loaner_asset_id?: number; // For repair
  license_id?: number; // For software_access
  return_condition?: string; // For change_replace / return
  to_status?: string; // For return / change_replace
  vendor_id?: number; // For repair
  cost?: number; // For repair
  notes?: string;
}

export class RequestFulfilmentService {
  private assetAssignmentService = new AssetAssignmentService();
  private assetMaintenanceService = new AssetMaintenanceService();
  private softwareService = new SoftwareService();

  async fulfil(input: FulfilInput, actor: UserInfo): Promise<Record<string, unknown>> {
    return sequelize.transaction(async (t: Transaction) => {
      // 1. Lock request
      const req = await requests.findByPk(input.request_id, {
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!req || Number(req.get('status')) !== 1) {
        throw new AppError(404, 'Request not found.');
      }

      const currentStatus = Number(req.get('request_status'));
      // Fulfilment is allowed from APPROVED (or UNDER_REVIEW for direct fulfilment)
      if (
        currentStatus !== REQUEST_STATUS.APPROVED &&
        currentStatus !== REQUEST_STATUS.UNDER_REVIEW
      ) {
        throw new AppError(422, 'Request must be approved or under review to be fulfilled.');
      }

      const requestType = Number(req.get('request_type'));
      const employeeId = Number(req.get('employee_id'));
      let assignedAssetId: number | null = null;
      let assignedLicenseId: number | null = null;

      // 2. Multi-workflow fulfilment
      switch (requestType) {
        case REQUEST_TYPE.NEW_HARDWARE: {
          const assetId = Number(input.asset_id);
          if (!assetId || isNaN(assetId)) {
            throw new AppError(422, 'asset_id is required to fulfil a new hardware request.');
          }

          // Lock asset and verify availability
          const asset = await assets.findByPk(assetId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });

          if (!asset || Number(asset.get('status')) !== 1) {
            throw new AppError(404, 'Asset not found.');
          }

          // asset_status 1 = Available / In stock
          if (Number(asset.get('asset_status')) !== 1) {
            throw new AppError(409, 'Asset is not available in stock.');
          }

          const reqCatId = req.get('category_id');
          if (reqCatId && Number(asset.get('category_id')) !== Number(reqCatId)) {
            throw new AppError(422, 'Asset does not match the requested category.');
          }

          await this.assetAssignmentService.assign(
            {
              asset_id: assetId,
              employee_id: employeeId,
              note: `Fulfilled via Request #${req.get('request_no')}`,
            },
            actor,
            t,
          );

          assignedAssetId = assetId;
          break;
        }

        case REQUEST_TYPE.CHANGE_REPLACE_HARDWARE: {
          const newAssetId = Number(input.new_asset_id || input.asset_id);
          if (!newAssetId || isNaN(newAssetId)) {
            throw new AppError(422, 'new_asset_id is required for hardware replacement.');
          }

          const currentAssetId = Number(req.get('current_asset_id'));
          if (!currentAssetId) {
            throw new AppError(422, 'Request has no current asset specified.');
          }

          // Lock new asset
          const newAsset = await assets.findByPk(newAssetId, {
            transaction: t,
            lock: t.LOCK.UPDATE,
          });
          if (!newAsset || Number(newAsset.get('status')) !== 1) {
            throw new AppError(404, 'New asset not found.');
          }
          if (Number(newAsset.get('asset_status')) !== 1) {
            throw new AppError(409, 'New asset is not available in stock.');
          }

          // 1. Return old asset
          await this.assetAssignmentService.return(
            {
              asset_id: currentAssetId,
              return_condition: input.return_condition || 'good',
              to_status: input.to_status || 'available',
              notes: `Returned via Replacement Request #${req.get('request_no')}`,
            },
            actor,
            t,
          );

          // 2. Assign new asset
          await this.assetAssignmentService.assign(
            {
              asset_id: newAssetId,
              employee_id: employeeId,
              note: `Replacement fulfilled via Request #${req.get('request_no')}`,
            },
            actor,
            t,
          );

          assignedAssetId = newAssetId;
          break;
        }

        case REQUEST_TYPE.REPAIR: {
          const currentAssetId = Number(req.get('current_asset_id'));
          if (!currentAssetId) {
            throw new AppError(422, 'Request has no asset specified for repair.');
          }

          // Return/unassign current asset if assigned
          try {
            await this.assetAssignmentService.return(
              {
                asset_id: currentAssetId,
                return_condition: 'needs_repair',
                to_status: 'in_repair',
                notes: `Sent for repair via Request #${req.get('request_no')}`,
              },
              actor,
              t,
            );
          } catch {
            // If already unassigned, proceed
          }

          // Create maintenance record
          await this.assetMaintenanceService.add(
            {
              asset_id: currentAssetId,
              issue: req.get('reason') || 'Hardware repair request',
              vendor_id: input.vendor_id || null,
              cost: input.cost || null,
            },
            actor,
            t,
          );

          assignedAssetId = currentAssetId;

          // Optional loaner asset
          if (input.loaner_asset_id) {
            const loanerId = Number(input.loaner_asset_id);
            const loaner = await assets.findByPk(loanerId, {
              transaction: t,
              lock: t.LOCK.UPDATE,
            });
            if (!loaner || Number(loaner.get('asset_status')) !== 1) {
              throw new AppError(409, 'Loaner asset is not available.');
            }
            await this.assetAssignmentService.assign(
              {
                asset_id: loanerId,
                employee_id: employeeId,
                note: `Loaner for repair Request #${req.get('request_no')}`,
              },
              actor,
              t,
            );
            assignedAssetId = loanerId;
          }
          break;
        }

        case REQUEST_TYPE.SOFTWARE_ACCESS: {
          const softwareId = Number(req.get('software_id'));
          if (!softwareId) {
            throw new AppError(422, 'Request has no software specified.');
          }

          const assignment = await this.softwareService.assign(
            {
              software_id: softwareId,
              license_id: input.license_id ? Number(input.license_id) : undefined,
              employee_id: employeeId,
              note: `Fulfilled via Request #${req.get('request_no')}`,
            },
            actor,
            t,
          );

          assignedLicenseId =
            (assignment.license_id as number) ||
            (input.license_id ? Number(input.license_id) : null);
          break;
        }

        case REQUEST_TYPE.RETURN_HARDWARE: {
          const currentAssetId = Number(req.get('current_asset_id'));
          if (!currentAssetId) {
            throw new AppError(422, 'Request has no asset specified for return.');
          }

          await this.assetAssignmentService.return(
            {
              asset_id: currentAssetId,
              return_condition: input.return_condition || 'good',
              to_status: input.to_status || 'available',
              notes: `Returned via Request #${req.get('request_no')}`,
            },
            actor,
            t,
          );

          assignedAssetId = currentAssetId;
          break;
        }

        default:
          throw new AppError(422, `Unsupported request type: ${requestType}`);
      }

      // 3. Update request record
      await req.update(
        {
          request_status: REQUEST_STATUS.FULFILLED,
          fulfilled_at: new Date(),
          fulfilled_by: actor.id,
          awaiting_stock: 0,
          assigned_asset_id: assignedAssetId,
          assigned_license_id: assignedLicenseId,
          updated_by: actor.id,
        },
        { transaction: t },
      );

      // 4. Record status history
      await request_status_history.create(
        {
          request_id: input.request_id,
          from_status: currentStatus,
          to_status: REQUEST_STATUS.FULFILLED,
          changed_by: actor.id,
          note: input.notes || 'Request fulfilled',
          status: 1,
          created_by: actor.id,
        },
        { transaction: t },
      );

      // 5. Activity log
      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: input.request_id,
        action: 'fulfilled',
        oldValue: { request_status: currentStatus },
        newValue: {
          request_status: REQUEST_STATUS.FULFILLED,
          assigned_asset_id: assignedAssetId,
          assigned_license_id: assignedLicenseId,
        },
        description: `Request fulfilled by ${actor.first_name} ${actor.last_name}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction: t,
      });

      // 6. Notification to employee
      const emp = await employees.findByPk(employeeId, { transaction: t });
      if (emp && emp.get('user_id')) {
        await notifications.create(
          {
            recipient_user_id: Number(emp.get('user_id')),
            kind: 'request_fulfilled',
            record_type: 'request',
            record_id: input.request_id,
            title: `Request ${req.get('request_no')} Fulfilled`,
            message: `Your request has been fulfilled successfully.`,
            status: 1,
            created_by: actor.id,
          },
          { transaction: t },
        );
      }

      return plain(req);
    });
  }
}
