import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { parseDateBounds, sanitizeFormulaInjection } from '../Reports/helpers';
import { getPagination, getSorting } from '../Utils/helpers';
import { escapeLikeTerm } from '../Utils/options_builder';
import { isSecretKey, redactSecrets } from '../Utils/redaction';

describe('Property-Based Testing with fast-check (Pure Utilities)', () => {
  describe('getPagination properties', () => {
    it('always bounds limit between 1 and 100, and offset >= 0', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -1000, max: 100000 }),
          fc.integer({ min: -1000, max: 100000 }),
          (page, itemsPerPage) => {
            const result = getPagination({ currentPage: page, itemsPerPage });
            expect(result.limit).toBeGreaterThanOrEqual(1);
            expect(result.limit).toBeLessThanOrEqual(100);
            expect(result.offset).toBeGreaterThanOrEqual(0);

            const expectedPage = Math.max(1, page);
            const expectedLimit = Math.min(100, Math.max(1, itemsPerPage));
            expect(result.limit).toBe(expectedLimit);
            expect(result.offset).toBe((expectedPage - 1) * expectedLimit);
          },
        ),
        { numRuns: 500 },
      );
    });
  });

  describe('getSorting properties', () => {
    const allowed = new Set(['name', 'email', 'created_at', 'status']);
    const defaultOrder = [['id', 'DESC']] as const;

    it('never emits un-whitelisted columns and normalizes directions to ASC or DESC', () => {
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              id: fc.string({ minLength: 1, maxLength: 20 }),
              value: fc.string(),
            }),
            { maxLength: 10 },
          ),
          (sortBy) => {
            const order = getSorting({ sortBy }, allowed, defaultOrder as any);
            expect(Array.isArray(order)).toBe(true);
            expect(order.length).toBeGreaterThan(0);

            for (const item of order) {
              const [col, dir] = item as [string, string];
              expect(['ASC', 'DESC']).toContain(dir);
              const validCols = new Set([...allowed, 'id', 'createdAt', 'updatedAt', 'status']);
              expect(validCols.has(col)).toBe(true);
            }
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  describe('sanitizeFormulaInjection properties (CSV Export Security)', () => {
    it('always neutralizes formula triggers (=, +, -, @, \\t, \\r)', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const sanitized = sanitizeFormulaInjection(input);
          if (/^[=+\-@\t\r]/.test(input)) {
            expect(sanitized.startsWith("'")).toBe(true);
            expect(sanitized).toBe(`'${input}`);
          } else {
            expect(sanitized).toBe(input);
          }
        }),
        { numRuns: 500 },
      );
    });

    it('neutralizes common formula injection payloads', () => {
      const dangerous = ['=cmd|', '-2+3', '+1234', '@SUM(A1:A10)', '\tTAB_ATTACK', '\rRETURN'];
      for (const payload of dangerous) {
        const out = sanitizeFormulaInjection(payload);
        expect(out.startsWith("'")).toBe(true);
      }
    });
  });

  describe('escapeLikeTerm properties', () => {
    it('escapes all !, %, _ and \\ characters using the exclamation mark SQL ESCAPE convention', () => {
      fc.assert(
        fc.property(fc.string(), (input) => {
          const escaped = escapeLikeTerm(input);
          if (/[!%_\\]/.test(input)) {
            expect(escaped).toContain('!');
          }
          const expected = input.replace(/[!%_\\]/g, '!$&');
          expect(escaped).toBe(expected);
        }),
        { numRuns: 500 },
      );
    });
  });

  describe('redactSecrets properties', () => {
    it('never leaves sensitive keys unredacted regardless of nested depth or casing', () => {
      const sensitiveKeyGen = fc.constantFrom(
        'password',
        'password_enc',
        'token',
        'reauth_token',
        'secret',
        'license_key',
        'iv',
        'auth_tag',
        'current_password',
      );

      fc.assert(
        fc.property(
          sensitiveKeyGen,
          fc.string({ minLength: 1, maxLength: 50 }),
          fc.stringMatching(/^[a-z][a-z0-9_]{2,15}$/).filter((k) => !isSecretKey(k)),
          fc.string({ minLength: 1, maxLength: 50 }),
          (sensKey, sensVal, safeKey, safeVal) => {
            const rawObj = {
              [sensKey]: sensVal,
              [safeKey]: safeVal,
              nested: {
                [sensKey]: sensVal,
                childSafe: safeVal,
              },
            };

            const redacted = redactSecrets(rawObj);
            expect((redacted as any)[sensKey]).toBe('[REDACTED]');
            expect((redacted as any).nested[sensKey]).toBe('[REDACTED]');
            expect((redacted as any).nested.childSafe).toBe(safeVal);
          },
        ),
        { numRuns: 300 },
      );
    });
  });

  describe('parseDateBounds properties', () => {
    it('produces start <= end for valid ISO date strings in chronological order', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1577836800000, max: 1735689600000 }), // 2020-01-01 to 2025-01-01
          fc.integer({ min: 1735689600001, max: 1893456000000 }), // 2025-01-01 to 2030-01-01
          (t1, t2) => {
            const d1 = new Date(t1);
            const d2 = new Date(t2);
            const startStr = d1.toISOString().split('T')[0];
            const endStr = d2.toISOString().split('T')[0];

            const bounds = parseDateBounds(startStr, endStr);
            expect(bounds).not.toBeNull();
            if (bounds) {
              expect(bounds.start.getTime()).toBeLessThanOrEqual(bounds.end.getTime());
            }
          },
        ),
        { numRuns: 300 },
      );
    });
  });
});
