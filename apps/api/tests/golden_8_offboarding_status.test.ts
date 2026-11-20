import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { offboarding_cases } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R8: Employee Offboarding & Asset Recovery Status', () => {
  it('computes exact pending asset recovery counts, clearance statuses and case states', async () => {
    const offCase = await offboarding_cases.findOne({
      where: { case_no: 'OFF-FIX-001' },
      attributes: ['id', 'case_no', 'case_status', 'last_working_date'],
      raw: true,
    });
    expect(offCase).toBeTruthy();

    const reportResult = await reportService.runReport(
      'offboarding-status',
      { filters: { start_date: '2026-11-01', end_date: '2026-11-30' }, itemsPerPage: 100 },
      adminActor,
    );

    const row = reportResult.rows.find((r) => r.case_no === 'OFF-FIX-001');
    expect(row).toBeDefined();
    expect(row?.case_no).toBe('OFF-FIX-001');
    expect(row?.case_status).toBe('open');
    expect(Number(row?.pending_assets_count)).toBe(1);

    const openSummary = reportResult.summary?.find((s) => s.key === 'open_cases');
    expect(openSummary).toBeDefined();
    expect(Number(openSummary?.value)).toBeGreaterThanOrEqual(1);
  });
});
