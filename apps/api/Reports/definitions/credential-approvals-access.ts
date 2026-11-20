import { Op } from 'sequelize';
import type { ReportDefinition, ReportRunOptions } from '../types';
import type { UserInfo } from '../../Types/api';
import {
  credentials,
  credential_types,
  credential_access_logs,
  employees,
  users,
} from '../../Database/Schema';
import { STATUS } from '@hm/shared';
import { parseDateBounds } from '../helpers';

export const credentialApprovalsAccessReport: ReportDefinition = {
  key: 'credential-approvals-access',
  title: 'Credential Approvals & Access Audits',
  description:
    'Strict audit log of credential approvals, submissions, and access reveals with zero password exposure.',
  category: 'security',
  module: 'report',
  allowedRoles: ['super_admin'],
  filters: [
    {
      key: 'approval_status',
      label: 'Approval Status',
      type: 'enum',
      options: [
        { label: 'All', value: 'all' },
        { label: 'Pending Review', value: '1' },
        { label: 'Approved', value: '2' },
        { label: 'Rejected', value: '3' },
      ],
    },
    {
      key: 'credential_type_id',
      label: 'Credential Type',
      type: 'id-select',
      endpoint: '/credential-type/options',
    },
    {
      key: 'start_date',
      label: 'Submitted From',
      type: 'date',
    },
    {
      key: 'end_date',
      label: 'Submitted To',
      type: 'date',
    },
  ],
  columns: [
    { key: 'label', label: 'Credential Name', type: 'string', sortable: true },
    { key: 'credential_type', label: 'Type', type: 'string', sortable: true },
    { key: 'employee_name', label: 'Owner / Assignee', type: 'string', sortable: true },
    { key: 'username', label: 'Username / Account', type: 'string', sortable: true },
    { key: 'url', label: 'URL / Host', type: 'string', sortable: false },
    { key: 'approval_status', label: 'Status', type: 'enum', sortable: true },
    { key: 'reveal_count', label: 'Reveal Count', type: 'number', sortable: true },
    { key: 'last_revealed_at', label: 'Last Revealed At', type: 'date', sortable: true },
    { key: 'submitted_at', label: 'Submitted At', type: 'date', sortable: true },
    { key: 'reviewed_by_name', label: 'Reviewed By', type: 'string', sortable: true },
  ],
  defaultSort: { key: 'submitted_at', direction: 'desc' },

  async run(options: ReportRunOptions, _actor: UserInfo) {
    const page = Math.max(1, Number(options.currentPage || 1));
    const pageSize = Math.min(100, Math.max(1, Number(options.itemsPerPage || 20)));
    const offset = (page - 1) * pageSize;

    const credWhere: Record<string, unknown> = { status: STATUS.ACTIVE };

    if (options.filters?.approval_status && options.filters.approval_status !== 'all') {
      credWhere.approval_status = Number(options.filters.approval_status);
    }
    if (options.filters?.credential_type_id) {
      credWhere.credential_type_id = options.filters.credential_type_id;
    }

    const dateBounds = parseDateBounds(
      options.filters?.start_date as string | undefined,
      options.filters?.end_date as string | undefined,
    );
    if (dateBounds) {
      credWhere.submitted_at = { [Op.between]: [dateBounds.start, dateBounds.end] };
    }

    // Explicitly query ONLY safe metadata columns, NEVER selecting password_enc, iv, auth_tag, key_version!
    const { rows, count } = await credentials.findAndCountAll({
      where: credWhere,
      attributes: [
        'id',
        'label',
        'username',
        'url',
        'approval_status',
        'submitted_at',
        'last_revealed_at',
        'reviewed_at',
        'reviewed_by',
        'employee_id',
        'credential_type_id',
      ],
      include: [
        { model: credential_types, as: 'credential_type', attributes: ['id', 'name'] },
        {
          model: employees,
          as: 'employee',
          attributes: ['id', 'first_name', 'last_name', 'employee_code'],
        },
        { model: users, as: 'reviewer', attributes: ['id', 'first_name', 'last_name', 'email'] },
      ],
      order: [['submitted_at', 'DESC']],
      limit: pageSize,
      offset,
    });

    // Count access reveals per credential in batch
    const credIds = rows.map((r) => r.get('id') as number);
    const accessLogs =
      credIds.length > 0
        ? await credential_access_logs.findAll({
            where: { credential_id: { [Op.in]: credIds } },
            attributes: ['credential_id'],
            raw: true,
          })
        : [];

    const revealCountMap = new Map<number, number>();
    for (const log of accessLogs as unknown as Array<{ credential_id: number | string }>) {
      const cId = Number(log.credential_id);
      revealCountMap.set(cId, (revealCountMap.get(cId) || 0) + 1);
    }

    const statusMap: Record<number, string> = {
      1: 'pending',
      2: 'approved',
      3: 'rejected',
    };

    const mappedRows = rows.map((r) => {
      const plain = r.get({ plain: true }) as Record<string, unknown>;
      const cType = (plain.credential_type as Record<string, unknown>) || {};
      const emp = (plain.employee as Record<string, unknown>) || {};
      const rev = (plain.reviewer as Record<string, unknown>) || {};
      const id = Number(plain.id);

      return {
        id,
        label: String(plain.label || '—'),
        credential_type: String(cType.name || 'General'),
        employee_name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || '—',
        username: String(plain.username || '—'),
        url: String(plain.url || '—'),
        approval_status: statusMap[Number(plain.approval_status)] || 'pending',
        reveal_count: revealCountMap.get(id) || 0,
        last_revealed_at: plain.last_revealed_at || null,
        submitted_at: plain.submitted_at || null,
        reviewed_by_name: rev.first_name ? `${rev.first_name} ${rev.last_name || ''}`.trim() : '—',
      };
    });

    const totalCredentials = await credentials.count({ where: credWhere });
    const pendingCount = await credentials.count({
      where: { ...credWhere, approval_status: 1 },
    });
    const approvedCount = await credentials.count({
      where: { ...credWhere, approval_status: 2 },
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
          key: 'total_credentials',
          label: 'Total Tracked Credentials',
          value: totalCredentials,
          tone: 'primary',
        },
        {
          key: 'pending_approvals',
          label: 'Pending Approvals',
          value: pendingCount,
          tone: 'warning',
        },
        {
          key: 'approved_count',
          label: 'Approved & Active',
          value: approvedCount,
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
