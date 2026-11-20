import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { activity_logs } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R10: Full System Audit & Activity Logs', () => {
  it('computes exact activity trail, action types and SHA-256 hash chaining verification', async () => {
    const fixDesc = 'DETERMINISTIC_FIXTURE_AUDIT_LOG_INITIALIZATION';
    const logRecord = await activity_logs.findOne({
      where: { description: fixDesc },
      attributes: ['id', 'module', 'action', 'description', 'hash', 'prev_hash'],
      raw: true,
    });
    expect(logRecord).toBeTruthy();

    const reportResult = await reportService.runReport(
      'audit-export',
      { filters: { module_name: 'reports', action: 'EXPORT' } },
      adminActor,
    );

    const row = reportResult.rows.find((r) => r.description === fixDesc);
    expect(row).toBeDefined();
    expect(row?.action).toBe('EXPORT');
    expect(row?.module).toBe('reports');
    expect(row?.description).toBe(fixDesc);
    expect(row?.is_chain_valid).toBe('verified');

    // Summary
    const totalLogsSummary = reportResult.summary?.find((s) => s.key === 'total_logs');
    expect(totalLogsSummary).toBeDefined();
    expect(Number(totalLogsSummary?.value)).toBeGreaterThanOrEqual(1);
  });
});
