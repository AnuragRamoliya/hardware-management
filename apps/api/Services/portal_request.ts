import { Op, Transaction } from 'sequelize';
import {
  REQUEST_TYPE,
  REQUEST_STATUS,
  REQUEST_PRIORITY,
  ACTIVITY_ACTIONS,
  MODULES,
  REALTIME_EVENTS,
  REALTIME_ROOMS,
  NOTIFICATION_CATEGORIES,
} from '@hm/shared';
import { AppError } from '../Config/app_error';
import {
  sequelize,
  requests,
  request_comments,
  request_status_history,
  request_attachments,
  employees,
  departments,
  designations,
  users,
  assets,
  asset_categories,
  asset_assignments,
  software,
  software_licenses,
  app_settings,
} from '../Database/Schema';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';
import { createNotification } from './notification';
import { realtimeService } from './realtime.service';

const plain = (val: import('sequelize').Model) =>
  val.get({ plain: true }) as Record<string, unknown>;

export class PortalRequestService {
  /**
   * Helper to resolve active employee record from authenticated user
   */
  async getEmployeeForUser(userId: number) {
    const emp = await employees.findOne({
      where: { user_id: userId, status: 1 },
      include: [
        { model: departments, as: 'department', attributes: ['id', 'name'] },
        { model: designations, as: 'designation', attributes: ['id', 'name'] },
      ],
    });

    if (!emp || Number(emp.get('employment_status')) >= 3) {
      throw new AppError(403, 'Active employee profile required to access portal.');
    }

    return emp;
  }

  /**
   * List employee's own requests
   */
  async list(input: ListDto, actor: UserInfo) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    const filters = (input.filters || {}) as Record<string, unknown>;
    const where: Record<string | symbol, unknown> = {
      employee_id: empId,
      status: 1,
    };

    if (filters.request_status !== undefined && filters.request_status !== '') {
      const statuses = Array.isArray(filters.request_status)
        ? filters.request_status
        : [filters.request_status];
      where.request_status = { [Op.in]: statuses.map(Number) };
    }

    if (filters.request_type !== undefined && filters.request_type !== '') {
      const types = Array.isArray(filters.request_type)
        ? filters.request_type
        : [filters.request_type];
      where.request_type = { [Op.in]: types.map(Number) };
    }

    if (input.general_search && input.general_search.trim().length > 0) {
      const term = `%${input.general_search.trim()}%`;
      where[Op.or] = [{ request_no: { [Op.like]: term } }, { title: { [Op.like]: term } }];
    }

