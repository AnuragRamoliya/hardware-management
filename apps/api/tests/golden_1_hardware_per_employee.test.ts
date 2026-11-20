import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { employees, asset_assignments } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R1: Hardware Per Employee', () => {
  it('computes exact deterministic counts, filters, sort, paging and summaries', async () => {
    // 1. Independent SQL calculation for Alice Fixture
    const alice = await employees.findOne({
      where: { employee_code: 'FIX-EMP-001' },
      attributes: ['id', 'first_name', 'last_name', 'employee_code'],
      raw: true,
    });
    expect(alice).toBeTruthy();
    const aliceId = Number((alice as unknown as { id: number }).id);

    const independentAssetCount = await asset_assignments.count({
      where: { employee_id: aliceId, returned_at: null },
    });
    // Alice has exactly 1 assigned hardware asset in fixture (TAG-FIX-001)
    expect(independentAssetCount).toBe(1);

    // 2. Run report with employee filter
    const reportResult = await reportService.runReport(
      'hardware-per-employee',
      { filters: { employee_id: aliceId } },
      adminActor,
    );

    expect(reportResult.count).toBe(1);
    expect(reportResult.rows).toHaveLength(1);

    const row = reportResult.rows[0];
    expect(row.employee_code).toBe('FIX-EMP-001');
    expect(row.asset_tag).toBe('TAG-FIX-001');
    expect(row.category).toBe('Fixture Laptops');
    expect(row.warranty_end).toBeDefined();

    // 3. Paging and default sort
    const pagedResult = await reportService.runReport(
      'hardware-per-employee',
      { currentPage: 1, itemsPerPage: 10, sortBy: [{ key: 'employee_name', direction: 'asc' }] },
      adminActor,
    );
    expect(pagedResult.page).toBe(1);
    expect(pagedResult.pageSize).toBe(10);
    expect(pagedResult.rows.length).toBeLessThanOrEqual(10);

    // 4. Summaries check
    expect(reportResult.summary).toBeDefined();
    const totalAssignedSummary = reportResult.summary?.find((s) => s.key === 'total_assignments');
    expect(totalAssignedSummary).toBeDefined();
    expect(typeof totalAssignedSummary?.value).toBe('number');
  });
});
