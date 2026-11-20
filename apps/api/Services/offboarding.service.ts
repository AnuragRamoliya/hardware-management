import { Op, type Transaction } from 'sequelize';
import {
  EMPLOYMENT_STATUS,
  OFFBOARDING_CASE_STATUS,
  OFFBOARDING_TASK_TYPE,
  OFFBOARDING_TASK_STATUS,
  TASK_PRIORITY,
  REQUEST_STATUS,
  NUMERIC_TO_CASE_STATUS,
  STATUS,
  ASSET_STATUS,
} from '@hm/shared';
import { AppError } from '../Config/app_error';
import {
  sequelize,
  offboarding_cases,
  offboarding_tasks,
  offboarding_checklist_templates,
  employees,
  users,
  roles,
  departments,
  designations,
  locations,
  assets,
  asset_assignments,
  software,
  software_assignments,
  credentials,
  credential_types,
  requests,
  user_tokens,
  app_settings,
  activity_logs,
  notifications,
} from '../Database/Schema';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { UserInfo } from '../Types/api';
import { RequestWorkflowService } from './request_workflow.service';
import { ClearancePdfService, type PdfCaseRecord } from './clearance_pdf.service';

const plain = (model: import('sequelize').Model) =>
  model.get({ plain: true }) as Record<string, unknown>;

export interface InitiateInput {
  employee_id: number;
  exit_type: number;
  resignation_date: string;
  last_working_date: string;
  reason: string;
  handover_to?: number;
  notes?: string;
  checklist_template_ids?: number[];
}

export interface CaseListFilters {
  case_status?: number | number[];
  employee_id?: number | number[];
  department_id?: number | number[];
  handover_to?: number | number[];
  exit_type?: number | number[];
  start_date?: string;
  end_date?: string;
  overdue?: boolean | string;
  pending_tasks?: boolean | string;
  search?: string;
}

export class OffboardingService {
  private requestWorkflow = new RequestWorkflowService();
  private pdfService = new ClearancePdfService();

  async preview(employee_id: number) {
    const emp = await employees.findByPk(employee_id, {
      include: [
        { model: departments, as: 'department', attributes: ['name'] },
        { model: designations, as: 'designation', attributes: ['name'] },
        { model: employees, as: 'manager', attributes: ['first_name', 'last_name'] },
      ],
    });

    if (!emp || Number(emp.get('status')) !== 1) {
      throw new AppError(404, 'Employee not found.');
    }

    const assignedAssets = await asset_assignments.findAll({
      where: { employee_id, returned_at: null, status: 1 },
      include: [{ model: assets, as: 'asset' }],
    });

    const assignedSoftware = await software_assignments.findAll({
      where: { employee_id, revoked_at: null, status: 1 },
      include: [{ model: software, as: 'software' }],
    });

    const activeCredentials = await credentials.findAll({
      where: { employee_id, status: 1 },
      include: [{ model: credential_types, as: 'credential_type' }],
    });

    const openRequests = await requests.findAll({
      where: {
        employee_id,
        request_status: { [Op.in]: [1, 2, 3, 4, 9] }, // Active open statuses
        status: 1,
      },
    });

    const checklistTemplates = await offboarding_checklist_templates.findAll({
      where: { status: 1, is_active: 1 },
      order: [['sort_order', 'ASC']],
    });

    const handoverUser = await this.selectHandoverUser();
    const strategySetting = await app_settings.findOne({
      where: { key: 'offboarding_handover_strategy', status: 1 },
    });
    const strategy = strategySetting ? String(strategySetting.get('value')) : 'least_loaded';

    const empData = plain(emp);
    const totalTasks =
      assignedAssets.length +
      assignedSoftware.length +
      activeCredentials.length +
      openRequests.length +
      checklistTemplates.length;

    return {
      employee: {
        id: Number(empData.id),
        employee_code: String(empData.employee_code || ''),
        first_name: String(empData.first_name || ''),
        last_name: String(empData.last_name || ''),
        email: String(empData.email || ''),
        employment_status: Number(empData.employment_status || 1),
        department: (empData.department as Record<string, unknown> | undefined)?.name as
          string | undefined,
        designation: (empData.designation as Record<string, unknown> | undefined)?.name as
          string | undefined,
        manager: (empData.manager as Record<string, unknown> | undefined)
          ? `${(empData.manager as Record<string, unknown>).first_name} ${(empData.manager as Record<string, unknown>).last_name || ''}`
          : undefined,
      },
      proposed_handover_to: handoverUser
        ? {
            id: Number(handoverUser.get('id')),
            first_name: String(handoverUser.get('first_name')),
            last_name: String(handoverUser.get('last_name') || ''),
            email: String(handoverUser.get('email')),
          }
        : null,
      handover_strategy: strategy,
      counts: {
        assets: assignedAssets.length,
        software: assignedSoftware.length,
        credentials: activeCredentials.length,
        open_requests: openRequests.length,
        checklist_templates: checklistTemplates.length,
        total_tasks: totalTasks,
      },
      items: {
        assets: assignedAssets.map((a) => {
          const ast = (a as unknown as { asset?: Record<string, unknown> }).asset;
          return {
            id: Number(a.get('id')),
            asset_tag: String(ast?.asset_tag || '—'),
            name: String(ast?.name || ast?.model || 'Hardware Asset'),
            serial_number: String(ast?.serial_no || '—'),
          };
        }),
        software: assignedSoftware.map((s) => {
          const sw = (s as unknown as { software?: Record<string, unknown> }).software;
          return {
            id: Number(s.get('id')),
            software_name: String(sw?.name || 'Software License'),
          };
        }),
        credentials: activeCredentials.map((c) => {
          const ct = (c as unknown as { credential_type?: Record<string, unknown> })
            .credential_type;
          return {
            id: Number(c.get('id')),
            account_identifier: String(c.get('account_identifier') || c.get('username') || '—'),
            credential_type: String(ct?.name || 'Account'),
          };
        }),
        requests: openRequests.map((r) => ({
          id: Number(r.get('id')),
          request_no: String(r.get('request_no')),
          title: String(r.get('title')),
          request_type: Number(r.get('request_type')),
        })),
        checklist: checklistTemplates.map((t) => ({
          id: Number(t.get('id')),
          title: String(t.get('title')),
          is_mandatory: Number(t.get('is_mandatory')) === 1,
        })),
      },
    };
  }

