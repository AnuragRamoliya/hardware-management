import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import {
  users,
  user_tokens,
  software,
  software_licenses,
  software_assignments,
  activity_logs,
} from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { STATUS, MODULES } from '../Config/constant';

describe('API Module 08: Software, Licenses & Concurrent Seat Allocation Suite', () => {
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
      refresh_token: `ref_sw_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  const testSuffix = Date.now();
  let createdSoftwareId: number;
  let createdLicenseId: number;

  describe('1. Software & License CRUD and Usage Metrics', () => {
    it('creates a new software definition as admin', async () => {
      const res = await request(app)
        .post('/software/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          name: `JetBrains-Suite-${testSuffix}`,
          category: 'IDE & Developer Tools',
          license_type: 'per_seat',
          vendor_id: 1,
        });

      expect([200, 201]).toContain(res.status);
      expect(res.body).toHaveProperty('data');
      createdSoftwareId = Number(res.body.data.id);
      expect(createdSoftwareId).toBeGreaterThan(0);
    });

    it('attaches a license with seats_total = 1 to the software', async () => {
      const res = await request(app)
        .post('/software/license/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          software_id: createdSoftwareId,
          license_key: `KEY-${testSuffix}`,
          seats_total: 1,
          cost: 499.0,
        });

      expect([200, 201]).toContain(res.status);
      createdLicenseId = Number(res.body.data.id);
      expect(createdLicenseId).toBeGreaterThan(0);
    });

    it('lists software and options endpoint returns created software', async () => {
      const res = await request(app)
        .post('/software/options')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ search: `JetBrains-Suite-${testSuffix}` });

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('rows');
      const found = res.body.data.rows.find((r: any) => Number(r.id) === createdSoftwareId);
      expect(found).toBeDefined();
    });

    it('checks initial software usage (0 allocated seats)', async () => {
      const res = await request(app)
        .get(`/software/usage/${createdSoftwareId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.length).toBe(0);
    });
  });

  describe('2. Seat Assignment, Revocation & Concurrency Conflict (Point 8)', () => {
    it('concurrently attempts to allocate the SINGLE available seat to two users', async () => {
      // Fire two simultaneous assignment requests for active employees 205 and 605
      const [res1, res2] = await Promise.all([
        request(app)
          .post('/software/assign')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({
            software_id: createdSoftwareId,
            license_id: createdLicenseId,
            employee_id: 205,
            note: 'Concurrent candidate 1',
          }),
        request(app)
          .post('/software/assign')
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({
            software_id: createdSoftwareId,
            license_id: createdLicenseId,
            employee_id: 605,
            note: 'Concurrent candidate 2',
          }),
      ]);

      const statuses = [res1.status, res2.status];
      const winCount = statuses.filter((s) => s === 200 || s === 201).length;
      const loseCount = statuses.filter((s) => s === 409).length;

      // Exactly ONE succeeds and exactly ONE receives 409 Conflict
      expect(winCount).toBe(1);
      expect(loseCount).toBe(1);

      // Verify database consistency: exactly 1 active assignment exists
      const activeAssignments = await software_assignments.findAll({
        where: { software_id: createdSoftwareId, revoked_at: null },
      });
      expect(activeAssignments.length).toBe(1);
    });

    it('rejects another assignment attempt when seats are exhausted (409)', async () => {
      const res = await request(app)
        .post('/software/assign')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          software_id: createdSoftwareId,
          employee_id: 1005,
        });

      expect(res.status).toBe(409);
      expect(res.body.message).toMatch(/seats/i);
    });

    it('revokes the seat assignment and frees the license seat', async () => {
      const activeAssign = await software_assignments.findOne({
        where: { software_id: createdSoftwareId, revoked_at: null },
      });
      expect(activeAssign).not.toBeNull();

      const res = await request(app)
        .post('/software/revoke')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          assignment_id: activeAssign?.id,
        });

      expect(res.status).toBe(200);

      // Verified revoked assignment in usage
      const usageRes = await request(app)
        .get(`/software/usage/${createdSoftwareId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(usageRes.status).toBe(200);
      expect(usageRes.body.data[0].revoked_at).not.toBeNull();
    });
  });

  describe('3. Validation Boundaries & Authorization Matrix', () => {
    it('rejects software creation with invalid license_type (400/422)', async () => {
      const res = await request(app)
        .post('/software/add')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({
          name: 'Invalid Software',
          category: 'Tools',
          license_type: 'invalid_type_enum',
        });

      expect([400, 422]).toContain(res.status);
    });

    it('returns 403 when regular employee attempts to create software', async () => {
      const res = await request(app)
        .post('/software/add')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          name: 'Hacked Software',
          category: 'Tools',
          license_type: 'per_seat',
        });

      expect(res.status).toBe(403);
    });

    it('returns 403 when regular employee attempts to allocate a software seat', async () => {
      const res = await request(app)
        .post('/software/assign')
        .set('token', empToken)
        .set('plain-text', 'true')
        .send({
          software_id: createdSoftwareId,
          employee_id: 3,
        });

      expect(res.status).toBe(403);
    });

    it('soft deletes software definition', async () => {
      const delRes = await request(app)
        .delete(`/software/delete/${createdSoftwareId}`)
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect([200, 204]).toContain(delRes.status);

      const dbSoftware = await software.findByPk(createdSoftwareId);
      expect(dbSoftware?.status).toBe(STATUS.DELETED);
    });
  });
});
