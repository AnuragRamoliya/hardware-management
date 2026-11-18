import crypto from 'node:crypto';
import { Op, type Transaction } from 'sequelize';
import { AppError } from '../Config/app_error';
import { STATUS } from '../Config/constant';
import { type RowAttributes, sequelize } from '../Database/Schema';
import {
  AssetCategoryRecord,
  AssetLocationRecord,
  AssetRecord,
  AssetVendorRecord,
} from '../Models/assets';
import {
  AssetAssignmentRecord as asset_assignments,
  AssignmentEmployeeRecord as employees,
} from '../Models/asset_assignment';
import { AssetMaintenanceRecord as asset_maintenance } from '../Models/asset_maintenance';
const assets = AssetRecord;
import { createActivityLog } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';

const assetFields = [
  'serial_no',
  'category_id',
  'brand',
  'model',
  'vendor_id',
  'purchase_date',
  'purchase_cost',
  'warranty_start',
  'warranty_end',
  'condition',
  'asset_status',
  'location_id',
  'parent_asset_id',
  'specs',
  'notes',
  'photo_url',
] as const;
const record = (model: import('sequelize').Model): RowAttributes =>
  model.get({ plain: true }) as RowAttributes;
const actorLabel = (actor: UserInfo) => `${actor.first_name} ${actor.last_name}`;

async function validateReferences(
  input: Record<string, unknown>,
  updatingId?: number,
): Promise<void> {
  for (const [field, model] of [
    ['category_id', AssetCategoryRecord],
    ['vendor_id', AssetVendorRecord],
    ['location_id', AssetLocationRecord],
    ['parent_asset_id', assets],
  ] as const) {
    const value = input[field];
    if (value === undefined || value === null || value === '') continue;
    if (
      !Number.isSafeInteger(Number(value)) ||
      Number(value) <= 0 ||
      !(await model.findByPk(Number(value)))
    ) {
      throw new AppError(422, `${field} must reference an existing record.`);
    }
  }
  const parentId = Number(input.parent_asset_id ?? 0);
  if (parentId) {
    if (parentId === updatingId) throw new AppError(422, 'An asset cannot be its own parent.');
    let currentId: number | null = parentId;
    const seen = new Set<number>();
    while (currentId) {
      if (currentId === updatingId || seen.has(currentId))
        throw new AppError(422, 'Accessory parent would create a circular hierarchy.');
      seen.add(currentId);
      const parent = (await assets.findByPk(currentId)) as import('sequelize').Model | null;
      currentId = parent ? Number(parent.get('parent_asset_id') ?? 0) || null : null;
    }
  }
}

function range(value: unknown, field: string): Record<symbol, Date> | undefined {
  if (value === undefined) return undefined;
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new AppError(422, `${field} must be a date range.`);
  }
  const input = value as Record<string, unknown>;
  const result: Record<symbol, Date> = {};
  for (const [key, operator] of [
    ['from', Op.gte],
    ['to', Op.lte],
  ] as const) {
    if (input[key] === undefined || input[key] === '') continue;
    if (typeof input[key] !== 'string' || Number.isNaN(Date.parse(input[key]))) {
      throw new AppError(422, `${field}.${key} must be a valid date.`);
    }
    const date = new Date(input[key]);
    if (key === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(input[key])) date.setHours(23, 59, 59, 999);
    result[operator] = date;
  }
  return Object.keys(result).length ? result : undefined;
}

