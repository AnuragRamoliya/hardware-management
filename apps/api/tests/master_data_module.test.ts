import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { users, user_tokens } from '../Database/Schema';
import { hashToken } from '../Utils/encryption';
import { MODULES } from '../Config/constant';

describe('API Module 04: Master Data Comprehensive QA Suite', () => {
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
      refresh_token: `ref_md_${Date.now()}_${Math.random()}`,
      expires_at: new Date(Date.now() + 7200_000),
    });
    return token;
  }

  beforeAll(async () => {
    adminToken = await getOrCreateToken('admin@fixture.local');
    empToken = await getOrCreateToken('emp@fixture.local');
  });

  const testSuffix = Date.now();

  const resources = [
    { name: 'Department', path: '/department', module: MODULES.DEPARTMENT },
    { name: 'Designation', path: '/designation', module: MODULES.DESIGNATION },
    { name: 'Location', path: '/location', module: MODULES.LOCATION },
    { name: 'Vendor', path: '/vendor', module: MODULES.VENDOR },
    { name: 'AssetCategory', path: '/asset_category', module: MODULES.ASSET_CATEGORY },
  ];

  for (const resDef of resources) {
    describe(`Master Data CRUD & Quality Gates: ${resDef.name} (${resDef.path})`, () => {
      let createdId: number;
      const itemName = `QA-${resDef.name}-${testSuffix}`;

      it(`creates a ${resDef.name} record as admin`, async () => {
        const res = await request(app)
          .post(`${resDef.path}/add`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ name: itemName, description: `Automated QA ${resDef.name}` });

        expect([200, 201]).toContain(res.status);
        expect(res.body).toHaveProperty('data');
        createdId = Number(res.body.data.id);
        expect(createdId).toBeGreaterThan(0);
      });

      it(`retrieves ${resDef.name} by ID`, async () => {
        const res = await request(app)
          .get(`${resDef.path}/get/${createdId}`)
          .set('token', adminToken)
          .set('plain-text', 'true');

        expect(res.status).toBe(200);
        expect(Number(res.body.data.id)).toBe(createdId);
        expect(res.body.data.name).toBe(itemName);
      });

      it(`updates ${resDef.name} record`, async () => {
        const res = await request(app)
          .put(`${resDef.path}/update`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ id: createdId, name: `${itemName}-Renamed` });

        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe(`${itemName}-Renamed`);
      });

      it(`lists ${resDef.name} records with search and pagination`, async () => {
        const res = await request(app)
          .post(`${resDef.path}/list`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({
            currentPage: 1,
            itemsPerPage: 10,
            search: itemName,
          });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('rows');
        const found = res.body.data.rows.find((r: any) => Number(r.id) === createdId);
        expect(found).toBeDefined();
      });

      it(`returns options for ${resDef.name}`, async () => {
        const res = await request(app)
          .post(`${resDef.path}/options`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({
            search: itemName,
            limit: 20,
          });

        expect(res.status).toBe(200);
        expect(res.body.data).toHaveProperty('rows');
        const found = res.body.data.rows.find((o: any) => Number(o.value) === createdId);
        expect(found).toBeDefined();
      });

      it(`rejects ${resDef.name} creation with missing required name (400/422)`, async () => {
        const res = await request(app)
          .post(`${resDef.path}/add`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({});

        expect([400, 422]).toContain(res.status);
      });

      it(`rejects unauthorized modification by regular employee (403)`, async () => {
        const res = await request(app)
          .put(`${resDef.path}/update`)
          .set('token', empToken)
          .set('plain-text', 'true')
          .send({ id: createdId, name: 'Hacked' });

        expect(res.status).toBe(403);
      });

      it(`soft deletes ${resDef.name} and ensures exclusion from options`, async () => {
        const delRes = await request(app)
          .delete(`${resDef.path}/delete/${createdId}`)
          .set('token', adminToken)
          .set('plain-text', 'true');

        expect([200, 204]).toContain(delRes.status);

        const optRes = await request(app)
          .post(`${resDef.path}/options`)
          .set('token', adminToken)
          .set('plain-text', 'true')
          .send({ search: itemName });

        expect(optRes.status).toBe(200);
        const found = optRes.body.data.rows?.find((o: any) => Number(o.value) === createdId);
        expect(found).toBeUndefined();
      });
    });
  }
});
