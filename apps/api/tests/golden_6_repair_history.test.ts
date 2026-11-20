import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { asset_maintenance, assets, vendors } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R6: Hardware Repair & Maintenance History', () => {
  it('computes exact maintenance costs, repair statuses, and vendor filtering', async () => {
    const vend = await vendors.findOne({
      where: { name: 'Fixture Tech Solutions' },
      attributes: ['id'],
      raw: true,
    });
    expect(vend).toBeTruthy();
    const vendId = Number((vend as unknown as { id: number }).id);

    const asset3 = await assets.findOne({
      where: { asset_tag: 'TAG-FIX-003' },
      attributes: ['id'],
      raw: true,
    });
    expect(asset3).toBeTruthy();
    const asset3Id = Number((asset3 as unknown as { id: number }).id);

    // Independent SQL check
    const maintRecord = await asset_maintenance.findOne({
      where: { asset_id: asset3Id },
      attributes: ['cost', 'status'],
      raw: true,
    });
    expect(maintRecord).toBeTruthy();
    const cost = Number((maintRecord as unknown as { cost: number }).cost);
    expect(cost).toBe(350);

    const reportResult = await reportService.runReport(
      'repair-history',
      {
        filters: {
          vendor_id: vendId,
          start_date: '2026-11-10',
          end_date: '2026-11-10',
          maintenance_status: 1,
        },
      },
      adminActor,
    );

    expect(reportResult.count).toBeGreaterThanOrEqual(1);
    const row = reportResult.rows.find((r) => r.asset_tag === 'TAG-FIX-003');
    expect(row).toBeDefined();
    expect(Number(row?.cost)).toBe(350);
    expect(row?.status_label).toBe('under_repair');

    // Summaries
    const costSummary = reportResult.summary?.find((s) => s.key === 'total_cost');
    expect(costSummary).toBeDefined();
    expect(Number(costSummary?.value)).toBeGreaterThanOrEqual(350);
  });
});
