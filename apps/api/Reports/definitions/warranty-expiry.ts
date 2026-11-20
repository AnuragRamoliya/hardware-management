import { Op } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  assets,
  asset_categories,
  vendors,
  asset_assignments,
  employees,
} from '../../Database/Schema';
import { STATUS } from '@hm/shared';

export const warrantyExpiryReport: ReportDefinition = {
  key: 'warranty-expiry',
  title: 'Hardware Warranty Expiry',
  description:
    'Proactive tracking of assets with warranties ending within 30, 60, or 90 days, or already expired.',
  category: 'lifecycle',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager'],
  filters: [
    {
      key: 'window_days',
      label: 'Warranty Expiry Window',
      type: 'enum',
      options: [
        { label: 'Expiring in 30 Days', value: '30' },
        { label: 'Expiring in 60 Days', value: '60' },
        { label: 'Expiring in 90 Days', value: '90' },
        { label: 'Already Expired', value: 'expired' },
        { label: 'All Tracked Warranties', value: 'all' },
      ],
    },
    {
      key: 'category_id',
      label: 'Asset Category',
      type: 'id-select',
      endpoint: '/asset-category/options',
    },
    {
      key: 'vendor_id',
      label: 'Vendor',
      type: 'id-select',
      endpoint: '/vendor/options',
    },
  ],
  columns: [
    { key: 'asset_tag', label: 'Asset Tag', type: 'string', sortable: true },
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'brand', label: 'Brand', type: 'string', sortable: true },
    { key: 'model', label: 'Model', type: 'string', sortable: true },
    { key: 'serial_number', label: 'Serial No', type: 'string', sortable: true },
    { key: 'vendor_name', label: 'Vendor', type: 'string', sortable: true },
    { key: 'warranty_end', label: 'Warranty Expiry Date', type: 'date', sortable: true },
    { key: 'days_remaining', label: 'Days Remaining', type: 'number', sortable: true },
    { key: 'warranty_status', label: 'Status', type: 'enum', sortable: true },
    { key: 'assignee_name', label: 'Current Assignee', type: 'string', sortable: true },
  ],
  defaultSort: { key: 'warranty_end', direction: 'asc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);

    const assetWhere: Record<string, unknown> = {
      status: STATUS.ACTIVE,
      warranty_end: { [Op.ne]: null },
    };

    if (options.filters?.category_id) {
      assetWhere.category_id = options.filters.category_id;
    }
    if (options.filters?.vendor_id) {
      assetWhere.vendor_id = options.filters.vendor_id;
    }

    const windowFilter = String(options.filters?.window_days || '90');
    if (windowFilter === 'expired') {
      assetWhere.warranty_end = { [Op.lt]: todayStr };
    } else if (['30', '60', '90'].includes(windowFilter)) {
      const days = Number(windowFilter);
      const futureDate = new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
      assetWhere.warranty_end = { [Op.between]: [todayStr, futureDate] };
    }

    const { rows, count } = await assets.findAndCountAll({
      where: assetWhere,
      include: [
        { model: asset_categories, as: 'category' },
        { model: vendors, as: 'vendor' },
        {
          model: asset_assignments,
          as: 'assignments',
          required: false,
          where: { status: STATUS.ACTIVE, returned_at: null },
          include: [{ model: employees, as: 'employee' }],
        },
      ],
      order: [['warranty_end', 'ASC']],
      limit: pageSize,
      offset,
    });

    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const cat = (plain.category as Record<string, unknown>) || {};
      const vend = (plain.vendor as Record<string, unknown>) || {};
      const assignList = (plain.assignments as Array<Record<string, unknown>>) || [];
      const currentAssign = assignList[0];
      const emp = currentAssign ? (currentAssign.employee as Record<string, unknown>) : null;

      const wEnd = plain.warranty_end ? new Date(`${plain.warranty_end}T00:00:00Z`) : null;
      let daysRemaining = 0;
      let statusBadge = 'active';

      if (wEnd) {
        const diffMs = wEnd.getTime() - now.getTime();
        daysRemaining = Math.ceil(diffMs / 86400000);
        if (daysRemaining < 0) {
          statusBadge = 'expired';
        } else if (daysRemaining <= 30) {
          statusBadge = 'critical';
        } else if (daysRemaining <= 60) {
          statusBadge = 'expiring_soon';
        } else {
          statusBadge = 'active';
        }
      }

      return {
        id: plain.id,
        asset_tag: String(plain.asset_tag || '—'),
        category: String(cat.name || '—'),
        brand: String(plain.brand || '—'),
        model: String(plain.model || '—'),
        serial_number: String(plain.serial_no || '—'),
        vendor_name: String(vend.name || '—'),
        warranty_end: plain.warranty_end,
        days_remaining: daysRemaining,
        warranty_status: statusBadge,
        assignee_name: emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : '—',
      };
    });

    // Summary counts
    const in30DaysStr = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);
    const expiredCount = await assets.count({
      where: { status: STATUS.ACTIVE, warranty_end: { [Op.lt]: todayStr } },
    });
    const expiringIn30 = await assets.count({
      where: { status: STATUS.ACTIVE, warranty_end: { [Op.between]: [todayStr, in30DaysStr] } },
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
        { key: 'total_matching', label: 'Matching Assets', value: count, tone: 'primary' },
        { key: 'expired_total', label: 'Expired Warranties', value: expiredCount, tone: 'danger' },
        {
          key: 'expiring_30_days',
          label: 'Expiring in 30 Days',
          value: expiringIn30,
          tone: 'warning',
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
