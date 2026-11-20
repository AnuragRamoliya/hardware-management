import { Op } from 'sequelize';
import {
  REQUEST_STATUS,
  REQUEST_TYPE_NAMES,
  REQUEST_STATUS_NAMES,
  REQUEST_PRIORITY_NAMES,
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
  software,
  software_licenses,
} from '../Database/Schema';
import { RequestWorkflowService } from './request_workflow.service';
import { RequestFulfilmentService, type FulfilInput } from './request_fulfilment.service';
import { createActivityLog, getPagination, getSorting } from '../Utils/helpers';
import type { ListDto, UserInfo } from '../Types/api';
import { createNotification } from './notification';
import { realtimeService } from './realtime.service';

const plain = (val: import('sequelize').Model) =>
  val.get({ plain: true }) as Record<string, unknown>;

export class RequestService {
  private workflowService = new RequestWorkflowService();
  private fulfilmentService = new RequestFulfilmentService();

  /**
   * Admin list of requests with rich filtering and general search
   */
  async list(input: ListDto, actor: UserInfo) {
    const filters = (input.filters || {}) as Record<string, unknown>;
    const where: Record<string | symbol, unknown> = { status: 1 };

    // Request Type filter
    if (filters.request_type !== undefined && filters.request_type !== '') {
      const types = Array.isArray(filters.request_type)
        ? filters.request_type
        : [filters.request_type];
      where.request_type = { [Op.in]: types.map(Number) };
    }

    // Request Status filter
    if (filters.request_status !== undefined && filters.request_status !== '') {
      const statuses = Array.isArray(filters.request_status)
        ? filters.request_status
        : [filters.request_status];
      where.request_status = { [Op.in]: statuses.map(Number) };
    }

    // Priority filter
    if (filters.priority !== undefined && filters.priority !== '') {
      const priorities = Array.isArray(filters.priority) ? filters.priority : [filters.priority];
      where.priority = { [Op.in]: priorities.map(Number) };
    }

    // Employee ID filter
    if (filters.employee_id !== undefined && filters.employee_id !== '') {
      const empIds = Array.isArray(filters.employee_id)
        ? filters.employee_id
        : [filters.employee_id];
      where.employee_id = { [Op.in]: empIds.map(Number) };
    }

    // Category ID filter
    if (filters.category_id !== undefined && filters.category_id !== '') {
      const catIds = Array.isArray(filters.category_id)
        ? filters.category_id
        : [filters.category_id];
      where.category_id = { [Op.in]: catIds.map(Number) };
    }

    // Assigned To filter
    if (filters.assigned_to !== undefined && filters.assigned_to !== '') {
      const assignees = Array.isArray(filters.assigned_to)
        ? filters.assigned_to
        : [filters.assigned_to];
      where.assigned_to = { [Op.in]: assignees.map(Number) };
    }

    // Unassigned quick filter
    if (filters.unassigned === true || filters.unassigned === 'true' || filters.unassigned === 1) {
      where.assigned_to = null;
    }

    // Mine quick filter
    if (filters.mine === true || filters.mine === 'true' || filters.mine === 1) {
      where.assigned_to = actor.id;
    }

    // SLA Breached quick filter
    if (
      filters.sla_breached === true ||
      filters.sla_breached === 'true' ||
      filters.sla_breached === 1
    ) {
      where.sla_breached = 1;
    }

    // Awaiting Stock quick filter
    if (
      filters.awaiting_stock === true ||
      filters.awaiting_stock === 'true' ||
      filters.awaiting_stock === 1
    ) {
      where.awaiting_stock = 1;
    }

    // Created range filter
    if (filters.created && typeof filters.created === 'object') {
      const cr = filters.created as { from?: string; to?: string };
      const range: Record<symbol, Date> = {};
      if (cr.from) range[Op.gte] = new Date(cr.from);
      if (cr.to) {
        const toDate = new Date(cr.to);
        if (/^\d{4}-\d{2}-\d{2}$/.test(cr.to)) toDate.setHours(23, 59, 59, 999);
        range[Op.lte] = toDate;
      }
      if (Object.keys(range).length) where.createdAt = range;
    }

    // Needed by range filter
    if (filters.needed_by && typeof filters.needed_by === 'object') {
      const nr = filters.needed_by as { from?: string; to?: string };
      const range: Record<symbol, unknown> = {};
      if (nr.from) range[Op.gte] = nr.from;
      if (nr.to) range[Op.lte] = nr.to;
      if (Object.keys(range).length) where.needed_by_date = range;
    }

    // Asset ID filter (matches current_asset_id or assigned_asset_id)
    if (filters.asset_id !== undefined && filters.asset_id !== '') {
      const assetId = Number(filters.asset_id);
      const assetCondition = {
        [Op.or]: [{ current_asset_id: assetId }, { assigned_asset_id: assetId }],
      };
      if (where[Op.and]) {
        (where[Op.and] as Array<Record<string | symbol, unknown>>).push(assetCondition);
      } else {
        where[Op.and] = [assetCondition];
      }
    }

    // General search across request_no, title, or employee name
    if (input.general_search && input.general_search.trim().length > 0) {
      const term = `%${input.general_search.trim()}%`;
      where[Op.or] = [
        { request_no: { [Op.like]: term } },
        { title: { [Op.like]: term } },
        { '$employee.first_name$': { [Op.like]: term } },
        { '$employee.last_name$': { [Op.like]: term } },
        { '$employee.employee_code$': { [Op.like]: term } },
      ];
    }

    const { limit, offset } = getPagination(input);
    const currentPage = Math.max(1, Number(input.currentPage ?? 1));
    const itemsPerPage = Math.min(100, Math.max(1, Number(input.itemsPerPage ?? 10)));
    const allowedRequestColumns = {
      id: 'id',
      request_no: 'request_no',
      employee: 'employee_id',
      employee_id: 'employee_id',
      request_type: 'request_type',
      category: 'category_id',
      category_id: 'category_id',
      title: 'title',
      priority: 'priority',
      request_status: 'request_status',
      assigned_to: 'assigned_to',
      needed_by: 'needed_by',
      status: 'status',
      createdAt: 'createdAt',
      updatedAt: 'updatedAt',
    };
    const order = getSorting(input, allowedRequestColumns, [['createdAt', 'DESC']]);

    const result = await requests.findAndCountAll({
      where,
      limit,
      offset,
      order,
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'employee_code', 'profile_image', 'email'],
          include: [
            { model: departments, as: 'department', attributes: ['id', 'name'] },
            { model: designations, as: 'designation', attributes: ['id', 'name'] },
          ],
        },
        {
          model: asset_categories,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: users,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: assets,
          as: 'current_asset',
          attributes: ['id', 'asset_tag', 'brand', 'model'],
        },
        {
          model: assets,
          as: 'assigned_asset',
          attributes: ['id', 'asset_tag', 'brand', 'model'],
        },
        {
          model: software,
          as: 'software',
          attributes: ['id', 'name', 'category'],
        },
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
   * Get single request details with full comments, history, attachments, and relations
   */
  async get(id: number) {
    const item = await requests.findOne({
      where: { id, status: 1 },
      include: [
        {
          model: employees,
          as: 'employee',
          attributes: [
            'id',
            'first_name',
            'last_name',
            'employee_code',
            'email',
            'phone',
            'profile_image',
            'user_id',
          ],
          include: [
            { model: departments, as: 'department', attributes: ['id', 'name'] },
            { model: designations, as: 'designation', attributes: ['id', 'name'] },
          ],
        },
        {
          model: asset_categories,
          as: 'category',
          attributes: ['id', 'name'],
        },
        {
          model: users,
          as: 'assignee',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'reviewer',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: users,
          as: 'fulfiller',
          attributes: ['id', 'first_name', 'last_name', 'email'],
        },
        {
          model: assets,
          as: 'current_asset',
          attributes: ['id', 'asset_tag', 'serial_no', 'brand', 'model', 'asset_status'],
        },
        {
          model: assets,
          as: 'assigned_asset',
          attributes: ['id', 'asset_tag', 'serial_no', 'brand', 'model', 'asset_status'],
        },
        {
          model: software,
          as: 'software',
          attributes: ['id', 'name', 'category', 'license_type'],
        },
        {
          model: software_licenses,
          as: 'assigned_license',
          attributes: ['id', 'license_key', 'seats_total', 'expiry_date'],
        },
        {
          model: request_comments,
          as: 'comments',
          where: { status: 1 },
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
              attributes: ['id', 'first_name', 'last_name', 'email'],
            },
          ],
          order: [['createdAt', 'ASC']],
        },
        {
          model: request_attachments,
          as: 'attachments',
          where: { status: 1 },
          required: false,
          include: [
            {
              model: users,
              as: 'uploader',
              attributes: ['id', 'first_name', 'last_name', 'email'],
            },
          ],
        },
      ],
    });

