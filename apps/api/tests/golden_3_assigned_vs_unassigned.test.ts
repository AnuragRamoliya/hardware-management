import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { asset_categories } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R3: Assigned vs Unassigned Hardware', () => {
  it('computes exact assignment statuses, ratios, and summary metrics', async () => {
    const fixCat = await asset_categories.findOne({
      where: { name: 'Fixture Laptops' },
      attributes: ['id', 'name'],
      raw: true,
    });
    const catId = Number((fixCat as unknown as { id: number }).id);

    const reportResult = await reportService.runReport(
      'assigned-vs-unassigned',
      { filters: { category_id: catId }, itemsPerPage: 50 },
      adminActor,
    );

    const fix1 = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-001');
    const fix2 = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-002');
    const fix3 = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-003');

    expect(fix1).toBeDefined();
    expect(fix1?.assignment_status).toBe('assigned');
    expect(fix1?.brand).toBe('Dell');
    expect(fix1?.model).toBe('Latitude 7420 Fixture');

    expect(fix2).toBeDefined();
    expect(fix2?.assignment_status).toBe('unassigned');

    expect(fix3).toBeDefined();
    expect(fix3?.assignment_status).toBe('unassigned');

    // Summary assertions
    const totalAssetsSummary = reportResult.summary?.find((s) => s.key === 'total_assets');
    const totalAssignedSummary = reportResult.summary?.find((s) => s.key === 'assigned_count');
    const totalUnassignedSummary = reportResult.summary?.find((s) => s.key === 'unassigned_count');

    expect(totalAssetsSummary).toBeDefined();
    expect(totalAssignedSummary).toBeDefined();
    expect(totalUnassignedSummary).toBeDefined();
    expect(Number(totalAssetsSummary?.value)).toBe(
      Number(totalAssignedSummary?.value) + Number(totalUnassignedSummary?.value),
    );
  });
});
