import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { createApp } from '../Config/app';
import { env } from '../Config/env';
import { modules, permissions, user_tokens, users } from '../Database/Schema';
import { UserModel } from '../Models/users';
import { ResourceModel } from '../Models/resource';
import {
  decryptPayload,
  decryptVaultSecret,
  encryptPayload,
  encryptVaultSecret,
} from '../Utils/encryption';

const app = createApp();
const validToken = jwt.sign({ email: 'admin@example.com' }, env.SECRET_KEY, {
  subject: '1',
  expiresIn: 3600,
});

describe('API authentication and resource CRUD', () => {
  beforeEach(() => {
    vi.spyOn(user_tokens, 'findOne').mockResolvedValue(
      user_tokens.build({
        user_id: 1,
        token: validToken,
        expires_at: new Date(Date.now() + 60_000),
      }),
    );
    vi.spyOn(users, 'findOne').mockResolvedValue(
      users.build({
        id: 1,
        role_id: 1,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com',
        status: 1,
      }),
    );
    vi.spyOn(modules, 'findOne').mockResolvedValue(modules.build({ id: 4, name: 'department' }));
    vi.spyOn(permissions, 'findOne').mockResolvedValue(
      permissions.build({
        role_id: 1,
        module_id: 4,
        read_access: 1,
        write_access: 1,
        delete_access: 1,
      }),
    );
  });

  describe('payload and vault encryption', () => {
    it('round-trips the client-compatible payload format', async () => {
      const encrypted = await encryptPayload({ message: 'compatible' });
      expect(encrypted.slice(0, 128)).toMatch(/^[A-Za-z0-9]{128}$/);
      expect(decryptPayload<{ message: string }>(encrypted)).toEqual({ message: 'compatible' });
    });

    it('authenticates AES-GCM vault ciphertext', () => {
      const encrypted = encryptVaultSecret('vault-value');
      expect(decryptVaultSecret(encrypted)).toBe('vault-value');
      const [iv, encodedTag, ciphertext] = encrypted.split('.');
      const tag = Buffer.from(encodedTag!, 'base64url');
      tag[0] ^= 1;
      expect(() =>
        decryptVaultSecret(`${iv}.${tag.toString('base64url')}.${ciphertext}`),
      ).toThrow();
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('handles login through the public auth route', async () => {
    vi.spyOn(UserModel.prototype, 'login').mockResolvedValue({
      token: 'access-token',
      refresh_token: 'refresh-token',
      user_info: {
        id: 1,
        role_id: 1,
        first_name: 'Super',
        last_name: 'Admin',
        email: 'admin@example.com',
        role: { id: 1, name: 'Super Admin' },
      },
    });

    const response = await request(app)
      .post('/user/login')
      .set('plain-text', 'true')
      .send({ email: 'admin@example.com', password: 'a-valid-password' });

    expect(response.status).toBe(200);
    expect(response.body.data.refresh_token).toBe('refresh-token');
  });

  it('rejects a protected request without a token', async () => {
    const response = await request(app).get('/user/profile').set('plain-text', 'true');
    expect(response.status).toBe(401);
    expect(response.body.message).toMatch(/token/i);
  });

  it('updates the authenticated profile through its dedicated route', async () => {
    vi.spyOn(UserModel.prototype, 'updateProfile').mockResolvedValue({
      id: 1,
      role_id: 1,
      first_name: 'Updated',
      last_name: 'Admin',
      email: 'updated@example.com',
    });

    const response = await request(app)
      .put('/user/profile/update')
      .set('plain-text', 'true')
      .set('token', validToken)
      .send({ first_name: 'Updated' });

    expect(response.status).toBe(200);
    expect(response.body.data.first_name).toBe('Updated');
  });

  it("returns the authenticated user's permissions for navigation", async () => {
    vi.spyOn(permissions, 'findAll').mockResolvedValue([]);

    const response = await request(app)
      .get('/module/permission')
      .set('plain-text', 'true')
      .set('token', validToken);

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
  });

  it('denies access when a role has no module permission', async () => {
    vi.spyOn(permissions, 'findOne').mockResolvedValue(null);
    const response = await request(app)
      .get('/user/profile')
      .set('plain-text', 'true')
      .set('token', validToken);
    expect(response.status).toBe(403);
  });

  it('serves options with the dedicated permission and validates pagination inputs', async () => {
    vi.spyOn(permissions, 'findOne').mockResolvedValue(
      permissions.build({
        role_id: 1,
        module_id: 4,
        read_access: 0,
        options_access: 1,
        status: 1,
      }),
    );
    const optionsSpy = vi.spyOn(ResourceModel.prototype, 'options').mockResolvedValue({
      rows: [{ value: 7, label: 'Operations', meta: {}, id: 7, name: 'Operations' }],
      count: 1,
      hasMore: false,
      page: 1,
    });
    const headers = { 'plain-text': 'true', token: validToken };

    const options = await request(app)
      .post('/department/options')
      .set(headers)
      .send({ search: ' Ops ', page: 1, limit: 30 });
    const capped = await request(app).post('/department/options').set(headers).send({ limit: 500 });
    const invalidPage = await request(app)
      .post('/department/options')
      .set(headers)
      .send({ page: 0 });
    const invalidLimit = await request(app)
      .post('/department/options')
      .set(headers)
      .send({ limit: -1 });
    const nonNumericPage = await request(app)
      .post('/department/options')
      .set(headers)
      .send({ page: 'abc' });
    const nonNumericLimit = await request(app)
      .post('/department/options')
      .set(headers)
      .send({ limit: 'abc' });

    expect(options.status).toBe(200);
    expect(options.body.data.rows[0]).toMatchObject({ value: 7, label: 'Operations' });
    expect(optionsSpy).toHaveBeenCalledWith({ search: 'Ops', page: 1, limit: 30 });
    expect(capped.status).toBe(200);
    expect(invalidPage.status).toBe(422);
    expect(invalidLimit.status).toBe(422);
    expect(nonNumericPage.status).toBe(422);
    expect(nonNumericLimit.status).toBe(422);
  });

  it('completes department create, list, get, update, and soft delete routes', async () => {
    let department = { id: 7, name: 'Operations', description: null, status: 1 };
    vi.spyOn(ResourceModel.prototype, 'add').mockImplementation(async () => department);
    vi.spyOn(ResourceModel.prototype, 'list').mockImplementation(async () => ({
      rows: [department],
      count: 1,
    }));
    vi.spyOn(ResourceModel.prototype, 'get').mockImplementation(async () => department);
    vi.spyOn(ResourceModel.prototype, 'update').mockImplementation(async (input) => {
      department = { ...department, ...input, id: 7, status: 1 } as typeof department;
      return department;
    });
    vi.spyOn(ResourceModel.prototype, 'delete').mockImplementation(async () => {
      department = { ...department, status: 2 };
    });

    const headers = { 'plain-text': 'true', token: validToken };
    const created = await request(app)
      .post('/department/add')
      .set(headers)
      .send({ name: 'Operations' });
    const listed = await request(app)
      .post('/department/list')
      .set(headers)
      .send({ currentPage: 1 });
    const fetched = await request(app).get('/department/get/7').set(headers);
    const updated = await request(app)
      .put('/department/update')
      .set(headers)
      .send({ id: 7, name: 'IT' });
    const deleted = await request(app).delete('/department/delete/7').set(headers);

    expect(created.status).toBe(201);
    expect(listed.body.data).toMatchObject({ rows: [{ id: 7 }], count: 1 });
    expect(fetched.body.data.name).toBe('Operations');
    expect(updated.body.data.name).toBe('IT');
    expect(deleted.status).toBe(200);
    expect(department.status).toBe(2);
  });
});
