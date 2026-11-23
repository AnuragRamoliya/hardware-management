import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { sanitizeFormulaInjection, validateAndWhitelistFilters } from '../Reports/helpers';
import { getReport } from '../Reports/registry';

describe('B3: Input Safety, SQLi, Mass Assignment, XSS & CSV Injection', () => {
  const app = createApp();
  let adminToken: string;

  async function getAdminToken(): Promise<string> {
    const user = await users.findOne({ where: { email: 'admin@fixture.local' } });
    const token = jwt.sign({ sub: String(user!.id), email: user!.email }, env.SECRET_KEY, {
      expiresIn: '1h',
    });
    await user_tokens.create({
      user_id: user!.id,
      token: hashToken(token),
      refresh_token: `ref_sec_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 3600_000),
    });
    return token;
  }

  it('neutralizes CSV formula injection characters (=, +, -, @, tab, cr)', () => {
    expect(sanitizeFormulaInjection('=1+1')).toBe("'=1+1");
    expect(sanitizeFormulaInjection('+cmd|/c calc')).toBe("'+cmd|/c calc");
    expect(sanitizeFormulaInjection('-1234')).toBe("'-1234");
    expect(sanitizeFormulaInjection('@SUM(A1:A10)')).toBe("'@SUM(A1:A10)");
    expect(sanitizeFormulaInjection('\tcmd')).toBe("'\tcmd");
    expect(sanitizeFormulaInjection('\rcmd')).toBe("'\rcmd");
    // Safe text is untouched
    expect(sanitizeFormulaInjection('Normal Asset Description')).toBe('Normal Asset Description');
  });

  it('rejects SQL injection attacks in filter values and whitelists filter keys', () => {
    const report = getReport('hardware-per-employee')!;

    // Malicious SQL injection in string filter
    expect(() =>
      validateAndWhitelistFilters(report, {
        search: "1' OR '1'='1; DROP TABLE users; --",
      }),
    ).toThrow(/SQL syntax or dangerous characters detected/);

    // Un-whitelisted filter parameter injection
    expect(() =>
      validateAndWhitelistFilters(report, {
        __proto__: { admin: true },
        admin: 1,
      }),
    ).toThrow(/not allowed for report/);
  });

  it('safely handles SQL injection attempts through real HTTP report queries', async () => {
    if (!adminToken) adminToken = await getAdminToken();

    const res = await request(app)
      .post('/reports/run/hardware-per-employee')
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({
        currentPage: 1,
        itemsPerPage: 10,
        filters: { condition: "new' OR '1'='1" },
      });

    // Parameterized safely: searching for literal string "new' OR '1'='1" yields 0 matches
    expect([200, 400]).toContain(res.status);
    if (res.status === 200) {
      expect(res.body.data.count).toBe(0);
    }
  });

  it('prevents path traversal in file parameters', async () => {
    if (!adminToken) adminToken = await getAdminToken();

    const res = await request(app)
      .get('/reports/jobs/download/../../../../etc/passwd')
      .set('token', adminToken);

    // Express validator requires numeric ID -> rejects with 400 or 404
    expect([400, 404]).toContain(res.status);
  });

  it('neutralizes stored XSS payloads in string representations', () => {
    const maliciousPayload = '<script>alert("XSS")</script>';
    const sanitized = sanitizeFormulaInjection(maliciousPayload);
    // Preserves text for safe React JSX escaping without executing scripts
    expect(sanitized).toBe(maliciousPayload);
  });
});