    const { limit, offset } = getPagination(input);
    const currentPage = Math.max(1, Number(input.currentPage ?? 1));
    const itemsPerPage = Math.min(100, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const allowedPortalRequestColumns = {
      id: 'id',
      request_no: 'request_no',
      request_type: 'request_type',
      category: 'category_id',
      category_id: 'category_id',
      title: 'title',
      priority: 'priority',
      request_status: 'request_status',
      needed_by: 'needed_by',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedPortalRequestColumns, [['createdAt', 'DESC']]);

    const result = await requests.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        { model: asset_categories, as: 'category', attributes: ['id', 'name'] },
        { model: assets, as: 'current_asset', attributes: ['id', 'asset_tag', 'brand', 'model'] },
        { model: assets, as: 'assigned_asset', attributes: ['id', 'asset_tag', 'brand', 'model'] },
        { model: software, as: 'software', attributes: ['id', 'name', 'category'] },
      ],
      distinct: true,
    });

    return {
      list: result.rows.map(plain),
      pagination: {
        totalItems: result.count,
        currentPage,
        itemsPerPage,
        totalPages: Math.ceil(result.count / itemsPerPage) || 1,
      },
    };
  }

  /**
   * Get single request details for employee
   * STRICT IDOR PROTECTION: queries exclusively with employee_id = emp.id
   * EXCLUDES INTERNAL COMMENTS: where is_internal = 0
   */
  async get(id: number, actor: UserInfo) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    const item = await requests.findOne({
      where: { id, employee_id: empId, status: 1 },
      include: [
        { model: asset_categories, as: 'category', attributes: ['id', 'name'] },
        { model: assets, as: 'current_asset', attributes: ['id', 'asset_tag', 'brand', 'model'] },
        { model: assets, as: 'assigned_asset', attributes: ['id', 'asset_tag', 'brand', 'model'] },
        { model: software, as: 'software', attributes: ['id', 'name', 'category'] },
        {
          model: software_licenses,
          as: 'assigned_license',
          attributes: ['id', 'license_key', 'seats_total'],
        },
        {
          model: request_comments,
          as: 'comments',
          where: { status: 1, is_internal: 0 }, // STRICT: internal comments excluded!
          required: false,
          include: [
            {
              model: users,
              as: 'author',
              attributes: ['id', 'first_name', 'last_name', 'email', 'image'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
        {
          model: request_status_history,
          as: 'history',
          include: [
            {
              model: users,
              as: 'user',
              attributes: ['id', 'first_name', 'last_name'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
        {
          model: request_attachments,
          as: 'attachments',
          where: { status: 1 },
          required: false,
        },
      ],
    });

    if (!item) {
      throw new AppError(404, 'Request not found.');
    }

    return plain(item);
  }

  /**
   * Add new request from portal
   */
  async add(
    input: {
      request_type: number;
      category_id?: number;
      current_asset_id?: number;
      software_id?: number;
      title: string;
      reason: string;
      priority?: number;
      needed_by_date?: string;
    },
    actor: UserInfo,
  ) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    // Check max active requests limit setting
    const maxSetting = await app_settings.findOne({
      where: { key: 'request_max_active_per_employee', status: 1 },
    });
    const maxLimit = maxSetting ? Number(maxSetting.get('value')) || 5 : 5;

    const activeCount = await requests.count({
      where: {
        employee_id: empId,
        request_status: { [Op.in]: [1, 2, 3, 4, 9] }, // Active statuses
        status: 1,
      },
    });

    if (activeCount >= maxLimit) {
      throw new AppError(
        422,
        `You have reached the maximum active requests limit (${maxLimit}). Please wait for current requests to complete.`,
      );
    }

    const reqType = Number(input.request_type);
    const priority = Number(input.priority) || REQUEST_PRIORITY.MEDIUM;

    // Notice period restriction
    if (Number(emp.get('employment_status')) === 2) {
      const restrictSetting = await app_settings.findOne({
        where: { key: 'offboarding_restrict_requests_during_notice', status: 1 },
      });
      const isRestricted = restrictSetting ? restrictSetting.get('value') === 'true' : true;
      if (isRestricted) {
        if (reqType !== REQUEST_TYPE.REPAIR && reqType !== REQUEST_TYPE.RETURN_HARDWARE) {
          throw new AppError(
            422,
            'Employees in notice period are restricted to submitting hardware repair and return requests only.',
          );
        }
      }
    }

    // Type-specific validations
    if (reqType === REQUEST_TYPE.NEW_HARDWARE) {
      if (!input.category_id) {
        throw new AppError(422, 'Category is required for new hardware requests.');
      }
      const cat = await asset_categories.findByPk(input.category_id);
      if (!cat || Number(cat.get('status')) !== 1) {
        throw new AppError(404, 'Asset category not found.');
      }
    } else if (
      reqType === REQUEST_TYPE.CHANGE_REPLACE_HARDWARE ||
      reqType === REQUEST_TYPE.REPAIR ||
      reqType === REQUEST_TYPE.RETURN_HARDWARE
    ) {
      if (!input.current_asset_id) {
        throw new AppError(422, 'Current assigned asset is required.');
      }
      // Must be currently assigned to this employee
      const assignment = await asset_assignments.findOne({
        where: {
          asset_id: input.current_asset_id,
          employee_id: empId,
          returned_at: null,
          status: 1,
        },
      });
      if (!assignment) {
        throw new AppError(
          422,
          'The specified asset is not currently assigned to your employee account.',
        );
      }
    } else if (reqType === REQUEST_TYPE.SOFTWARE_ACCESS) {
      if (!input.software_id) {
        throw new AppError(422, 'Software is required for software access requests.');
      }
      const sw = await software.findByPk(input.software_id);
      if (!sw || Number(sw.get('status')) !== 1) {
        throw new AppError(404, 'Software not found.');
      }
    } else {
      throw new AppError(422, `Invalid request type: ${reqType}`);
    }

    // Duplicate guard: no second active request of the same type for the same category/asset/software
    const dupWhere: Record<string | symbol, unknown> = {
      employee_id: empId,
      request_type: reqType,
      request_status: { [Op.in]: [1, 2, 3, 4, 9] },
      status: 1,
    };
    if (input.category_id) dupWhere.category_id = input.category_id;
    if (input.current_asset_id) dupWhere.current_asset_id = input.current_asset_id;
    if (input.software_id) dupWhere.software_id = input.software_id;

    const duplicate = await requests.findOne({ where: dupWhere });
    if (duplicate) {
      throw new AppError(409, 'You already have an active request of this type for this item.');
    }

    // Needed by date validation
    if (input.needed_by_date) {
      const neededDate = new Date(input.needed_by_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (neededDate < today) {
        throw new AppError(422, 'Needed by date cannot be in the past.');
      }
    }

    // SLA calculation
    const slaSetting = await app_settings.findOne({
      where: { key: 'request_sla_hours', status: 1 },
    });
    let slaHoursMap: Record<string, number> = { '4': 4, '3': 24, '2': 72, '1': 120 };
    if (slaSetting && slaSetting.get('value')) {
      try {
        slaHoursMap = JSON.parse(String(slaSetting.get('value')));
      } catch {
        // default
      }
    }
    const turnaroundHours = slaHoursMap[String(priority)] || 72;
    const slaDueAt = new Date(Date.now() + turnaroundHours * 3600000);

    // Initial status check: manager approval required?
    const approvalSetting = await app_settings.findOne({
      where: { key: 'request_manager_approval_required', status: 1 },
    });
    const managerApprovalRequired = approvalSetting?.get('value') === 'true';
    const initialStatus = managerApprovalRequired
      ? REQUEST_STATUS.PENDING_MANAGER_APPROVAL
      : REQUEST_STATUS.SUBMITTED;

    return sequelize.transaction(async (t: Transaction) => {
      // Generate sequential request_no REQ-000001
      const lastReq = await requests.findOne({
        attributes: ['id'],
        order: [['id', 'DESC']],
        transaction: t,
        lock: t.LOCK.UPDATE,
      });
      const nextNum = lastReq ? Number(lastReq.get('id')) + 1 : 1;
      const requestNo = `REQ-${String(nextNum).padStart(6, '0')}`;

      const newReq = await requests.create(
        {
          request_no: requestNo,
          employee_id: empId,
          request_type: reqType,
          category_id: input.category_id || null,
          current_asset_id: input.current_asset_id || null,
          software_id: input.software_id || null,
          title: input.title.trim(),
          reason: input.reason.trim(),
          priority,
          needed_by_date: input.needed_by_date || null,
          request_status: initialStatus,
          sla_due_at: slaDueAt,
          sla_breached: 0,
          awaiting_stock: 0,
          status: 1,
          created_by: actor.id,
        },
        { transaction: t },
      );

      const reqId = Number(newReq.get('id'));

      // Status history entry
      await request_status_history.create(
        {
          request_id: reqId,
          from_status: 0,
          to_status: initialStatus,
          changed_by: actor.id,
          note: 'Request submitted by employee',
          status: 1,
          created_by: actor.id,
        },
        { transaction: t },
      );

      // Activity log
      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: reqId,
        action: ACTIVITY_ACTIONS.CREATED,
        newValue: plain(newReq),
        description: `Request ${requestNo} submitted by ${emp.get('first_name')} ${emp.get('last_name')}`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction: t,
      });

      // Notify reviewers and publish real-time event
      realtimeService.publish({
        event: REALTIME_EVENTS.REQUEST_CREATED,
        rooms: [REALTIME_ROOMS.queueRequests(), REALTIME_ROOMS.role('hardware_manager')],
        data: {
          id: reqId,
          request_no: requestNo,
          title: input.title.trim(),
          priority,
          request_type: reqType,
          request_status: initialStatus,
          employee_id: empId,
          employee_name: `${emp.get('first_name')} ${emp.get('last_name')}`.trim(),
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
        transaction: t,
      });

      return plain(newReq);
    });
  }

  /**
   * Update request details
   * Allowed ONLY when status is SUBMITTED or NEED_INFO
   * If status was NEED_INFO, update moves status back to SUBMITTED!
   */
  async update(
    input: {
      id: number;
      title?: string;
      reason?: string;
      needed_by_date?: string;
      priority?: number;
    },
    actor: UserInfo,
  ) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    return sequelize.transaction(async (t: Transaction) => {
      const req = await requests.findOne({
        where: { id: input.id, employee_id: empId, status: 1 },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!req) {
        throw new AppError(404, 'Request not found.');
      }

      const currentStatus = Number(req.get('request_status'));
      if (
        currentStatus !== REQUEST_STATUS.SUBMITTED &&
        currentStatus !== REQUEST_STATUS.NEED_INFO
      ) {
        throw new AppError(
          422,
          'Requests can only be updated while in Submitted or Need Info status.',
        );
      }

      const updates: Record<string, unknown> = { updated_by: actor.id };
      if (input.title) updates.title = input.title.trim();
      if (input.reason) updates.reason = input.reason.trim();
      if (input.needed_by_date) updates.needed_by_date = input.needed_by_date;
      if (input.priority) updates.priority = Number(input.priority);

      // If updating from NEED_INFO, transition back to SUBMITTED
      let statusChanged = false;
      if (currentStatus === REQUEST_STATUS.NEED_INFO) {
        updates.request_status = REQUEST_STATUS.SUBMITTED;
        statusChanged = true;
      }

      await req.update(updates, { transaction: t });

      if (statusChanged) {
        await request_status_history.create(
          {
            request_id: input.id,
            from_status: REQUEST_STATUS.NEED_INFO,
            to_status: REQUEST_STATUS.SUBMITTED,
            changed_by: actor.id,
            note: 'Updated by employee in response to feedback',
            status: 1,
            created_by: actor.id,
          },
          { transaction: t },
        );
      }

      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: input.id,
        action: ACTIVITY_ACTIONS.UPDATED,
        oldValue: { request_status: currentStatus },
        newValue: updates,
        description: `Request updated by employee`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction: t,
      });

      return plain(req);
    });
  }

  /**
   * Cancel request
   * Allowed until fulfilled (status < 6)
   */
  async cancel(input: { id: number; reason: string }, actor: UserInfo) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    return sequelize.transaction(async (t: Transaction) => {
      const req = await requests.findOne({
        where: { id: input.id, employee_id: empId, status: 1 },
        transaction: t,
        lock: t.LOCK.UPDATE,
      });

      if (!req) {
        throw new AppError(404, 'Request not found.');
      }

      const currentStatus = Number(req.get('request_status'));
      if (
        currentStatus === REQUEST_STATUS.FULFILLED ||
        currentStatus === REQUEST_STATUS.CLOSED ||
        currentStatus === REQUEST_STATUS.CANCELLED
      ) {
        throw new AppError(
          422,
          'Cannot cancel a request that is already fulfilled, closed, or cancelled.',
        );
      }

      await req.update(
        {
          request_status: REQUEST_STATUS.CANCELLED,
          cancelled_reason: input.reason ? input.reason.trim() : 'Cancelled by employee',
          updated_by: actor.id,
        },
        { transaction: t },
      );

      await request_status_history.create(
        {
          request_id: input.id,
          from_status: currentStatus,
          to_status: REQUEST_STATUS.CANCELLED,
          changed_by: actor.id,
          note: input.reason || 'Cancelled by employee',
          status: 1,
          created_by: actor.id,
        },
        { transaction: t },
      );

      await createActivityLog({
        module: MODULES.REQUEST,
        moduleId: input.id,
        action: ACTIVITY_ACTIONS.CANCELLED,
        oldValue: { request_status: currentStatus },
        newValue: { request_status: REQUEST_STATUS.CANCELLED, reason: input.reason },
        description: `Request cancelled by employee`,
        createdBy: actor.id,
        createdByName: `${actor.first_name} ${actor.last_name}`,
        transaction: t,
      });

      return plain(req);
    });
  }

  /**
   * Add a comment on request from portal
   * Always public (is_internal = 0)
   */
  async addComment(input: { request_id: number; comment: string }, actor: UserInfo) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    const req = await requests.findOne({
      where: { id: input.request_id, employee_id: empId, status: 1 },
    });

    if (!req) {
      throw new AppError(404, 'Request not found.');
    }

    if (!input.comment || input.comment.trim().length === 0) {
      throw new AppError(422, 'Comment cannot be empty.');
    }

    const comment = await request_comments.create({
      request_id: input.request_id,
      user_id: actor.id,
      comment: input.comment.trim(),
      is_internal: 0, // Public comment
      status: 1,
      created_by: actor.id,
    });

    // If request was in NEED_INFO, adding a comment also transitions status back to SUBMITTED!
    if (Number(req.get('request_status')) === REQUEST_STATUS.NEED_INFO) {
      await req.update({ request_status: REQUEST_STATUS.SUBMITTED, updated_by: actor.id });
      await request_status_history.create({
        request_id: input.request_id,
        from_status: REQUEST_STATUS.NEED_INFO,
        to_status: REQUEST_STATUS.SUBMITTED,
        changed_by: actor.id,
        note: 'Employee responded with comment',
        status: 1,
        created_by: actor.id,
      });

      realtimeService.publish({
        event: REALTIME_EVENTS.REQUEST_STATUS_CHANGED,
        rooms: [REALTIME_ROOMS.request(input.request_id), REALTIME_ROOMS.queueRequests()],
        data: {
          id: input.request_id,
          request_no: String(req.get('request_no')),
          title: String(req.get('title')),
          status: REQUEST_STATUS.SUBMITTED,
          prev_status: REQUEST_STATUS.NEED_INFO,
          reason: 'Employee responded with comment',
          updatedAt: new Date().toISOString(),
        },
        actor: { id: actor.id, name: `${actor.first_name} ${actor.last_name || ''}`.trim() },
      });
    }

    const commentData = {
      id: Number(comment.get('id')),
      request_id: input.request_id,
      comment: input.comment.trim(),
      user_id: actor.id,
      author_name: `${actor.first_name} ${actor.last_name || ''}`.trim(),
      is_internal: false,
      createdAt: new Date().toISOString(),
    };

    // Public comment: emit to request room and staff room
    realtimeService.publish({
      event: REALTIME_EVENTS.REQUEST_COMMENT_ADDED,
      rooms: [
        REALTIME_ROOMS.request(input.request_id),
        REALTIME_ROOMS.requestStaff(input.request_id),
      ],
      data: commentData,
      actor: { id: actor.id, name: commentData.author_name },
    });

    // Notify assigned reviewer or staff
    const assigneeId = req.get('assigned_to');
    if (assigneeId) {
      await createNotification({
        recipient_user_id: Number(assigneeId),
        category: NOTIFICATION_CATEGORIES.REQUEST,
        kind: 'request_comment',
        entity_type: 'request',
        entity_id: input.request_id,
        title: `Reply on Request #${req.get('request_no')}`,
        body: `${actor.first_name} left a comment: "${input.comment.trim().slice(0, 100)}"`,
        message: `${actor.first_name} left a comment: "${input.comment.trim().slice(0, 100)}"`,
        link: `/requests/${input.request_id}`,
      });
    }

    return plain(comment);
  }

  /**
   * Upload attachment for request
   */
  async addAttachment(
    input: {
      request_id: number;
      file_name: string;
      file_path: string;
      mime_type: string;
      size: number;
    },
    actor: UserInfo,
  ) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    const req = await requests.findOne({
      where: { id: input.request_id, employee_id: empId, status: 1 },
    });

    if (!req) {
      throw new AppError(404, 'Request not found.');
    }

    // Max 3 attachments check
    const existingCount = await request_attachments.count({
      where: { request_id: input.request_id, status: 1 },
    });
    if (existingCount >= 3) {
      throw new AppError(422, 'Maximum of 3 attachments per request reached.');
    }

    const attachment = await request_attachments.create({
      request_id: input.request_id,
      file_name: input.file_name,
      file_path: input.file_path,
      mime_type: input.mime_type,
      size: input.size,
      uploaded_by: actor.id,
      status: 1,
      created_by: actor.id,
    });

    return plain(attachment);
  }

  /**
   * Options for portal request wizard
   * - my currently assigned assets
   * - requestable categories
   * - software list
   */
  async options(actor: UserInfo) {
    const emp = await this.getEmployeeForUser(actor.id);
    const empId = Number(emp.get('id'));

    const [assignedAssets, cats, soft] = await Promise.all([
      asset_assignments.findAll({
        where: {
          employee_id: empId,
          returned_at: null,
          status: 1,
        },
        include: [
          {
            model: assets,
            as: 'asset',
            attributes: ['id', 'asset_tag', 'brand', 'model', 'category_id'],
            include: [{ model: asset_categories, as: 'category', attributes: ['id', 'name'] }],
          },
        ],
      }),
      asset_categories.findAll({
        where: { status: 1 },
        attributes: ['id', 'name', 'description'],
        order: [['name', 'ASC']],
      }),
      software.findAll({
        where: { status: 1 },
        attributes: ['id', 'name', 'category', 'license_type'],
        order: [['name', 'ASC']],
      }),
    ]);

    const myAssets = assignedAssets
      .map((a) => a.get('asset'))
      .filter((ast): ast is import('sequelize').Model => Boolean(ast))
      .map((ast) => plain(ast));

    return {
      my_assets: myAssets,
      categories: cats.map(plain),
      software: soft.map(plain),
    };
  }
}
