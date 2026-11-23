import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens, employees } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';

describe('API Phone Validation & E.164 Normalization', () => {
  const app = createApp();
  let adminToken: string;

  async function getOrCreateToken(email: string): Promise<string> {
    const user = await users.findOne({ where: { email } });
    if (!user) throw new Error(`User not found: ${email}`);
    const token = jwt.sign({ sub: String(user.id), email: user.email }, env.SECRET_KEY, {
      expiresIn: '2h',
    });
    await user_tokens.create({
      user_id: user.id,
      token: hashToken(token),
      refresh_token: `ref_ph_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
  });

  it('accepts and normalizes Indian national phone to E.164 on employee create', async () => {
    const code = `PH-IN-${Date.now()}`;
    const res = await request(app)
      .post('/employee/add')
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({
        employee_code: code,
        first_name: 'Phone',
        last_name: 'India',
        email: `phone.in.${Date.now()}@fixture.local`,
        phone: '9876543210',
        employment_status: 1,
      });

    expect(res.status).toBe(201);
    const created = await employees.findOne({ where: { employee_code: code } });
    expect(created?.phone).toBe('+919876543210');
  });

  it('accepts and stores valid international E.164 phone number', async () => {
    const code = `PH-US-${Date.now()}`;
    const res = await request(app)
      .post('/employee/add')
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({
        employee_code: code,
        first_name: 'Phone',
        last_name: 'US',
        email: `phone.us.${Date.now()}@fixture.local`,
        phone: '+12025550143',
        employment_status: 1,
      });

    expect(res.status).toBe(201);
    const created = await employees.findOne({ where: { employee_code: code } });
    expect(created?.phone).toBe('+12025550143');
  });

  it('rejects invalid phone numbers with 422 Validation Error', async () => {
    const res = await request(app)
      .post('/employee/add')
      .set('token', adminToken)
      .set('plain-text', 'true')
      .send({
        employee_code: `PH-INV-${Date.now()}`,
        first_name: 'Phone',
        last_name: 'Invalid',
        email: `phone.inv.${Date.now()}@fixture.local`,
        phone: '12345',
        employment_status: 1,
      });

    expect(res.status).toBe(422);
  });
});
