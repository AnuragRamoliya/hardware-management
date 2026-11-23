export const FORBIDDEN_SECRET_KEYS = new Set([
  'password',
  'passwd',
  'secret',
  'token',
  'authorization',
  'license_key',
  'password_enc',
  'security_text',
  'otp',
  'iv',
  'auth_tag',
  'key_version',
  'reauth_token',
  'current_password',
  'new_password',
  'confirm_password',
]);

export function isSecretKey(key: string): boolean {
  const normalized = key.toLowerCase().replace(/[-_]/g, '');
  for (const forbidden of FORBIDDEN_SECRET_KEYS) {
    const cleanForbidden = forbidden.replace(/[-_]/g, '');
    if (
      normalized === cleanForbidden ||
      normalized.includes('password') ||
      normalized.includes('secret')
    ) {
      return true;
    }
  }
  return false;
}

export function redactSecrets<T>(data: T, depth = 0): T {
  if (depth > 10 || data === null || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map((item) => redactSecrets(item, depth + 1)) as unknown as T;
  }

  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (isSecretKey(key)) {
      result[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      result[key] = redactSecrets(value, depth + 1);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

export function findForbiddenSecretKeys(data: unknown, path = '', depth = 0): string[] {
  if (depth > 10 || data === null || typeof data !== 'object') {
    return [];
  }

  const leaks: string[] = [];

  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      leaks.push(...findForbiddenSecretKeys(item, `${path}[${index}]`, depth + 1));
    });
    return leaks;
  }

  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (isSecretKey(key)) {
      leaks.push(currentPath);
    } else if (typeof value === 'object' && value !== null) {
      leaks.push(...findForbiddenSecretKeys(value, currentPath, depth + 1));
    }
  }

  return leaks;
}
