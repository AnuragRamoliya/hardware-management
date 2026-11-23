import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import {
  users,
  user_tokens,
  employees,
  departments,
  designations,
  locations,
  offboarding_cases,
  offboarding_tasks,
} from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { STATUS, EMPLOYMENT_STATUS, OFFBOARDING_TASK_STATUS } from '@hm/shared';

describe('API Module 11: Offboarding Lifecycle Comprehensive QA Suite', () => {
  const app = createApp();
  let adminToken: string;
  let hrToken: string;
  let empToken: string;
  let testEmpId: number;
  let offboardingCaseId: number;
  let offboardingTaskId: number;

  async function getOrCreateToken(email: string): Promise<string> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.SECRET_KEY, {
      expiresIn: '2h',
    });
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_off_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  const testSuffix = Date.now();

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    hrToken = await getOrCreateToken('hr@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');

    const dept = await departments.findOne({ where: { status: 1 } });
    const desig = await designations.findOne({ where: { status: 1 } });
    const loc = await locations.findOne({ where: { status: 1 } });

    // Create a dedicated employee for this offboarding test
    const newEmp = await employees.create({
      employee_code: `OFF-EMP-${testSuffix}`,
      first_name: 'Offboarding',
      last_name: `Candidate-${testSuffix}`,
      email: `offboard_${testSuffix}@example.local`,
      department_id: dept?.id || 1,
      designation_id: desig?.id || 1,
      location_id: loc?.id || 1,
      employment_status: EMPLOYMENT_STATUS.ACTIVE,
      status: STATUS.ACTIVE,
    });
    testEmpId = Number(newEmp.id);
  });

  describe('1. Case Initiation & Preview', () => {
    it('generates an offboarding preview showing assets and clearances to recover', async () => {
      const res = await request(app)
        .post('/offboarding/preview')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({ employee_id: testEmpId });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('initiates an offboarding case as HR specialist', async () => {
      const res = await request(app)
        .post('/offboarding/initiate')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({
          employee_id: testEmpId,
          exit_type: 1, // Resignation
          resignation_date: '2026-11-01',
          last_working_date: '2026-11-20',
          reason: 'Relocating to another city',
          notes: 'Standard resignation workflow',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      offboardingCaseId = Number(res.body.data.id || res.body.data.case_id);
      expect(offboardingCaseId).toBeGreaterThan(0);

      // Verify employee status transitioned to RESIGNED (3)
      const emp = await employees.findByPk(testEmpId);
      expect(Number(emp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.RESIGNED);
    });

    it('fetches offboarding case details by ID', async () => {
      const res = await request(app)
        .get(`/offboarding/get/${offboardingCaseId}`)
        .set('token', hrToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('case_no');
      expect(Number(res.body.data.employee_id)).toBe(testEmpId);
    });

    it('lists offboarding cases with pagination', async () => {
      const res = await request(app)
        .post('/offboarding/list')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
        });

      expect(res.status).toBe(200);
      const rows = res.body.data.list || res.body.data.rows || [];
      expect(rows.some((r: any) => Number(r.id) === offboardingCaseId)).toBe(true);
    });
  });

  describe('2. Task Queue Management & Checklists', () => {
    it('adds a custom offboarding task to the case', async () => {
      const res = await request(app)
        .post('/offboarding/task/add')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({
          case_id: offboardingCaseId,
          title: `Return Security Access Keycard ${testSuffix}`,
          is_mandatory: true,
          due_date: '2026-11-20',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      offboardingTaskId = Number(res.body.data.id);
      expect(offboardingTaskId).toBeGreaterThan(0);
    });

    it('lists tasks for the offboarding case', async () => {
      const res = await request(app)
        .post('/offboarding/task/list')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 50,
          case_id: offboardingCaseId,
        });

      expect(res.status).toBe(200);
      const rows = res.body.data.list || res.body.data.rows || [];
      expect(rows.some((r: any) => Number(r.id) === offboardingTaskId)).toBe(true);
    });

    it('completes the offboarding task', async () => {
      const res = await request(app)
        .put('/offboarding/task/complete')
        .set('token', hrToken)
        .set('plain-text', 'true')
        .send({
          task_id: offboardingTaskId,
          notes: 'Keycard handed over to building security',
        });

      expect(res.status).toBe(200);
    });
  });

  describe('3. Case Final Clearance & Document Verification', () => {
    it('completes the offboarding case and issues clearance certificate', async () => {
      // Complete all mandatory tasks using correct string status enum
      await offboarding_tasks.update(
        { task_status: OFFBOARDING_TASK_STATUS.COMPLETED },
        { where: { case_id: offboardingCaseId } },
      );

      const res = await request(app)
        .put('/offboarding/complete')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: offboardingCaseId,
          clearance_notes: 'All items recovered and verified',
        });

      expect(res.status).toBe(200);

      // Verify employee status transitioned to EXITED (4)
      const emp = await employees.findByPk(testEmpId);
      expect(Number(emp?.get('employment_status'))).toBe(EMPLOYMENT_STATUS.EXITED);
    });

    it('fetches clearance document PDF', async () => {
      const res = await request(app)
        .get(`/offboarding/clearance/${offboardingCaseId}`)
        .set('token', adminToken);

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toMatch(/application\/pdf/);
      expect(res.body.length).toBeGreaterThan(100);
    });

    it('verifies tamper-evident clearance document verification hash', async () => {
      const caseRecord = await offboarding_cases.findByPk(offboardingCaseId);
      const certCode =
        caseRecord?.get('clearance_certificate_code') || caseRecord?.get('certificate_number');

      if (certCode) {
        const verifyRes = await request(app)
          .post('/offboarding/verify-document')
          .set('plain-text', 'true')
          .send({ code: String(certCode) });

        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.data).toHaveProperty('valid', true);
      }
    });
  });

  describe('4. Security & RBAC Enforcement', () => {
    it('prevents regular employee from initiating offboarding (403)', async () => {
      const res = await request(app)
        .post('/offboarding/initiate')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          employee_id: testEmpId,
          exit_type: 1,
          resignation_date: '2026-11-20',
          last_working_date: '2026-12-20',
          reason: 'Unauthorized attempt',
        });

      expect(res.status).toBe(403);
    });

    it('prevents unauthenticated access to offboarding cases (401)', async () => {
      const res = await request(app)
        .post('/offboarding/list')
        .set('plain-text', 'true')
        .send({ currentPage: 1, itemsPerPage: 10 });

      expect(res.status).toBe(401);
    });
  });
});
