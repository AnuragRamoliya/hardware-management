import { describe, it, expect } from 'vitest';
import {
  generateSecurePassword,
  estimatePasswordEntropy,
  validatePasswordPolicy,
} from '../Utils/password_policy';

describe('Password Policy & Generator Utility', () => {
  it('generates passwords of specified length with complexity', () => {
    const pwd16 = generateSecurePassword({ length: 16, requireComplexity: true });
    expect(pwd16.length).toBe(16);
    expect(/[A-Z]/.test(pwd16)).toBe(true);
    expect(/[a-z]/.test(pwd16)).toBe(true);
    expect(/[0-9]/.test(pwd16)).toBe(true);
    expect(/[^a-zA-Z0-9]/.test(pwd16)).toBe(true);

    const pwd24 = generateSecurePassword({ length: 24, requireComplexity: true });
    expect(pwd24.length).toBe(24);
  });

  it('calculates entropy and assign scores correctly', () => {
    const weak = estimatePasswordEntropy('abc');
    expect(weak.score).toBeLessThanOrEqual(1);
    expect(weak.warning).toBeDefined();

    const strong = estimatePasswordEntropy('P@ssw0rd!LongAndSecure123');
    expect(strong.score).toBeGreaterThanOrEqual(3);
    expect(strong.entropy).toBeGreaterThan(60);
  });

  it('validates password policy compliance', () => {
    const short = validatePasswordPolicy('Short1!', { min_length: 12, require_complexity: true });
    expect(short.valid).toBe(false);
    expect(short.message).toContain('at least 12 characters');

    const simple = validatePasswordPolicy('alllowercasewithoutnumbers', {
      min_length: 12,
      require_complexity: true,
    });
    expect(simple.valid).toBe(false);
    expect(simple.message).toContain('must include uppercase, lowercase, numbers, and symbols');

    const good = validatePasswordPolicy('GoodP@ssw0rd123', {
      min_length: 12,
      require_complexity: true,
    });
    expect(good.valid).toBe(true);
  });
});
