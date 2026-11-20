import { fn, col } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  assets,
  asset_categories,
  departments,
  employees,
  asset_assignments,
} from '../../Database/Schema';
import { STATUS, ASSET_STATUS } from '@hm/shared';

export const assetsByCategoryDepartmentReport: ReportDefinition = {
  key: 'assets-by-category-department',
  title: 'Assets by Category and Department',
  description:
    'Aggregated breakdown of asset inventory across categories and departments with status distributions.',
  category: 'inventory',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager'],
  filters: [
    {
      key: 'category_id',
      label: 'Asset Category',
      type: 'id-select',
      endpoint: '/asset-category/options',
    },
    {
      key: 'department_id',
      label: 'Department',
      type: 'id-select',
      endpoint: '/department/options',
    },
  ],
  columns: [
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'department', label: 'Department', type: 'string', sortable: true },
    { key: 'total_assets', label: 'Total Assets', type: 'number', sortable: true },
    { key: 'active_assets', label: 'In Use', type: 'number', sortable: true },
    { key: 'spare_assets', label: 'In Stock (Spare)', type: 'number', sortable: true },
    { key: 'in_repair', label: 'In Repair', type: 'number', sortable: true },
    { key: 'retired', label: 'Retired', type: 'number', sortable: true },
  ],
  defaultSort: { key: 'total_assets', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    // Fetch all active categories & departments to construct cross-matrix aggregation
    const catWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.category_id) catWhere.id = options.filters.category_id;

    const deptWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.department_id) deptWhere.id = options.filters.department_id;

    const [allCategories, allDepartments] = await Promise.all([
      asset_categories.findAll({ where: catWhere, raw: true }),
      departments.findAll({ where: deptWhere, raw: true }),
    ]);

    const catMap = new Map<number, string>(
      (allCategories as unknown as Array<{ id: number | string; name: string }>).map((c) => [
        Number(c.id),
        c.name,
      ]),
    );
    const deptMap = new Map<number, string>(
      (allDepartments as unknown as Array<{ id: number | string; name: string }>).map((d) => [
        Number(d.id),
        d.name,
      ]),
    );

    // Query assigned assets grouped by asset.category_id and employee.department_id
    const assignedCounts = (await asset_assignments.findAll({
      where: { status: STATUS.ACTIVE, returned_at: null },
      attributes: [
        [col('asset.category_id'), 'category_id'],
        [col('employee.department_id'), 'department_id'],
        [fn('COUNT', col('asset_assignments.id')), 'assigned_count'],
      ],
      include: [
        { model: assets, as: 'asset', attributes: [] },
        { model: employees, as: 'employee', attributes: [] },
      ],
      group: [col('asset.category_id'), col('employee.department_id')],
      raw: true,
    })) as unknown as Array<{
      category_id: number;
      department_id: number;
      assigned_count: string | number;
    }>;

    // Query total assets per category and status
    const statusCounts = (await assets.findAll({
      where: { status: STATUS.ACTIVE },
      attributes: ['category_id', 'asset_status', [fn('COUNT', col('id')), 'count']],
      group: ['category_id', 'asset_status'],
      raw: true,
    })) as unknown as Array<{ category_id: number; asset_status: number; count: string | number }>;

    // Build row records per (category, department) pair
    const rowMap = new Map<
      string,
      {
        id: string;
        category: string;
        department: string;
        total_assets: number;
        active_assets: number;
        spare_assets: number;
        in_repair: number;
        retired: number;
      }
    >();

    for (const item of assignedCounts) {
      const cId = Number(item.category_id);
      const dId = Number(item.department_id);
      if (!catMap.has(cId) || !deptMap.has(dId)) continue;

      const key = `${cId}-${dId}`;
      const count = Number(item.assigned_count || 0);
      rowMap.set(key, {
        id: key,
        category: catMap.get(cId) || 'Uncategorized',
        department: deptMap.get(dId) || 'Unassigned',
        total_assets: count,
        active_assets: count,
        spare_assets: 0,
        in_repair: 0,
        retired: 0,
      });
    }

    // Include unassigned/in-stock/in-repair per category
    for (const sc of statusCounts) {
      const cId = Number(sc.category_id);
      if (!catMap.has(cId)) continue;
      const count = Number(sc.count || 0);
      const st = Number(sc.asset_status);
      const key = `${cId}-unassigned`;

      let entry = rowMap.get(key);
      if (!entry) {
        entry = {
          id: key,
          category: catMap.get(cId) || 'Uncategorized',
          department: '(Stock / Unassigned)',
          total_assets: 0,
          active_assets: 0,
          spare_assets: 0,
          in_repair: 0,
          retired: 0,
        };
        rowMap.set(key, entry);
      }

      if (st === ASSET_STATUS.AVAILABLE) {
        entry.spare_assets += count;
        entry.total_assets += count;
      } else if (st === ASSET_STATUS.IN_REPAIR || st === ASSET_STATUS.UNDER_REPAIR) {
        entry.in_repair += count;
        entry.total_assets += count;
      } else if (st === ASSET_STATUS.RETIRED) {
        entry.retired += count;
        entry.total_assets += count;
      }
    }

    const allRows = Array.from(rowMap.values()).filter((r) => r.total_assets > 0);
    allRows.sort((a, b) => b.total_assets - a.total_assets);

    const totalCount = allRows.length;
    const pagedRows = allRows.slice(offset, offset + pageSize);

    const grandTotal = allRows.reduce((sum, r) => sum + r.total_assets, 0);
    const totalActive = allRows.reduce((sum, r) => sum + r.active_assets, 0);
    const totalSpare = allRows.reduce((sum, r) => sum + r.spare_assets, 0);

    return {
      key: this.key,
      rows: pagedRows,
      count: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      columns: this.columns,
      summary: [
        { key: 'grand_total', label: 'Total Tracked Assets', value: grandTotal, tone: 'primary' },
        { key: 'total_active', label: 'Active Assigned', value: totalActive, tone: 'success' },
        { key: 'total_spare', label: 'Available Spare', value: totalSpare, tone: 'secondary' },
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
