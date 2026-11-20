import { Op } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import { requests, employees, departments } from '../../Database/Schema';
import { STATUS } from '@hm/shared';
import { parseDateBounds } from '../helpers';

export const requestTurnaroundSlaReport: ReportDefinition = {
  key: 'request-turnaround-sla',
  title: 'Hardware Request Turnaround & SLA Compliance',
  description:
    'Fulfillment durations, review milestones, and SLA breach analysis across all hardware and software requests.',
  category: 'service-level',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager', 'hr'],
  filters: [
    {
      key: 'request_type',
      label: 'Request Type',
      type: 'enum',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Hardware Allocation', value: '1' },
        { label: 'Software License', value: '2' },
        { label: 'Hardware Repair', value: '3' },
        { label: 'Hardware Return', value: '4' },
      ],
    },
    {
      key: 'priority',
      label: 'Priority',
      type: 'enum',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Low', value: '1' },
        { label: 'Medium', value: '2' },
        { label: 'High', value: '3' },
        { label: 'Urgent', value: '4' },
      ],
    },
    {
      key: 'breached_only',
      label: 'SLA Breached Only',
      type: 'enum',
      options: [
        { label: 'All Requests', value: 'false' },
        { label: 'Breached Only', value: 'true' },
      ],
    },
    {
      key: 'start_date',
      label: 'Created From',
      type: 'date',
    },
    {
      key: 'end_date',
      label: 'Created To',
      type: 'date',
    },
  ],
  columns: [
    { key: 'request_no', label: 'Request #', type: 'string', sortable: true },
    { key: 'employee_name', label: 'Requester', type: 'string', sortable: true },
    { key: 'department', label: 'Department', type: 'string', sortable: true },
    { key: 'type_label', label: 'Request Type', type: 'enum', sortable: true },
    { key: 'priority_label', label: 'Priority', type: 'enum', sortable: true },
    { key: 'status_label', label: 'Status', type: 'enum', sortable: true },
    { key: 'created_at', label: 'Created At', type: 'date', sortable: true },
    { key: 'reviewed_at', label: 'Reviewed At', type: 'date', sortable: true },
    { key: 'fulfilled_at', label: 'Fulfilled At', type: 'date', sortable: true },
    { key: 'turnaround_hours', label: 'Turnaround (Hours)', type: 'number', sortable: true },
    { key: 'sla_due_at', label: 'SLA Due Date', type: 'date', sortable: true },
    { key: 'sla_breached', label: 'SLA Breached?', type: 'enum', sortable: true },
  ],
  defaultSort: { key: 'created_at', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const reqWhere: Record<string, unknown> = { status: STATUS.ACTIVE };

    if (options.filters?.request_type && options.filters.request_type !== 'all') {
      reqWhere.request_type = Number(options.filters.request_type);
    }
    if (options.filters?.priority && options.filters.priority !== 'all') {
      reqWhere.priority = Number(options.filters.priority);
    }
    if (options.filters?.breached_only === 'true' || options.filters?.breached_only === true) {
      reqWhere.sla_breached = 1;
    }

    const dateBounds = parseDateBounds(
      options.filters?.start_date as string | undefined,
      options.filters?.end_date as string | undefined,
    );
    if (dateBounds) {
      reqWhere.createdAt = { [Op.between]: [dateBounds.start, dateBounds.end] };
    }

    const { rows, count } = await requests.findAndCountAll({
      where: reqWhere,
      include: [
        {
          model: employees,
          as: 'employee',
          include: [{ model: departments, as: 'department' }],
        },
      ],
      order: [['createdAt', 'DESC']],
      limit: pageSize,
      offset,
    });

    const typeMap: Record<number, string> = {
      1: 'hardware_allocation',
      2: 'software_license',
      3: 'hardware_repair',
      4: 'hardware_return',
    };
    const priorityMap: Record<number, string> = {
      1: 'low',
      2: 'medium',
      3: 'high',
      4: 'urgent',
    };
    const statusMap: Record<number, string> = {
      1: 'pending_review',
      2: 'in_review',
      3: 'approved',
      4: 'rejected',
      5: 'fulfilled',
      6: 'cancelled',
    };

    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const emp = (plain.employee as Record<string, unknown>) || {};
      const dept = (emp.department as Record<string, unknown>) || {};

      const created = new Date(plain.createdAt as string);
      let turnaroundHours = 0;
      if (plain.fulfilled_at) {
        const fulfilled = new Date(plain.fulfilled_at as string);
        turnaroundHours = Math.max(
          0,
          Math.round((fulfilled.getTime() - created.getTime()) / 3600000),
        );
      }

      return {
        id: plain.id,
        request_no: String(plain.request_no || '—'),
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—',
        department: String(dept.name || '—'),
        type_label: typeMap[Number(plain.request_type)] || 'other',
        priority_label: priorityMap[Number(plain.priority)] || 'medium',
        status_label: statusMap[Number(plain.request_status)] || 'pending',
        created_at: plain.createdAt,
        reviewed_at: plain.reviewed_at || null,
        fulfilled_at: plain.fulfilled_at || null,
        turnaround_hours: turnaroundHours,
        sla_due_at: plain.sla_due_at || null,
        sla_breached: Number(plain.sla_breached) === 1 ? 'breached' : 'within_sla',
      };
    });

    // Summary calculations
    const allMatching = await requests.findAll({
      where: reqWhere,
      attributes: ['request_status', 'sla_breached', 'createdAt', 'fulfilled_at'],
      raw: true,
    });

    interface RequestSummaryRow {
      request_status?: number | string | null;
      sla_breached?: number | boolean | null;
      createdAt?: string | Date;
      fulfilled_at?: string | Date | null;
    }
    const reqList = allMatching as unknown as RequestSummaryRow[];

    const totalRequests = reqList.length;
    const fulfilledRequests = reqList.filter((m) => m.fulfilled_at);
    const breachedCount = reqList.filter((m) => Number(m.sla_breached) === 1).length;
    const breachRate = totalRequests > 0 ? Math.round((breachedCount / totalRequests) * 100) : 0;

    const avgHours =
      fulfilledRequests.length > 0
        ? Math.round(
            fulfilledRequests.reduce((sum, m) => {
              const h =
                (new Date(String(m.fulfilled_at)).getTime() -
                  new Date(String(m.createdAt)).getTime()) /
                3600000;
              return sum + Math.max(0, h);
            }, 0) / fulfilledRequests.length,
          )
        : 0;

    return {
      key: this.key,
      rows: mappedRows,
      count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      columns: this.columns,
      summary: [
        { key: 'total_requests', label: 'Total Requests', value: totalRequests, tone: 'primary' },
        {
          key: 'fulfilled_count',
          label: 'Fulfilled Requests',
          value: fulfilledRequests.length,
          tone: 'success',
        },
        {
          key: 'avg_turnaround_hours',
          label: 'Avg Fulfillment (Hours)',
          value: avgHours,
          tone: 'secondary',
        },
        {
          key: 'breach_rate',
          label: 'SLA Breach Rate (%)',
          value: `${breachRate}%`,
          tone: breachRate > 15 ? 'danger' : 'success',
        },
      ],
    };
  },

  async *stream(options, actor) {
    let page = 1;
    while (true) {
      const res = await this.run({ ...options, currentPage: page, itemsPerPage: 500 }, actor);
      if (!res.rows.length) break;
      yield res.rows;
      if (page >= res.totalPages) break;
      page++;
    }
  },
};
