import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { software, software_licenses, software_assignments } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R4: Software License Utilization', () => {
  it('computes exact seat allocations, available buffers, and utilization percentages', async () => {
    const swRecord = await software.findOne({
      where: { name: 'Fixture IDE Enterprise' },
      attributes: ['id', 'name'],
      raw: true,
    });
    expect(swRecord).toBeTruthy();
    const swId = Number((swRecord as unknown as { id: number }).id);

    // Independent SQL check
    const licRecord = await software_licenses.findOne({
      where: { software_id: swId },
      attributes: ['seats_total'],
      raw: true,
    });
    const seatsTotal = Number((licRecord as unknown as { seats_total: number })?.seats_total || 10);
    expect(seatsTotal).toBe(10);

    const activeAssignments = await software_assignments.count({
      where: { software_id: swId, revoked_at: null },
    });
    expect(activeAssignments).toBe(1);

    const reportResult = await reportService.runReport(
      'software-license-utilization',
      { filters: { software_id: swId } },
      adminActor,
    );

    const row = reportResult.rows.find((r) => r.software_name === 'Fixture IDE Enterprise');
    expect(row).toBeDefined();
    expect(Number(row?.seats_total)).toBe(10);
    expect(Number(row?.seats_assigned)).toBe(1);
    expect(Number(row?.seats_available)).toBe(9);
    expect(Number(row?.utilization_pct)).toBe(10);
    expect(row?.is_over_allocated).toBe('no');

    // Summaries
    const totalSeatsSummary = reportResult.summary?.find((s) => s.key === 'total_seats');
    expect(totalSeatsSummary).toBeDefined();
    expect(Number(totalSeatsSummary?.value)).toBeGreaterThanOrEqual(10);
  });
});