export class AssetService {
  async list(
    input: ListDto,
    unassignedOnly = false,
  ): Promise<{ rows: RowAttributes[]; count: number }> {
    const filters = input.filters ?? {};
    const where: Record<string | symbol, unknown> = { status: STATUS.ACTIVE };
    const arrays: Record<string, string> = {
      category_id: 'category_id',
      asset_status: 'asset_status',
      condition: 'condition',
      vendor_id: 'vendor_id',
      location_id: 'location_id',
    };
    for (const [key, column] of Object.entries(arrays)) {
      const value = filters[key];
      if (value === undefined || value === null || value === '') continue;
      const values = Array.isArray(value) ? value : [value];
      if (values.length === 0) continue;
      if (column === 'condition') {
        if (values.some((item) => !['new', 'good', 'fair', 'poor'].includes(String(item))))
          throw new AppError(422, 'Invalid asset condition filter.');
        where[column] = { [Op.in]: values };
      } else {
        if (values.some((item) => !Number.isSafeInteger(Number(item)) || Number(item) < 1))
          throw new AppError(422, `Invalid ${key} filter.`);
        where[column] = { [Op.in]: values.map(Number) };
      }
    }
    const purchaseRange = range(filters.purchase_date, 'purchase_date');
    const warrantyRange = range(filters.warranty_end, 'warranty_end');
    if (purchaseRange) where.purchase_date = purchaseRange;
    if (warrantyRange) where.warranty_end = warrantyRange;
    if (
      typeof filters.has_warranty_expiring !== 'boolean' &&
      filters.has_warranty_expiring !== undefined
    )
      throw new AppError(422, 'has_warranty_expiring must be boolean.');
    if (filters.has_warranty_expiring === true) {
      const today = new Date();
      const lastDay = new Date(today.getTime() + 30 * 86400000);
      where.warranty_end = {
        [Op.between]: [today.toISOString().slice(0, 10), lastDay.toISOString().slice(0, 10)],
      };
    }
    if (filters.unassigned !== undefined && typeof filters.unassigned !== 'boolean')
      throw new AppError(422, 'unassigned must be boolean.');
    const isUnassigned = unassignedOnly || filters.unassigned === true;
    if (isUnassigned) where.asset_status = 1;
    if (filters.assigned_employee_id !== undefined) {
      const ids = Array.isArray(filters.assigned_employee_id)
        ? filters.assigned_employee_id
        : [filters.assigned_employee_id];
      if (ids.some((id) => !Number.isSafeInteger(Number(id)) || Number(id) < 1))
        throw new AppError(422, 'Invalid assigned_employee_id filter.');
      const assignments = await asset_assignments.findAll({
        attributes: ['asset_id'],
        where: { returned_at: null, employee_id: { [Op.in]: ids.map(Number) } },
      });
      where.id = {
        [Op.in]: assignments.map((item) =>
          typeof item.get === 'function'
            ? item.get('asset_id')
            : (item as unknown as { asset_id: number }).asset_id,
        ),
      };
    }
    const search =
      input.general_search ??
      (typeof filters.general_search === 'string' ? filters.general_search : '');
    if (search)
      where[Op.or] = ['asset_tag', 'serial_no', 'brand', 'model'].map((field) => ({
        [field]: { [Op.like]: `%${search}%` },
      }));
    const page = Math.max(1, Number(input.currentPage ?? 1));
    const limit = Math.min(10000, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const result = await assets.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['id', 'DESC']],
    });
    return { rows: result.rows.map(record), count: result.count };
  }

  async get(id: number): Promise<RowAttributes> {
    const asset = await assets.findOne({ where: { id, status: STATUS.ACTIVE } });
    if (!asset) throw new AppError(404, 'Asset not found.');
    const current = await asset_assignments.findOne({
      where: { asset_id: id, returned_at: null },
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
      ],
    });
    const accessories = await assets.findAll({
      where: { parent_asset_id: id, status: STATUS.ACTIVE },
    });
    const maintenance = await asset_maintenance.findAll({
      where: { asset_id: id, status: STATUS.ACTIVE },
      order: [['sent_at', 'DESC']],
    });
    return {
      ...record(asset),
      current_assignment: current ? record(current) : null,
      accessories: accessories.map(record),
      maintenance: maintenance.map(record),
    };
  }

  async add(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    await validateReferences(input);
    return sequelize.transaction(async (transaction) => {
      const data = Object.fromEntries(
        assetFields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
      );
      const asset = await assets.create(
        {
          ...data,
          asset_tag: 'AST-TMP-' + crypto.randomBytes(8).toString('hex'),
          status: STATUS.ACTIVE,
          created_by: actor.id,
        },
        { transaction },
      );
      const assetId = Number(asset.get('id'));
      const assetTag = `AST-${String(assetId).padStart(6, '0')}`;
      await asset.update({ asset_tag: assetTag }, { transaction });
      await this.log(transaction, actor, assetId, 'created', record(asset));
      return record(asset);
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    const id = Number(input.id);
    await validateReferences(input, id);
    return sequelize.transaction(async (transaction) => {
      const asset = await assets.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!asset || Number(asset.get('status')) === STATUS.DELETED)
        throw new AppError(404, 'Asset not found.');
      const previous = record(asset);
      const updates = Object.fromEntries(
        assetFields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
      );
      await asset.update({ ...updates, updated_by: actor.id }, { transaction });
      await this.log(transaction, actor, id, 'updated', { previous, updates });
      return record(asset);
    });
  }

  async remove(id: number, actor: UserInfo): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const asset = await assets.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!asset || Number(asset.get('status')) === STATUS.DELETED)
        throw new AppError(404, 'Asset not found.');
      const assignment = await asset_assignments.findOne({
        where: { asset_id: id, returned_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (assignment) throw new AppError(409, 'Return the asset before deleting it.');
      await asset.update({ status: STATUS.DELETED, updated_by: actor.id }, { transaction });
      await this.log(transaction, actor, id, 'deleted', record(asset));
    });
  }

  private log(
    transaction: Transaction,
    actor: UserInfo,
    id: number,
    action: string,
    value: unknown,
  ) {
    return createActivityLog({
      module: 'asset',
      moduleId: id,
      action,
      newValue: value,
      description: `Asset ${id} ${action}`,
      createdBy: actor.id,
      createdByName: actorLabel(actor),
      transaction,
    });
  }
}
