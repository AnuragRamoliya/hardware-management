import { describe, it, expect } from 'vitest';
import { redactSecrets, findForbiddenSecretKeys, isSecretKey } from '../Utils/redaction';

describe('Vault Redaction Utility', () => {
  it('identifies sensitive secret keys', () => {
    expect(isSecretKey('password')).toBe(true);
    expect(isSecretKey('password_enc')).toBe(true);
    expect(isSecretKey('secret')).toBe(true);
    expect(isSecretKey('token')).toBe(true);
    expect(isSecretKey('authorization')).toBe(true);
    expect(isSecretKey('iv')).toBe(true);
    expect(isSecretKey('auth_tag')).toBe(true);
    expect(isSecretKey('username')).toBe(false);
    expect(isSecretKey('email')).toBe(false);
    expect(isSecretKey('label')).toBe(false);
  });

  it('redacts sensitive fields in nested objects and arrays', () => {
    const raw = {
      username: 'johndoe',
      password: 'PlaintextPassword123',
      nested: {
        token: 'jwt.token.here',
        publicNote: 'keep this',
      },
      list: [
        { id: 1, secret: 'top-secret' },
        { id: 2, label: 'public' },
      ],
    };

    const sanitized = redactSecrets(raw);

    expect(sanitized.username).toBe('johndoe');
    expect(sanitized.password).toBe('[REDACTED]');
    expect(sanitized.nested.token).toBe('[REDACTED]');
    expect(sanitized.nested.publicNote).toBe('keep this');
    expect(sanitized.list[0].secret).toBe('[REDACTED]');
    expect(sanitized.list[1].label).toBe('public');
  });

  it('detects any forbidden secret keys present in payloads', () => {
    const clean = {
      id: 1,
      label: 'My Account',
      username: 'alice',
      url: 'https://example.com',
    };
    expect(findForbiddenSecretKeys(clean)).toEqual([]);

    const dirty = {
      id: 1,
      label: 'My Account',
      password: 'raw',
      meta: {
        auth_tag: 'tag',
      },
    };
    const leaks = findForbiddenSecretKeys(dirty);
    expect(leaks).toContain('password');
    expect(leaks).toContain('meta.auth_tag');
  });
});
