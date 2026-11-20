import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  assets,
  asset_categories,
  locations,
  asset_assignments,
  employees,
} from '../../Database/Schema';
import { STATUS } from '@hm/shared';

export const assignedVsUnassignedReport: ReportDefinition = {
  key: 'assigned-vs-unassigned',
  title: 'Assigned vs Unassigned Hardware',
  description:
    'Detailed inventory distribution comparing deployed assets with in-stock spare units and deployment age.',
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
      key: 'location_id',
      label: 'Location',
      type: 'id-select',
      endpoint: '/location/options',
    },
    {
      key: 'assignment_status',
      label: 'Deployment Status',
      type: 'enum',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Assigned (Deployed)', value: 'assigned' },
        { label: 'Unassigned (In Stock)', value: 'unassigned' },
      ],
    },
  ],
  columns: [
    { key: 'asset_tag', label: 'Asset Tag', type: 'string', sortable: true },
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'brand', label: 'Brand', type: 'string', sortable: true },
    { key: 'model', label: 'Model', type: 'string', sortable: true },
    { key: 'serial_number', label: 'Serial No', type: 'string', sortable: true },
    { key: 'location', label: 'Location', type: 'string', sortable: true },
    { key: 'assignment_status', label: 'Status', type: 'enum', sortable: true },
    { key: 'assignee_name', label: 'Assignee', type: 'string', sortable: true },
    { key: 'assigned_date', label: 'Assigned Date', type: 'date', sortable: true },
    { key: 'days_deployed', label: 'Days Deployed', type: 'number', sortable: true },
  ],
  defaultSort: { key: 'asset_tag', direction: 'asc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const assetWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.category_id) {
      assetWhere.category_id = options.filters.category_id;
    }
    if (options.filters?.location_id) {
      assetWhere.location_id = options.filters.location_id;
    }

    const { rows, count } = await assets.findAndCountAll({
      where: assetWhere,
      include: [
        { model: asset_categories, as: 'category' },
        { model: locations, as: 'location' },
        {
          model: asset_assignments,
          as: 'assignments',
          required: false,
          where: { status: STATUS.ACTIVE, returned_at: null },
          include: [{ model: employees, as: 'employee' }],
        },
      ],
      order: [['asset_tag', 'ASC']],
      limit: pageSize,
      offset,
    });

    const now = new Date();
    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const cat = (plain.category as Record<string, unknown>) || {};
      const loc = (plain.location as Record<string, unknown>) || {};
      const assignList = (plain.assignments as Array<Record<string, unknown>>) || [];
      const currentAssign = assignList[0];
      const emp = currentAssign ? (currentAssign.employee as Record<string, unknown>) : null;

      const isAssigned = !!currentAssign;
      let daysDeployed = 0;
      if (isAssigned && currentAssign.assigned_at) {
        const assignDate = new Date(currentAssign.assigned_at as string);
        daysDeployed = Math.max(0, Math.floor((now.getTime() - assignDate.getTime()) / 86400000));
      }

      return {
        id: plain.id,
        asset_tag: String(plain.asset_tag || '—'),
        category: String(cat.name || '—'),
        brand: String(plain.brand || '—'),
        model: String(plain.model || '—'),
        serial_number: String(plain.serial_no || '—'),
        location: String(loc.name || '—'),
        assignment_status: isAssigned ? 'assigned' : 'unassigned',
        assignee_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '—',
        assigned_date: currentAssign?.assigned_at || null,
        days_deployed: isAssigned ? daysDeployed : 0,
      };
    });

    // Apply assignment_status filter in memory if specified
    const filterStatus = options.filters?.assignment_status;
    let filteredRows = mappedRows;
    if (filterStatus && filterStatus !== 'all') {
      filteredRows = mappedRows.filter((r) => r.assignment_status === filterStatus);
    }

    // Aggregates for summary
    const totalAssets = await assets.count({ where: assetWhere });
    const assignedCount = await asset_assignments.count({
      where: { status: STATUS.ACTIVE, returned_at: null },
      include: [{ model: assets, as: 'asset', where: assetWhere }],
    });
    const unassignedCount = Math.max(0, totalAssets - assignedCount);
    const deploymentRate = totalAssets > 0 ? Math.round((assignedCount / totalAssets) * 100) : 0;

    return {
      key: this.key,
      rows: filteredRows,
      count: filterStatus && filterStatus !== 'all' ? filteredRows.length : count,
      page,
      pageSize,
      totalPages: Math.ceil(
        (filterStatus && filterStatus !== 'all' ? filteredRows.length : count) / pageSize,
      ),
      columns: this.columns,
      summary: [
        { key: 'total_assets', label: 'Total Tracked Assets', value: totalAssets, tone: 'primary' },
        {
          key: 'assigned_count',
          label: 'Currently Assigned',
          value: assignedCount,
          tone: 'success',
        },
        {
          key: 'unassigned_count',
          label: 'Available In Stock',
          value: unassignedCount,
          tone: 'warning',
        },
        {
          key: 'deployment_rate',
          label: 'Deployment Rate (%)',
          value: `${deploymentRate}%`,
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
