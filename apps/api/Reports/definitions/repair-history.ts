import { Op } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import { asset_maintenance, assets, asset_categories, vendors } from '../../Database/Schema';
import { STATUS } from '@hm/shared';
import { parseDateBounds } from '../helpers';

export const repairHistoryReport: ReportDefinition = {
  key: 'repair-history',
  title: 'Hardware Repair & Maintenance History',
  description:
    'Complete maintenance ticket logs, vendor repair durations, expenses, and return resolutions.',
  category: 'lifecycle',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager'],
  filters: [
    {
      key: 'vendor_id',
      label: 'Service Vendor',
      type: 'id-select',
      endpoint: '/vendor/options',
    },
    {
      key: 'maintenance_status',
      label: 'Maintenance Status',
      type: 'enum',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Under Repair', value: '1' },
        { label: 'Returned / Resolved', value: '2' },
        { label: 'Unrepairable', value: '3' },
      ],
    },
    {
      key: 'start_date',
      label: 'Sent From Date',
      type: 'date',
    },
    {
      key: 'end_date',
      label: 'Sent To Date',
      type: 'date',
    },
  ],
  columns: [
    { key: 'asset_tag', label: 'Asset Tag', type: 'string', sortable: true },
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'issue', label: 'Reported Issue', type: 'string', sortable: false },
    { key: 'vendor_name', label: 'Service Vendor', type: 'string', sortable: true },
    { key: 'sent_at', label: 'Date Sent', type: 'date', sortable: true },
    { key: 'returned_at', label: 'Date Returned', type: 'date', sortable: true },
    { key: 'turnaround_days', label: 'Turnaround (Days)', type: 'number', sortable: true },
    { key: 'cost', label: 'Repair Cost', type: 'currency', sortable: true },
    { key: 'status_label', label: 'Status', type: 'enum', sortable: true },
    { key: 'resolution', label: 'Resolution Summary', type: 'string', sortable: false },
  ],
  defaultSort: { key: 'sent_at', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const maintWhere: Record<string, unknown> = { status: STATUS.ACTIVE };

    if (options.filters?.vendor_id) {
      maintWhere.vendor_id = options.filters.vendor_id;
    }
    if (options.filters?.maintenance_status && options.filters.maintenance_status !== 'all') {
      maintWhere.maintenance_status = Number(options.filters.maintenance_status);
    }

    const dateBounds = parseDateBounds(
      options.filters?.start_date as string | undefined,
      options.filters?.end_date as string | undefined,
    );
    if (dateBounds) {
      maintWhere.sent_at = { [Op.between]: [dateBounds.start, dateBounds.end] };
    }

    const { rows, count } = await asset_maintenance.findAndCountAll({
      where: maintWhere,
      include: [
        {
          model: assets,
          as: 'asset',
          include: [{ model: asset_categories, as: 'category' }],
        },
      ],
      order: [['sent_at', 'DESC']],
      limit: pageSize,
      offset,
    });

    const now = new Date();
    // Fetch vendor map
    const allVendors = await vendors.findAll({ attributes: ['id', 'name'], raw: true });
    const vendorMap = new Map<number, string>(
      (allVendors as unknown as Array<{ id: number; name: string }>).map((v) => [
        Number(v.id),
        String(v.name),
      ]),
    );

    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const ast = (plain.asset as Record<string, unknown>) || {};
      const cat = (ast.category as Record<string, unknown>) || {};
      const vName = plain.vendor_id ? vendorMap.get(Number(plain.vendor_id)) || '—' : '—';

      const sent = plain.sent_at ? new Date(plain.sent_at as string) : null;
      const returned = plain.returned_at ? new Date(plain.returned_at as string) : null;

      let turnaroundDays = 0;
      if (sent) {
        const endPoint = returned || now;
        turnaroundDays = Math.max(0, Math.floor((endPoint.getTime() - sent.getTime()) / 86400000));
      }

      const st = Number(plain.maintenance_status);
      const stLabel = st === 1 ? 'under_repair' : st === 2 ? 'returned' : 'unrepairable';

      return {
        id: plain.id,
        asset_tag: String(ast.asset_tag || '—'),
        category: String(cat.name || '—'),
        issue: String(plain.issue || '—'),
        vendor_name: vName,
        sent_at: plain.sent_at,
        returned_at: plain.returned_at,
        turnaround_days: turnaroundDays,
        cost: plain.cost ? Number(plain.cost) : 0,
        status_label: stLabel,
        resolution: String(plain.resolution || '—'),
      };
    });

    // Summary calculations
    const allMaint = await asset_maintenance.findAll({
      where: maintWhere,
      attributes: ['cost', 'maintenance_status', 'sent_at', 'returned_at'],
      raw: true,
    });

    interface MaintSummaryRow {
      cost?: number | string | null;
      maintenance_status?: number | string | null;
      sent_at?: string | null;
      returned_at?: string | null;
    }
    const maintList = allMaint as unknown as MaintSummaryRow[];

    const totalCost = maintList.reduce((acc, m) => acc + (Number(m.cost) || 0), 0);
    const underRepairCount = maintList.filter((m) => Number(m.maintenance_status) === 1).length;
    const resolvedList = maintList.filter((m) => m.sent_at && m.returned_at);
    const avgTurnaround =
      resolvedList.length > 0
        ? Math.round(
            resolvedList.reduce((acc, m) => {
              const diff = Math.floor(
                (new Date(String(m.returned_at)).getTime() -
                  new Date(String(m.sent_at)).getTime()) /
                  86400000,
              );
              return acc + Math.max(0, diff);
            }, 0) / resolvedList.length,
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
        { key: 'total_tickets', label: 'Maintenance Tickets', value: count, tone: 'primary' },
        {
          key: 'under_repair_count',
          label: 'Currently in Repair',
          value: underRepairCount,
          tone: 'warning',
        },
        {
          key: 'avg_turnaround_days',
          label: 'Avg Turnaround (Days)',
          value: avgTurnaround,
          tone: 'secondary',
        },
        { key: 'total_cost', label: 'Total Maintenance Spend', value: totalCost, tone: 'primary' },
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