    if (!item) throw new AppError(404, 'Request not found.');
    return plain(item);
  }

  /**
   * Take request (assign to self)
   */
  async take(id: number, actor: UserInfo) {
    const item = await requests.findByPk(id);
    if (!item || Number(item.get('status')) !== 1) {
      throw new AppError(404, 'Request not found.');
    }

    const currentAssignee = item.get('assigned_to');
    await item.update({
      assigned_to: actor.id,
      updated_by: actor.id,
    });

    await createActivityLog({
      module: MODULES.REQUEST,
      moduleId: id,
      action: ACTIVITY_ACTIONS.ASSIGNED,
      oldValue: { assigned_to: currentAssignee },
      newValue: { assigned_to: actor.id },
      description: `Request assigned to ${actor.first_name} ${actor.last_name}`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });

    return plain(item);
  }

  /**
   * Assign request to a team member
   */
  async assign(id: number, assignedTo: number, actor: UserInfo) {
    const item = await requests.findByPk(id);
    if (!item || Number(item.get('status')) !== 1) {
      throw new AppError(404, 'Request not found.');
    }

    const targetUser = await users.findByPk(assignedTo);
    if (!targetUser || Number(targetUser.get('status')) !== 1) {
      throw new AppError(404, 'Assignee user not found.');
    }

    const currentAssignee = item.get('assigned_to');
    await item.update({
      assigned_to: assignedTo,
      updated_by: actor.id,
    });

    await createActivityLog({
      module: MODULES.REQUEST,
      moduleId: id,
      action: ACTIVITY_ACTIONS.ASSIGNED,
      oldValue: { assigned_to: currentAssignee },
      newValue: { assigned_to: assignedTo },
      description: `Request assigned to ${targetUser.get('first_name')} ${targetUser.get('last_name')}`,
      createdBy: actor.id,
      createdByName: `${actor.first_name} ${actor.last_name}`,
    });

    // Notify new assignee
    await createNotification({
      recipient_user_id: assignedTo,
      category: NOTIFICATION_CATEGORIES.REQUEST,
      kind: 'request_assigned',
      entity_type: 'request',
      entity_id: id,
      title: `Assigned: Request #${item.get('request_no')}`,
      message: `You were assigned request "${item.get('title')}".`,
      body: `You were assigned request "${item.get('title')}".`,
    });

    return plain(item);
  }

  /**
   * Bulk assign requests
   */
  async bulkAssign(requestIds: number[], assignedTo: number, actor: UserInfo) {
    if (!requestIds || !requestIds.length) {
      throw new AppError(422, 'request_ids is required.');
    }

    const targetUser = await users.findByPk(assignedTo);
    if (!targetUser || Number(targetUser.get('status')) !== 1) {
      throw new AppError(404, 'Assignee user not found.');
    }

    return sequelize.transaction(async (t) => {
      for (const id of requestIds) {
        const req = await requests.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
        if (req && Number(req.get('status')) === 1) {
          const oldAssignee = req.get('assigned_to');
          await req.update({ assigned_to: assignedTo, updated_by: actor.id }, { transaction: t });
          await createActivityLog({
            module: MODULES.REQUEST,
            moduleId: id,
            action: ACTIVITY_ACTIONS.ASSIGNED,
            oldValue: { assigned_to: oldAssignee },
            newValue: { assigned_to: assignedTo },
            description: `Request bulk assigned to ${targetUser.get('first_name')} ${targetUser.get('last_name')}`,
            createdBy: actor.id,
            createdByName: `${actor.first_name} ${actor.last_name}`,
            transaction: t,
          });
        }
      }
      return { success: true, count: requestIds.length };
    });
  }

  /**
   * Review request action (start_review, approve, reject, need_info)
   */
  async review(
    input: {
      id: number;
      action: 'start_review' | 'approve' | 'reject' | 'need_info';
      feedback?: string;
      awaiting_stock?: boolean;
    },
    actor: UserInfo,
  ) {
    let targetStatus: number;
    switch (input.action) {
      case 'start_review':
        targetStatus = REQUEST_STATUS.UNDER_REVIEW;
        break;
      case 'approve':
        targetStatus = REQUEST_STATUS.APPROVED;
        break;
      case 'reject':
        targetStatus = REQUEST_STATUS.REJECTED;
        break;
      case 'need_info':
        targetStatus = REQUEST_STATUS.NEED_INFO;
        break;
      default:
        throw new AppError(422, `Unsupported review action: ${input.action}`);
    }

    return this.workflowService.transition({
      requestId: input.id,
      toStatus: targetStatus as import('@hm/shared').RequestStatus,
      actor,
      feedback: input.feedback,
      awaitingStock: input.awaiting_stock,
    });
  }

  /**
   * Fulfil request
   */
  async fulfil(input: FulfilInput, actor: UserInfo) {
    return this.fulfilmentService.fulfil(input, actor);
  }

  /**
   * Close fulfilled request
   */
  async close(id: number, notes: string | undefined, actor: UserInfo) {
    return this.workflowService.transition({
      requestId: id,
      toStatus: REQUEST_STATUS.CLOSED,
      actor,
      feedback: notes,
    });
  }

  /**
   * Add a comment (staff-only internal note or public)
   */
  async addComment(
    input: { request_id: number; comment: string; is_internal?: boolean },
    actor: UserInfo,
  ) {
    if (!input.comment || input.comment.trim().length === 0) {
      throw new AppError(422, 'Comment cannot be empty.');
    }

    const req = await requests.findByPk(input.request_id);
    if (!req || Number(req.get('status')) !== 1) {
      throw new AppError(404, 'Request not found.');
    }

    const isInternal = input.is_internal ? 1 : 0;
    const commentRecord = await request_comments.create({
      request_id: input.request_id,
      user_id: actor.id,
      comment: input.comment.trim(),
      is_internal: isInternal,
      status: 1,
      created_by: actor.id,
    });

    // Notify employee and emit real-time event
    const commentData = {
      id: Number(commentRecord.get('id')),
      request_id: input.request_id,
      comment: input.comment.trim(),
      user_id: actor.id,
      author_name: `${actor.first_name} ${actor.last_name || ''}`.trim(),
      is_internal: Boolean(isInternal),
      createdAt: new Date().toISOString(),
    };

    if (isInternal) {
      // Delivered ONLY to staff room, never to employees
      realtimeService.publish({
        event: REALTIME_EVENTS.REQUEST_COMMENT_ADDED,
        rooms: REALTIME_ROOMS.requestStaff(input.request_id),
        data: commentData,
        actor: { id: actor.id, name: commentData.author_name },
      });
    } else {
      // Delivered to public request room and staff room
      realtimeService.publish({
        event: REALTIME_EVENTS.REQUEST_COMMENT_ADDED,
        rooms: [
          REALTIME_ROOMS.request(input.request_id),
          REALTIME_ROOMS.requestStaff(input.request_id),
        ],
        data: commentData,
        actor: { id: actor.id, name: commentData.author_name },
      });

      const emp = await employees.findByPk(Number(req.get('employee_id')));
      if (emp && emp.get('user_id')) {
        await createNotification({
          recipient_user_id: Number(emp.get('user_id')),
          category: NOTIFICATION_CATEGORIES.REQUEST,
          kind: 'request_comment',
          entity_type: 'request',
          entity_id: input.request_id,
          title: `New Comment on Request #${req.get('request_no')}`,
          body: `${actor.first_name} left a message: "${input.comment.trim().slice(0, 100)}"`,
          message: `${actor.first_name} left a message: "${input.comment.trim().slice(0, 100)}"`,
          link: `/requests/${input.request_id}`,
        });
      }
    }

    return plain(commentRecord);
  }

  /**
   * Request statistics for dashboard cards & metrics
   */
  async stats(actor?: UserInfo) {
    const actorId = actor?.id ? Number(actor.id) : 0;
    const [statusCounts] = await sequelize.query(`
      SELECT \`request_status\`, COUNT(*) as \`count\`
      FROM \`requests\`
      WHERE \`status\` = 1
      GROUP BY \`request_status\`
    `);

    const [typeCounts] = await sequelize.query(`
      SELECT \`request_type\`, COUNT(*) as \`count\`
      FROM \`requests\`
      WHERE \`status\` = 1
      GROUP BY \`request_type\`
    `);

    const [[metrics]] = await sequelize.query(`
      SELECT
        COUNT(*) as total_requests,
        SUM(CASE WHEN \`request_status\` IN (1, 2, 3, 4, 9) THEN 1 ELSE 0 END) as open_requests,
        SUM(CASE WHEN \`assigned_to\` = ${actorId} AND \`request_status\` IN (1, 2, 3, 4, 9) THEN 1 ELSE 0 END) as my_queue,
        SUM(CASE WHEN \`sla_breached\` = 1 AND \`request_status\` IN (1, 2, 3, 4, 9) THEN 1 ELSE 0 END) as sla_breached,
        SUM(CASE WHEN \`awaiting_stock\` = 1 AND \`request_status\` IN (1, 2, 3, 4, 9) THEN 1 ELSE 0 END) as awaiting_stock,
        AVG(CASE WHEN \`fulfilled_at\` IS NOT NULL THEN TIMESTAMPDIFF(HOUR, \`createdAt\`, \`fulfilled_at\`) ELSE NULL END) as avg_turnaround_hours
      FROM \`requests\`
      WHERE \`status\` = 1
    `);

    const metricRow = ((metrics as unknown as Array<Record<string, unknown>>)?.[0] || {}) as Record<
      string,
      unknown
    >;

    return {
      metrics: {
        total_requests: Number(metricRow.total_requests || 0),
        open_requests: Number(metricRow.open_requests || 0),
        my_queue: Number(metricRow.my_queue || 0),
        sla_breached: Number(metricRow.sla_breached || 0),
        awaiting_stock: Number(metricRow.awaiting_stock || 0),
        avg_turnaround_hours: Math.round(Number(metricRow.avg_turnaround_hours || 0)),
      },
      by_status: statusCounts,
      by_type: typeCounts,
    };
  }

  /**
   * Options endpoint for filter dropdowns
   */
  async options() {
    const [cats, reviewUsers, soft] = await Promise.all([
      asset_categories.findAll({
        where: { status: 1 },
        attributes: ['id', 'name'],
        order: [['name', 'ASC']],
      }),
      users.findAll({
        where: { status: 1 },
        attributes: ['id', 'first_name', 'last_name', 'email'],
        order: [['first_name', 'ASC']],
      }),
      software.findAll({
        where: { status: 1 },
        attributes: ['id', 'name', 'category'],
        order: [['name', 'ASC']],
      }),
    ]);

    return {
      categories: cats.map(plain),
      reviewers: reviewUsers.map(plain),
      software: soft.map(plain),
      types: Object.entries(REQUEST_TYPE_NAMES).map(([val, name]) => ({
        id: Number(val),
        name,
      })),
      statuses: Object.entries(REQUEST_STATUS_NAMES).map(([val, name]) => ({
        id: Number(val),
        name,
      })),
      priorities: Object.entries(REQUEST_PRIORITY_NAMES).map(([val, name]) => ({
        id: Number(val),
        name,
      })),
    };
  }

  /**
   * Export requests to CSV format
   */
  async export(input: ListDto, actor: UserInfo) {
    const { list } = await this.list({ ...input, itemsPerPage: 10000, currentPage: 1 }, actor);
    return list;
  }
}
