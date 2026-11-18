import bcrypt from 'bcrypt';
import { Op, type Transaction, type WhereOptions } from 'sequelize';
import { ACTIVITY_ACTIONS, STATUS } from '../Config/constant';
import { activity_logs, type RowAttributes } from '../Database/Schema';
import type { ListDto } from '../Types/api';

export async function createHashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function compareHashPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function getPagination(data: ListDto): { limit: number; offset: number } {
  const currentPage = Math.max(1, Number(data.currentPage ?? 1));
  const itemsPerPage = Math.min(100, Math.max(1, Number(data.itemsPerPage ?? 10)));
  return { limit: itemsPerPage, offset: (currentPage - 1) * itemsPerPage };
}

export function applyMultiFieldSearch(
  query: Record<string | symbol, unknown>,
  value: string | undefined,
  fields: string[],
): WhereOptions<RowAttributes> {
  if (!value) return query as WhereOptions<RowAttributes>;
  query[Op.or] = fields.map((field) => ({ [field]: { [Op.like]: `%${value}%` } }));
  return query as WhereOptions<RowAttributes>;
}

interface ActivityInput {
  module: string;
  moduleId?: number | string | null;
  action: string;
  field?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  description: string;
  meta?: Record<string, unknown>;
  createdBy?: number;
  createdByName?: string;
  transaction: Transaction;
}

export async function createActivityLog(input: ActivityInput): Promise<void> {
  await activity_logs.create(
    {
      module: input.module,
      module_id: input.moduleId ?? null,
      action: input.action,
      field: input.field ?? null,
      old_value: input.oldValue ?? null,
      new_value: input.newValue ?? null,
      description: input.description,
      meta: input.meta ?? null,
      created_by: input.createdBy ?? null,
      created_by_name: input.createdByName ?? null,
      status: STATUS.ACTIVE,
    },
    { transaction: input.transaction },
  );
}

export async function logCreated(
  module: string,
  moduleId: number,
  actorId: number,
  actorName: string,
  transaction: Transaction,
  value: unknown,
): Promise<void> {
  await createActivityLog({
    module,
    moduleId,
    action: ACTIVITY_ACTIONS.CREATED,
    newValue: value,
    description: `${module} ${moduleId} was created`,
    createdBy: actorId,
    createdByName: actorName,
    transaction,
  });
}
