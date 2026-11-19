import { Op, type Transaction } from 'sequelize';
import {
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
  OFFBOARDING_CASE_STATUS,
} from '@hm/shared';
import { AppError } from '../Config/app_error';
import {
  sequelize,
  offboarding_tasks,
  offboarding_cases,
  employees,
  users,
  assets,
  asset_assignments,
} from '../Database/Schema';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';
import { AssetAssignmentService } from './asset_assignment';

const plain = (model: import('sequelize').Model) =>
  model.get({ plain: true }) as Record<string, unknown>;

export interface TaskListFilters {
  mine?: boolean | string;
  task_type?: number;
  task_status?: number;
  employee_id?: number;
  case_id?: number;
  overdue?: boolean | string;
  search?: string;
}

export class OffboardingTasksService {
  private assetAssignmentService = new AssetAssignmentService();

  async list(
    filters: TaskListFilters,
    pagination: { currentPage?: number; itemsPerPage?: number },
    actor: UserInfo,
  ) {
    const where: Record<string | symbol, unknown> = { status: 1 };
    const caseWhere: Record<string, unknown> = { status: 1 };

    if (filters.mine === true || filters.mine === 'true') {
      where.assigned_to = actor.id;
    }

    if (filters.task_type) {
      where.task_type = Number(filters.task_type);
    }

    if (filters.task_status) {
      where.task_status = Number(filters.task_status);
    }

    if (filters.case_id) {
      where.case_id = Number(filters.case_id);
    }

    if (filters.employee_id) {
      caseWhere.employee_id = Number(filters.employee_id);
    }

    const today = new Date().toISOString().split('T')[0];
    if (filters.overdue === true || filters.overdue === 'true') {
      where.due_date = { [Op.lt]: today };
      where.task_status = {
        [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
      };
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      where[Op.or] = [{ title: { [Op.like]: term } }, { ref_label: { [Op.like]: term } }];
    }

    const { limit, offset } = getPagination(pagination);

    const allowedTaskColumns = {
      id: 'id',
      case_id: 'case_id',
      task_name: 'title',
      title: 'title',
      task_type: 'task_type',
      department: 'department',
      assignee_id: 'assignee_id',
      due_date: 'due_date',
      task_status: 'task_status',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(pagination, allowedTaskColumns, [
      ['due_date', 'ASC'],
      ['id', 'ASC'],
    ]);

    const { rows, count } = await offboarding_tasks.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: offboarding_cases,
          as: 'case',
          where: caseWhere,
          include: [
            {
              model: employees,
              as: 'employee',
              attributes: ['id', 'first_name', 'last_name', 'employee_code', 'email'],
            },
          ],
        },
        {
          model: users,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'completer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'waiver',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
      ],
    });

