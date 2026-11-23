import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, employees, credential_access_logs } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { CREDENTIAL_APPROVAL_STATUS, CREDENTIAL_ACCESS_ACTION } from '@hm/shared';

describe('API Module 09: Credential Vault Comprehensive QA Suite', () => {
  const app = createApp();
  let adminToken: string;
  let empToken: string;
  let adminUserId: number;
  let testEmpId: number;

  async function getOrCreateToken(email: string): Promise<{ token: string; userId: number }> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.SECRET_KEY, {
      expiresIn: '2h',
    });
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_vault_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return { token, userId: Number(user.id) };
  }

  beforeAll(async () => {
    const admin = await getOrCreateToken('admin@fixture.local');
    adminToken = admin.token;
    adminUserId = admin.userId;

    const emp = await getOrCreateToken('emp@fixture.local');
    empToken = emp.token;

    const empRecord = await employees.findOne({ where: { user_id: emp.userId } });
    if (empRecord) {
      testEmpId = Number(empRecord.id);
    } else {
      const anyEmp = await employees.findOne();
      testEmpId = anyEmp ? Number(anyEmp.id) : 1;
    }
  });

  const testSuffix = Date.now();
  let testTypeId: number;
  let testCredId: number;
  let reauthToken: string;

  describe('1. Credential Types Management', () => {
    it('creates a new credential type as admin', async () => {
      const res = await request(app)
        .post('/credential-type/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          name: `QA-Vault-Type-${testSuffix}`,
          category: 'infrastructure',
          description: 'Type for QA automated tests',
          is_system: false,
          allow_employee_submit: true,
          requires_approval: true,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      testTypeId = Number(res.body.data.id);
      expect(testTypeId).toBeGreaterThan(0);
    });

    it('fetches credential type by ID', async () => {
      const res = await request(app)
        .get(`/credential-type/get/${testTypeId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.name).toBe(`QA-Vault-Type-${testSuffix}`);
    });

    it('updates credential type details', async () => {
      const res = await request(app)
        .put('/credential-type/update')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: testTypeId,
          name: `QA-Vault-Type-${testSuffix}-Updated`,
          category: 'cloud',
        });

      expect(res.status).toBe(200);
    });

    it('lists credential types with pagination', async () => {
      const res = await request(app)
        .post('/credential-type/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: `QA-Vault-Type-${testSuffix}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.length).toBeGreaterThanOrEqual(1);
    });

    it('retrieves credential type options', async () => {
      const res = await request(app)
        .post('/credential-type/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
    });
  });

  describe('2. Credential Secrets & Lifecycle', () => {
    const rawSecret = 'MySuperSecretP@ssword2026!';

    it('creates an admin credential with encrypted password (auto-approved)', async () => {
      const res = await request(app)
        .post('/credential/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          employee_id: testEmpId,
          credential_type_id: testTypeId,
          label: `QA-Cred-${testSuffix}`,
          username: `user_${testSuffix}@example.com`,
          password: rawSecret,
          url: 'https://vpn.example.com',
          notes: 'Automated QA vault secret',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      testCredId = Number(res.body.data.id);
      expect(testCredId).toBeGreaterThan(0);
    });

    it('fetches credential by ID and verifies password is NOT exposed in plain text', async () => {
      const res = await request(app)
        .get(`/credential/get/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.label).toBe(`QA-Cred-${testSuffix}`);
      // Password must NEVER be exposed in get responses
      expect(res.body.data.password).toBeUndefined();
      expect(res.body.data.encrypted_password).toBeUndefined();
    });

    it('changes credential password and preserves version history', async () => {
      const newSecret = 'UpdatedP@ssword2026#Sec!';
      const res = await request(app)
        .put('/credential/change-password')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: testCredId,
          password: newSecret,
        });

      expect(res.status).toBe(200);

      // Verify history
      const histRes = await request(app)
        .get(`/credential/history/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(histRes.status).toBe(200);
      expect(Array.isArray(histRes.body.data)).toBe(true);
      expect(histRes.body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('3. Re-Authentication and Secret Reveal Flow', () => {
    it('generates a reauth token via POST /user/reauth', async () => {
      const res = await request(app)
        .post('/user/reauth')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          password: 'TestPassword123!',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('reauth_token');
      reauthToken = res.body.data.reauth_token;
      expect(reauthToken.length).toBeGreaterThan(20);
    });

    it('rejects reveal with invalid or expired reauth token (401)', async () => {
      const res = await request(app)
        .post(`/credential/reveal/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          reauth_token: 'invalid_reauth_token_xyz',
          reason: 'Authorized access for QA security check',
        });

      expect(res.status).toBe(401);
    });

    it('rejects reveal without mandatory audit reason or reason too short (400)', async () => {
      const res = await request(app)
        .post(`/credential/reveal/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          reauth_token: reauthToken,
          reason: 'abc', // too short (< 5 chars)
        });

      expect([400, 422]).toContain(res.status);
    });

    it('successfully reveals the decrypted password and logs access', async () => {
      const res = await request(app)
        .post(`/credential/reveal/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          reauth_token: reauthToken,
          reason: 'Authorized security audit reveal check',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('password');
      expect(res.body.data.password).toBe('UpdatedP@ssword2026#Sec!');

      // Verify audit log entry exists in credential_access_logs
      const accessLog = await credential_access_logs.findOne({
        where: {
          credential_id: testCredId,
          accessed_by: adminUserId,
          action: CREDENTIAL_ACCESS_ACTION.REVEAL,
        },
        order: [['id', 'DESC']],
      });
      expect(accessLog).not.toBeNull();
      expect(accessLog?.reason).toBe('Authorized security audit reveal check');
    });
  });

  describe('4. Approval Workflow (Pending -> Review/Reject/Approve)', () => {
    let portalCredId: number;

    it('portal employee submits a credential that enters PENDING approval', async () => {
      // First accept consent if needed
      await request(app)
        .post('/portal/credential/consent')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({});

      const res = await request(app)
        .post('/portal/credential/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          credential_type_id: testTypeId,
          label: `Portal-Cred-${testSuffix}`,
          username: `portal_user_${testSuffix}@example.com`,
          password: 'PortalSecretPassword2026!',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      portalCredId = Number(res.body.data.id);
      expect(portalCredId).toBeGreaterThan(0);
    });

    it('admin views pending credentials in approvals list', async () => {
      const res = await request(app)
        .post('/credential/approvals/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: `Portal-Cred-${testSuffix}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((r: any) => Number(r.id) === portalCredId);
      expect(found).toBeDefined();
      expect(Number(found.approval_status)).toBe(CREDENTIAL_APPROVAL_STATUS.PENDING);
    });

    it('admin approves the credential', async () => {
      const res = await request(app)
        .post(`/credential/approve/${portalCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);

      // Verify approval status changed
      const getRes = await request(app)
        .get(`/credential/get/${portalCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(getRes.status).toBe(200);
      expect(Number(getRes.body.data.approval_status)).toBe(CREDENTIAL_APPROVAL_STATUS.APPROVED);
    });

    it('rejects already approved credential or invalid state transitions gracefully', async () => {
      const res = await request(app)
        .post(`/credential/reject/${portalCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ feedback: 'Attempting to reject approved credential' });

      // Cannot reject an already approved credential -> 400
      expect([400, 422]).toContain(res.status);
    });
  });

  describe('5. Collection Requests', () => {
    let reqId: number;

    it('admin creates a collection request for employee', async () => {
      const res = await request(app)
        .post('/credential/request/create')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          employee_id: testEmpId,
          credential_type_id: testTypeId,
          due_date: '2026-12-31',
          instructions: 'Please submit your VPN password',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      reqId = Number(res.body.data.id);
      expect(reqId).toBeGreaterThan(0);
    });

    it('admin lists collection requests', async () => {
      const res = await request(app)
        .post('/credential/request/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.rows.some((r: any) => Number(r.id) === reqId)).toBe(true);
    });

    it('admin cancels collection request', async () => {
      const res = await request(app)
        .post(`/credential/request/cancel/${reqId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
    });
  });

  describe('6. Soft Delete and Access Control', () => {
    it('soft deletes credential', async () => {
      const res = await request(app)
        .delete(`/credential/delete/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);

      // Access deleted credential should return 404
      const getRes = await request(app)
        .get(`/credential/get/${testCredId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(getRes.status).toBe(404);
    });

    it('enforces RBAC: regular employee token cannot access admin vault routes (403)', async () => {
      const res = await request(app)
        .post('/credential/list')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({ currentPage: 1, itemsPerPage: 10 });

      expect(res.status).toBe(403);
    });

    it('enforces authentication: unauthenticated access returns 401', async () => {
      const res = await request(app)
        .post('/credential/list')
        .set('plain-text', 'true')
        .send({ currentPage: 1, itemsPerPage: 10 });

      expect(res.status).toBe(401);
    });
  });
});
