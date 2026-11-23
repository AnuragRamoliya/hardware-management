import crypto from 'node:crypto';

const UPPERCASE = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
const LOWERCASE = 'abcdefghijklmnopqrstuvwxyz';
const DIGITS = '0123456789';
const SYMBOLS = '!@#$%^&*()_+-=[]{}|;:,.<>?';

export interface PasswordPolicyOptions {
  min_length?: number;
  require_complexity?: boolean;
}

function getRandomChar(str: string): string {
  const index = crypto.randomInt(str.length);
  return str.charAt(index);
}

export function generateSecurePassword(
  options: { length?: number; requireComplexity?: boolean } = {},
): string {
  const length = Math.max(12, Math.min(64, options.length ?? 16));
  const requireComplexity = options.requireComplexity ?? true;

  const allChars = UPPERCASE + LOWERCASE + DIGITS + (requireComplexity ? SYMBOLS : '');
  const result: string[] = [];

  // Guarantee at least one from each required character set
  if (requireComplexity) {
    result.push(getRandomChar(UPPERCASE));
    result.push(getRandomChar(LOWERCASE));
    result.push(getRandomChar(DIGITS));
    result.push(getRandomChar(SYMBOLS));
  } else {
    result.push(getRandomChar(UPPERCASE));
    result.push(getRandomChar(LOWERCASE));
    result.push(getRandomChar(DIGITS));
  }

  while (result.length < length) {
    result.push(getRandomChar(allChars));
  }

  // Fisher-Yates shuffle using cryptographically secure random integers
  for (let i = result.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    const charI = result[i];
    const charJ = result[j];
    if (charI !== undefined && charJ !== undefined) {
      result[i] = charJ;
      result[j] = charI;
    }
  }

  return result.join('');
}

export interface EntropyResult {
  entropy: number;
  score: 0 | 1 | 2 | 3 | 4;
  warning?: string;
}

export function estimatePasswordEntropy(password: string): EntropyResult {
  if (!password) {
    return { entropy: 0, score: 0, warning: 'Password cannot be empty.' };
  }

  let poolSize = 0;
  if (/[a-z]/.test(password)) poolSize += 26;
  if (/[A-Z]/.test(password)) poolSize += 26;
  if (/[0-9]/.test(password)) poolSize += 10;
  if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

  if (poolSize === 0) poolSize = 26;

  const entropy = Math.round(password.length * Math.log2(poolSize));

  let score: 0 | 1 | 2 | 3 | 4 = 0;
  let warning: string | undefined;

  if (entropy < 28) {
    score = 0;
    warning = 'Very weak password. Easily vulnerable to brute-force.';
  } else if (entropy < 36) {
    score = 1;
    warning = 'Weak password. Add length or character variety.';
  } else if (entropy < 60) {
    score = 2;
    warning = 'Fair password.';
  } else if (entropy < 80) {
    score = 3;
  } else {
    score = 4;
  }

  return { entropy, score, warning };
}

export function validatePasswordPolicy(
  password: string,
  policy: PasswordPolicyOptions = {},
): { valid: boolean; message?: string } {
  const minLength = policy.min_length ?? 12;
  const requireComplexity = policy.require_complexity ?? false;

  if (password.length < minLength) {
    return {
      valid: false,
      message: `Password must be at least ${minLength} characters long.`,
    };
  }

  if (requireComplexity) {
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasDigit = /[0-9]/.test(password);
    const hasSymbol = /[^a-zA-Z0-9]/.test(password);

    if (!hasUpper || !hasLower || !hasDigit || !hasSymbol) {
      return {
        valid: false,
        message: 'Password must include uppercase, lowercase, numbers, and symbols.',
      };
    }
  }

  return { valid: true };
}
