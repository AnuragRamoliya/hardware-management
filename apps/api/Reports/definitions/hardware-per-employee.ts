import { fn, col } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  asset_assignments,
  assets,
  employees,
  departments,
  asset_categories,
} from '../../Database/Schema';
import { STATUS } from '@hm/shared';

export const hardwarePerEmployeeReport: ReportDefinition = {
  key: 'hardware-per-employee',
  title: 'Hardware Per Employee',
  description:
    'Overview of company hardware assets currently deployed to employees across departments.',
  category: 'hardware',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager'],
  filters: [
    {
      key: 'employee_id',
      label: 'Employee',
      type: 'id-select',
      endpoint: '/employee/options',
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'id-select',
      endpoint: '/department/options',
    },
    {
      key: 'category_id',
      label: 'Asset Category',
      type: 'id-select',
      endpoint: '/asset-category/options',
    },
    {
      key: 'condition',
      label: 'Condition',
      type: 'enum',
      options: [
        { label: 'New', value: 'new' },
        { label: 'Good', value: 'good' },
        { label: 'Fair', value: 'fair' },
        { label: 'Poor', value: 'poor' },
      ],
    },
  ],
  columns: [
    { key: 'employee_name', label: 'Employee', type: 'string', sortable: true },
    { key: 'employee_code', label: 'Employee Code', type: 'string', sortable: true },
    { key: 'department', label: 'Department', type: 'string', sortable: true },
    { key: 'asset_tag', label: 'Asset Tag', type: 'string', sortable: true },
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'model', label: 'Model', type: 'string', sortable: true },
    { key: 'serial_number', label: 'Serial No', type: 'string', sortable: true },
    { key: 'assigned_date', label: 'Assigned Date', type: 'date', sortable: true },
    { key: 'condition', label: 'Condition', type: 'enum', sortable: true },
    { key: 'warranty_end', label: 'Warranty Expiry', type: 'date', sortable: true },
  ],
  defaultSort: { key: 'assigned_date', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const assignWhere: Record<string, unknown> = {
      status: STATUS.ACTIVE,
      returned_at: null,
    };
    if (options.filters?.employee_id) {
      assignWhere.employee_id = options.filters.employee_id;
    }
    const empWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.department_id) {
      empWhere.department_id = options.filters.department_id;
    }
    const assetWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.category_id) {
      assetWhere.category_id = options.filters.category_id;
    }
    if (options.filters?.condition) {
      assetWhere.condition = options.filters.condition;
    }

    const { rows, count } = await asset_assignments.findAndCountAll({
      where: assignWhere,
      include: [
        {
          model: employees,
          as: 'employee',
          where: empWhere,
          include: [{ model: departments, as: 'department' }],
        },
        {
          model: assets,
          as: 'asset',
          where: assetWhere,
          include: [{ model: asset_categories, as: 'category' }],
        },
      ],
      order: [['assigned_at', 'DESC']],
      limit: pageSize,
      offset,
    });

    const mappedRows = rows.map((r) => {
      const plainAssign = r.get({ plain: true }) as Record<string, unknown>;
      const emp = (plainAssign.employee as Record<string, unknown>) || {};
      const dept = (emp.department as Record<string, unknown>) || {};
      const ast = (plainAssign.asset as Record<string, unknown>) || {};
      const cat = (ast.category as Record<string, unknown>) || {};

      return {
        id: plainAssign.id,
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—',
        employee_code: String(emp.employee_code || '—'),
        department: String(dept.name || '—'),
        asset_tag: String(ast.asset_tag || '—'),
        category: String(cat.name || '—'),
        model: String(ast.model || ast.name || '—'),
        serial_number: String(ast.serial_no || '—'),
        assigned_date: plainAssign.assigned_at,
        condition: String(plainAssign.condition_on_assignment || 'good'),
        warranty_end: ast.warranty_end,
      };
    });

    // Summary aggregates
    const [summaryData] = await asset_assignments.findAll({
      where: assignWhere,
      include: [
        { model: employees, as: 'employee', where: empWhere },
        { model: assets, as: 'asset', where: assetWhere },
      ],
      attributes: [
        [fn('COUNT', col('asset_assignments.id')), 'total_count'],
        [fn('COUNT', fn('DISTINCT', col('asset_assignments.employee_id'))), 'unique_employees'],
      ],
      raw: true,
    });

    const totalCount = Number(
      (summaryData as unknown as Record<string, unknown>)?.total_count || count,
    );
    const uniqueEmployees = Number(
      (summaryData as unknown as Record<string, unknown>)?.unique_employees || 0,
    );

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
          key: 'total_assignments',
          label: 'Total Assigned Assets',
          value: totalCount,
          tone: 'primary',
        },
        {
          key: 'unique_employees',
          label: 'Employees with Hardware',
          value: uniqueEmployees,
          tone: 'secondary',
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
