import { describe, it, expect } from 'vitest';
import { getRateLimiterLimits } from '../Middleware/rate_limiter';

describe('Production vs Test Rate Limiter Limits Configuration', () => {
  it('enforces strict limits when NODE_ENV is production', () => {
    const prodLimits = getRateLimiterLimits('production');

    console.log('[PROD RATE LIMITS CONFIG]', JSON.stringify(prodLimits, null, 2));

    expect(prodLimits).toEqual({
      login: 5,
      reveal: 10,
      export: 5,
      options: 120,
      verifyDocument: 10,
    });

    expect(prodLimits.login).toBe(5);
    expect(prodLimits.reveal).toBe(10);
    expect(prodLimits.export).toBe(5);
    expect(prodLimits.options).toBe(120);
    expect(prodLimits.verifyDocument).toBe(10);
  });

  it('provides relaxed limits when NODE_ENV is test or development to prevent test collision', () => {
    const testLimits = getRateLimiterLimits('test');
    const devLimits = getRateLimiterLimits('development');

    console.log('[TEST RATE LIMITS CONFIG]', JSON.stringify(testLimits, null, 2));

    expect(testLimits).toEqual({
      login: 200,
      reveal: 100,
      export: 100,
      options: 1000,
      verifyDocument: 100,
    });

    expect(devLimits).toEqual(testLimits);
  });
});