  async initiate(input: InitiateInput, actor: UserInfo) {
    if (!input.employee_id) throw new AppError(422, 'Employee ID is required.');
    if (!input.exit_type) throw new AppError(422, 'Exit type is required.');
    if (!input.resignation_date) throw new AppError(422, 'Resignation date is required.');
    if (!input.last_working_date) throw new AppError(422, 'Last working date is required.');
    if (!input.reason || input.reason.trim().length === 0)
      throw new AppError(422, 'Reason is required.');

    if (new Date(input.last_working_date) < new Date(input.resignation_date)) {
      throw new AppError(422, 'Last working date cannot be earlier than resignation date.');
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      // 1. Lock employee row
      const emp = await employees.findByPk(input.employee_id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!emp || Number(emp.get('status')) !== 1) {
        throw new AppError(404, 'Employee not found or inactive.');
      }

      if (Number(emp.get('employment_status')) === EMPLOYMENT_STATUS.EXITED) {
        throw new AppError(422, 'Employee has already exited the company.');
      }

      // Check existing open case
      const existingCase = await offboarding_cases.findOne({
        where: {
          employee_id: input.employee_id,
          case_status: {
            [Op.in]: [
              OFFBOARDING_CASE_STATUS.OPEN,
              OFFBOARDING_CASE_STATUS.IN_PROGRESS,
              OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
            ],
          },
          status: 1,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (existingCase) {
        throw new AppError(
          409,
          `Employee already has an active offboarding case (#${existingCase.get('case_no')}).`,
        );
      }

      // Determine handover owner
      let handoverUserId: number | null = null;
      if (input.handover_to) {
        const u = await users.findByPk(input.handover_to, { transaction });
        if (!u || Number(u.get('status')) !== 1) {
          throw new AppError(422, 'Selected handover owner is not valid or inactive.');
        }
        handoverUserId = Number(u.get('id'));
      } else {
        const chosen = await this.selectHandoverUser(transaction);
        handoverUserId = chosen ? Number(chosen.get('id')) : actor.id;
      }

      // 2. Set employee employment_status: if last_working_date < todayStr -> RESIGNED else NOTICE
      const tzSetting = await app_settings.findOne({
        where: { key: { [Op.in]: ['app.timezone', 'system.timezone', 'app_timezone'] }, status: 1 },
        transaction,
      });
      const tz = (tzSetting?.get('value') as string) || process.env.APP_TIMEZONE || 'Asia/Kolkata';
      const todayStr = new Intl.DateTimeFormat('en-CA', { timeZone: tz }).format(new Date());
      const newStatus =
        input.last_working_date < todayStr ? EMPLOYMENT_STATUS.RESIGNED : EMPLOYMENT_STATUS.NOTICE;

      await emp.update(
        {
          employment_status: newStatus,
          last_working_date: input.last_working_date,
          updated_by: actor.id,
        },
        { transaction },
      );

      // 3. Create case record with safe sequence
      const [[maxCase]] = await sequelize.query('SELECT MAX(id) as max_id FROM offboarding_cases', {
        transaction,
      });
      const nextId = (Number((maxCase as unknown as { max_id?: number })?.max_id) || 0) + 1;
      const caseNo = `OFF-${String(nextId).padStart(6, '0')}`;

      const createdCase = await offboarding_cases.create(
        {
          case_no: caseNo,
          employee_id: input.employee_id,
          exit_type: input.exit_type,
          resignation_date: input.resignation_date,
          last_working_date: input.last_working_date,
          reason: input.reason.trim(),
          initiated_by: actor.id,
          handover_to: handoverUserId,
          manager_id: emp.get('manager_id') || null,
          case_status: OFFBOARDING_CASE_STATUS.OPEN,
          notes: input.notes ? input.notes.trim() : null,
          status: 1,
          created_by: actor.id,
          updated_by: actor.id,
        },
        { transaction },
      );

      const caseId = Number(createdCase.get('id'));

      // 4. Build Tasks
      // Assets
      const assignedAssets = await asset_assignments.findAll({
        where: { employee_id: input.employee_id, returned_at: null, status: 1 },
        include: [{ model: assets, as: 'asset' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const assignment of assignedAssets) {
        const ast = (
          assignment as unknown as {
            asset?: import('sequelize').Model & {
              asset_tag?: string;
              model?: string;
              name?: string;
            };
          }
        ).asset;
        const assetTag = String(ast?.asset_tag || `AST-${assignment.get('asset_id')}`);
        const modelName = ast?.model || ast?.name || 'Hardware Asset';

        await offboarding_tasks.create(
          {
            case_id: caseId,
            task_type: OFFBOARDING_TASK_TYPE.ASSET,
            ref_id: Number(assignment.get('id')),
            ref_label: `${assetTag} · ${modelName}`,
            title: `Return Hardware: ${assetTag}`,
            assigned_to: handoverUserId,
            task_status: OFFBOARDING_TASK_STATUS.PENDING,
            priority: TASK_PRIORITY.HIGH,
            is_mandatory: 1,
            due_date: input.last_working_date,
            status: 1,
            created_by: actor.id,
            updated_by: actor.id,
          },
          { transaction },
        );

        // Update asset status to pending_return (3) and assignment due_return_date to LWD
        if (ast) {
          await ast.update(
            { asset_status: ASSET_STATUS.PENDING_RETURN, updated_by: actor.id },
            { transaction },
          );
        }
        await assignment.update(
          { due_return_date: input.last_working_date, updated_by: actor.id },
          { transaction },
        );
      }

      // Software
      const assignedSoftware = await software_assignments.findAll({
        where: { employee_id: input.employee_id, revoked_at: null, status: 1 },
        include: [{ model: software, as: 'software' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const swAssign of assignedSoftware) {
        const sw = (
          swAssign as unknown as { software?: import('sequelize').Model & { name?: string } }
        ).software;
        const swName = String(sw?.name || 'Software License');

        await offboarding_tasks.create(
          {
            case_id: caseId,
            task_type: OFFBOARDING_TASK_TYPE.SOFTWARE,
            ref_id: Number(swAssign.get('id')),
            ref_label: swName,
            title: `Revoke License: ${swName}`,
            assigned_to: handoverUserId,
            task_status: OFFBOARDING_TASK_STATUS.PENDING,
            is_mandatory: 1,
            due_date: input.last_working_date,
            status: 1,
            created_by: actor.id,
            updated_by: actor.id,
          },
          { transaction },
        );
      }

      // Credentials
      const activeCreds = await credentials.findAll({
        where: { employee_id: input.employee_id, status: 1 },
        include: [{ model: credential_types, as: 'credential_type' }],
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const cred of activeCreds) {
        const ct = (
          cred as unknown as { credential_type?: import('sequelize').Model & { name?: string } }
        ).credential_type;
        const ident = String(
          cred.get('account_identifier') || cred.get('username') || ct?.name || 'Account',
        );

        await offboarding_tasks.create(
          {
            case_id: caseId,
            task_type: OFFBOARDING_TASK_TYPE.CREDENTIAL,
            ref_id: Number(cred.get('id')),
            ref_label: `${ident} (${ct?.name || 'Credential'})`,
            title: `Disable Credential: ${ident}`,
            assigned_to: handoverUserId,
            task_status: OFFBOARDING_TASK_STATUS.PENDING,
            is_mandatory: 1,
            due_date: input.last_working_date,
            status: 1,
            created_by: actor.id,
            updated_by: actor.id,
          },
          { transaction },
        );
      }

      // Open requests: Cancel via RequestWorkflowService with reason "Employee offboarding"
      const openReqs = await requests.findAll({
        where: {
          employee_id: input.employee_id,
          request_status: { [Op.in]: [1, 2, 3, 4, 9] },
          status: 1,
        },
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      for (const req of openReqs) {
        await this.requestWorkflow.transition({
          requestId: Number(req.get('id')),
          toStatus: REQUEST_STATUS.CANCELLED,
          actor,
          cancelledReason: 'Employee offboarding',
          externalTransaction: transaction,
        });

        await offboarding_tasks.create(
          {
            case_id: caseId,
            task_type: OFFBOARDING_TASK_TYPE.REQUEST,
            ref_id: Number(req.get('id')),
            ref_label: String(req.get('request_no')),
            title: `Auto-Cancelled Request #${req.get('request_no')}`,
            assigned_to: handoverUserId,
            task_status: OFFBOARDING_TASK_STATUS.COMPLETED,
            is_mandatory: 0,
            due_date: input.last_working_date,
            completed_at: new Date(),
            completed_by: actor.id,
            outcome_notes: 'Automatically cancelled on offboarding initiation',
            status: 1,
            created_by: actor.id,
            updated_by: actor.id,
          },
          { transaction },
        );
      }

      // Checklist templates
      const templateWhere: Record<string, unknown> = { status: 1, is_active: 1 };
      if (input.checklist_template_ids && input.checklist_template_ids.length > 0) {
        templateWhere.id = { [Op.in]: input.checklist_template_ids };
      }

      const templates = await offboarding_checklist_templates.findAll({
        where: templateWhere,
        order: [['sort_order', 'ASC']],
        transaction,
      });

      for (const tpl of templates) {
        await offboarding_tasks.create(
          {
            case_id: caseId,
            task_type: OFFBOARDING_TASK_TYPE.CHECKLIST,
            ref_id: Number(tpl.get('id')),
            ref_label: 'Template Item',
            title: String(tpl.get('title')),
            assigned_to: handoverUserId,
            task_status: OFFBOARDING_TASK_STATUS.PENDING,
            is_mandatory: Number(tpl.get('is_mandatory')) === 1 ? 1 : 0,
            due_date: input.last_working_date,
            status: 1,
            created_by: actor.id,
            updated_by: actor.id,
          },
          { transaction },
        );
      }

      // 5. Activity log + Notifications
      await createActivityLog({
        module: 'offboarding',
        moduleId: caseId,
        action: 'initiated',
        description: `Offboarding initiated for ${emp.get('first_name')} ${emp.get('last_name') || ''} (LWD: ${input.last_working_date})`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      // Employee notification
      const empUserId = emp.get('user_id');
      if (empUserId) {
        await notifications.create(
          {
            recipient_user_id: Number(empUserId),
            kind: 'offboarding_initiated',
            record_type: 'offboarding_case',
            record_id: caseId,
            title: 'Offboarding Process Initiated',
            message: `Your offboarding has been scheduled. Your Last Working Day is ${input.last_working_date}. Please review required handovers.`,
            status: 1,
          },
          { transaction },
        );
      }

      // Handover user notification
      if (handoverUserId) {
        await notifications.create(
          {
            recipient_user_id: handoverUserId,
            kind: 'offboarding_handover_assigned',
            record_type: 'offboarding_case',
            record_id: caseId,
            title: `New Offboarding Handover Case: #${caseNo}`,
            message: `You have been assigned as the hardware handover owner for ${emp.get('first_name')} ${emp.get('last_name') || ''}.`,
            status: 1,
          },
          { transaction },
        );
      }

      return plain(createdCase);
    });
  }

  async list(
    filters: CaseListFilters,
    pagination: { currentPage?: number; itemsPerPage?: number },
  ) {
    const where: Record<string | symbol, unknown> = { status: 1 };
    const empWhere: Record<string | symbol, unknown> = { status: 1 };

    if (filters.case_status) {
      const normalizeStatus = (val: unknown) =>
        typeof val === 'number' && val in NUMERIC_TO_CASE_STATUS
          ? NUMERIC_TO_CASE_STATUS[val as keyof typeof NUMERIC_TO_CASE_STATUS]
          : String(val);

      where.case_status = Array.isArray(filters.case_status)
        ? { [Op.in]: filters.case_status.map(normalizeStatus) }
        : normalizeStatus(filters.case_status);
    }

    if (filters.employee_id) {
      where.employee_id = Array.isArray(filters.employee_id)
        ? { [Op.in]: filters.employee_id.map(Number) }
        : Number(filters.employee_id);
    }

    if (filters.handover_to) {
      where.handover_to = Array.isArray(filters.handover_to)
        ? { [Op.in]: filters.handover_to.map(Number) }
        : Number(filters.handover_to);
    }

    if (filters.exit_type) {
      where.exit_type = Array.isArray(filters.exit_type)
        ? { [Op.in]: filters.exit_type.map(Number) }
        : Number(filters.exit_type);
    }

    if (filters.department_id) {
      empWhere.department_id = Array.isArray(filters.department_id)
        ? { [Op.in]: filters.department_id.map(Number) }
        : Number(filters.department_id);
    }

    if (filters.start_date && filters.end_date) {
      where.last_working_date = { [Op.between]: [filters.start_date, filters.end_date] };
    } else if (filters.start_date) {
      where.last_working_date = { [Op.gte]: filters.start_date };
    } else if (filters.end_date) {
      where.last_working_date = { [Op.lte]: filters.end_date };
    }

    const today = new Date().toISOString().split('T')[0];
    if (filters.overdue === true || filters.overdue === 'true') {
      where.last_working_date = { [Op.lt]: today };
      where.case_status = {
        [Op.in]: [OFFBOARDING_CASE_STATUS.OPEN, OFFBOARDING_CASE_STATUS.IN_PROGRESS],
      };
    }

    if (filters.search && filters.search.trim()) {
      const term = `%${filters.search.trim()}%`;
      empWhere[Op.or] = [
        { first_name: { [Op.like]: term } },
        { last_name: { [Op.like]: term } },
        { employee_code: { [Op.like]: term } },
        { email: { [Op.like]: term } },
      ];
    }

    const { limit, offset } = getPagination(pagination);

    const allowedCaseColumns = {
      id: 'id',
      case_no: 'case_no',
      employee_id: 'employee_id',
      employee: 'employee_id',
      case_status: 'case_status',
      exit_type: 'exit_type',
      resignation_date: 'resignation_date',
      last_working_date: 'last_working_date',
      handover_to: 'handover_to',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(pagination, allowedCaseColumns, [
      ['last_working_date', 'ASC'],
      ['id', 'DESC'],
    ]);

    const { rows, count } = await offboarding_cases.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: employees,
          as: 'employee',
          where: empWhere,
          include: [
            { model: departments, as: 'department', attributes: ['id', 'name'] },
            { model: designations, as: 'designation', attributes: ['id', 'name'] },
            { model: locations, as: 'location', attributes: ['id', 'name'] },
            { model: employees, as: 'manager', attributes: ['id', 'first_name', 'last_name'] },
          ],
        },
        {
          model: users,
          as: 'handover_user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'initiator',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: offboarding_tasks,
          as: 'tasks',
          attributes: ['id', 'task_type', 'task_status', 'is_mandatory'],
        },
      ],
    });

    const listWithProgress = rows.map((r) => {
      const item = plain(r);
      const taskList = (item.tasks as Array<Record<string, unknown>>) || [];
      const total = taskList.length;
      const completed = taskList.filter(
        (t) => t.task_status === OFFBOARDING_TASK_STATUS.COMPLETED,
      ).length;
      const waived = taskList.filter(
        (t) => t.task_status === OFFBOARDING_TASK_STATUS.WAIVED,
      ).length;
      const exceptions = taskList.filter(
        (t) => t.task_status === OFFBOARDING_TASK_STATUS.EXCEPTION,
      ).length;
      const pending = taskList.filter(
        (t) =>
          t.task_status === OFFBOARDING_TASK_STATUS.PENDING ||
          t.task_status === OFFBOARDING_TASK_STATUS.IN_PROGRESS,
      ).length;

      const progress = {
        total,
        completed,
        waived,
        exceptions,
        pending,
        percent: total > 0 ? Math.round(((completed + waived) / total) * 100) : 100,
      };

      return { ...item, progress };
    });

    return {
      list: listWithProgress,
      pagination: {
        totalItems: count,
        currentPage: pagination.currentPage ? Number(pagination.currentPage) : 1,
        itemsPerPage: limit,
        totalPages: Math.ceil(count / limit),
      },
    };
  }

  async get(id: number) {
    const c = await offboarding_cases.findByPk(id, {
      include: [
        {
          model: employees,
          as: 'employee',
          include: [
            { model: departments, as: 'department', attributes: ['id', 'name'] },
            { model: designations, as: 'designation', attributes: ['id', 'name'] },
            { model: locations, as: 'location', attributes: ['id', 'name'] },
            { model: employees, as: 'manager', attributes: ['id', 'first_name', 'last_name'] },
          ],
        },
        {
          model: users,
          as: 'handover_user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'initiator',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: offboarding_tasks,
          as: 'tasks',
          include: [
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
            { model: users, as: 'waiver', attributes: ['id', 'first_name', 'last_name', 'email'] },
          ],
        },
      ],
    });

    if (!c || Number(c.get('status')) !== 1) {
      throw new AppError(404, 'Offboarding case not found.');
    }

    const item = plain(c);
    const taskList = (item.tasks as Array<Record<string, unknown>>) || [];
    const total = taskList.length;
    const completed = taskList.filter(
      (t) => t.task_status === OFFBOARDING_TASK_STATUS.COMPLETED,
    ).length;
    const waived = taskList.filter((t) => t.task_status === OFFBOARDING_TASK_STATUS.WAIVED).length;
    const exceptions = taskList.filter(
      (t) => t.task_status === OFFBOARDING_TASK_STATUS.EXCEPTION,
    ).length;
    const pending = taskList.filter(
      (t) =>
        t.task_status === OFFBOARDING_TASK_STATUS.PENDING ||
        t.task_status === OFFBOARDING_TASK_STATUS.IN_PROGRESS,
    ).length;

    const progress = {
      total,
      completed,
      waived,
      exceptions,
      pending,
      percent: total > 0 ? Math.round(((completed + waived) / total) * 100) : 100,
    };

    // Timeline activity
    const activity = await activity_logs.findAll({
      where: { module: 'offboarding', module_id: id },
      order: [['createdAt', 'DESC']],
      limit: 50,
    });

    return {
      ...item,
      progress,
      activity: activity.map(plain),
    };
  }

  async update(
    input: {
      id: number;
      last_working_date?: string;
      handover_to?: number;
      notes?: string;
      reason?: string;
    },
    actor: UserInfo,
  ) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const c = await offboarding_cases.findByPk(input.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!c || Number(c.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding case not found.');
      }

      const caseStatus = String(c.get('case_status'));
      if (
        caseStatus === OFFBOARDING_CASE_STATUS.COMPLETED ||
        caseStatus === OFFBOARDING_CASE_STATUS.CANCELLED
      ) {
        throw new AppError(422, 'Completed or cancelled cases cannot be modified.');
      }

      const updates: Record<string, unknown> = { updated_by: actor.id };
      let extendedLwd = false;

      if (
        input.last_working_date &&
        input.last_working_date !== String(c.get('last_working_date'))
      ) {
        updates.last_working_date = input.last_working_date;
        extendedLwd = true;

        // Update employee LWD
        await employees.update(
          { last_working_date: input.last_working_date, updated_by: actor.id },
          { where: { id: Number(c.get('employee_id')) }, transaction },
        );

        // Update open tasks due_date
        await offboarding_tasks.update(
          { due_date: input.last_working_date, updated_by: actor.id },
          {
            where: {
              case_id: input.id,
              task_status: {
                [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
              },
            },
            transaction,
          },
        );

        // Update active asset assignments return_due_date
        await asset_assignments.update(
          { due_return_date: input.last_working_date, updated_by: actor.id },
          { where: { employee_id: Number(c.get('employee_id')), returned_at: null }, transaction },
        );
      }

      if (input.handover_to && input.handover_to !== Number(c.get('handover_to'))) {
        const u = await users.findByPk(input.handover_to, { transaction });
        if (!u || Number(u.get('status')) !== 1) {
          throw new AppError(422, 'Target handover user is invalid or inactive.');
        }
        updates.handover_to = input.handover_to;

        // Reassign pending hardware & checklist tasks
        await offboarding_tasks.update(
          { assigned_to: input.handover_to, updated_by: actor.id },
          {
            where: {
              case_id: input.id,
              task_type: {
                [Op.in]: [OFFBOARDING_TASK_TYPE.ASSET, OFFBOARDING_TASK_TYPE.CHECKLIST],
              },
              task_status: {
                [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
              },
            },
            transaction,
          },
        );
      }

      if (input.notes !== undefined) updates.notes = input.notes;

      await c.update(updates, { transaction });

      await createActivityLog({
        module: 'offboarding',
        moduleId: input.id,
        action: 'case_updated',
        description: extendedLwd
          ? `Last working date extended to ${input.last_working_date} (Reason: ${input.reason || 'Not specified'})`
          : 'Offboarding case parameters updated',
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(c);
    });
  }

  async cancel(input: { id: number; reason: string }, actor: UserInfo) {
    if (!input.reason || input.reason.trim().length < 5) {
      throw new AppError(422, 'Withdrawal reason is required with minimum 5 characters.');
    }

    return sequelize.transaction(async (transaction: Transaction) => {
      const c = await offboarding_cases.findByPk(input.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
      });

      if (!c || Number(c.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding case not found.');
      }

      if (String(c.get('case_status')) === OFFBOARDING_CASE_STATUS.COMPLETED) {
        throw new AppError(
          422,
          'Cannot withdraw an offboarding case that has already completed clearance.',
        );
      }

      const empId = Number(c.get('employee_id'));

      // 1. Employee reverts to ACTIVE (1)
      await employees.update(
        {
          employment_status: EMPLOYMENT_STATUS.ACTIVE,
          last_working_date: null,
          updated_by: actor.id,
        },
        { where: { id: empId }, transaction },
      );

      // 2. Pending/in_progress tasks become CANCELLED (6)
      await offboarding_tasks.update(
        {
          task_status: OFFBOARDING_TASK_STATUS.CANCELLED,
          outcome_notes: `Withdrawn: ${input.reason.trim()}`,
          updated_by: actor.id,
        },
        {
          where: {
            case_id: input.id,
            task_status: {
              [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
            },
          },
          transaction,
        },
      );

      // 3. Hardware assets revert from pending_return (3) back to assigned (2)
      const openAssignments = await asset_assignments.findAll({
        where: { employee_id: empId, returned_at: null, status: 1 },
        transaction,
      });

      for (const assign of openAssignments) {
        await assets.update(
          { asset_status: ASSET_STATUS.ASSIGNED, updated_by: actor.id },
          {
            where: {
              id: Number(assign.get('asset_id')),
              asset_status: ASSET_STATUS.PENDING_RETURN,
            },
            transaction,
          },
        );
        await assign.update({ due_return_date: null, updated_by: actor.id }, { transaction });
      }

      // 4. Update case status to CANCELLED (5)
      await c.update(
        {
          case_status: OFFBOARDING_CASE_STATUS.CANCELLED,
          notes: c.get('notes')
            ? `${c.get('notes')}\nWithdrawal Reason: ${input.reason.trim()}`
            : `Withdrawal Reason: ${input.reason.trim()}`,
          updated_by: actor.id,
        },
        { transaction },
      );

      await createActivityLog({
        module: 'offboarding',
        moduleId: input.id,
        action: 'case_withdrawn',
        description: `Offboarding case withdrawn: "${input.reason.trim()}"`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(c);
    });
  }

  async complete(input: { id: number; clearance_notes?: string; now?: Date }, actor: UserInfo) {
    return sequelize.transaction(async (transaction: Transaction) => {
      const c = await offboarding_cases.findByPk(input.id, {
        transaction,
        lock: transaction.LOCK.UPDATE,
        include: [
          {
            model: employees,
            as: 'employee',
            include: [
              { model: departments, as: 'department' },
              { model: designations, as: 'designation' },
            ],
          },
          { model: offboarding_tasks, as: 'tasks' },
        ],
      });

      if (!c || Number(c.get('status')) !== 1) {
        throw new AppError(404, 'Offboarding case not found.');
      }

      const caseStatus = String(c.get('case_status'));
      if (caseStatus === OFFBOARDING_CASE_STATUS.COMPLETED) {
        throw new AppError(409, 'Clearance certificate has already been issued for this case.');
      }

      // Check all mandatory tasks
      const taskList = (c as unknown as { tasks?: Array<Record<string, unknown>> }).tasks || [];
      const unfulfilledMandatory = taskList.filter((t) => {
        const isMandatory = Number(t.is_mandatory) === 1;
        const s = String(t.task_status);
        return (
          isMandatory &&
          s !== OFFBOARDING_TASK_STATUS.COMPLETED &&
          s !== OFFBOARDING_TASK_STATUS.WAIVED
        );
      });

      if (unfulfilledMandatory.length > 0) {
        const titles = unfulfilledMandatory.map((t) => `"${t.title}"`).join(', ');
        throw new AppError(
          422,
          `Cannot issue clearance: ${unfulfilledMandatory.length} mandatory task(s) are still unresolved: ${titles}. Every mandatory item must be completed or formally waived.`,
        );
      }

      // Check LWD has passed
      const now = input.now || new Date();
      const lwd = new Date(String(c.get('last_working_date')));
      // Allow completion on or after last working day
      if (now < new Date(lwd.getFullYear(), lwd.getMonth(), lwd.getDate())) {
        throw new AppError(
          422,
          `Cannot issue clearance before the Last Working Day (${c.get('last_working_date')}).`,
        );
      }

      // Fetch company settings for PDF
      const settingsList = await app_settings.findAll({ transaction });
      const settingsMap: Record<string, string> = {};
      for (const s of settingsList) {
        settingsMap[String(s.get('key'))] = String(s.get('value') ?? '');
      }

      // Generate clearance number
      const clearanceNumber = `CLR-${c.get('case_no')}`;

      // Generate clearance and handover receipt PDFs
      const clearanceResult = await this.pdfService.generateClearancePdf(
        {
          ...plain(c),
          clearance_number: clearanceNumber,
          clearance_issued_at: now,
        } as unknown as PdfCaseRecord,
        settingsMap,
      );

      const assetTasks = taskList.filter((t) => t.task_type === OFFBOARDING_TASK_TYPE.ASSET);
      const handoverUser = c.get('handover_to')
        ? await users.findByPk(Number(c.get('handover_to')), { transaction })
        : null;
      const handoverReceiptResult = await this.pdfService.generateHandoverReceiptPdf(
        plain(c) as unknown as PdfCaseRecord,
        assetTasks,
        handoverUser ? plain(handoverUser) : null,
        settingsMap,
      );

      // Update case
      await c.update(
        {
          case_status: OFFBOARDING_CASE_STATUS.COMPLETED,
          completed_at: now,
          clearance_number: clearanceNumber,
          clearance_issued_at: now,
          clearance_file_path: clearanceResult.filePath,
          handover_receipt_file_path: handoverReceiptResult.filePath,
          verification_code: clearanceResult.verificationCode,
          verification_hash: clearanceResult.hash,
          notes: input.clearance_notes ? input.clearance_notes.trim() : c.get('notes'),
          updated_by: actor.id,
        },
        { transaction },
      );

      // Update employee to EXITED (4)
      const empId = Number(c.get('employee_id'));
      const emp = await employees.findByPk(empId, { transaction });
      if (emp) {
        await emp.update(
          { employment_status: EMPLOYMENT_STATUS.EXITED, updated_by: actor.id },
          { transaction },
        );

        // Deactivate user login & revoke tokens
        const userId = emp.get('user_id');
        if (userId) {
          await users.update(
            { status: STATUS.INACTIVE, updated_by: actor.id },
            { where: { id: Number(userId) }, transaction },
          );
          await user_tokens.update(
            { is_revoked: 1 },
            { where: { user_id: Number(userId) }, transaction },
          );
        }
      }

      await createActivityLog({
        module: 'offboarding',
        moduleId: input.id,
        action: 'clearance_issued',
        description: `Clearance certificate #${clearanceNumber} issued. Employee marked EXITED.`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name || ''}`,
        transaction,
      });

      return plain(c);
    });
  }

  async issueClearance(
    id: number,
    actor: UserInfo,
    options?: { clearance_notes?: string; now?: Date },
  ) {
    return this.complete(
      { id, clearance_notes: options?.clearance_notes, now: options?.now },
      actor,
    );
  }

  async getClearancePdf(id: number, actor: UserInfo) {
    if (!actor) {
      throw new AppError(401, 'Unauthorized');
    }
    const c = await offboarding_cases.findByPk(id);
    if (!c || Number(c.get('status')) !== 1) {
      throw new AppError(404, 'Case not found.');
    }

    if (!c.get('clearance_file_path')) {
      throw new AppError(404, 'Clearance certificate has not been generated for this case.');
    }

    return String(c.get('clearance_file_path'));
  }

  async getHandoverReceiptPdf(id: number, actor: UserInfo) {
    if (!actor) {
      throw new AppError(401, 'Unauthorized');
    }
    const c = await offboarding_cases.findByPk(id);
    if (!c || Number(c.get('status')) !== 1) {
      throw new AppError(404, 'Case not found.');
    }

    if (!c.get('handover_receipt_file_path')) {
      throw new AppError(404, 'Handover receipt has not been generated for this case.');
    }

    return String(c.get('handover_receipt_file_path'));
  }

  async getStats() {
    const today = new Date().toISOString().split('T')[0];
    const in30Days = new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0];

    const total_cases = await offboarding_cases.count({ where: { status: 1 } });
    const in_notice = await employees.count({
      where: { employment_status: EMPLOYMENT_STATUS.NOTICE, status: 1 },
    });
    const pending_handover = await offboarding_tasks.count({
      where: {
        task_type: OFFBOARDING_TASK_TYPE.ASSET,
        task_status: {
          [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
        },
        status: 1,
      },
    });
    const overdue_returns = await offboarding_tasks.count({
      where: {
        task_type: OFFBOARDING_TASK_TYPE.ASSET,
        task_status: {
          [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
        },
        due_date: { [Op.lt]: today },
        status: 1,
      },
    });
    const pending_clearance = await offboarding_cases.count({
      where: { case_status: OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE, status: 1 },
    });
    const completed_cases = await offboarding_cases.count({
      where: { case_status: OFFBOARDING_CASE_STATUS.COMPLETED, status: 1 },
    });
    const exits_next_30_days = await offboarding_cases.count({
      where: {
        last_working_date: { [Op.between]: [today, in30Days] },
        case_status: {
          [Op.in]: [
            OFFBOARDING_CASE_STATUS.OPEN,
            OFFBOARDING_CASE_STATUS.IN_PROGRESS,
            OFFBOARDING_CASE_STATUS.PENDING_CLEARANCE,
          ],
        },
        status: 1,
      },
    });

    return {
      total_cases,
      in_notice,
      pending_handover,
      overdue_returns,
      pending_clearance,
      completed_cases,
      exits_next_30_days,
    };
  }

  async portalGet(actor: UserInfo) {
    const emp = await employees.findOne({
      where: { user_id: actor.id, status: 1 },
    });

    if (!emp) {
      return { has_case: false, case: null };
    }

    const c = await offboarding_cases.findOne({
      where: { employee_id: Number(emp.get('id')), status: 1 },
      order: [['id', 'DESC']],
      include: [
        {
          model: users,
          as: 'handover_user',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        { model: offboarding_tasks, as: 'tasks' },
      ],
    });

    if (!c) {
      return { has_case: false, case: null };
    }

    const item = plain(c);
    const taskList = (item.tasks as Array<Record<string, unknown>>) || [];
    const total = taskList.length;
    const completed = taskList.filter(
      (t) =>
        t.task_status === OFFBOARDING_TASK_STATUS.COMPLETED ||
        t.task_status === OFFBOARDING_TASK_STATUS.WAIVED,
    ).length;

    const lwdDate = new Date(String(c.get('last_working_date')));
    const now = new Date();
    const diffMs = lwdDate.getTime() - now.getTime();
    const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

    const instructions = [
      'Please return all company hardware items to the designated hardware manager before or on your Last Working Day.',
      'Ensure all local files are backed up to official company cloud drives. Local hard drives will be wiped clean upon return.',
      'Software seats and access will be automatically deactivated at 23:59 on your Last Working Day.',
      'Complete project documentation and hand off responsibilities to your reporting manager.',
    ];

    return {
      has_case: true,
      case: {
        id: Number(item.id),
        case_no: String(item.case_no),
        case_status: String(item.case_status),
        last_working_date: String(item.last_working_date),
        days_left: Math.max(0, daysLeft),
        is_overdue: daysLeft < 0,
        handover_contact: item.handover_user
          ? {
              first_name: (item.handover_user as Record<string, unknown>).first_name as string,
              last_name: (item.handover_user as Record<string, unknown>).last_name as string,
              email: (item.handover_user as Record<string, unknown>).email as string,
            }
          : null,
        instructions,
        tasks: taskList.map((t) => ({
          id: Number(t.id),
          task_type: Number(t.task_type),
          title: String(t.title),
          ref_label: t.ref_label ? String(t.ref_label) : null,
          task_status: Number(t.task_status),
          is_mandatory: Number(t.is_mandatory) === 1,
          due_date: String(t.due_date),
        })),
        progress: {
          total,
          completed,
          percent: total > 0 ? Math.round((completed / total) * 100) : 100,
        },
      },
    };
  }

  async verifyDocument(code: string) {
    return this.pdfService.verifyDocument(code);
  }

  private async selectHandoverUser(
    transaction?: Transaction,
  ): Promise<import('sequelize').Model | null> {
    const strategySetting = await app_settings.findOne({
      where: {
        key: { [Op.in]: ['offboarding.assignment_strategy', 'offboarding_handover_strategy'] },
        status: 1,
      },
      transaction,
    });
    const strategy = strategySetting ? String(strategySetting.get('value')) : 'least_loaded';

    if (strategy === 'fixed') {
      const fixedSetting = await app_settings.findOne({
        where: {
          key: { [Op.in]: ['offboarding.fixed_assignee_id', 'offboarding_fixed_handover_user_id'] },
          status: 1,
        },
        transaction,
      });
      if (fixedSetting && fixedSetting.get('value')) {
        const u = await users.findByPk(Number(fixedSetting.get('value')), { transaction });
        if (u && Number(u.get('status')) === 1) return u;
      }
    }

    // Find all active hardware managers or IT staff
    const hwRoles = await roles.findAll({
      where: {
        [Op.or]: [
          { type: { [Op.in]: ['hardware_manager', 'hardware', 'admin'] } },
          { name: { [Op.in]: ['Hardware Manager', 'Hardware', 'Admin', 'Super Admin'] } },
        ],
      },
      transaction,
    });
    const roleIds = hwRoles.map((r) => Number(r.get('id')));

    const hwUsers =
      roleIds.length > 0
        ? await users.findAll({
            where: { role_id: { [Op.in]: roleIds }, status: 1 },
            transaction,
          })
        : [];

    if (hwUsers.length === 0) {
      const [[admin]] = await sequelize.query('SELECT * FROM users WHERE status = 1 LIMIT 1', {
        transaction,
      });
      return admin ? users.build(admin as Record<string, unknown>, { isNewRecord: false }) : null;
    }

    if (strategy === 'round_robin') {
      // Find user with least recently assigned case
      const lastAssignedCase = await offboarding_cases.findOne({
        where: { handover_to: { [Op.in]: hwUsers.map((u) => Number(u.get('id'))) } },
        order: [['id', 'DESC']],
        transaction,
      });
      if (!lastAssignedCase) return hwUsers[0] ?? null;
      const lastUserId = Number(lastAssignedCase.get('handover_to'));
      const idx = hwUsers.findIndex((u) => Number(u.get('id')) === lastUserId);
      return hwUsers[(idx + 1) % hwUsers.length] ?? null;
    }

    // Default: least_loaded
    let minLoadedUser = hwUsers[0];
    let minTaskCount = Infinity;

    for (const u of hwUsers) {
      const count = await offboarding_tasks.count({
        where: {
          assigned_to: Number(u.get('id')),
          task_status: {
            [Op.in]: [OFFBOARDING_TASK_STATUS.PENDING, OFFBOARDING_TASK_STATUS.IN_PROGRESS],
          },
          status: 1,
        },
        transaction,
      });

      if (count < minTaskCount) {
        minTaskCount = count;
        minLoadedUser = u;
      }
    }

    return minLoadedUser ?? null;
  }
}
