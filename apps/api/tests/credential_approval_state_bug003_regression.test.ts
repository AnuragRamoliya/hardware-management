import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, credentials, credential_types, employees } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { CREDENTIAL_APPROVAL_STATUS, STATUS } from '@hm/shared';

describe('Regression BUG-003: Credential Approval State Machine Invariants', () => {
  const app = createApp();
  let adminToken: string;
  let testCredId: number;

  beforeAll(async () => {
    const user = await users.findOne({ where: { email: 'admin@fixture.local' } });
    const token = jwt.sign({ sub: String(user!.id), email: user!.email }, env.SECRET_KEY, {
      expiresIn: '1h',
    });
    await user_tokens.create({
      user_id: user!.id,
      token: hashToken(token),
      refresh_token: `ref_bug003_${Date.now()}`,
      expires_at: new Date(Date.now() + 100000),
    });
    adminToken = token;

    const emp = await employees.findOne({ where: { status: STATUS.ACTIVE } });
    const type = await credential_types.findOne({ where: { status: STATUS.ACTIVE } });
    const cred = await credentials.create({
      employee_id: emp ? emp.id : 205,
      credential_type_id: type ? type.id : 1,
      label: 'Bug-003-Approved-Cred',
      username: 'approved_user',
      password_enc: 'PROVISIONAL',
      iv: 'PROVISIONAL',
      auth_tag: 'PROVISIONAL',
      key_version: '1',
      approval_status: CREDENTIAL_APPROVAL_STATUS.APPROVED,
      status: STATUS.ACTIVE,
      created_by: user!.id,
    });
    testCredId = Number(cred.id);
  });

  it('rejects attempting to reject an already-approved credential (returns 400)', async () => {
    const res = await request(app)
      .post(`/credential/reject/${testCredId}`)
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({ feedback: 'Attempting to reject already approved credential' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not pending approval/i);
  });

  it('rejects attempting to request changes on an already-approved credential (returns 400)', async () => {
    const res = await request(app)
      .post(`/credential/needs-change/${testCredId}`)
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({ feedback: 'Attempting to request changes on already approved credential' });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/not pending approval/i);
  });
});
