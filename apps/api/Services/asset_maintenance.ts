import { Op } from 'sequelize';
import { ASSET_STATUS } from '@hm/shared';
import { AppError } from '../Config/app_error';
import { sequelize, type RowAttributes } from '../Database/Schema';
import { AssetMaintenanceRecord, MaintenanceAssetRecord } from '../Models/asset_maintenance';
import { createActivityLog, getSorting } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';

const plain = (value: import('sequelize').Model): RowAttributes =>
  value.get({ plain: true }) as RowAttributes;

export class AssetMaintenanceService {
  async list(input: ListDto) {
    const filters = input.filters ?? {};
    const where: Record<string | symbol, unknown> = { status: 1 };
    for (const field of ['asset_id', 'vendor_id'] as const) {
      if (filters[field] === undefined || filters[field] === '') continue;
      const values = Array.isArray(filters[field]) ? filters[field] : [filters[field]];
      if (values.some((value) => !Number.isSafeInteger(Number(value)) || Number(value) < 1))
        throw new AppError(422, `Invalid ${field} filter.`);
      where[field] = { [Op.in]: values.map(Number) };
    }
    if (filters.maintenance_status !== undefined) {
      const values = Array.isArray(filters.maintenance_status)
        ? filters.maintenance_status
        : [filters.maintenance_status];
      if (values.some((value) => ![1, 2].includes(Number(value))))
        throw new AppError(422, 'Invalid maintenance_status filter.');
      where.maintenance_status = { [Op.in]: values.map(Number) };
    }
    if (filters.sent_at !== undefined) {
      if (!filters.sent_at || typeof filters.sent_at !== 'object' || Array.isArray(filters.sent_at))
        throw new AppError(422, 'sent_at must be a date range.');
      const bounds: Record<symbol, Date> = {};
      for (const [key, operator] of [
        ['from', Op.gte],
        ['to', Op.lte],
      ] as const) {
        const value = (filters.sent_at as Record<string, unknown>)[key];
        if (value === undefined || value === '') continue;
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
          throw new AppError(422, `sent_at.${key} must be a valid date.`);
        const date = new Date(value);
        if (key === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
        bounds[operator] = date;
      }
      if (Object.keys(bounds).length) where.sent_at = bounds;
    }
    const page = Math.max(1, Number(input.currentPage ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const allowedMaintenanceColumns = new Set([
      'id',
      'asset_id',
      'vendor_id',
      'maintenance_status',
      'sent_at',
      'returned_at',
      'cost',
      'status',
      'createdAt',
      'updatedAt',
    ]);
    const order = getSorting(input, allowedMaintenanceColumns, [['sent_at', 'DESC']]);
    const result = await AssetMaintenanceRecord.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order,
    });
    return { rows: result.rows.map(plain), count: result.count };
  }

  async add(
    input: Record<string, unknown>,
    actor: UserInfo,
    existingTransaction?: import('sequelize').Transaction,
  ) {
    const run = async (transaction: import('sequelize').Transaction) => {
      const asset = await MaintenanceAssetRecord.findByPk(Number(input.asset_id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!asset || Number(asset.get('asset_status')) === 2)
        throw new AppError(409, 'Asset must be unassigned before maintenance.');
      const maintenance = await AssetMaintenanceRecord.create(
        {
          asset_id: input.asset_id,
          issue: input.issue,
          vendor_id: input.vendor_id ?? null,
          cost: input.cost ?? null,
          sent_at: new Date(),
          maintenance_status: 1,
          created_by: actor.id,
          status: 1,
        },
        { transaction },
      );
      await asset.update({ asset_status: ASSET_STATUS.UNDER_REPAIR }, { transaction });
      await createActivityLog({
        module: 'asset_maintenance',
        moduleId: Number(maintenance.get('id')),
        action: 'created',
        newValue: plain(maintenance),
        description: 'Asset maintenance started',
        createdBy: actor.id,
        transaction,
      });
      return plain(maintenance);
    };

    if (existingTransaction) {
      return run(existingTransaction);
    }
    return sequelize.transaction(run);
  }

  async update(input: Record<string, unknown>, actor: UserInfo) {
    return sequelize.transaction(async (transaction) => {
      const item = await AssetMaintenanceRecord.findByPk(Number(input.id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item) throw new AppError(404, 'Maintenance record not found.');
      const updates = {
        issue: input.issue ?? item.get('issue'),
        vendor_id: input.vendor_id ?? item.get('vendor_id'),
        cost: input.cost ?? item.get('cost'),
        resolution: input.resolution ?? item.get('resolution'),
      };
      await item.update(updates, { transaction });
      await createActivityLog({
        module: 'asset_maintenance',
        moduleId: Number(item.get('id')),
        action: 'updated',
        newValue: updates,
        description: 'Asset maintenance updated',
        createdBy: actor.id,
        transaction,
      });
      return plain(item);
    });
  }

  async complete(input: Record<string, unknown>, actor: UserInfo) {
    return sequelize.transaction(async (transaction) => {
      const item = await AssetMaintenanceRecord.findByPk(Number(input.id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!item || Number(item.get('maintenance_status')) !== 1)
        throw new AppError(404, 'Open maintenance record not found.');
      await item.update(
        { maintenance_status: 2, returned_at: new Date(), resolution: input.resolution ?? null },
        { transaction },
      );
      const asset = await MaintenanceAssetRecord.findByPk(Number(item.get('asset_id')), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (asset && Number(asset.get('asset_status')) === ASSET_STATUS.UNDER_REPAIR)
        await asset.update({ asset_status: ASSET_STATUS.AVAILABLE }, { transaction });
      await createActivityLog({
        module: 'asset_maintenance',
        moduleId: Number(item.get('id')),
        action: 'completed',
        newValue: plain(item),
        description: 'Asset maintenance completed',
        createdBy: actor.id,
        transaction,
      });
      return plain(item);
    });
  }
}
