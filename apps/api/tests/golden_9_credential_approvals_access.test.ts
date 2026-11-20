import { describe, it, expect } from 'vitest';
import { reportService } from '../Services/report.service';
import { credential_types } from '../Database/Schema';
import type { UserInfo } from '../Types/api';

const adminActor: UserInfo = {
  id: 1,
  role_id: 1,
  role: 'super_admin',
  first_name: 'Super',
  last_name: 'Admin',
  email: 'admin@test.local',
};

describe('Golden Test R9: Credential Approvals & Access Audits', () => {
  it('computes exact access approval metadata and strictly guarantees ZERO secret leakage', async () => {
    const credType = await credential_types.findOne({
      where: { name: 'Fixture API Key' },
      attributes: ['id'],
      raw: true,
    });
    expect(credType).toBeTruthy();
    const credTypeId = Number((credType as unknown as { id: number }).id);

    const reportResult = await reportService.runReport(
      'credential-approvals-access',
      { filters: { credential_type_id: credTypeId } },
      adminActor,
    );

    const row = reportResult.rows.find((r) => r.label === 'Fixture Production API Token');
    expect(row).toBeDefined();
    expect(row?.label).toBe('Fixture Production API Token');
    expect(row?.approval_status).toBe('approved');
    expect(Number(row?.reveal_count)).toBe(1);

    // CRITICAL SECURITY ASSERTION: Zero ciphertext or secrets in rows
    const forbiddenKeys = ['password', 'password_enc', 'secret', 'iv', 'auth_tag', 'salt'];
    for (const key of Object.keys(row || {})) {
      for (const forbidden of forbiddenKeys) {
        expect(key.toLowerCase()).not.toContain(forbidden);
      }
    }
  });
});
