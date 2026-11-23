import crypto from 'node:crypto';
import CryptoJS from 'crypto-js';
import { env } from '../Config/env';

export {
  encryptSecret,
  decryptSecret,
  buildAAD,
  getVaultKeys,
  getActiveKeyVersion,
  generateVaultKey,
  type EncryptedSecret,
} from './vault_crypto';

const CHARACTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export async function encryptPayload<T>(data: T, length = 64): Promise<string> {
  const keyLength = length * 2;
  const randomBytes = crypto.randomBytes(keyLength);
  let key = '';
  for (const byte of randomBytes) key += CHARACTERS[byte % CHARACTERS.length];
  return key + CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();
}

export function decryptPayload<T>(value: string): T {
  const payload = value.replace(/"/g, '');
  const secretKey = payload.slice(0, 128);
  const encryptedData = payload.substring(128);
  const decrypted = CryptoJS.AES.decrypt(encryptedData, secretKey).toString(CryptoJS.enc.Utf8);
  if (!decrypted) throw new Error('Unable to decrypt payload');
  return JSON.parse(decrypted) as T;
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export function encryptVaultSecret(value: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    'aes-256-gcm',
    Buffer.from(env.VAULT_ENCRYPTION_KEY, 'utf8'),
    iv,
  );
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString('base64url')).join('.');
}

export function decryptVaultSecret(value: string): string {
  const [encodedIv, encodedTag, encodedCiphertext, extra] = value.split('.');
  if (!encodedIv || !encodedTag || !encodedCiphertext || extra !== undefined) {
    throw new Error('Invalid encrypted vault value.');
  }
  const decipher = crypto.createDecipheriv(
    'aes-256-gcm',
    Buffer.from(env.VAULT_ENCRYPTION_KEY, 'utf8'),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}
