import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { requests } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R7: Request Turnaround & SLA Compliance', () => {
  it('computes exact turnaround hours, SLA breach status and priority mapping', async () => {
    const req = await requests.findOne({
      where: { request_no: 'REQ-FIX-001' },
      attributes: [
        'id',
        'request_no',
        'priority',
        'request_status',
        'sla_breached',
        'createdAt',
        'fulfilled_at',
      ],
      raw: true,
    });
    expect(req).toBeTruthy();

    const reportResult = await reportService.runReport(
      'request-turnaround-sla',
      { filters: { start_date: '2026-11-18', end_date: '2026-11-19' }, itemsPerPage: 100 },
      adminActor,
    );

    const row = reportResult.rows.find((r) => r.request_no === 'REQ-FIX-001');
    expect(row).toBeDefined();
    expect(row?.request_no).toBe('REQ-FIX-001');
    expect(row?.priority_label).toBe('medium');
    expect(row?.status_label).toBe('fulfilled');
    expect(row?.sla_breached).toBe('within_sla');
    expect(Number(row?.turnaround_hours)).toBe(26);

    const breachSummary = reportResult.summary?.find((s) => s.key === 'breach_rate');
    expect(breachSummary).toBeDefined();
    expect(typeof breachSummary?.value).toBe('string');
  });
});
