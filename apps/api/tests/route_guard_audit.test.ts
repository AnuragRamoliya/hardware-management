import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../Config/app';
import { envSchema } from '../Config/env';
import { listAllRoutes } from '../scripts/audit_routes';

describe('A1 & A5: Route Guard Audit and Transport Security', () => {
  const publicAllowlist = new Set([
    'GET /',
    'GET /health',
    'GET /ready',
    'POST /user/login',
    'POST /login',
    'POST /user/refresh/token',
    'POST /refresh/token',
    'POST /user/forgot/password',
    'POST /forgot/password',
    'POST /user/forgot/otp/verify',
    'POST /forgot/otp/verify',
    'PUT /user/reset/password',
    'PUT /reset/password',
    'POST /offboarding/verify-document',
    'POST /verify-document',
  ]);

  it('enforces that every route outside the public allowlist requires userAuth', () => {
    const allRoutes = listAllRoutes();
    expect(allRoutes.length).toBeGreaterThan(50);

    const unprotectedRoutes: string[] = [];

    for (const r of allRoutes) {
      const key = `${r.method} ${r.path}`;
      if (r.path.startsWith('/api-docs') || publicAllowlist.has(key)) {
        continue;
      }

      const hasAuth = r.middleware.some(
        (m) => m === 'userAuth' || m === 'socketAuthMiddleware' || m === 'authenticate',
      );

      if (!hasAuth) {
        unprotectedRoutes.push(`${key} -> [${r.middleware.join(', ')}]`);
      }
    }

    if (unprotectedRoutes.length > 0) {
      console.error('Found unprotected routes:', unprotectedRoutes);
    }

    expect(unprotectedRoutes).toEqual([]);
  });

  it('enforces transport security headers in Express app', async () => {
    const app = createApp();
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(app.get('x-powered-by')).toBe(false);
  });

  it('production configuration refuses to boot with default secrets or wildcard CORS', () => {
    const baseValid = {
      PORT: '8000',
      NODE_ENV: 'production',
      DB_USERNAME: 'dbuser',
      DB_PASSWORD: 'realpassword123',
      DB_HOST: '127.0.0.1',
      DB_DATABASE: 'itam_prod',
      SECRET_KEY: 'extremely-secure-and-long-random-production-jwt-secret-key-at-least-32-chars',
      ENCRYPTION_SECRET: 'prod-encryption-secret-string',
      VAULT_ENCRYPTION_KEY: '12345678901234567890123456789012', // default dev key
      SUPER_ADMIN_EMAIL: 'admin@company.com',
      SUPER_ADMIN_PASSWORD: 'ValidPassword123!',
      CORS_ORIGINS: 'https://app.company.com',
    };

    // 1. Should fail on default dev VAULT_ENCRYPTION_KEY
    expect(() => envSchema.parse(baseValid)).toThrow(
      /Default development VAULT_ENCRYPTION_KEY is forbidden in production/,
    );

    // 2. Should fail on wildcard CORS
    const wildcardCors = {
      ...baseValid,
      VAULT_ENCRYPTION_KEY: 'abcdefabcdefabcdefabcdefabcdefab',
      CORS_ORIGINS: '*',
    };
    expect(() => envSchema.parse(wildcardCors)).toThrow();

    // 3. Should fail on default fixture password
    const fixturePass = {
      ...baseValid,
      VAULT_ENCRYPTION_KEY: 'abcdefabcdefabcdefabcdefabcdefab',
      SUPER_ADMIN_PASSWORD: 'TestPassword123!',
    };
    expect(() => envSchema.parse(fixturePass)).toThrow(
      /Default development SUPER_ADMIN_PASSWORD is forbidden in production/,
    );
  });
});
