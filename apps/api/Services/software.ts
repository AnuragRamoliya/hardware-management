import { Op, type Transaction } from 'sequelize';
import { AppError } from '../Config/app_error';
import { type RowAttributes, sequelize, app_settings } from '../Database/Schema';
import {
  SoftwareAssignmentRecord as software_assignments,
  SoftwareEmployeeRecord as employees,
  SoftwareRecord as software,
} from '../Models/software';
import { SoftwareLicenseRecord as software_licenses } from '../Models/software_license';
import { createActivityLog } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';

const plain = (value: import('sequelize').Model) => value.get({ plain: true }) as RowAttributes;
const actorLabel = (actor: UserInfo) => `${actor.first_name} ${actor.last_name}`;

export type SoftwareRow = RowAttributes & {
  id: number | string;
  seats_total: number;
  seats_used: number;
  seats_available: number;
};

const softwareFields = [
  'name',
  'vendor_id',
  'category',
  'license_type',
  'cost',
  'billing_cycle',
  'renewal_date',
  'notes',
] as const;

export class SoftwareService {
  async list(input: ListDto): Promise<{ rows: SoftwareRow[]; count: number }> {
    const filters = input.filters ?? {};
    const where: Record<string | symbol, unknown> = { status: 1 };
    for (const field of ['category', 'license_type'] as const) {
      const value = filters[field];
      if (value === undefined || value === '') continue;
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => typeof item !== 'string'))
        throw new AppError(422, `Invalid ${field} filter.`);
      where[field] = { [Op.in]: values };
    }
    for (const field of ['vendor_id'] as const) {
      const value = filters[field];
      if (value === undefined || value === '') continue;
      const values = Array.isArray(value) ? value : [value];
      if (values.some((item) => !Number.isSafeInteger(Number(item)) || Number(item) < 1))
        throw new AppError(422, `Invalid ${field} filter.`);
      where[field] = { [Op.in]: values.map(Number) };
    }
    const renewal = filters.renewal_date;
    if (renewal !== undefined) {
      if (!renewal || typeof renewal !== 'object' || Array.isArray(renewal))
        throw new AppError(422, 'renewal_date must be a range.');
      const range = renewal as Record<string, unknown>;
      const bounds: Record<symbol, Date> = {};
      for (const [key, op] of [
        ['from', Op.gte],
        ['to', Op.lte],
      ] as const) {
        if (range[key] === undefined || range[key] === '') continue;
        if (typeof range[key] !== 'string' || Number.isNaN(Date.parse(range[key])))
          throw new AppError(422, 'Invalid renewal date range.');
        const date = new Date(range[key]);
        if (key === 'to' && /^\d{4}-\d{2}-\d{2}$/.test(range[key])) date.setHours(23, 59, 59, 999);
        bounds[op] = date;
      }
      if (Object.keys(bounds).length) where.renewal_date = bounds;
    }
    if (filters.expiring !== undefined && typeof filters.expiring !== 'boolean')
      throw new AppError(422, 'expiring must be boolean.');
    if (filters.expiring === true)
      where.renewal_date = { [Op.between]: [new Date(), new Date(Date.now() + 30 * 86400000)] };
    if (filters.has_available_seats !== undefined) {
      if (typeof filters.has_available_seats !== 'boolean')
        throw new AppError(422, 'has_available_seats must be boolean.');
      const allLicenses = await software_licenses.findAll({
        where: { status: 1 },
        attributes: ['id', 'software_id', 'seats_total'],
      });
      const availableIds = new Set<number>();
      for (const license of allLicenses) {
        const used = await software_assignments.count({
          where: { license_id: license.get('id'), revoked_at: null },
        });
        if (used < Number(license.get('seats_total')))
          availableIds.add(Number(license.get('software_id')));
      }
      const ids = [...availableIds];
      where.id = filters.has_available_seats ? { [Op.in]: ids } : { [Op.notIn]: ids };
    }
    const search = typeof input.general_search === 'string' ? input.general_search.trim() : '';
    if (search)
      where[Op.or] = ['name', 'category'].map((field) => ({
        [field]: { [Op.like]: '%' + search + '%' },
      }));
    const page = Math.max(1, Number(input.currentPage ?? 1));
    const limit = Math.min(100, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const result = await software.findAndCountAll({
      where,
      limit,
      offset: (page - 1) * limit,
      order: [['id', 'DESC']],
    });
    const rows = await Promise.all(
      result.rows.map(async (item) => {
        const data = plain(item);
        const licenses = await software_licenses.findAll({
          where: { software_id: item.get('id'), status: 1 },
          attributes: ['id', 'seats_total'],
        });
        const licenseIds = licenses.map((license) =>
          Number(
            typeof license.get === 'function'
              ? license.get('id')
              : (license as unknown as { id: number }).id,
          ),
        );
        const totalSeats = licenses.reduce(
          (sum, license) =>
            sum +
            Number(
              typeof license.get === 'function'
                ? license.get('seats_total')
                : (license as unknown as { seats_total: number }).seats_total,
            ),
          0,
        );
        const seatsUsed = licenseIds.length
          ? await software_assignments.count({
              where: { license_id: { [Op.in]: licenseIds }, revoked_at: null },
            })
          : 0;
        return {
          ...data,
          seats_total: totalSeats,
          seats_used: seatsUsed,
          seats_available: totalSeats - seatsUsed,
        } as unknown as SoftwareRow;
      }),
    );
    return { rows, count: result.count };
  }

  async add(input: Record<string, unknown>, actor: UserInfo) {
    if (typeof input.name !== 'string' || !input.name.trim())
      throw new AppError(422, 'name is required.');
    if (typeof input.category !== 'string' || typeof input.license_type !== 'string')
      throw new AppError(422, 'category and license_type are required.');
    const value = Object.fromEntries(
      softwareFields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
    );
    return sequelize.transaction(async (transaction) => {
      const record = await software.create(
        { ...value, status: 1, created_by: actor.id },
        { transaction },
      );
      await this.log(transaction, actor, Number(record.get('id')), 'created', plain(record));
      return plain(record);
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo) {
    return sequelize.transaction(async (transaction) => {
      const record = await software.findByPk(Number(input.id), {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record || Number(record.get('status')) !== 1)
        throw new AppError(404, 'Software not found.');
      const updates = Object.fromEntries(
        softwareFields.filter((key) => input[key] !== undefined).map((key) => [key, input[key]]),
      );
      await record.update({ ...updates, updated_by: actor.id }, { transaction });
      await this.log(transaction, actor, Number(record.get('id')), 'updated', updates);
      return plain(record);
    });
  }

  async remove(id: number, actor: UserInfo) {
    return sequelize.transaction(async (transaction) => {
      const record = await software.findByPk(id, { transaction, lock: transaction.LOCK.UPDATE });
      if (!record || Number(record.get('status')) !== 1)
        throw new AppError(404, 'Software not found.');
      const open = await software_assignments.count({
        where: { software_id: id, revoked_at: null },
        transaction,
      });
      if (open) throw new AppError(409, 'Revoke open assignments before deleting software.');
      await record.update({ status: 2, updated_by: actor.id }, { transaction });
      await this.log(transaction, actor, id, 'deleted', plain(record));
    });
  }

  async get(id: number) {
    const record = await software.findOne({ where: { id, status: 1 } });
    if (!record) throw new AppError(404, 'Software not found.');
    return plain(record);
  }

  async assign(
    input: {
      software_id: number;
      license_id?: number;
      employee_id: number;
      note?: string;
      override_reason?: string;
    },
    actor: UserInfo,
    existingTransaction?: Transaction,
  ) {
    const run = async (transaction: Transaction) => {
      const target = await software.findByPk(input.software_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!target || Number(target.get('status')) !== 1)
        throw new AppError(404, 'Software not found.');
      const employee = await employees.findByPk(input.employee_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (
        !employee ||
        Number(employee.get('status')) !== 1 ||
        Number(employee.get('employment_status')) >= 3
      )
        throw new AppError(422, 'Employee is inactive or exited.');

      if (Number(employee.get('employment_status')) === 2) {
        const blockSetting = await app_settings.findOne({
          where: { key: 'offboarding_block_assign_during_notice', status: 1 },
          transaction,
        });
        const isBlocked = blockSetting ? blockSetting.get('value') === 'true' : true;
        if (isBlocked) {
          const canApprove = actor.role_id === 1;
          if (!canApprove || !input.override_reason || input.override_reason.trim().length < 5) {
            throw new AppError(
              422,
              'New software assignment is blocked during notice period. Approval permission and reason are required to override.',
            );
          }
          await createActivityLog({
            module: 'software',
            moduleId: input.software_id,
            action: 'notice_assignment_override',
            description: `Software assignment override granted during notice period for employee ${employee.get('first_name')}: "${input.override_reason}"`,
            createdBy: actor.id,
            createdByName: `${actor.first_name} ${actor.last_name || ''}`,
            transaction,
          });
        }
      }
      const duplicate = await software_assignments.findOne({
        where: { software_id: input.software_id, employee_id: input.employee_id, revoked_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (duplicate) throw new AppError(409, 'Employee already has this software.');
      let license;
      if (input.license_id) {
        license = await software_licenses.findByPk(input.license_id, {
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        if (
          !license ||
          Number(license.get('software_id')) !== input.software_id ||
          Number(license.get('status')) !== 1
        )
          throw new AppError(422, 'License does not belong to the selected software.');
      } else {
        const licenses = await software_licenses.findAll({
          where: { software_id: input.software_id, status: 1 },
          order: [['id', 'ASC']],
          transaction,
          lock: transaction.LOCK.UPDATE,
        });
        license = null;
        for (const candidate of licenses) {
          const used = await software_assignments.count({
            where: { license_id: candidate.get('id'), revoked_at: null },
            transaction,
          });
          if (used < Number(candidate.get('seats_total'))) {
            license = candidate;
            break;
          }
        }
        if (!license && licenses.length)
          throw new AppError(409, 'All software license seats are in use.');
      }
      if (license) {
        const used = await software_assignments.count({
          where: { license_id: license.get('id'), revoked_at: null },
          transaction,
        });
        if (used >= Number(license.get('seats_total')))
          throw new AppError(409, 'All seats on this license are in use.');
      }
      const assignment = await software_assignments.create(
        {
          software_id: input.software_id,
          license_id: license?.get('id') ?? null,
          employee_id: input.employee_id,
          assigned_at: new Date(),
          assigned_by: actor.id,
          note: input.note ?? null,
          status: 1,
          created_by: actor.id,
        },
        { transaction },
      );
      await this.log(transaction, actor, input.software_id, 'assigned', {
        employee_id: input.employee_id,
        license_id: license?.get('id'),
      });
      return plain(assignment);
    };

    if (existingTransaction) {
      return run(existingTransaction);
    }
    return sequelize.transaction(run);
  }

  async revoke(input: { assignment_id: number }, actor: UserInfo) {
    const assignment = await software_assignments.findOne({
      where: { id: input.assignment_id, revoked_at: null },
    });
    if (!assignment) throw new AppError(404, 'Active software assignment not found.');
    await sequelize.transaction(async (transaction) => {
      await assignment.update(
        { revoked_at: new Date(), revoked_by: actor.id, updated_by: actor.id },
        { transaction },
      );
      await this.log(transaction, actor, Number(assignment.get('software_id')), 'revoked', {
        assignment_id: input.assignment_id,
      });
    });
    return plain(assignment);
  }

  async usage(id: number) {
    const rows = await software_assignments.findAll({
      where: { software_id: id },
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'employee_code', 'first_name', 'last_name', 'email'],
        },
      ],
      order: [['assigned_at', 'DESC']],
    });
    return rows.map(plain);
  }

  async employeeSoftware(employeeId: number) {
    const rows = await software_assignments.findAll({
      where: { employee_id: employeeId },
      include: [{ model: software, as: 'software' }],
      order: [['assigned_at', 'DESC']],
    });
    return rows.map(plain);
  }

  private log(
    transaction: Transaction,
    actor: UserInfo,
    id: number,
    action: string,
    value: unknown,
  ) {
    return createActivityLog({
      module: 'software',
      moduleId: id,
      action,
      newValue: value,
      description: `Software ${id} ${action}`,
      createdBy: actor.id,
      createdByName: actorLabel(actor),
      transaction,
    });
  }
}
