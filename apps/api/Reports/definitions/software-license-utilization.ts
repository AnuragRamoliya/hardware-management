import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import { software, software_licenses, software_assignments, vendors } from '../../Database/Schema';
import { STATUS } from '@hm/shared';

export const softwareLicenseUtilizationReport: ReportDefinition = {
  key: 'software-license-utilization',
  title: 'Software License Utilization',
  description:
    'Seat allocation, utilization percentages, and over-allocation monitoring across all software licenses.',
  category: 'software',
  module: 'report',
  allowedRoles: ['super_admin', 'hardware_manager'],
  filters: [
    {
      key: 'software_id',
      label: 'Software Application',
      type: 'id-select',
      endpoint: '/software/options',
    },
    {
      key: 'vendor_id',
      label: 'Vendor',
      type: 'id-select',
      endpoint: '/vendor/options',
    },
    {
      key: 'over_allocated_only',
      label: 'Show Over-Allocated Only',
      type: 'enum',
      options: [
        { label: 'All Licenses', value: 'false' },
        { label: 'Over-Allocated Only', value: 'true' },
      ],
    },
  ],
  columns: [
    { key: 'software_name', label: 'Software Application', type: 'string', sortable: true },
    { key: 'category', label: 'Category', type: 'string', sortable: true },
    { key: 'license_type', label: 'License Type', type: 'string', sortable: true },
    { key: 'vendor_name', label: 'Vendor', type: 'string', sortable: true },
    { key: 'seats_total', label: 'Total Seats', type: 'number', sortable: true },
    { key: 'seats_assigned', label: 'Assigned Seats', type: 'number', sortable: true },
    { key: 'seats_available', label: 'Available Seats', type: 'number', sortable: true },
    { key: 'utilization_pct', label: 'Utilization (%)', type: 'number', sortable: true },
    { key: 'is_over_allocated', label: 'Over-Allocated?', type: 'enum', sortable: true },
    { key: 'renewal_date', label: 'Renewal Date', type: 'date', sortable: true },
  ],
  defaultSort: { key: 'software_name', direction: 'asc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const swWhere: Record<string, unknown> = { status: STATUS.ACTIVE };
    if (options.filters?.software_id) {
      swWhere.id = options.filters.software_id;
    }
    if (options.filters?.vendor_id) {
      swWhere.vendor_id = options.filters.vendor_id;
    }

    const allSoftware = await software.findAll({
      where: swWhere,
      include: [
        { model: vendors, as: 'vendor' },
        {
          model: software_licenses,
          as: 'licenses',
          where: { status: STATUS.ACTIVE },
          required: false,
        },
        {
          model: software_assignments,
          as: 'assignments',
          where: { status: STATUS.ACTIVE },
          required: false,
        },
      ],
      order: [['name', 'ASC']],
    });

    const rows = allSoftware.map((s) => {
      const plain = s.get({ plain: true }) as Record<string, unknown>;
      const vend = (plain.vendor as Record<string, unknown>) || {};
      const licenses = (plain.licenses as Array<Record<string, unknown>>) || [];
      const assignments = (plain.assignments as Array<Record<string, unknown>>) || [];

      const totalSeats = licenses.reduce((sum, l) => sum + (Number(l.seats_total) || 0), 0);
      const assignedSeats = assignments.length;
      const availableSeats = Math.max(0, totalSeats - assignedSeats);
      const utilization = totalSeats > 0 ? Math.round((assignedSeats / totalSeats) * 100) : 0;
      const isOverAllocated = assignedSeats > totalSeats;

      return {
        id: plain.id,
        software_name: String(plain.name || '—'),
        category: String(plain.category || 'General'),
        license_type: String(plain.license_type || 'Perpetual'),
        vendor_name: String(vend.name || '—'),
        seats_total: totalSeats,
        seats_assigned: assignedSeats,
        seats_available: isOverAllocated ? 0 : availableSeats,
        utilization_pct: utilization,
        is_over_allocated: isOverAllocated ? 'yes' : 'no',
        renewal_date: plain.renewal_date || null,
      };
    });

    const overAllocFilter =
      options.filters?.over_allocated_only === 'true' ||
      options.filters?.over_allocated_only === true;
    const filteredRows = overAllocFilter ? rows.filter((r) => r.is_over_allocated === 'yes') : rows;

    const totalCount = filteredRows.length;
    const pagedRows = filteredRows.slice(offset, offset + pageSize);

    const grandTotalSeats = rows.reduce((acc, r) => acc + r.seats_total, 0);
    const grandAssignedSeats = rows.reduce((acc, r) => acc + r.seats_assigned, 0);
    const overAllocatedCount = rows.filter((r) => r.is_over_allocated === 'yes').length;
    const avgUtil =
      grandTotalSeats > 0 ? Math.round((grandAssignedSeats / grandTotalSeats) * 100) : 0;

    return {
      key: this.key,
      rows: pagedRows,
      count: totalCount,
      page,
      pageSize,
      totalPages: Math.ceil(totalCount / pageSize),
      columns: this.columns,
      summary: [
        {
          key: 'total_seats',
          label: 'Total Purchased Seats',
          value: grandTotalSeats,
          tone: 'primary',
        },
        {
          key: 'assigned_seats',
          label: 'Allocated Seats',
          value: grandAssignedSeats,
          tone: 'secondary',
        },
        {
          key: 'average_utilization',
          label: 'Average Utilization',
          value: `${avgUtil}%`,
          tone: avgUtil > 90 ? 'warning' : 'success',
        },
        {
          key: 'over_allocated_count',
          label: 'Over-Allocated Apps',
          value: overAllocatedCount,
          tone: overAllocatedCount > 0 ? 'danger' : 'success',
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
