import { describe, expect, it, vi } from 'vitest';
import { buildAAD, encryptSecret, decryptSecret, getActiveKeyVersion } from '../Utils/vault_crypto';
import { computeRowHash, GENESIS_HASH, verifyHashChain } from '../Utils/hash_chain';
import { validatePasswordPolicy, generateSecurePassword } from '../Utils/password_policy';
import { findForbiddenSecretKeys } from '../Utils/redaction';
import { CredentialVaultService } from '../Services/credential_vault';
import { CREDENTIAL_APPROVAL_STATUS, PROVIDED_BY } from '@hm/shared';
import type { UserInfo } from '../Types/api';

describe('Phase 3 Credential Vault Unit & Integration Tests', () => {
  const sampleActor: UserInfo = {
    id: 1,
    role_id: 1,
    first_name: 'Security',
    last_name: 'Admin',
    email: 'admin@example.com',
  };

  describe('1. Cryptography and Row-Bound AAD', () => {
    it('encrypts and decrypts secret bound to row AAD', () => {
      const plaintext = 'SuperSecretP@ssw0rd!123';
      const aad = buildAAD(42, 101);
      const encrypted = encryptSecret(plaintext, aad);

      expect(encrypted.ciphertext).toBeDefined();
      expect(encrypted.iv).toBeDefined();
      expect(encrypted.authTag).toBeDefined();
      expect(encrypted.keyVersion).toBe(getActiveKeyVersion());

      const decrypted = decryptSecret(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyVersion,
        aad,
      );
      expect(decrypted).toBe(plaintext);
    });

    it('fails decryption if row AAD is tampered (e.g. copied to another employee)', () => {
      const plaintext = 'ConfidentialToken#999';
      const originalAAD = buildAAD(42, 101);
      const tamperedAAD = buildAAD(42, 999); // wrong employee ID
      const encrypted = encryptSecret(plaintext, originalAAD);

      expect(() => {
        decryptSecret(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.authTag,
          encrypted.keyVersion,
          tamperedAAD,
        );
      }).toThrow(/verification failed/i);
    });

    it('fails decryption if ciphertext or auth tag is modified', () => {
      const plaintext = 'PlainData';
      const aad = buildAAD(1, 1);
      const encrypted = encryptSecret(plaintext, aad);

      // Modify auth tag
      const corruptedTag = Buffer.from(encrypted.authTag, 'base64');
      corruptedTag[0] ^= 1;

      expect(() => {
        decryptSecret(
          encrypted.ciphertext,
          encrypted.iv,
          corruptedTag.toString('base64'),
          encrypted.keyVersion,
          aad,
        );
      }).toThrow(/verification failed/i);
    });
  });

  describe('2. Secret Redaction & Leak Scanning', () => {
    it('detects forbidden secret keys in objects and nested structures', () => {
      const safeObject = {
        id: 10,
        label: 'GitHub Account',
        username: 'dev_user',
        employee: { id: 5, name: 'Alice' },
      };
      expect(findForbiddenSecretKeys(safeObject)).toEqual([]);

      const leakyObject = {
        id: 10,
        label: 'GitHub Account',
        username: 'dev_user',
        password_enc: 'dGVzdA==',
        iv: 'cmFuZG9t',
        auth_tag: 'dGFn',
        key_version: '1',
      };
      const leaks = findForbiddenSecretKeys(leakyObject);
      expect(leaks).toContain('password_enc');
      expect(leaks).toContain('iv');
      expect(leaks).toContain('auth_tag');
      expect(leaks).toContain('key_version');
    });
  });

  describe('3. Password Policy & Generator', () => {
    it('validates password minimum length and complexity', () => {
      expect(validatePasswordPolicy('short', { min_length: 12 }).valid).toBe(false);
      expect(
        validatePasswordPolicy('alllowercasewithoutnumbersorsymbols', {
          min_length: 12,
          require_complexity: true,
        }).valid,
      ).toBe(false);

      expect(
        validatePasswordPolicy('ValidP@ssw0rd!2026', {
          min_length: 12,
          require_complexity: true,
        }).valid,
      ).toBe(true);
    });

    it('generates passwords compliant with complexity rules', () => {
      for (let i = 0; i < 10; i++) {
        const generated = generateSecurePassword(16, true);
        expect(generated.length).toBe(16);
        expect(
          validatePasswordPolicy(generated, { min_length: 16, require_complexity: true }).valid,
        ).toBe(true);
      }
    });
  });

  describe('4. Reauth and Reveal Flow Security', () => {
    const service = new CredentialVaultService();

    it('generates and verifies short-lived re-authentication tokens', () => {
      const { reauth_token, expires_at } = service.generateReauthToken(sampleActor.id);
      expect(reauth_token).toBeDefined();
      expect(expires_at.getTime()).toBeGreaterThan(Date.now());

      // Should verify without error
      expect(() => service.verifyReauthToken(reauth_token, sampleActor.id)).not.toThrow();

      // Should fail if verified for different user
      expect(() => service.verifyReauthToken(reauth_token, 999)).toThrow(/invalid or expired/i);
    });

    it('rejects admin reveal if mandatory reason is missing or shorter than 5 chars', async () => {
      const { reauth_token } = service.generateReauthToken(sampleActor.id);

      await expect(
        service.revealSecret(1, reauth_token, 'tiny', sampleActor, false),
      ).rejects.toThrow(/mandatory access reason of at least 5 characters/i);

      await expect(
        service.revealSecret(1, reauth_token, undefined, sampleActor, false),
      ).rejects.toThrow(/mandatory access reason/i);
    });
  });

  describe('5. Audit Log Hash Chaining and Tamper Verification', () => {
    it('computes forward-secure chained hashes across sequential access records', () => {
      const rows = [
        {
          id: 1,
          credential_id: 10,
          employee_id: 5,
          accessed_by: 1,
          action: 'reveal',
          reason: 'Incident response #402',
          ip_address: '10.0.0.1',
          user_agent: 'Vitest/Chrome',
          success: 1,
          failure_reason: null,
          accessed_at: '2026-11-18T10:00:00.000Z',
          prev_hash: GENESIS_HASH,
          hash: '',
        },
        {
          id: 2,
          credential_id: 10,
          employee_id: 5,
          accessed_by: 2,
          action: 'reveal',
          reason: 'Routine audit compliance',
          ip_address: '10.0.0.2',
          user_agent: 'Vitest/Firefox',
          success: 1,
          failure_reason: null,
          accessed_at: '2026-11-18T10:05:00.000Z',
          prev_hash: '',
          hash: '',
        },
      ];

      // Chain row 0
      const row0Data = {
        id: rows[0]!.id,
        credential_id: rows[0]!.credential_id,
        employee_id: rows[0]!.employee_id,
        accessed_by: rows[0]!.accessed_by,
        action: rows[0]!.action,
        reason: rows[0]!.reason,
        ip_address: rows[0]!.ip_address,
        user_agent: rows[0]!.user_agent,
        success: rows[0]!.success,
        failure_reason: rows[0]!.failure_reason,
        accessed_at: rows[0]!.accessed_at,
      };
      rows[0]!.hash = computeRowHash(rows[0]!.prev_hash, row0Data);

      // Chain row 1
      rows[1]!.prev_hash = rows[0]!.hash;
      const row1Data = {
        id: rows[1]!.id,
        credential_id: rows[1]!.credential_id,
        employee_id: rows[1]!.employee_id,
        accessed_by: rows[1]!.accessed_by,
        action: rows[1]!.action,
        reason: rows[1]!.reason,
        ip_address: rows[1]!.ip_address,
        user_agent: rows[1]!.user_agent,
        success: rows[1]!.success,
        failure_reason: rows[1]!.failure_reason,
        accessed_at: rows[1]!.accessed_at,
      };
      rows[1]!.hash = computeRowHash(rows[1]!.prev_hash, row1Data);

      // Verification succeeds
      const result = verifyHashChain(rows, (r) => ({
        id: r.id,
        credential_id: r.credential_id,
        employee_id: r.employee_id,
        accessed_by: r.accessed_by,
        action: r.action,
        reason: r.reason,
        ip_address: r.ip_address,
        user_agent: r.user_agent,
        success: r.success,
        failure_reason: r.failure_reason,
        accessed_at: r.accessed_at,
      }));

      expect(result.valid).toBe(true);
      expect(result.totalVerified).toBe(2);

      // Tampering row 0 data breaks chain
      rows[0]!.reason = 'TAMPERED REASON AFTER DB WRITE';
      const tamperedResult = verifyHashChain(rows, (r) => ({
        id: r.id,
        credential_id: r.credential_id,
        employee_id: r.employee_id,
        accessed_by: r.accessed_by,
        action: r.action,
        reason: r.reason,
        ip_address: r.ip_address,
        user_agent: r.user_agent,
        success: r.success,
        failure_reason: r.failure_reason,
        accessed_at: r.accessed_at,
      }));

      expect(tamperedResult.valid).toBe(false);
      expect(tamperedResult.brokenIndex).toBe(0);
      expect(tamperedResult.errorMessage).toMatch(/tampered content/i);
    });
  });
});
