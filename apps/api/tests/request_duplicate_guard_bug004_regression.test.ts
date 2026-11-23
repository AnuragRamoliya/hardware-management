import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, asset_categories, requests } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { REQUEST_TYPE, REQUEST_PRIORITY, REQUEST_STATUS } from '@hm/shared';

describe('Regression BUG-004: Portal Request Duplicate Guard Category Scoping', () => {
  const app = createApp();
  let empToken: string;
  let catAId: number;
  let catBId: number;

  beforeAll(async () => {
    const user = await users.findOne({ where: { email: 'emp@fixture.local' } });
    expect(user).not.toBeNull();
    const token = jwt.sign({ sub: String(user!.id), email: user!.email }, env.SECRET_KEY, {
      expiresIn: '1h',
    });
    await user_tokens.create({
      user_id: user!.id,
      token: hashToken(token),
      refresh_token: `ref_bug004_${Date.now()}`,
      expires_at: new Date(Date.now() + 100000),
    });
    empToken = token;

    // Clean up any lingering active test requests for this user to have a clean slate
    const emp = await (
      await import('../Database/Schema')
    ).employees.findOne({
      where: { user_id: user!.id },
    });
    if (emp) {
      await requests.update(
        { request_status: REQUEST_STATUS.CLOSED },
        { where: { employee_id: emp.id, request_status: [1, 2, 3, 4, 9] } },
      );
    }

    const catA = await asset_categories.create({
      name: `CatA-${Date.now()}`,
      status: 1,
      created_by: 1,
    });
    catAId = Number(catA.id);

    const catB = await asset_categories.create({
      name: `CatB-${Date.now()}`,
      status: 1,
      created_by: 1,
    });
    catBId = Number(catB.id);
  });

  it('allows an employee to submit active hardware requests for different categories', async () => {
    // 1. Submit request for Category A (e.g. Laptop)
    const resA = await request(app)
      .post('/portal/request/add')
      .set('token', empToken)
      .set('plain-text', 'true')
      .send({
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        category_id: catAId,
        title: 'Need a Laptop for engineering',
        reason: 'Work machine requirement',
        priority: REQUEST_PRIORITY.MEDIUM,
      });

    expect([200, 201]).toContain(resA.status);

    // 2. Submit second request for Category B (e.g. Monitor)
    const resB = await request(app)
      .post('/portal/request/add')
      .set('token', empToken)
      .set('plain-text', 'true')
      .send({
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        category_id: catBId,
        title: 'Need a Monitor for development',
        reason: 'External screen requirement',
        priority: REQUEST_PRIORITY.MEDIUM,
      });

    // Should NOT be blocked by 409 because it is a different category/item
    expect([200, 201]).toContain(resB.status);
    expect(resB.body).toHaveProperty('data');
    expect(Number(resB.body.data.category_id)).toBe(catBId);
  });

  it('blocks a second active request for the SAME category with 409 Conflict', async () => {
    const resDuplicate = await request(app)
      .post('/portal/request/add')
      .set('token', empToken)
      .set('plain-text', 'true')
      .send({
        request_type: REQUEST_TYPE.NEW_HARDWARE,
        category_id: catAId, // same as first request
        title: 'Second Laptop request',
        reason: 'Duplicate attempt',
        priority: REQUEST_PRIORITY.LOW,
      });

    expect(resDuplicate.status).toBe(409);
    expect(resDuplicate.body.message).toMatch(/already have an active request/i);
  });
});
