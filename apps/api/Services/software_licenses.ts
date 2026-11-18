import { Op, type Transaction } from 'sequelize';
import { AppError } from '../Config/app_error';
import { type RowAttributes, sequelize } from '../Database/Schema';
import { SoftwareRecord as software } from '../Models/software';
import {
  LicenseAssignmentRecord as software_assignments,
  SoftwareLicenseRecord as software_licenses,
} from '../Models/software_license';
import { encryptVaultSecret } from '../Utils/encryption';
import { createActivityLog } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';

const plain = (value: import('sequelize').Model) => value.get({ plain: true }) as RowAttributes;
const actorLabel = (actor: UserInfo) => `${actor.first_name} ${actor.last_name}`;

export type SoftwareLicenseRow = RowAttributes & {
  id: number | string;
  seats_used: number;
  seats_available: number;
};

export class SoftwareLicensesService {
  async list(input: ListDto): Promise<{ rows: SoftwareLicenseRow[]; count: number }> {
    const filters = input.filters ?? {};
    const where: Record<string | symbol, unknown> = { status: 1 };
    if (filters.software_id !== undefined) where.software_id = Number(filters.software_id);
    if (filters.expiry_date !== undefined) {
      if (
        !filters.expiry_date ||
        typeof filters.expiry_date !== 'object' ||
        Array.isArray(filters.expiry_date)
      )
        throw new AppError(422, 'expiry_date must be a range.');
      const dateRange = filters.expiry_date as Record<string, unknown>;
      const bounds: Record<symbol, Date> = {};
      for (const [key, op] of [
        ['from', Op.gte],
        ['to', Op.lte],
      ] as const) {
        const value = dateRange[key];
        if (value === undefined || value === '') continue;
        if (typeof value !== 'string' || Number.isNaN(Date.parse(value)))
          throw new AppError(422, 'Invalid license expiry range.');
        const date = new Date(value);
        if (key === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(value)) date.setHours(23, 59, 59, 999);
        bounds[op] = date;
      }
      if (Object.keys(bounds).length) where.expiry_date = bounds;
    }
    if (filters.has_available_seats !== undefined) {
      if (typeof filters.has_available_seats !== 'boolean')
        throw new AppError(422, 'has_available_seats must be boolean.');
      const licenses = await software_licenses.findAll({
        where: { status: 1 },
        attributes: ['id', 'seats_total'],
      });
      const ids: number[] = [];
      for (const license of licenses) {
        const used = await software_assignments.count({
          where: { license_id: license.get('id'), revoked_at: null },
        });
        if (used < Number(license.get('seats_total')) === filters.has_available_seats)
          ids.push(Number(license.get('id')));
      }
      where.id = { [Op.in]: ids };
    }
    const page = Math.max(1, Number(input.currentPage ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const result = await software_licenses.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['id', 'DESC']],
    });
    const rows = await Promise.all(
      result.rows.map(async (item) => {
        const data = plain(item);
        delete data.license_key;
        const used = await software_assignments.count({
          where: { license_id: item.get('id'), revoked_at: null },
        });
        return {
          ...data,
          seats_used: used,
          seats_available: Number(item.get('seats_total')) - used,
        } as unknown as SoftwareLicenseRow;
      }),
    );
    return { rows, count: result.count };
  }

  async add(input: Record<string, unknown>, actor: UserInfo) {
    const softwareId = Number(input.software_id);
    if (!Number.isSafeInteger(softwareId) || !(await software.findByPk(softwareId)))
      throw new AppError(422, 'software_id must reference existing software.');
    const seats = Number(input.seats_total ?? 1);
    if (!Number.isSafeInteger(seats) || seats < 1)
      throw new AppError(422, 'seats_total must be a positive integer.');
    const licenseKey =
      typeof input.license_key === 'string' && input.license_key
        ? encryptVaultSecret(input.license_key)
        : null;
    return sequelize.transaction(async (transaction) => {
      const license = await software_licenses.create(
        {
          software_id: softwareId,
          license_key: licenseKey,
          seats_total: seats,
          purchase_date: input.purchase_date ?? null,
          expiry_date: input.expiry_date ?? null,
          status: 1,
          created_by: actor.id,
        },
        { transaction },
      );
      await this.log(transaction, actor, Number(license.get('id')), 'license_created', {
        software_id: softwareId,
        seats_total: seats,
        expiry_date: input.expiry_date ?? null,
      });
      const result = plain(license);
      delete result.license_key;
      return result;
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo) {
    return sequelize.transaction(async (transaction) => {
      const license = await software_licenses.findByPk(Number(input.id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!license) throw new AppError(404, 'License not found.');
      const used = await software_assignments.count({
        where: { license_id: input.id, revoked_at: null },
        transaction,
      });
      if (
        input.seats_total !== undefined &&
        (!Number.isSafeInteger(Number(input.seats_total)) || Number(input.seats_total) < used)
      )
        throw new AppError(409, 'Seats cannot be lower than active usage.');
      const update: Record<string, unknown> = {};
      for (const key of ['seats_total', 'purchase_date', 'expiry_date'] as const)
        if (input[key] !== undefined) update[key] = input[key];
      if (typeof input.license_key === 'string' && input.license_key)
        update.license_key = encryptVaultSecret(input.license_key);
      await license.update({ ...update, updated_by: actor.id }, { transaction });
      const safeUpdate = { ...update };
      delete safeUpdate.license_key;
      await this.log(transaction, actor, Number(license.get('id')), 'license_updated', safeUpdate);
      const result = plain(license);
      delete result.license_key;
      return result;
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
      module: 'software_license',
      moduleId: id,
      action,
      newValue: value,
      description: `Software license ${id} ${action}`,
      createdBy: actor.id,
      createdByName: actorLabel(actor),
      transaction,
    });
  }
}
