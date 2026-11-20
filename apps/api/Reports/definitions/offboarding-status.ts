import { Op } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  offboarding_cases,
  offboarding_tasks,
  employees,
  departments,
} from '../../Database/Schema';
import { STATUS } from '@hm/shared';
import { parseDateBounds } from '../helpers';

export const offboardingStatusReport: ReportDefinition = {
  key: 'offboarding-status',
  title: 'Employee Offboarding & Asset Recovery Status',
  description:
    'Lifecycle monitoring of employee exits, pending asset returns, checklist milestones, and clearance credentials.',
  category: 'lifecycle',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager', 'hr'],
  filters: [
    {
      key: 'case_status',
      label: 'Case Status',
      type: 'enum',
      options: [
        { label: 'All Cases', value: 'all' },
        { label: 'Open', value: 'open' },
        { label: 'In Progress', value: 'in_progress' },
        { label: 'Clearance Ready', value: 'clearance_ready' },
        { label: 'Completed', value: 'completed' },
      ],
    },
    {
      key: 'start_date',
      label: 'LWD From',
      type: 'date',
    },
    {
      key: 'end_date',
      label: 'LWD To',
      type: 'date',
    },
  ],
  columns: [
    { key: 'case_no', label: 'Case #', type: 'string', sortable: true },
    { key: 'employee_name', label: 'Employee', type: 'string', sortable: true },
    { key: 'department', label: 'Department', type: 'string', sortable: true },
    { key: 'exit_type', label: 'Exit Type', type: 'enum', sortable: true },
    { key: 'last_working_date', label: 'Last Working Date', type: 'date', sortable: true },
    { key: 'case_status', label: 'Case Status', type: 'enum', sortable: true },
    { key: 'pending_assets_count', label: 'Pending Asset Returns', type: 'number', sortable: true },
    { key: 'pending_tasks_count', label: 'Pending Tasks', type: 'number', sortable: true },
    { key: 'clearance_number', label: 'Clearance #', type: 'string', sortable: true },
    { key: 'completed_at', label: 'Completed At', type: 'date', sortable: true },
  ],
  defaultSort: { key: 'last_working_date', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const caseWhere: Record<string, unknown> = { status: STATUS.ACTIVE };

    if (options.filters?.case_status && options.filters.case_status !== 'all') {
      caseWhere.case_status = options.filters.case_status;
    }

    const dateBounds = parseDateBounds(
      options.filters?.start_date as string | undefined,
      options.filters?.end_date as string | undefined,
    );
    if (dateBounds) {
      caseWhere.last_working_date = {
        [Op.between]: [
          dateBounds.start.toISOString().slice(0, 10),
          dateBounds.end.toISOString().slice(0, 10),
        ],
      };
    }

    const { rows, count } = await offboarding_cases.findAndCountAll({
      where: caseWhere,
      include: [
        {
          model: employees,
          as: 'employee',
          include: [{ model: departments, as: 'department' }],
        },
        {
          model: offboarding_tasks,
          as: 'tasks',
          required: false,
          where: { status: STATUS.ACTIVE },
        },
      ],
      order: [['last_working_date', 'DESC']],
      limit: pageSize,
      offset,
    });

    const exitTypeMap: Record<number, string> = {
      1: 'resignation',
      2: 'termination',
      3: 'retirement',
      4: 'contract_end',
    };

    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const emp = (plain.employee as Record<string, unknown>) || {};
      const dept = (emp.department as Record<string, unknown>) || {};
      const taskList = (plain.tasks as Array<Record<string, unknown>>) || [];

      const pendingTasks = taskList.filter(
        (t) => t.task_status !== 'completed' && t.task_status !== 'waived',
      );
      const pendingAssets = pendingTasks.filter((t) => t.task_type === 'asset_return');

      return {
        id: plain.id,
        case_no: String(plain.case_no || '—'),
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—',
        department: String(dept.name || '—'),
        exit_type: exitTypeMap[Number(plain.exit_type)] || 'resignation',
        last_working_date: plain.last_working_date,
        case_status: String(plain.case_status || 'open'),
        pending_assets_count: pendingAssets.length,
        pending_tasks_count: pendingTasks.length,
        clearance_number: String(plain.clearance_number || '—'),
        completed_at: plain.completed_at || null,
      };
    });

    // Summary
    const totalCases = await offboarding_cases.count({ where: caseWhere });
    const openCases = await offboarding_cases.count({
      where: { ...caseWhere, case_status: { [Op.in]: ['open', 'in_progress'] } },
    });
    const completedCases = await offboarding_cases.count({
      where: { ...caseWhere, case_status: 'completed' },
    });

    return {
      key: this.key,
      rows: mappedRows,
      count,
      page,
      pageSize,
      totalPages: Math.ceil(count / pageSize),
      columns: this.columns,
      summary: [
        {
          key: 'total_cases',
          label: 'Total Offboarding Cases',
          value: totalCases,
          tone: 'primary',
        },
        { key: 'open_cases', label: 'Active In Progress', value: openCases, tone: 'warning' },
        {
          key: 'completed_cases',
          label: 'Cleared & Completed',
          value: completedCases,
          tone: 'success',
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
