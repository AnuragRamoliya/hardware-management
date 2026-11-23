import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, employees, activity_logs } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { STATUS, MODULES } from '../Config/constant';
import { EMPLOYMENT_STATUS } from '@hm/shared';

describe('API Module 03: Employees Comprehensive QA Suite', () => {
  const app = createApp();
  let adminToken: string;
  let hrToken: string;
  let empToken: string;

  async function getOrCreateToken(email: string): Promise<string> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.SECRET_KEY, {
      expiresIn: '2h',
    });
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_emp_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    hrToken = await getOrCreateToken('hr@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  const testSuffix = Date.now();
  const testCode = `QA-EMP-${testSuffix}`;
  let createdEmployeeId: number;

  describe('1. Happy Path: CRUD, Listing, Options, and Activity Log', () => {
    it('creates an employee with valid payload as admin', async () => {
      const res = await request(app)
        .post('/employee/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          employee_code: testCode,
          first_name: 'TestQA',
          last_name: 'Employee',
          email: `qa.emp.${testSuffix}@example.com`,
          phone: '+1-555-0199',
          department_id: 1,
          designation_id: 1,
          location_id: 1,
          join_date: '2026-01-15',
          employment_status: EMPLOYMENT_STATUS.ACTIVE,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      expect(res.body.data).toHaveProperty('id');
      createdEmployeeId = Number(res.body.data.id);
      expect(res.body.data.employee_code).toBe(testCode);

      // Verify activity log creation
      const log = await activity_logs.findOne({
        where: {
          module: MODULES.EMPLOYEE,
          module_id: createdEmployeeId,
          action: 'CREATED',
        },
      });
      expect(log).not.toBeNull();
    });

    it('retrieves created employee by ID', async () => {
      const res = await request(app)
        .get(`/employee/get/${createdEmployeeId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(createdEmployeeId);
      expect(res.body.data.first_name).toBe('TestQA');
    });

    it('updates employee fields and employment status', async () => {
      const res = await request(app)
        .put('/employee/update')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: createdEmployeeId,
          first_name: 'TestQA-Updated',
          employment_status: EMPLOYMENT_STATUS.NOTICE,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.first_name).toBe('TestQA-Updated');
      expect(Number(res.body.data.employment_status)).toBe(EMPLOYMENT_STATUS.NOTICE);
    });

    it('lists employees with pagination, search and filters', async () => {
      const res = await request(app)
        .post('/employee/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: testCode,
          sortBy: [{ id: 'created_at', value: 'DESC' }],
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      expect(res.body.data).toHaveProperty('count');
      const found = res.body.data.rows.find((r: any) => Number(r.id) === createdEmployeeId);
      expect(found).toBeDefined();
    });

    it('returns options endpoint with active employees', async () => {
      const res = await request(app)
        .post('/employee/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          search: 'TestQA',
          page: 1,
          limit: 20,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((o: any) => Number(o.value) === createdEmployeeId);
      expect(found).toBeDefined();
    });

    it('soft deletes employee (status = 2) and removes from active list/options', async () => {
      const delRes = await request(app)
        .delete(`/employee/delete/${createdEmployeeId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect([200, 204]).toContain(delRes.status);

      // Verify soft delete in DB
      const dbRow = await employees.findByPk(createdEmployeeId);
      expect(dbRow?.status).toBe(STATUS.DELETED);

      // Excluded from standard options
      const optRes = await request(app)
        .post('/employee/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ search: testCode });

      expect(optRes.status).toBe(200);
      const found = optRes.body.data.rows?.find((o: any) => Number(o.value) === createdEmployeeId);
      expect(found).toBeUndefined();
    });
  });

  describe('2. Validation Boundaries and Error Handling', () => {
    it('rejects employee creation with missing required fields (400 / 422)', async () => {
      const res = await request(app)
        .post('/employee/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          first_name: 'MissingCode',
        });

      expect([400, 422]).toContain(res.status);
      expect(res.body).toHaveProperty('message');
    });

    it('rejects duplicate employee_code', async () => {
      const duplicateCode = `DUP-${Date.now()}`;
      // Create first
      await request(app)
        .post('/employee/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          employee_code: duplicateCode,
          first_name: 'First',
          last_name: 'Person',
          email: `dup1.${Date.now()}@example.com`,
          department_id: 1,
        });

      // Attempt duplicate
      const res = await request(app)
        .post('/employee/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          employee_code: duplicateCode,
          first_name: 'Second',
          last_name: 'Person',
          email: `dup2.${Date.now()}@example.com`,
          department_id: 1,
        });

      expect([400, 409, 422]).toContain(res.status);
    });

    it('returns 404 for non-existent employee ID on get', async () => {
      const res = await request(app)
        .get('/employee/get/99999999')
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(404);
      expect(res.body).toHaveProperty('message');
    });
  });

  describe('3. Authorization & RBAC Matrix', () => {
    it('returns 401 when unauthenticated', async () => {
      const res = await request(app).get('/employee/get/1').set('plain-text', 'true');

      expect(res.status).toBe(401);
    });

    it('returns 403 when employee role attempts to delete an employee', async () => {
      const res = await request(app)
        .delete(`/employee/delete/1`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(403);
    });

    it('returns 403 when employee role attempts to add an employee', async () => {
      const res = await request(app)
        .post('/employee/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          employee_code: `FORBIDDEN-${Date.now()}`,
          first_name: 'Hack',
          last_name: 'Attempt',
          email: 'hack@example.com',
        });

      expect(res.status).toBe(403);
    });
  });

  describe('4. Concurrency Protection', () => {
    it('handles simultaneous duplicate creation race safely (exactly one succeeds)', async () => {
      const concurrentCode = `RACE-${Date.now()}`;
      const payload = {
        employee_code: concurrentCode,
        first_name: 'Race',
        last_name: 'Candidate',
        department_id: 1,
      };

      const [res1, res2] = await Promise.all([
        request(app)
          .post('/employee/add')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ ...payload, email: `race1.${Date.now()}@example.com` }),
        request(app)
          .post('/employee/add')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ ...payload, email: `race2.${Date.now()}@example.com` }),
      ]);

      const statuses = [res1.status, res2.status];
      const successCount = statuses.filter((s) => s === 200 || s === 201).length;
      const failureCount = statuses.filter((s) => [400, 409, 422].includes(s)).length;

      expect(successCount).toBe(1);
      expect(failureCount).toBe(1);
    });
  });
});
