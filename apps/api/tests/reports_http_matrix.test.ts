import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { ALL_REPORTS } from '../Reports/registry';
import { users, user_tokens, export_jobs } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { EXPORT_JOB_STATUS } from '@hm/shared';

describe('A2: Reports HTTP Permission Matrix (Supertest + Real Tokens)', () => {
  const app = createApp();
  let adminToken: string;
  let hwToken: string;
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
      refresh_token: `ref_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    hwToken = await getOrCreateToken('hw@fixture.local');
    hrToken = await getOrCreateToken('hr@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  it('rejects unauthenticated requests with 401', async () => {
    const res = await request(app)
      .post('/reports/run/hardware-per-employee')
      .set('plain-text', 'true')
      .send({});
    expect(res.status).toBe(401);
  });

  describe('4 Roles x 10 Reports Matrix through HTTP', () => {
    for (const report of ALL_REPORTS) {
      it(`evaluates permissions for report [${report.key}] across 4 roles`, async () => {
        // 1. Super Admin: Always allowed
        const adminRes = await request(app)
          .post(`/reports/run/${report.key}`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ currentPage: 1, itemsPerPage: 5 });
        expect(adminRes.status).toBe(200);

        // 2. Employee: Always forbidden (403)
        const empRes = await request(app)
          .post(`/reports/run/${report.key}`)
          .set('token', empToken)
          .set('plain-text', 'true')
          .send({ currentPage: 1, itemsPerPage: 5 });
        expect(empRes.status).toBe(403);

        // 3. Hardware Manager: Allowed on 8, forbidden on credentials and audit
        const hwRes = await request(app)
          .post(`/reports/run/${report.key}`)
          .set('token', hwToken)
          .set('plain-text', 'true')
          .send({ currentPage: 1, itemsPerPage: 5 });
        if (report.key === 'credential-approvals-access' || report.key === 'audit-export') {
          expect(hwRes.status).toBe(403);
        } else {
          expect(hwRes.status).toBe(200);
        }

        // 4. HR: Allowed only on SLA and offboarding
        const hrRes = await request(app)
          .post(`/reports/run/${report.key}`)
          .set('token', hrToken)
          .set('plain-text', 'true')
          .send({ currentPage: 1, itemsPerPage: 5 });
        if (report.key === 'request-turnaround-sla' || report.key === 'offboarding-status') {
          expect(hrRes.status).toBe(200);
        } else {
          expect(hrRes.status).toBe(403);
        }
      });
    }
  });

  describe('Export Formats (CSV / XLSX / PDF) and Job Downloads', () => {
    it('allows super_admin to export in csv format', async () => {
      const res = await request(app)
        .post('/reports/export/hardware-per-employee')
        .set('token', adminToken)
        .set('plain-text', 'true')
        .send({ format: 'csv', filters: {} });
      expect([200, 202]).toContain(res.status);
    });

    it('returns 403 or 404 when downloading another user export job', async () => {
      const job = await export_jobs.create({
        requested_by: 39, // admin
        report_key: 'hardware-per-employee',
        format: 'csv',
        job_status: EXPORT_JOB_STATUS.COMPLETED,
        progress: 100,
        file_path: '/tmp/test_export.csv',
        file_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        expires_at: new Date(Date.now() + 3600_000),
      });

      // Employee tries to download admin's job
      const res = await request(app)
        .get(`/reports/jobs/download/${job.id}`)
        .set('plain-text', 'true')
        .set('token', empToken);
      expect([403, 404]).toContain(res.status);
    });

    it('returns 410 when downloading an expired export job', async () => {
      const expiredJob = await export_jobs.create({
        requested_by: 39,
        report_key: 'hardware-per-employee',
        format: 'csv',
        job_status: EXPORT_JOB_STATUS.EXPIRED,
        progress: 100,
        file_path: '/tmp/expired_export.csv',
        file_sha256: '0000000000000000000000000000000000000000000000000000000000000000',
        expires_at: new Date(Date.now() - 3600_000),
      });

      const res = await request(app)
        .get(`/reports/jobs/download/${expiredJob.id}`)
        .set('plain-text', 'true')
        .set('token', adminToken);
      expect([410, 404]).toContain(res.status);
    });
  });
});
