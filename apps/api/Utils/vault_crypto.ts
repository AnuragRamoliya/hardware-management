import crypto from 'node:crypto';
import { env } from '../Config/env';
import { AppError } from '../Config/app_error';

export interface EncryptedSecret {
  ciphertext: string;
  iv: string;
  authTag: string;
  keyVersion: string;
}

let keyCache: Record<string, Buffer> | null = null;

export function getVaultKeys(): Record<string, Buffer> {
  if (keyCache) return keyCache;

  const rawKeys = env.VAULT_ENCRYPTION_KEYS?.trim();
  const keys: Record<string, Buffer> = {};

  if (rawKeys) {
    try {
      const parsed = JSON.parse(rawKeys) as Record<string, string>;
      for (const [version, base64Key] of Object.entries(parsed)) {
        const buffer = Buffer.from(base64Key, 'base64');
        if (buffer.length !== 32) {
          throw new Error(
            `Key for version ${version} must be exactly 32 bytes (got ${buffer.length}).`,
          );
        }
        keys[version] = buffer;
      }
    } catch (err) {
      if (env.NODE_ENV === 'production') {
        throw new Error(`Invalid VAULT_ENCRYPTION_KEYS in production: ${(err as Error).message}`);
      }
    }
  }

  // Fallback to legacy single key or development default if not in production
  if (Object.keys(keys).length === 0) {
    if (env.NODE_ENV === 'production') {
      throw new Error(
        'VAULT_ENCRYPTION_KEYS must be configured with at least one 32-byte key in production.',
      );
    }
    const fallbackBuffer = env.VAULT_ENCRYPTION_KEY
      ? Buffer.from(env.VAULT_ENCRYPTION_KEY, 'utf8')
      : crypto.createHash('sha256').update('dev-vault-encryption-key-fallback').digest();
    keys['1'] = fallbackBuffer;
  }

  keyCache = keys;
  return keyCache;
}

export function getActiveKeyVersion(): string {
  return env.VAULT_KEY_VERSION || '1';
}

export function buildAAD(credentialId: number | string, employeeId: number | string): string {
  return `credential:${credentialId}:employee:${employeeId}`;
}

export function encryptSecret(
  plaintext: string,
  aad?: string,
  keyVersion?: string,
): EncryptedSecret {
  const version = keyVersion || getActiveKeyVersion();
  const keys = getVaultKeys();
  const key = keys[version];

  if (!key) {
    throw new AppError(500, `Encryption key for version "${version}" not found in vault keys.`);
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  if (aad) {
    cipher.setAAD(Buffer.from(aad, 'utf8'));
  }

  const ciphertextBuffer = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return {
    ciphertext: ciphertextBuffer.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: version,
  };
}

export function decryptSecret(
  ciphertext: string,
  iv: string,
  authTag: string,
  keyVersion: string,
  aad?: string,
): string {
  const keys = getVaultKeys();
  const key = keys[keyVersion];

  if (!key) {
    throw new AppError(500, `Decryption key for version "${keyVersion}" not found in vault keys.`);
  }

  try {
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'base64'));

    decipher.setAuthTag(Buffer.from(authTag, 'base64'));

    if (aad) {
      decipher.setAAD(Buffer.from(aad, 'utf8'));
    }

    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ciphertext, 'base64')),
      decipher.final(),
    ]).toString('utf8');

    return plaintext;
  } catch {
    throw new AppError(400, 'Tampered or invalid secret data: decryption verification failed.');
  }
}

export function generateVaultKey(): string {
  return crypto.randomBytes(32).toString('base64');
}
