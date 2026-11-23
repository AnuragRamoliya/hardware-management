import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';

describe('API Module 15: Dashboard Role-Based Summaries Comprehensive QA Suite', () => {
  const app = createApp();
  let adminToken: string;
  let hrToken: string;
  let empToken: string;

  async function getOrCreateToken(email: string): Promise<string> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign(
      { sub: String(user.id), email: user.email, jti: `dash_${Date.now()}_${Math.random()}` },
      env.SECRET_KEY,
      { expiresIn: '2h' },
    );
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_dash_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    hrToken = await getOrCreateToken('hr@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  describe('1. Super Admin / Hardware Manager Summary', () => {
    it('returns fleet and license KPIs for admin user', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
      const data = res.body.data;
      expect(['super_admin', 'hardware_manager']).toContain(data.role);
      expect(typeof data.totalAssets).toBe('number');
      expect(typeof data.available).toBe('number');
      expect(typeof data.assigned).toBe('number');
      expect(typeof data.inRepair).toBe('number');
      expect(typeof data.expiringWarranties).toBe('number');
      expect(typeof data.softwareCount).toBe('number');
      expect(typeof data.seatsTotal).toBe('number');
      expect(typeof data.seatsUsed).toBe('number');
      expect(typeof data.seatsAvailable).toBe('number');
      expect(typeof data.openRequests).toBe('number');
      expect(typeof data.openOffboardings).toBe('number');
      expect(Array.isArray(data.quickReports)).toBe(true);
      expect(data.quickReports).toContain('hardware-per-employee');
    });

    it('filters dashboard metrics with date bounds', async () => {
      const res = await request(app)
        .get('/dashboard/summary?start_date=2026-01-01&end_date=2026-12-31')
        .set('token', adminToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveProperty('openRequests');
    });
  });

  describe('2. HR Role Summary', () => {
    it('returns offboarding and request SLA metrics for HR user', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('token', hrToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.role).toBe('hr');
      expect(typeof data.totalOffboardingCases).toBe('number');
      expect(typeof data.openOffboardingCases).toBe('number');
      expect(typeof data.pendingOffboardingTasks).toBe('number');
      expect(typeof data.pendingRequests).toBe('number');
      expect(Array.isArray(data.quickReports)).toBe(true);
      expect(data.quickReports).toContain('offboarding-status');
    });
  });

  describe('3. Employee Role Summary', () => {
    it('returns self-service requests and assigned hardware count for employee', async () => {
      const res = await request(app)
        .get('/dashboard/summary')
        .set('token', empToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      const data = res.body.data;
      expect(data.role).toBe('employee');
      expect(typeof data.myRequestsCount).toBe('number');
      expect(typeof data.myActiveRequests).toBe('number');
      expect(typeof data.myAssignedAssets).toBe('number');
      // Admin-only fields must NOT leak to employee
      expect(data.seatsTotal).toBeUndefined();
      expect(data.openOffboardings).toBeUndefined();
      expect(data.quickReports).toBeUndefined();
    });
  });

  describe('4. Security & Unauthenticated Access', () => {
    it('rejects unauthenticated request with 401', async () => {
      const res = await request(app).get('/dashboard/summary').set('plain-text', 'true');

      expect(res.status).toBe(401);
    });
  });
});
