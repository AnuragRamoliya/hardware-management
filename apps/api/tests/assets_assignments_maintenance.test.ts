import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import {
  users,
  user_tokens,
  assets,
  asset_assignments,
  asset_maintenances,
  activity_logs,
} from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { STATUS, MODULES } from '../Config/constant';
import { ASSET_STATUS } from '@hm/shared';

describe('API Modules 05, 06, 07: Assets, Assignments & Maintenance Suite', () => {
  const app = createApp();
  let adminToken: string;
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
      refresh_token: `ref_asset_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  const testSuffix = Date.now();
  let createdAssetId: number;
  let createdAssetTag: string;

  describe('1. Asset CRUD & Quality Gates', () => {
    it('creates a new asset and auto-assigns an asset tag', async () => {
      const res = await request(app)
        .post('/asset/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          category_id: 1,
          location_id: 1,
          vendor_id: 1,
          brand: 'Dell',
          model: `Precision-${testSuffix}`,
          serial_no: `SN-${testSuffix}`,
          condition: 'new',
          purchase_cost: 1499.99,
          purchase_date: '2026-02-01',
          asset_status: ASSET_STATUS.AVAILABLE,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      createdAssetId = Number(res.body.data.id);
      createdAssetTag = res.body.data.asset_tag;
      expect(createdAssetId).toBeGreaterThan(0);
      expect(createdAssetTag).toMatch(/^AST-\d{6}$/);

      // Verify activity log
      const log = await activity_logs.findOne({
        where: {
          module: MODULES.ASSET,
          module_id: createdAssetId,
        },
      });
      expect(log).not.toBeNull();
    });

    it('retrieves asset by ID with detail associations', async () => {
      const res = await request(app)
        .get(`/asset/get/${createdAssetId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(Number(res.body.data.id)).toBe(createdAssetId);
      expect(res.body.data.model).toBe(`Precision-${testSuffix}`);
    });

    it('updates asset details', async () => {
      const res = await request(app)
        .put('/asset/update')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: createdAssetId,
          notes: 'Updated QA notes',
          condition: 'good',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.condition).toBe('good');
    });

    it('lists assets with search and pagination', async () => {
      const res = await request(app)
        .post('/asset/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: `SN-${testSuffix}`,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((r: any) => Number(r.id) === createdAssetId);
      expect(found).toBeDefined();
    });

    it('returns options endpoint matching the created asset', async () => {
      const res = await request(app)
        .post('/asset/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          search: createdAssetTag,
          limit: 10,
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((o: any) => Number(o.value) === createdAssetId);
      expect(found).toBeDefined();
    });
  });

  describe('2. Asset Assignment Lifecycle & State Transitions', () => {
    it('assigns available asset to employee 3', async () => {
      const res = await request(app)
        .post('/asset/assign')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          asset_id: createdAssetId,
          employee_id: 3,
          due_return_date: '2026-12-31',
          notes: 'QA Lifecycle assignment',
        });

      expect([200, 201]).toContain(res.status);

      // Verify asset status transitioned to ASSIGNED
      const updatedAsset = await assets.findByPk(createdAssetId);
      expect(Number(updatedAsset?.asset_status)).toBe(ASSET_STATUS.ASSIGNED);
    });

    it('rejects assigning an ALREADY ASSIGNED asset (400 / 409 / 422)', async () => {
      const res = await request(app)
        .post('/asset/assign')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          asset_id: createdAssetId,
          employee_id: 4,
        });

      expect([400, 409, 422]).toContain(res.status);
    });

    it('transfers asset from employee 3 to employee 4', async () => {
      const res = await request(app)
        .post('/asset/transfer')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          asset_id: createdAssetId,
          to_employee_id: 4,
          transfer_notes: 'Reassigned across departments',
        });

      expect(res.status).toBe(200);

      // Verify assignment history has active assignment for employee 4
      const activeAssign = await asset_assignments.findOne({
        where: { asset_id: createdAssetId, status: STATUS.ACTIVE, employee_id: 4 },
      });
      expect(activeAssign).not.toBeNull();
    });

    it('returns asset back to available status', async () => {
      const res = await request(app)
        .post('/asset/return')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          asset_id: createdAssetId,
          return_condition: 'good',
          to_status: 'available',
        });

      expect(res.status).toBe(200);

      // Asset is available again
      const returnedAsset = await assets.findByPk(createdAssetId);
      expect(Number(returnedAsset?.asset_status)).toBe(ASSET_STATUS.AVAILABLE);
    });
  });

  describe('3. Asset Maintenance Lifecycle', () => {
    let maintenanceId: number;

    it('logs maintenance for available asset, transitioning it to in_repair', async () => {
      const res = await request(app)
        .post('/asset/maintenance/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          asset_id: createdAssetId,
          issue: 'Screen flickering defect',
          cost: 150.0,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body.data).toHaveProperty('id');
      maintenanceId = Number(res.body.data.id);

      const inRepairAsset = await assets.findByPk(createdAssetId);
      expect(Number(inRepairAsset?.asset_status)).toBe(ASSET_STATUS.IN_REPAIR);
    });

    it('lists maintenance records', async () => {
      const res = await request(app)
        .post('/asset/maintenance/list')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
          search: 'Screen flickering',
        });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((m: any) => Number(m.id) === maintenanceId);
      expect(found).toBeDefined();
    });

    it('completes maintenance and returns asset to available status', async () => {
      const res = await request(app)
        .post('/asset/maintenance/complete')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          id: maintenanceId,
          resolution: 'Replaced EDP display cable. Operational.',
        });

      expect(res.status).toBe(200);

      const fixedAsset = await assets.findByPk(createdAssetId);
      expect(Number(fixedAsset?.asset_status)).toBe(ASSET_STATUS.AVAILABLE);
    });
  });

  describe('4. Concurrency & Authorization Rules', () => {
    it('returns 403 when regular employee attempts to delete an asset', async () => {
      const res = await request(app)
        .delete(`/asset/delete/${createdAssetId}`)
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(403);
    });

    it('concurrency test: simultaneous assignment attempts on same asset (exactly one wins)', async () => {
      // Asset is currently AVAILABLE
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/asset/assign')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ asset_id: createdAssetId, employee_id: 3 }),
        request(app)
          .post('/asset/assign')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ asset_id: createdAssetId, employee_id: 4 }),
      ]);

      const statuses = [res1.status, res2.status];
      const successes = statuses.filter((s) => s === 200 || s === 201).length;
      const conflicts = statuses.filter((s) => [400, 409, 422].includes(s)).length;

      expect(successes).toBe(1);
      expect(conflicts).toBe(1);

      // Clean up assignment
      await request(app)
        .post('/asset/return')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ asset_id: createdAssetId, to_status: 'available' });
    });

    it('soft deletes asset and ensures it cannot be assigned', async () => {
      const delRes = await request(app)
        .delete(`/asset/delete/${createdAssetId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect([200, 204]).toContain(delRes.status);

      // Attempt assignment on deleted asset
      const assignRes = await request(app)
        .post('/asset/assign')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ asset_id: createdAssetId, employee_id: 3 });

      expect([400, 404, 409, 422]).toContain(assignRes.status);
    });
  });
});
