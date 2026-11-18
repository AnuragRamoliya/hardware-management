import { describe, it, expect } from 'vitest';
import {
  encryptSecret,
  decryptSecret,
  buildAAD,
  generateVaultKey,
  getActiveKeyVersion,
} from '../Utils/vault_crypto';

describe('Vault Crypto (AES-256-GCM with AAD and Versioning)', () => {
  it('encrypts and decrypts a plaintext secret successfully', () => {
    const secret = 'super-secret-password-123!@#';
    const aad = buildAAD(101, 202);

    const encrypted = encryptSecret(secret, aad);
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

    expect(decrypted).toBe(secret);
  });

  it('generates distinct IVs and ciphertexts for the same plaintext', () => {
    const secret = 'identical-secret';
    const aad = buildAAD(1, 1);

    const enc1 = encryptSecret(secret, aad);
    const enc2 = encryptSecret(secret, aad);

    expect(enc1.iv).not.toBe(enc2.iv);
    expect(enc1.ciphertext).not.toBe(enc2.ciphertext);

    expect(decryptSecret(enc1.ciphertext, enc1.iv, enc1.authTag, enc1.keyVersion, aad)).toBe(
      secret,
    );
    expect(decryptSecret(enc2.ciphertext, enc2.iv, enc2.authTag, enc2.keyVersion, aad)).toBe(
      secret,
    );
  });

  it('fails decryption when ciphertext is tampered with', () => {
    const secret = 'sensitive-data';
    const aad = buildAAD(5, 10);
    const encrypted = encryptSecret(secret, aad);

    // Flip a character in ciphertext
    const tampered =
      encrypted.ciphertext.charAt(0) === 'A'
        ? 'B' + encrypted.ciphertext.slice(1)
        : 'A' + encrypted.ciphertext.slice(1);

    expect(() =>
      decryptSecret(tampered, encrypted.iv, encrypted.authTag, encrypted.keyVersion, aad),
    ).toThrow(/Tampered or invalid secret/);
  });

  it('fails decryption when authentication tag is tampered with', () => {
    const secret = 'sensitive-data';
    const aad = buildAAD(5, 10);
    const encrypted = encryptSecret(secret, aad);

    const tamperedTag =
      encrypted.authTag.charAt(0) === 'X'
        ? 'Y' + encrypted.authTag.slice(1)
        : 'X' + encrypted.authTag.slice(1);

    expect(() =>
      decryptSecret(encrypted.ciphertext, encrypted.iv, tamperedTag, encrypted.keyVersion, aad),
    ).toThrow(/Tampered or invalid secret/);
  });

  it('fails decryption when IV is tampered with', () => {
    const secret = 'sensitive-data';
    const aad = buildAAD(5, 10);
    const encrypted = encryptSecret(secret, aad);

    const tamperedIv =
      encrypted.iv.charAt(0) === 'Z' ? 'W' + encrypted.iv.slice(1) : 'Z' + encrypted.iv.slice(1);

    expect(() =>
      decryptSecret(encrypted.ciphertext, tamperedIv, encrypted.authTag, encrypted.keyVersion, aad),
    ).toThrow(/Tampered or invalid secret/);
  });

  it('fails decryption when AAD row binding is mismatched (e.g. moved to another employee or credential)', () => {
    const secret = 'employee-specific-token';
    const originalAad = buildAAD(42, 999);
    const spoofedAad = buildAAD(43, 999); // different credential ID

    const encrypted = encryptSecret(secret, originalAad);

    expect(() =>
      decryptSecret(
        encrypted.ciphertext,
        encrypted.iv,
        encrypted.authTag,
        encrypted.keyVersion,
        spoofedAad,
      ),
    ).toThrow(/Tampered or invalid secret/);
  });

  it('generates a valid 32-byte base64 encryption key', () => {
    const key = generateVaultKey();
    const buffer = Buffer.from(key, 'base64');
    expect(buffer.length).toBe(32);
  });
});
