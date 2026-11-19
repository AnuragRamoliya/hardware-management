import { Op, type Transaction } from 'sequelize';
import { AppError } from '../Config/app_error';
import { type RowAttributes, sequelize, app_settings } from '../Database/Schema';
import {
  AssetAssignmentRecord as asset_assignments,
  AssignedAssetRecord as assets,
  AssignmentEmployeeRecord as employees,
} from '../Models/asset_assignment';
import { createActivityLog } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';
import { REALTIME_EVENTS, REALTIME_ROOMS } from '@hm/shared';
import { realtimeService } from './realtime.service';

const assetStatus = {
  available: 1,
  assigned: 2,
  pending_return: 3,
  in_repair: 4,
  retired: 5,
  lost: 6,
} as const;
const actorLabel = (actor: UserInfo) => `${actor.first_name} ${actor.last_name}`;
const plain = (value: import('sequelize').Model) => value.get({ plain: true }) as RowAttributes;

export class AssetAssignmentService {
  async assign(
    input: {
      asset_id: number;
      employee_id: number;
      due_return_date?: string;
      note?: string;
      override_reason?: string;
    },
    actor: UserInfo,
    existingTransaction?: Transaction,
  ) {
    if (existingTransaction) {
      return this.assignInTransaction(input, actor, existingTransaction);
    }
    return sequelize.transaction(async (transaction) =>
      this.assignInTransaction(input, actor, transaction),
    );
  }

