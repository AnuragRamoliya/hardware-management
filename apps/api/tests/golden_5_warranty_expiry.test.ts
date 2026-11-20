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

describe('Golden Test R5: Hardware Warranty Expiry', () => {
  it('correctly maps expiration horizons and distinguishes active vs expired warranties', async () => {
    const fixCat = await asset_categories.findOne({
      where: { name: 'Fixture Laptops' },
      attributes: ['id'],
      raw: true,
    });
    const catId = Number((fixCat as unknown as { id: number }).id);

    const reportResult = await reportService.runReport(
      'warranty-expiry',
      { filters: { category_id: catId, window_days: 'all' }, itemsPerPage: 50 },
      adminActor,
    );

    const fix1 = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-001');
    const fix3 = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-003');

    expect(fix1).toBeDefined();
    expect(fix1?.warranty_status).toBe('expiring_soon');
    expect(Number(fix1?.days_remaining)).toBeGreaterThan(0);

    expect(fix3).toBeDefined();
    expect(fix3?.warranty_status).toBe('expired');
    expect(Number(fix3?.days_remaining)).toBeLessThanOrEqual(0);

    const expiredSummary = reportResult.summary?.find((s) => s.key === 'expired_total');
    expect(expiredSummary).toBeDefined();
    expect(Number(expiredSummary?.value)).toBeGreaterThanOrEqual(1);
  });
});
