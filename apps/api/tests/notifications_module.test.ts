import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, notifications } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { NOTIFICATION_CATEGORIES, NOTIFICATION_PRIORITY } from '@hm/shared';

describe('API Module 12: Notifications & Preferences Comprehensive QA Suite', () => {
  const app = createApp();
  let userAToken: string;
  let userBToken: string;
  let userAId: number;
  let userBId: number;
  let notifA1Id: number;
  let notifA2Id: number;
  let notifB1Id: number;

  async function getOrCreateToken(email: string): Promise<{ token: string; userId: number }> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign(
      { sub: String(user.id), email: user.email, jti: `notif_${Date.now()}_${Math.random()}` },
      env.SECRET_KEY,
      { expiresIn: '2h' },
    );
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_notif_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return { token, userId: Number(user.id) };
  }

  const testSuffix = Date.now();

  beforeAll(async () => {
    const userA = await getOrCreateToken('admin@fixture.local');
    userAToken = userA.token;
    userAId = userA.userId;

    const userB = await getOrCreateToken('emp@fixture.local');
    userBToken = userB.token;
    userBId = userB.userId;

    // Seed test notifications for user A
    const n1 = await notifications.create({
      recipient_user_id: userAId,
      kind: 'system_alert',
      record_type: 'hardware',
      record_id: 1,
      title: `System Alert A1 ${testSuffix}`,
      message: 'New hardware assignment pending approval',
      category: NOTIFICATION_CATEGORIES.HARDWARE,
      priority: NOTIFICATION_PRIORITY.HIGH,
      read_at: null,
      status: 1,
    });
    notifA1Id = Number(n1.id);

    const n2 = await notifications.create({
      recipient_user_id: userAId,
      kind: 'system_alert',
      record_type: 'software',
      record_id: 2,
      title: `System Alert A2 ${testSuffix}`,
      message: 'License seats threshold reached 90%',
      category: NOTIFICATION_CATEGORIES.SOFTWARE,
      priority: NOTIFICATION_PRIORITY.URGENT,
      read_at: null,
      status: 1,
    });
    notifA2Id = Number(n2.id);

    // Seed test notification for user B
    const n3 = await notifications.create({
      recipient_user_id: userBId,
      kind: 'system_alert',
      record_type: 'request',
      record_id: 3,
      title: `System Alert B1 ${testSuffix}`,
      message: 'Your laptop request has been approved',
      category: NOTIFICATION_CATEGORIES.REQUEST,
      priority: NOTIFICATION_PRIORITY.STANDARD,
      read_at: null,
      status: 1,
    });
    notifB1Id = Number(n3.id);
  });

  describe('1. Realtime Health & Notification Listing', () => {
    it('checks realtime service health (GET /realtime/health)', async () => {
      const res = await request(app)
        .get('/realtime/health')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('fetches unread count for user A', async () => {
      const res = await request(app)
        .get('/notification/unread-count')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body.data.count).toBeGreaterThanOrEqual(2);
    });

    it('lists notifications for user A (POST /notification/list)', async () => {
      const res = await request(app)
        .post('/notification/list')
        .set('token', userAToken)
        .set('plain-text', 'true')
        .send({
          currentPage: 1,
          itemsPerPage: 10,
        });

      expect(res.status).toBe(200);
      const rows = res.body.data.rows || res.body.data.list || [];
      expect(rows.some((r: any) => Number(r.id) === notifA1Id)).toBe(true);
      expect(rows.some((r: any) => Number(r.id) === notifA2Id)).toBe(true);
      // User B's notification should NOT be visible to User A
      expect(rows.some((r: any) => Number(r.id) === notifB1Id)).toBe(false);
    });

    it('supports legacy GET /notifications endpoint', async () => {
      const res = await request(app)
        .get('/notifications')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.data.some((r: any) => Number(r.id) === notifA1Id)).toBe(true);
    });
  });

  describe('2. Read State Mutations & Isolation', () => {
    it('marks a single notification as read', async () => {
      const res = await request(app)
        .put('/notification/read')
        .set('token', userAToken)
        .set('plain-text', 'true')
        .send({ ids: [notifA1Id] });

      expect(res.status).toBe(200);

      const check = await notifications.findByPk(notifA1Id);
      expect(check?.get('read_at')).not.toBeNull();
    });

    it('prevents user A from marking user B notification as read', async () => {
      const res = await request(app)
        .put('/notification/read')
        .set('token', userAToken)
        .set('plain-text', 'true')
        .send({ ids: [notifB1Id] });

      expect(res.status).toBe(200);

      // User B's notification must remain unread
      const checkB = await notifications.findByPk(notifB1Id);
      expect(checkB?.get('read_at')).toBeNull();
    });

    it('marks all notifications as read for current user', async () => {
      const res = await request(app)
        .put('/notification/read-all')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);

      const countRes = await request(app)
        .get('/notification/unread-count')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(countRes.status).toBe(200);
      expect(countRes.body.data.count).toBe(0);
    });

    it('deletes a notification belonging to user', async () => {
      const res = await request(app)
        .delete(`/notification/delete/${notifA1Id}`)
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);

      const check = await notifications.findByPk(notifA1Id);
      expect(Number(check?.get('status'))).toBe(2);
    });

    it('rejects attempt to delete another users notification with 404', async () => {
      const res = await request(app)
        .delete(`/notification/delete/${notifB1Id}`)
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(404);
    });
  });

  describe('3. Notification Preferences', () => {
    it('retrieves current notification preferences', async () => {
      const res = await request(app)
        .get('/notification/preferences')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('data');
    });

    it('updates notification category preferences', async () => {
      const res = await request(app)
        .put('/notification/preferences')
        .set('token', userAToken)
        .set('plain-text', 'true')
        .send({
          preferences: [
            { category: 'hardware', in_app: 1, email: 1, desktop: 0, sound: 1 },
            { category: 'software', in_app: 0, email: 1, desktop: 0, sound: 0 },
          ],
        });

      expect(res.status).toBe(200);

      const check = await request(app)
        .get('/notification/preferences')
        .set('token', userAToken)
        .set('plain-text', 'true');

      expect(check.status).toBe(200);
      const prefs = check.body.data;
      expect(Array.isArray(prefs)).toBe(true);
      const softPref = prefs.find((p: any) => p.category === 'software');
      if (softPref) {
        expect(Number(softPref.in_app)).toBe(0);
      }
    });
  });

  describe('4. Security & Unauthenticated Access', () => {
    it('prevents unauthenticated access to notification listing (401)', async () => {
      const res = await request(app)
        .post('/notification/list')
        .set('plain-text', 'true')
        .send({ currentPage: 1, itemsPerPage: 10 });

      expect(res.status).toBe(401);
    });
  });
});
