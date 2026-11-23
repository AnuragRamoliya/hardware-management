import { Op, type WhereOptions } from 'sequelize';
import { AppError } from '../Config/app_error';
import { ACTIVITY_ACTIONS, STATUS } from '../Config/constant';
import { sequelize } from '../Config/database';
import type { EntityModel, RowAttributes } from '../Database/Schema';
import {
  applyMultiFieldSearch,
  createActivityLog,
  getPagination,
  getSorting,
} from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';
import { getOptions, isOptionsResource } from './options';
import type { OptionsDto, OptionsResult } from '../Types/options';
import { validatePhoneNumber } from '@hm/shared';

export interface ResourceDefinition {
  table: string;
  module: string;
  writableFields: string[];
  searchFields: string[];
  optionFields?: string[];
  optionsResource?: string;
  filterableFields?: Record<string, 'text' | 'number' | 'boolean' | 'date'>;
  includeAttributes?: [unknown, string][];
  extraSortFields?: string[];
}

export class ResourceModel {
  constructor(
    protected readonly model: EntityModel,
    protected readonly definition: ResourceDefinition,
  ) {}

  protected values(input: Record<string, unknown>): Record<string, unknown> {
    const raw = Object.fromEntries(
      Object.entries(input).filter(([key]) => this.definition.writableFields.includes(key)),
    );
    if (typeof raw.phone === 'string' && raw.phone.trim()) {
      const p = validatePhoneNumber(raw.phone, 'IN');
      if (p.valid && p.e164) {
        raw.phone = p.e164;
      }
    }
    return raw;
  }

  protected actorName(actor: UserInfo): string {
    return `${actor.first_name} ${actor.last_name}`;
  }

  async add(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    return sequelize.transaction(async (transaction) => {
      const record = await this.model.create(
        { ...this.values(input), created_by: actor.id, status: STATUS.ACTIVE },
        { transaction },
      );
      const result = record.get({ plain: true }) as RowAttributes;
      await createActivityLog({
        module: this.definition.module,
        moduleId: Number(result.id),
        action: ACTIVITY_ACTIONS.CREATED,
        newValue: result,
        description: `${this.definition.table} ${String(result.id)} was created`,
        createdBy: actor.id,
        createdByName: this.actorName(actor),
        transaction,
      });
      return result;
    });
  }

