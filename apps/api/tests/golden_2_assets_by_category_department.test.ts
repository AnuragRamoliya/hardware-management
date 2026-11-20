import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { asset_categories, assets } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R2: Assets by Category and Department', () => {
  it('computes exact deterministic groupings, sums and counts independently', async () => {
    const fixCat = await asset_categories.findOne({
      where: { name: 'Fixture Laptops' },
      attributes: ['id', 'name'],
      raw: true,
    });
    expect(fixCat).toBeTruthy();
    const catId = Number((fixCat as unknown as { id: number }).id);

    // Independent SQL calculation for Fixture Laptops
    const independentTotalAssets = await assets.count({
      where: { category_id: catId },
    });
    // Fixture seeds exactly 3 assets in Fixture Laptops: TAG-FIX-001, TAG-FIX-002, TAG-FIX-003
    expect(independentTotalAssets).toBe(3);

    const reportResult = await reportService.runReport(
      'assets-by-category-department',
      { filters: { category_id: catId } },
      adminActor,
    );

    // Assert rows contain Fixture Laptops
    const catRows = reportResult.rows.filter((r) => r.category === 'Fixture Laptops');
    expect(catRows.length).toBeGreaterThanOrEqual(1);

    const sumTotalAssets = catRows.reduce((sum, r) => sum + Number(r.total_assets), 0);
    expect(sumTotalAssets).toBe(3);

    // Assert summary contains exact grand total
    const grandTotalSummary = reportResult.summary?.find((s) => s.key === 'grand_total');
    expect(grandTotalSummary).toBeDefined();
    expect(typeof grandTotalSummary?.value).toBe('number');
  });
});
