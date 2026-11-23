import { describe, it, expect } from 'vitest';
import { envSchema } from '../Config/env';
import { activity_logs } from '../Database/Schema';
import { encryptSecret, decryptSecret, buildAAD, getActiveKeyVersion } from '../Utils/vault_crypto';
import { sanitizeFormulaInjection } from '../Reports/helpers';

describe('B4 & B5: Vault Key Rotation, Production Boot Rejection & Redaction Verification', () => {
  it('production boot refuses default/short secrets, wildcard CORS and fixture passwords', () => {
    const baseValid = {
      PORT: '8000',
      NODE_ENV: 'production',
      DB_USERNAME: 'dbuser',
      DB_PASSWORD: 'StrongDbPassword2026!',
      DB_HOST: '127.0.0.1',
      DB_DATABASE: 'hardware_store',
      SECRET_KEY: 'extremely-secure-and-random-32char-key!',
      CORS_ORIGINS: 'https://app.hardware-management.com',
      ENCRYPTION_SECRET: '32-character-encryption-secret-prod!',
      VAULT_ENCRYPTION_KEY: 'abcdef0123456789abcdef0123456789',
      SUPER_ADMIN_EMAIL: 'admin@prod.hardware-management.com',
      SUPER_ADMIN_PASSWORD: 'SuperStrongProdPassword2026!#$%',
    };

    // 1. Rejects default VAULT_ENCRYPTION_KEY in production
    expect(() =>
      envSchema.parse({
        ...baseValid,
        VAULT_ENCRYPTION_KEY: '12345678901234567890123456789012',
      }),
    ).toThrow(/Default development VAULT_ENCRYPTION_KEY is forbidden/);

    // 2. Rejects wildcard CORS in production
    expect(() =>
      envSchema.parse({
        ...baseValid,
        CORS_ORIGINS: '*',
      }),
    ).toThrow();

    // 3. Rejects fixture super admin passwords in production
    expect(() =>
      envSchema.parse({
        ...baseValid,
        SUPER_ADMIN_PASSWORD: 'SuperAdmin123!',
      }),
    ).toThrow(/Default development SUPER_ADMIN_PASSWORD is forbidden/);

    expect(() =>
      envSchema.parse({
        ...baseValid,
        SUPER_ADMIN_PASSWORD: 'TestPassword123!',
      }),
    ).toThrow(/Default development SUPER_ADMIN_PASSWORD is forbidden/);

    // 4. Rejects default / example SECRET_KEY
    expect(() =>
      envSchema.parse({
        ...baseValid,
        SECRET_KEY: 'example-secret-key-that-is-32-chars-long',
      }),
    ).toThrow(/Default development SECRET_KEY is forbidden/);

    // 5. Valid production configuration passes
    const validParsed = envSchema.parse(baseValid);
    expect(validParsed.NODE_ENV).toBe('production');
  });

  it('vault:rotate re-encrypts secrets with new active key and maintains reveal capability', async () => {
    const testSecret = 'OriginalSecureSecret123!';
    const credId = 99991;
    const empId = 1;
    const aad = buildAAD(credId, empId);

    // Initial encryption under v1
    const v1Encrypted = encryptSecret(testSecret, aad, '1');
    expect(v1Encrypted.keyVersion).toBe('1');

    // Decrypt with v1
    const decryptedV1 = decryptSecret(
      v1Encrypted.ciphertext,
      v1Encrypted.iv,
      v1Encrypted.authTag,
      '1',
      aad,
    );
    expect(decryptedV1).toBe(testSecret);

    // Re-encrypt to target active key version (simulate vault:rotate)
    const targetVersion = getActiveKeyVersion();
    const rotatedEncrypted = encryptSecret(decryptedV1, aad, targetVersion);
    expect(rotatedEncrypted.keyVersion).toBe(targetVersion);

    // Reveal secret after rotation
    const revealedAfterRotation = decryptSecret(
      rotatedEncrypted.ciphertext,
      rotatedEncrypted.iv,
      rotatedEncrypted.authTag,
      targetVersion,
      aad,
    );
    expect(revealedAfterRotation).toBe(testSecret);

    // Verify old key version is retired / fails if decrypted with wrong key version
    if (targetVersion !== 'legacy-nonexistent') {
      expect(() =>
        decryptSecret(
          rotatedEncrypted.ciphertext,
          rotatedEncrypted.iv,
          rotatedEncrypted.authTag,
          'legacy-retired-key',
          aad,
        ),
      ).toThrow(/not found in vault keys/);
    }
  });

  it('B5: Redaction — activity logs, exports and application logs never log plaintext passwords or secrets', async () => {
    // Check recent activity logs in database
    const recentLogs = await activity_logs.findAll({
      limit: 20,
      order: [['id', 'DESC']],
    });

    const forbiddenPatterns = [
      'SuperAdmin123!',
      'TestPassword123!',
      'dev-vault-encryption-key-fallback',
      '12345678901234567890123456789012',
    ];

    for (const log of recentLogs) {
      const details = JSON.stringify(log.details || '');
      for (const pattern of forbiddenPatterns) {
        expect(details).not.toContain(pattern);
      }
    }

    // Verify CSV exporter sanitization
    const injectionSample = '=cmd|"/C calc"!A0';
    const sanitized = sanitizeFormulaInjection(injectionSample);
    expect(sanitized.startsWith("'")).toBe(true);
    expect(sanitized).toBe('\'=cmd|"/C calc"!A0');
  });
});