  private async assignInTransaction(
    input: {
      asset_id: number;
      employee_id: number;
      due_return_date?: string;
      note?: string;
      override_reason?: string;
    },
    actor: UserInfo,
    transaction: Transaction,
  ) {
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
            'New asset assignment is blocked during notice period. Approval permission and reason are required to override.',
          );
        }
        await createActivityLog({
          module: 'asset_assignment',
          moduleId: input.asset_id,
          action: 'notice_assignment_override',
          description: `Assignment override granted during notice period for employee ${employee.get('first_name')}: "${input.override_reason}"`,
          createdBy: actor.id,
          createdByName: `${actor.first_name} ${actor.last_name || ''}`,
          transaction,
        });
      }
    }
    const root = await assets.findByPk(input.asset_id, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!root || Number(root.get('status')) !== 1) throw new AppError(404, 'Asset not found.');
    const toAssign = [root];
    const seenAssets = new Set<number>([input.asset_id]);
    let parentIds = [input.asset_id];
    while (parentIds.length) {
      const children = await assets.findAll({
        where: { parent_asset_id: { [Op.in]: parentIds }, status: 1 },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const nextParents: number[] = [];
      for (const child of children) {
        const childId = Number(child.get('id'));
        if (seenAssets.has(childId)) continue;
        seenAssets.add(childId);
        toAssign.push(child);
        nextParents.push(childId);
      }
      parentIds = nextParents;
    }
    for (const asset of toAssign) {
      if (Number(asset.get('asset_status')) !== assetStatus.available)
        throw new AppError(409, `Asset ${String(asset.get('asset_tag'))} is not available.`);
      const open = await asset_assignments.findOne({
        where: { asset_id: asset.get('id'), returned_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (open) throw new AppError(409, 'Asset is already assigned.');
    }
    const now = new Date();
    const created = [];
    for (const asset of toAssign) {
      const assetId = Number(asset.get('id'));
      const assignment = await asset_assignments.create(
        {
          asset_id: assetId,
          employee_id: input.employee_id,
          assigned_at: now,
          assigned_by: actor.id,
          due_return_date: input.due_return_date ?? null,
          note: input.note ?? null,
          status: 1,
          created_by: actor.id,
        },
        { transaction },
      );
      await asset.update(
        { asset_status: assetStatus.assigned, updated_by: actor.id },
        { transaction },
      );
      await this.log(transaction, actor, assetId, 'assigned', {
        employee_id: input.employee_id,
        assignment_id: assignment.get('id'),
      });
      created.push(plain(assignment));
    }

    const empUser = employee.get('user_id');
    realtimeService.publish({
      event: REALTIME_EVENTS.ASSET_ASSIGNED,
      rooms: [
        REALTIME_ROOMS.queueDashboard(),
        `asset:${input.asset_id}`,
        ...(empUser ? [REALTIME_ROOMS.user(Number(empUser))] : []),
      ],
      data: {
        asset_id: input.asset_id,
        employee_id: input.employee_id,
        action: 'assigned',
        label: `Asset #${input.asset_id} assigned`,
      },
      actor: { id: actor.id, name: actorLabel(actor) },
      transaction,
    });

    return created[0];
  }

  async return(
    input: {
      assignment_id?: number;
      asset_id?: number;
      return_condition?: string;
      notes?: string;
      to_status?: string;
    },
    actor: UserInfo,
    existingTransaction?: Transaction,
  ) {
    if (existingTransaction) {
      return this.returnInTransaction(input, actor, existingTransaction);
    }
    return sequelize.transaction(async (transaction) =>
      this.returnInTransaction(input, actor, transaction),
    );
  }

  private async returnInTransaction(
    input: {
      assignment_id?: number;
      asset_id?: number;
      return_condition?: string;
      notes?: string;
      to_status?: string;
    },
    actor: UserInfo,
    transaction: Transaction,
  ) {
    const assignment = await asset_assignments.findOne({
      where: {
        ...(input.assignment_id ? { id: input.assignment_id } : { asset_id: input.asset_id }),
        returned_at: null,
      },
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!assignment) throw new AppError(404, 'Open assignment not found.');
    const assetId = Number(assignment.get('asset_id'));
    const asset = await assets.findByPk(assetId, { transaction, lock: transaction.LOCK.UPDATE });
    if (!asset) throw new AppError(404, 'Asset not found.');
    const statusName = input.to_status ?? 'available';
    const nextStatus = assetStatus[statusName as keyof typeof assetStatus];
    if (![1, 4, 5, 6].includes(nextStatus))
      throw new AppError(422, 'Invalid return destination status.');
    const now = new Date();
    await assignment.update(
      {
        returned_at: now,
        received_by: actor.id,
        return_condition: input.return_condition ?? null,
        return_notes: input.notes ?? null,
        updated_by: actor.id,
      },
      { transaction },
    );
    await asset.update(
      {
        asset_status: nextStatus,
        ...(input.return_condition ? { condition: input.return_condition } : {}),
        updated_by: actor.id,
      },
      { transaction },
    );
    await this.log(transaction, actor, assetId, 'returned', {
      to_status: statusName,
      assignment_id: assignment.get('id'),
    });
    const accessories = [];
    const seen = new Set<number>([assetId]);
    let parentIds = [assetId];
    while (parentIds.length) {
      const children = await assets.findAll({
        where: { parent_asset_id: { [Op.in]: parentIds }, status: 1 },
        order: [['id', 'ASC']],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      const nextParents: number[] = [];
      for (const child of children) {
        const childId = Number(child.get('id'));
        if (seen.has(childId)) continue;
        seen.add(childId);
        accessories.push(child);
        nextParents.push(childId);
      }
      parentIds = nextParents;
    }
    for (const accessory of accessories) {
      const open = await asset_assignments.findOne({
        where: { asset_id: accessory.get('id'), returned_at: null },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });
      if (!open) continue;
      await open.update(
        {
          returned_at: now,
          received_by: actor.id,
          return_condition: input.return_condition ?? null,
          return_notes: input.notes ?? null,
        },
        { transaction },
      );
      await accessory.update(
        {
          asset_status: nextStatus,
          ...(input.return_condition ? { condition: input.return_condition } : {}),
          updated_by: actor.id,
        },
        { transaction },
      );
      await this.log(transaction, actor, Number(accessory.get('id')), 'returned', {
        parent_asset_id: assetId,
      });
    }
    return plain(assignment);
  }

  async transfer(
    input: { asset_id: number; to_employee_id: number; note?: string },
    actor: UserInfo,
  ) {
    return sequelize.transaction(async (transaction) => {
      await this.returnInTransaction(
        {
          asset_id: input.asset_id,
          to_status: 'available',
          notes: 'Transferred to another employee',
        },
        actor,
        transaction,
      );
      return this.assignInTransaction(
        { asset_id: input.asset_id, employee_id: input.to_employee_id, note: input.note },
        actor,
        transaction,
      );
    });
  }

  async bulkAssign(
    items: Array<{
      asset_id: number;
      employee_id: number;
      due_return_date?: string;
      note?: string;
    }>,
    actor: UserInfo,
    allOrNothing = true,
  ) {
    if (!Array.isArray(items) || items.length > 100)
      throw new AppError(422, 'Provide up to 100 assignments.');
    if (allOrNothing)
      return sequelize.transaction(async (transaction) =>
        Promise.all(items.map((item) => this.assignInTransaction(item, actor, transaction))),
      );
    const results = [];
    for (const item of items) {
      try {
        results.push({ ok: true, data: await this.assign(item, actor) });
      } catch (error) {
        results.push({
          ok: false,
          asset_id: item.asset_id,
          message: error instanceof Error ? error.message : 'Assignment failed.',
        });
      }
    }
    return results;
  }

  async bulkReturn(
    items: Array<{
      asset_id?: number;
      assignment_id?: number;
      to_status?: string;
      return_condition?: string;
      notes?: string;
    }>,
    actor: UserInfo,
    allOrNothing = true,
  ) {
    if (!Array.isArray(items) || items.length > 100)
      throw new AppError(422, 'Provide up to 100 returns.');
    if (allOrNothing)
      return sequelize.transaction(async (transaction) =>
        Promise.all(items.map((item) => this.returnInTransaction(item, actor, transaction))),
      );
    const results = [];
    for (const item of items) {
      try {
        results.push({ ok: true, data: await this.return(item, actor) });
      } catch (error) {
        results.push({
          ok: false,
          asset_id: item.asset_id,
          message: error instanceof Error ? error.message : 'Return failed.',
        });
      }
    }
    return results;
  }

  async history(assetId: number) {
    return asset_assignments.findAll({
      where: { asset_id: assetId },
      order: [['assigned_at', 'DESC']],
    });
  }

  async employeeAssets(employeeId: number) {
    const rows = await asset_assignments.findAll({
      where: { employee_id: employeeId },
      include: [{ model: assets, as: 'asset' }],
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
      module: 'asset_assignment',
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