    return {
      list: rows.map(plain),
      pagination: {
        totalItems: count,
        currentPage: pagination.currentPage ? Number(pagination.currentPage) : 1,
        itemsPerPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async receive(
    input: { task_id: number; return_condition?: string; to_status?: string; notes?: string },
    actor: UserInfo,
  ) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const task = await offboarding_tasks.findByPk(input.task_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task || Number(task.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding task not found.');
      }

      if (Number(task.get('task_type')) !== OFFBOARDING_TASK_TYPE.ASSET) {
        throw new AppError(422, 'Only hardware asset tasks can be received via this action.');
      }

      const currentStatus = Number(task.get('task_status'));
      if (
        currentStatus === OFFBOARDING_TASK_STATUS.COMPLETED ||
        currentStatus === OFFBOARDING_TASK_STATUS.WAIVED ||
        currentStatus === OFFBOARDING_TASK_STATUS.CANCELLED
      ) {
        throw new AppError(
          409,
          `Task is already ${currentStatus === OFFBOARDING_TASK_STATUS.COMPLETED ? 'completed' : 'closed'}.`,
        );
      }

      const assignmentId = task.get('ref_id');
      if (assignmentId) {
        await this.assetAssignmentService.return(
          {
            assignment_id: Number(assignmentId),
            return_condition: input.return_condition || 'good',
            to_status: input.to_status || 'available',
            notes: input.notes || 'Received during offboarding hardware handover',
          },
          actor,
          transaction,
        );
      }

      const now = new Date();
      await task.update(
        {
          task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          return_condition: input.return_condition || 'good',
          to_status: input.to_status || 'available',
          outcome_notes: input.notes || null,
          completed_at: now,
          completed_by: actor.id,
          updated_by: actor.id,
        },
        { transaction },
      );

      // Check case status progression
      const caseId = Number(task.get('case_id'));
      await this.updateCaseProgress(caseId, transaction);

      await createActivityLog({
        module: 'offboarding',
        moduleId: caseId,
        action: 'task_received',
        description: `Hardware asset received for task #${task.get('id')} (${task.get('title')})`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(task);
    });
  }

  async bulkReceive(
    items: Array<{
      task_id: number;
      return_condition?: string;
      to_status?: string;
      notes?: string;
    }>,
    actor: UserInfo,
  ) {
    const results: Array<{ task_id: number; success: boolean; error?: string }> = [];

    for (const item of items) {
      try {
        await this.receive(item, actor);
        results.push({ task_id: item.task_id, success: true });
      } catch (err: unknown) {
        results.push({
          task_id: item.task_id,
          success: false,
          error: err instanceof Error ? err.message : 'Failed to receive asset',
        });
      }
    }

    return { results };
  }

  async complete(input: { task_id: number; notes?: string }, actor: UserInfo) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const task = await offboarding_tasks.findByPk(input.task_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task || Number(task.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding task not found.');
      }

      const currentStatus = Number(task.get('task_status'));
      if (
        currentStatus === OFFBOARDING_TASK_STATUS.COMPLETED ||
        currentStatus === OFFBOARDING_TASK_STATUS.CANCELLED
      ) {
        throw new AppError(409, 'Task is already closed.');
      }

      const now = new Date();
      await task.update(
        {
          task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
          outcome_notes: input.notes || null,
          completed_at: now,
          completed_by: actor.id,
          updated_by: actor.id,
        },
        { transaction },
      );

      const caseId = Number(task.get('case_id'));
      await this.updateCaseProgress(caseId, transaction);

      await createActivityLog({
        module: 'offboarding',
        moduleId: caseId,
        action: 'task_completed',
        description: `Offboarding task completed: "${task.get('title')}"`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(task);
    });
  }

  async waive(input: { task_id: number; reason: string }, actor: UserInfo) {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new AppError(422, 'Waiver reason is required with minimum 5 characters.');
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      const task = await offboarding_tasks.findByPk(input.task_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task || Number(task.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding task not found.');
      }

      const currentStatus = Number(task.get('task_status'));
      if (currentStatus === OFFBOARDING_TASK_STATUS.CANCELLED) {
        throw new AppError(409, 'Cancelled task cannot be waived.');
      }

      const now = new Date();
      await task.update(
        {
          task_status: OFFBOARDING_TASK_STATUS.WAIVED,
          waived_by: actor.id,
          waive_reason: input.reason.trim(),
          completed_at: now,
          updated_by: actor.id,
        },
        { transaction },
      );

      const caseId = Number(task.get('case_id'));
      await this.updateCaseProgress(caseId, transaction);

      await createActivityLog({
        module: 'offboarding',
        moduleId: caseId,
        action: 'task_waived',
        description: `Offboarding task waived: "${task.get('title')}" (Reason: ${input.reason.trim()})`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(task);
    });
  }

  async exception(input: { task_id: number; notes: string; to_status?: string }, actor: UserInfo) {
    if (!input.notes || input.notes.trim().length < 5) {
      throw new AppError(422, 'Exception notes are required with minimum 5 characters.');
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      const task = await offboarding_tasks.findByPk(input.task_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!task || Number(task.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding task not found.');
      }

      const taskType = Number(task.get('task_type'));
      const toStatus = input.to_status || 'lost';

      if (taskType === OFFBOARDING_TASK_TYPE.ASSET && task.get('ref_id')) {
        const assignment = await asset_assignments.findByPk(Number(task.get('ref_id')), {
          transaction,
        });
        if (assignment && assignment.get('asset_id')) {
          const assetStatusId = toStatus === 'in_repair' ? 4 : 6; // 4: in_repair, 6: lost
          await assets.update(
            { asset_status: assetStatusId, updated_by: actor.id },
            { where: { id: Number(assignment.get('asset_id')) }, transaction },
          );
        }
      }

      const now = new Date();
      await task.update(
        {
          task_status: OFFBOARDING_TASK_STATUS.EXCEPTION,
          to_status: toStatus,
          outcome_notes: input.notes.trim(),
          completed_at: now,
          completed_by: actor.id,
          updated_by: actor.id,
        },
        { transaction },
      );

      const caseId = Number(task.get('case_id'));
      await this.updateCaseProgress(caseId, transaction);

      await createActivityLog({
        module: 'offboarding',
        moduleId: caseId,
        action: 'task_exception',
        description: `Offboarding task flagged as exception: "${task.get('title')}" (Status: ${toStatus})`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(task);
    });
  }

  async reassign(input: { task_id: number; assigned_to: number }, actor: UserInfo) {
    const task = await offboarding_tasks.findByPk(input.task_id);
    if (!task || Number(task.get('status')) !== 1) {
      throw new AppError(404, 'Task not found.');
    }

    const targetUser = await users.findByPk(input.assigned_to);
    if (!targetUser || Number(targetUser.get('status')) !== 1) {
      throw new AppError(404, 'Assignee user not found or inactive.');
    }

    await task.update({
      assigned_to: input.assigned_to,
      updated_by: actor.id,
    });

    await createActivityLog({
      module: 'offboarding',
      moduleId: Number(task.get('case_id')),
      action: 'task_reassigned',
      description: `Task "${task.get('title')}" reassigned to ${targetUser.get('first_name')} ${targetUser.get('last_name') || ''}`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name || ''}`,
    });

    return plain(task);
  }

  async add(
    input: {
      case_id: number;
      title: string;
      is_mandatory?: boolean;
      due_date?: string;
      assigned_to?: number;
    },
    actor: UserInfo,
  ) {
    if (!input.title || input.title.trim().length === 0) {
      throw new AppError(422, 'Task title is required.');
    }

    const c = await offboarding_cases.findByPk(input.case_id);
    if (!c || Number(c.get('status')) !== 1) {
      throw new AppError(404, 'Offboarding case not found.');
    }

    const dueDate = input.due_date || String(c.get('last_working_date'));
    const assignee = input.assigned_to || c.get('handover_to') || actor.id;

    const task = await offboarding_tasks.create({
      case_id: input.case_id,
      task_type: OFFBOARDING_TASK_TYPE.CHECKLIST,
      ref_id: null,
      ref_label: 'Ad hoc item',
      title: input.title.trim(),
      assigned_to: assignee,
      task_status: OFFBOARDING_TASK_STATUS.PENDING,
      is_mandatory: input.is_mandatory !== false ? 1 : 0,
      due_date: dueDate,
      status: 1,
      created_by: actor.id,
      updated_by: actor.id,
    });

    return plain(task);
  }

  async scan(asset_tag: string) {
    if (!asset_tag || asset_tag.trim().length === 0) {
      throw new AppError(422, 'Asset tag is required.');
    }

    const asset = await assets.findOne({
      where: { asset_tag: asset_tag.trim(), status: 1 },
    });

    if (!asset) {
      throw new AppError(404, `No asset found with tag "${asset_tag}".`);
    }

    const assignment = await asset_assignments.findOne({
      where: { asset_id: Number(asset.get('id')), returned_at: null, status: 1 },
    });

    if (!assignment) {
      throw new AppError(404, `Asset ${asset_tag} has no open assignment.`);
    }

    const task = await offboarding_tasks.findOne({
      where: {
        task_type: OFFBOARDING_TASK_TYPE.ASSET,
        ref_id: Number(assignment.get('id')),
        task_status: {
          [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
        },
        status: 1,
      },
      include: [
        {
          model: offboarding_cases,
          as: 'case',
          include: [
            {
              model: employees,
              as: 'employee',
              attributes: ['id', 'first_name', 'last_name', 'employee_code', 'email'],
            },
          ],
        },
      ],
    });

    if (!task) {
      throw new AppError(
        404,
        `No open offboarding return task found for asset tag "${asset_tag}".`,
      );
    }

    return {
      task: plain(task),
      asset: plain(asset),
    };
  }

  private async updateCaseProgress(caseId: number, transaction: Transaction) {
    const c = await offboarding_cases.findByPk(caseId, {
      transaction,
      lock: transaction.LOCK.UPDATE,
    });
    if (!c) return;

    const currentCaseStatus = Number(c.get('case_status'));

    // Move to IN_PROGRESS on first task touch
    if (currentCaseStatus === OFFBOARDING_CASE_STATUS.OPEN) {
      await c.update({ case_status: OFFBOARDING_CASE_STATUS.IN_PROGRESS }, { transaction });
    }

    // Check if all mandatory tasks are completed or waived
    const allTasks = await offboarding_tasks.findAll({
      where: { case_id: caseId, status: 1 },
      transaction,
    });

    const mandatoryTasks = allTasks.filter((t) => Number(t.get('is_mandatory')) === 1);
    const allMandatoryDone = mandatoryTasks.every((t) => {
      const s = Number(t.get('task_status'));
      return s === OFFBOARDING_TASK_STATUS.COMPLETED || s === OFFBOARDING_TASK_STATUS.WAIVED;
    });

    const lwd = new Date(String(c.get('last_working_date')));
    const now = new Date();
    const isLwdPassed = now >= lwd;

    if (
      allMandatoryDone &&
      isLwdPassed &&
      (currentCaseStatus === OFFBOARDING_CASE_STATUS.OPEN ||
        currentCaseStatus === OFFBOARDING_CASE_STATUS.IN_PROGRESS)
    ) {
      await c.update({ case_status: OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE }, { transaction });
    }
  }
}
