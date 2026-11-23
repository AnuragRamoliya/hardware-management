import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, employees } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';

describe('Regression BUG-002: Employee Vault Consent Persistence', () => {
  const app = createApp();

  it('persists privacy policy consent and reflects consent_accepted in status check', async () => {
    const user = await users.findOne({ where: { email: 'emp@fixture.local' } });
    expect(user).not.toBeNull();
    const token = jwt.sign({ sub: String(user!.id), email: user!.email }, env.SECRET_KEY, {
      expiresIn: '1h',
    });
    await user_tokens.create({
      user_id: user!.id,
      token: hashToken(token),
      refresh_token: `ref_bug002_${Date.now()}`,
      expires_at: new Date(Date.now() + 100000),
    });

    const consentRes = await request(app)
      .post('/portal/credential/consent')
      .set('token', token)
      .set('plain-text', 'true')
      .send({});

    expect(consentRes.status).toBe(200);
    expect(consentRes.body.data.consent_accepted).toBe(true);

    // Now check consent status on a subsequent request
    const statusRes = await request(app)
      .get('/portal/credential/consent/status')
      .set('token', token)
      .set('plain-text', 'true');

    expect(statusRes.status).toBe(200);
    expect(statusRes.body.data.consent_accepted).toBe(true);
    expect(statusRes.body.data.consent_accepted_at).not.toBeNull();

    // Verify directly in DB
    const emp = await employees.findOne({ where: { user_id: user!.id } });
    expect(emp?.get('vault_consent_accepted_at')).toBeTruthy();
  });
});