  async update(input: Record<string, unknown>, actor: UserInfo): Promise<RowAttributes> {
    const id = Number(input.id);
    return sequelize.transaction(async (transaction) => {
      const record = await this.model.findOne({
        where: { id, status: { [Op.ne]: STATUS.DELETED } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw new AppError(404, `${this.definition.table} not found.`);
      const previous = record.get({ plain: true }) as RowAttributes;
      const updates = { ...this.values(input), updated_by: actor.id };
      await record.update(updates, { transaction });
      const current = record.get({ plain: true }) as RowAttributes;
      for (const [field, value] of Object.entries(updates)) {
        if (previous[field] === value) continue;
        await createActivityLog({
          module: this.definition.module,
          moduleId: id,
          action: ACTIVITY_ACTIONS.UPDATED,
          field,
          oldValue: previous[field],
          newValue: value,
          description: `${this.definition.table} ${id} ${field} updated`,
          createdBy: actor.id,
          createdByName: this.actorName(actor),
          transaction,
        });
      }
      return current;
    });
  }

  async get(id: number): Promise<RowAttributes> {
    const record = await this.model.findOne({
      where: { id, status: { [Op.ne]: STATUS.DELETED } },
      ...(this.definition.includeAttributes?.length
        ? { attributes: { include: this.definition.includeAttributes as unknown as string[] } }
        : {}),
    });
    if (!record) throw new AppError(404, `${this.definition.table} not found.`);
    const plain = record.get({ plain: true }) as RowAttributes;
    if (this.definition.includeAttributes) {
      for (const [, alias] of this.definition.includeAttributes) {
        if (alias.endsWith('_count') && plain[alias] !== undefined) {
          plain[alias] = Number(plain[alias] || 0);
        }
      }
    }
    return plain;
  }

  async list(input: ListDto, options = false): Promise<{ rows: RowAttributes[]; count: number }> {
    const where: Record<string | symbol, unknown> = { status: { [Op.ne]: STATUS.DELETED } };
    for (const [field, value] of Object.entries(input.filters ?? {})) {
      const kind = this.definition.filterableFields?.[field];
      if (!kind || value === null || value === undefined || value === '') continue;
      const normalize = (candidate: unknown): string | number | boolean | Date => {
        if (kind === 'text' && typeof candidate === 'string') return candidate;
        if (
          kind === 'number' &&
          (typeof candidate === 'number' ||
            (typeof candidate === 'string' &&
              candidate.trim() !== '' &&
              Number.isFinite(Number(candidate))))
        ) {
          const number = Number(candidate);
          if (Number.isFinite(number)) return number;
        }
        if (kind === 'boolean' && typeof candidate === 'boolean') return candidate;
        if (kind === 'date' && typeof candidate === 'string') {
          const date = new Date(candidate);
          if (!Number.isNaN(date.getTime())) return date;
        }
        throw new AppError(422, `Invalid value for filter ${field}.`);
      };

      if (Array.isArray(value)) {
        if (value.length === 0) continue;
        where[field] = { [Op.in]: value.map(normalize) };
        continue;
      }
      if (typeof value === 'object') {
        if (kind !== 'date' && kind !== 'number') {
          throw new AppError(422, `Range filters are not supported for ${field}.`);
        }
        const range = value as Record<string, unknown>;
        if (Object.keys(range).some((key) => key !== 'from' && key !== 'to')) {
          throw new AppError(422, `Invalid range filter for ${field}.`);
        }
        const lower =
          range.from === undefined || range.from === '' ? undefined : normalize(range.from);
        const upper = range.to === undefined || range.to === '' ? undefined : normalize(range.to);
        if (
          upper instanceof Date &&
          typeof range.to === 'string' &&
          /^\d{4}-\d{2}-\d{2}$/.test(range.to)
        ) {
          upper.setHours(23, 59, 59, 999);
        }
        if (lower === undefined && upper === undefined) continue;
        where[field] = {
          ...(lower !== undefined ? { [Op.gte]: lower } : {}),
          ...(upper !== undefined ? { [Op.lte]: upper } : {}),
        };
        continue;
      }
      const normalized = normalize(value);
      where[field] = kind === 'text' ? { [Op.like]: `%${normalized}%` } : normalized;
    }
    const search = input.general_search ?? input.filters?.general_search;
    if (typeof search === 'string' && search) {
      applyMultiFieldSearch(where, search, this.definition.searchFields);
    }
    const modelAttributes = Object.keys(
      (this.model as unknown as { rawAttributes?: Record<string, unknown> }).rawAttributes ?? {},
    );
    const sortFields = new Set([
      'id',
      'status',
      'createdAt',
      'updatedAt',
      ...this.definition.writableFields,
      ...modelAttributes,
      ...(this.definition.extraSortFields ?? []),
      ...(this.definition.includeAttributes?.map(([, alias]) => alias) ?? []),
    ]);
    const order = getSorting(input, sortFields, [['id', 'DESC']]);
    const pagination = getPagination(input);
    const result = await this.model.findAndCountAll({
      where: where as WhereOptions<RowAttributes>,
      limit: pagination.limit,
      offset: pagination.offset,
      order,
      distinct: true,
      ...(options && this.definition.optionFields
        ? { attributes: this.definition.optionFields }
        : this.definition.includeAttributes?.length
          ? { attributes: { include: this.definition.includeAttributes as unknown as string[] } }
          : {}),
    });
    return {
      rows: result.rows.map((row) => {
        const plain = row.get({ plain: true }) as RowAttributes;
        if (this.definition.includeAttributes) {
          for (const [, alias] of this.definition.includeAttributes) {
            if (alias.endsWith('_count') && plain[alias] !== undefined) {
              plain[alias] = Number(plain[alias] || 0);
            }
          }
        }
        return plain;
      }),
      count: result.count,
    };
  }

  async options(input: OptionsDto): Promise<OptionsResult> {
    const resource = this.definition.optionsResource ?? this.definition.table;
    if (!isOptionsResource(resource)) {
      throw new AppError(500, `Options are not configured for ${resource}.`);
    }
    return getOptions(resource, input);
  }

  async delete(id: number, actor: UserInfo): Promise<void> {
    await sequelize.transaction(async (transaction) => {
      const record = await this.model.findOne({
        where: { id, status: { [Op.ne]: STATUS.DELETED } },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!record) throw new AppError(404, `${this.definition.table} not found.`);
      await record.update({ status: STATUS.DELETED, updated_by: actor.id }, { transaction });
      await createActivityLog({
        module: this.definition.module,
        moduleId: id,
        action: ACTIVITY_ACTIONS.DELETED,
        oldValue: 1,
        newValue: STATUS.DELETED,
        description: `${this.definition.table} ${id} was soft deleted`,
        createdBy: actor.id,
        createdByName: this.actorName(actor),
        transaction,
      });
    });
  }
}
