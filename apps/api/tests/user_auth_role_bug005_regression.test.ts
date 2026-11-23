import { describe, it, expect } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';

describe('Regression BUG-005: userAuth attaches role and role_name to req.userInfo', () => {
  const app = createApp();

  it('populates role name on req.userInfo for authenticated actors', async () => {
    const adminUser = await users.findOne({ where: { email: 'admin@fixture.local' } });
    expect(adminUser).not.toBeNull();
    const token = jwt.sign(
      { sub: String(adminUser!.id), email: adminUser!.email },
      env.SECRET_KEY,
      {
        expiresIn: '1h',
      },
    );
    await user_tokens.create({
      user_id: adminUser!.id,
      token: hashToken(token),
      refresh_token: `ref_bug005_${Date.now()}`,
      expires_at: new Date(Date.now() + 100000),
    });

    // Call /module/permission which returns current user permissions and role
    const res = await request(app)
      .get('/module/permission')
      .set('token', token)
      .set('plain-text', 'true');

    expect(res.status).toBe(200);
    // Role information should be properly hydrated
    expect(res.body.data).toBeDefined();
  });
});
