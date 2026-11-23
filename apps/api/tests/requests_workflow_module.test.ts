import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import {
  users,
  user_tokens,
  employees,
  asset_categories,
  assets,
  asset_assignments,
  requests,
} from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { REQUEST_STATUS, REQUEST_TYPE, REQUEST_PRIORITY, ASSET_STATUS } from '@hm/shared';

describe('API Module 10: Requests Workflow Comprehensive QA Suite', () => {
  const app = createApp();
  let adminToken: string;
  let hwToken: string;
  let empToken: string;
  let adminUserId: number;
  let hwUserId: number;
  let testEmpId: number;
  let testCatId: number;
  let rejectCatId: number;
  let cancelCatId: number;
  let testAssetId: number;

  async function getOrCreateToken(email: string): Promise<{ token: string; userId: number }> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.SECRET_KEY, {
      expiresIn: '2h',
    });
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_req_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return { token, userId: Number(user.id) };
  }

  beforeAll(async () => {
    const admin = await getOrCreateToken('admin@fixture.local');
    adminToken = admin.token;
    adminUserId = admin.userId;

    const hw = await getOrCreateToken('hw@fixture.local');
    hwToken = hw.token;
    hwUserId = hw.userId;

    const emp = await getOrCreateToken('emp@fixture.local');
    empToken = emp.token;

    const empRecord = await employees.findOne({ where: { user_id: emp.userId } });
    if (empRecord) {
      testEmpId = Number(empRecord.id);
    } else {
      const anyEmp = await employees.findOne();
      testEmpId = anyEmp ? Number(anyEmp.id) : 1;
    }

    // Ensure clean state for test employee active requests
    await requests.update(
      { request_status: REQUEST_STATUS.CLOSED },
      { where: { employee_id: testEmpId, request_status: [1, 2, 3, 4, 9] } },
    );

    const cat1 = await asset_categories.create({
      name: `Cat-Main-${Date.now()}`,
      status: 1,
      created_by: adminUserId,
    });
    testCatId = Number(cat1.id);

    const cat2 = await asset_categories.create({
      name: `Cat-Reject-${Date.now()}`,
      status: 1,
      created_by: adminUserId,
    });
    rejectCatId = Number(cat2.id);

    const cat3 = await asset_categories.create({
      name: `Cat-Cancel-${Date.now()}`,
      status: 1,
      created_by: adminUserId,
    });
    cancelCatId = Number(cat3.id);

    const assetRecord = await assets.create({
      asset_tag: `TAG-QA-${Date.now()}`,
      name: 'Fulfilment Test Monitor',
      category_id: testCatId,
      asset_status: ASSET_STATUS.AVAILABLE,
      status: 1,
      created_by: adminUserId,
    });
    testAssetId = Number(assetRecord.id);
  });

  const testSuffix = Date.now();
  let mainRequestId: number;

  describe('1. Portal Request Lifecycle & Self-Service', () => {
    it('portal employee submits a new hardware request', async () => {
      const res = await request(app)
        .post('/portal/request/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          category_id: testCatId,
          title: `QA Monitor Request ${testSuffix}`,
          reason: 'Need external 4k display for testing',
          priority: REQUEST_PRIORITY.MEDIUM,
          needed_by_date: '2026-12-01',
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      mainRequestId = Number(res.body.data.id);
      expect(mainRequestId).toBeGreaterThan(0);
      expect(res.body.data.request_no).toMatch(/^REQ-/);
    });

    it('portal employee fetches the created request details', async () => {
      const res = await request(app)
        .get(`/portal/request/get/${mainRequestId}`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.title).toBe(`QA Monitor Request ${testSuffix}`);
      expect(Number(res.body.data.request_status)).toBe(REQUEST_STATUS.SUBMITTED);
    });

    it('portal employee updates request title and priority while still pending', async () => {
      const res = await request(app)
        .put('/portal/request/update')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          id: mainRequestId,
          title: `QA Monitor Request ${testSuffix} - Updated`,
          priority: REQUEST_PRIORITY.HIGH,
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/portal/request/get/${mainRequestId}`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(check.body.data.title).toContain('Updated');
      expect(Number(check.body.data.priority)).toBe(REQUEST_PRIORITY.HIGH);
    });

    it('portal employee lists their submitted requests', async () => {
      const res = await request(app)
        .post('/portal/request/list')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
        });

      expect(res.status).toBe(200);
      const rows = res.body.data.list || res.body.data.rows || [];
      expect(rows.some((r: any) => Number(r.id) === mainRequestId)).toBe(true);
    });
  });

  describe('2. Staff Assignment, Review & Fulfilment Workflow', () => {
    it('admin views request in admin list with search and filters', async () => {
      const res = await request(app)
        .post('/request/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: `QA Monitor Request ${testSuffix}`,
        });

      expect(res.status).toBe(200);
      const rows = res.body.data.list || res.body.data.rows || [];
      expect(rows.length).toBeGreaterThanOrEqual(1);
      const row = rows.find((r: any) => Number(r.id) === mainRequestId);
      expect(row).toBeDefined();
    });

    it('hardware manager takes ownership of the request', async () => {
      const res = await request(app)
        .put('/request/take')
        .set('token', hwToken)
        .set('plain-text', 'true')
        .send({ id: mainRequestId });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.assigned_to)).toBe(hwUserId);
    });

    it('admin reassigns request to another staff member', async () => {
      const res = await request(app)
        .put('/request/assign')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: mainRequestId,
          assigned_to: adminUserId,
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.assigned_to)).toBe(adminUserId);
    });

    it('transitions to UNDER_REVIEW via action: start_review', async () => {
      const res = await request(app)
        .put('/request/review')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: mainRequestId,
          action: 'start_review',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.UNDER_REVIEW);
    });

    it('approves request via action: approve', async () => {
      const res = await request(app)
        .put('/request/review')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: mainRequestId,
          action: 'approve',
          feedback: 'Hardware request approved for procurement',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.APPROVED);
    });

    it('fulfils the approved request by allocating asset', async () => {
      const res = await request(app)
        .put('/request/fulfil')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          request_id: mainRequestId,
          asset_id: testAssetId,
          notes: 'Allocated test monitor to employee',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.FULFILLED);
    });

    it('closes the fulfilled request with closing notes', async () => {
      const res = await request(app)
        .put('/request/close')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: mainRequestId,
          notes: 'Completed and closed QA request',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.CLOSED);
    });
  });

  describe('3. Alternate Workflow: Rejection & Cancellation', () => {
    let rejectReqId: number;
    let cancelReqId: number;

    it('rejects a request with feedback via action: reject', async () => {
      const createRes = await request(app)
        .post('/portal/request/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          category_id: rejectCatId,
          title: `QA Request to Reject ${testSuffix}`,
          reason: 'Duplicate request',
          priority: REQUEST_PRIORITY.LOW,
        });

      expect([200, 201]).toContain(createRes.status);
      rejectReqId = Number(createRes.body.data.id);

      const res = await request(app)
        .put('/request/review')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: rejectReqId,
          action: 'reject',
          feedback: 'Rejected: Already has sufficient hardware',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/request/get/${rejectReqId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.REJECTED);
      expect(check.body.data.decision_feedback).toContain('Already has sufficient');
    });

    it('portal employee cancels their own pending request', async () => {
      const createRes = await request(app)
        .post('/portal/request/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          request_type: REQUEST_TYPE.NEW_HARDWARE,
          category_id: cancelCatId,
          title: `QA Request to Cancel ${testSuffix}`,
          reason: 'No longer needed',
          priority: REQUEST_PRIORITY.LOW,
        });

      expect([200, 201]).toContain(createRes.status);
      cancelReqId = Number(createRes.body.data.id);

      const res = await request(app)
        .put('/portal/request/cancel')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          id: cancelReqId,
          reason: 'Issue resolved without repair',
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get(`/portal/request/get/${cancelReqId}`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(Number(check.body.data.request_status)).toBe(REQUEST_STATUS.CANCELLED);
    });
  });

  describe('4. Comments and Confidentiality Boundaries', () => {
    it('admin posts an internal staff comment and employee posts a public comment', async () => {
      const adminCommentRes = await request(app)
        .post('/request/comment')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          request_id: mainRequestId,
          comment: 'Internal staff discussion: checking vendor inventory.',
          is_internal: true,
        });

      expect(adminCommentRes.status).toBe(200);

      const empCommentRes = await request(app)
        .post('/portal/request/comment')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          request_id: mainRequestId,
          comment: 'Employee update: urgent for upcoming sprint.',
        });

      expect(empCommentRes.status).toBe(200);

      // Verify portal user cannot see the internal comment
      const portalView = await request(app)
        .get(`/portal/request/get/${mainRequestId}`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(portalView.status).toBe(200);
      const comments: any[] = portalView.body.data.comments || [];
      const hasInternal = comments.some((c) => c.comment.includes('Internal staff discussion'));
      expect(hasInternal).toBe(false);

      // Verify admin can see both
      const adminView = await request(app)
        .get(`/request/get/${mainRequestId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(adminView.status).toBe(200);
      const adminComments: any[] = adminView.body.data.comments || [];
      expect(adminComments.some((c) => c.comment.includes('Internal staff discussion'))).toBe(true);
      expect(adminComments.some((c) => c.comment.includes('Employee update'))).toBe(true);
    });
  });

  describe('5. Stats and Options', () => {
    it('retrieves request stats summary', async () => {
      const res = await request(app)
        .get('/request/stats')
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('retrieves request filter options', async () => {
      const res = await request(app)
        .post('/request/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({});

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });
  });

  describe('6. Security & RBAC Enforcement', () => {
    it('prevents regular employee from taking or reviewing requests (403)', async () => {
      const res = await request(app)
        .put('/request/take')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({ id: mainRequestId });

      expect(res.status).toBe(403);
    });

    it('prevents unauthenticated requests from accessing admin endpoints (401)', async () => {
      const res = await request(app)
        .post('/request/list')
        .set('plain-text', 'true')
        .send({ currentPage: 1, itemsPerPage: 10 });

      expect(res.status).toBe(401);
    });
  });

  afterAll(async () => {
    if (testAssetId) {
      await requests.update(
        { assigned_asset_id: null },
        { where: { assigned_asset_id: testAssetId } },
      );
      await asset_assignments.destroy({ where: { asset_id: testAssetId } });
      await assets.destroy({ where: { id: testAssetId } });
    }
  });
});
