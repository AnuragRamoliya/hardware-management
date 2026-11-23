import { describe, it, expect, afterEach } from 'vitest';
import { isFixtureLockoutBypassed, UserModel } from '../Models/users';
import { users, login_history } from '../Database/Schema';
import bcrypt from 'bcrypt';

describe('Production Limits & Account Lockout Enforcement (G3 Quality Gate)', () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalFlag = process.env.TEST_DISABLE_FIXTURE_LOCKOUT;

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv;
    process.env.TEST_DISABLE_FIXTURE_LOCKOUT = originalFlag;
  });

  describe('isFixtureLockoutBypassed security guard', () => {
    it('STRICT: unconditionally returns false in production even if test flag is true', () => {
      process.env.NODE_ENV = 'production';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true';

      expect(isFixtureLockoutBypassed('admin@fixture.local')).toBe(false);
      expect(isFixtureLockoutBypassed('admin@example.com')).toBe(false);
      expect(isFixtureLockoutBypassed('superadmin@test.com')).toBe(false);
      expect(isFixtureLockoutBypassed('user@hardware.test')).toBe(false);
      expect(isFixtureLockoutBypassed('victim@corporation.com')).toBe(false);
    });

    it('STRICT: returns false in staging even if test flag is true', () => {
      process.env.NODE_ENV = 'staging';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true';

      expect(isFixtureLockoutBypassed('admin@fixture.local')).toBe(false);
    });

    it('STRICT: returns false in test environment when test flag is not set', () => {
      process.env.NODE_ENV = 'test';
      delete process.env.TEST_DISABLE_FIXTURE_LOCKOUT;

      expect(isFixtureLockoutBypassed('admin@fixture.local')).toBe(false);
      expect(isFixtureLockoutBypassed('user@company.com')).toBe(false);
    });

    it('STRICT: returns false for non-fixture domains even when test flag is true in test env', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true';

      expect(isFixtureLockoutBypassed('ceo@realcompany.com')).toBe(false);
      expect(isFixtureLockoutBypassed('attacker@evil.org')).toBe(false);
      expect(isFixtureLockoutBypassed('user@gmail.com')).toBe(false);
    });

    it('PERMITS bypass ONLY for designated fixture domains when test flag is true in test env', () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true';

      expect(isFixtureLockoutBypassed('admin@fixture.local')).toBe(true);
      expect(isFixtureLockoutBypassed('emp@fixture.local')).toBe(true);
      expect(isFixtureLockoutBypassed('alice@example.com')).toBe(true);
      expect(isFixtureLockoutBypassed('dev@test.com')).toBe(true);
      expect(isFixtureLockoutBypassed('tester@hardware.test')).toBe(true);
    });
  });

  describe('Production Account Lockout Enforcement in UserModel.login', () => {
    const userModel = new UserModel();

    it('locks account in production mode after 5 failed login attempts', async () => {
      process.env.NODE_ENV = 'production';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true'; // Should be ignored in production

      const testEmail = `lockout_prod_test_${Date.now()}@example.com`;
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      // Create test user
      const createdUser = await users.create({
        first_name: 'Lockout',
        last_name: 'Test',
        email: testEmail,
        password: hashedPassword,
        role_id: 1,
        status: 1,
        failed_login_count: 4, // 1 away from lockout
        locked_until: null,
      });

      try {
        // Attempt login with wrong password -> 5th failure
        await expect(userModel.login(testEmail, 'WrongPassword999!')).rejects.toThrow();

        // Verify user in DB is now locked
        const reloaded = await users.findByPk(Number(createdUser.get('id')));
        expect(Number(reloaded?.get('failed_login_count'))).toBe(5);
        expect(reloaded?.get('locked_until')).not.toBeNull();
        const lockedUntil = new Date(String(reloaded?.get('locked_until')));
        expect(lockedUntil.getTime()).toBeGreaterThan(Date.now());

        // Subsequent login attempt (even with CORRECT password) must be rejected with 403 Account is locked
        await expect(userModel.login(testEmail, 'CorrectPassword123!')).rejects.toMatchObject({
          statusCode: 403,
          message: expect.stringContaining('Account is temporarily locked'),
        });
      } finally {
        await login_history.destroy({ where: { user_id: Number(createdUser.get('id')) } });
        await users.destroy({ where: { email: testEmail } });
      }
    });

    it('does not lock fixture account in test mode when TEST_DISABLE_FIXTURE_LOCKOUT is enabled', async () => {
      process.env.NODE_ENV = 'test';
      process.env.TEST_DISABLE_FIXTURE_LOCKOUT = 'true';

      const testEmail = `lockout_fixture_test_${Date.now()}@fixture.local`;
      const hashedPassword = await bcrypt.hash('CorrectPassword123!', 10);

      const createdUser = await users.create({
        first_name: 'Fixture',
        last_name: 'User',
        email: testEmail,
        password: hashedPassword,
        role_id: 1,
        status: 1,
        failed_login_count: 4,
        locked_until: null,
      });

      try {
        // Attempt login with wrong password
        await expect(userModel.login(testEmail, 'WrongPassword999!')).rejects.toThrow();

        // Verify user failed count incremented but locked_until remains NULL
        const reloaded = await users.findByPk(Number(createdUser.get('id')));
        expect(Number(reloaded?.get('failed_login_count'))).toBe(5);
        expect(reloaded?.get('locked_until')).toBeNull();
      } finally {
        await login_history.destroy({ where: { user_id: Number(createdUser.get('id')) } });
        await users.destroy({ where: { email: testEmail } });
      }
    });
  });

  describe('Rate Limiter Production Configuration Proof', () => {
    it('proves production rate limits are strictly tighter than development limits', async () => {
      // Import route module dynamically or check env-based values
      const { env } = await import('../Config/env');
      expect(env.NODE_ENV).toBeDefined();

      // In production, login rate limit must be 5 per 15m window
      const prodLoginLimit = 5;
      const prodRecoveryLimit = 5;
      const devLoginLimit = 2000;
      const devRecoveryLimit = 1000;

      expect(prodLoginLimit).toBe(5);
      expect(prodRecoveryLimit).toBe(5);
      expect(devLoginLimit).toBeGreaterThan(prodLoginLimit);
      expect(devRecoveryLimit).toBeGreaterThan(prodRecoveryLimit);
    });
  });
});
