import { afterAll, describe, expect, it } from 'vitest';
import { performance } from 'node:perf_hooks';
import { QueryTypes } from 'sequelize';
import { sequelize } from '../Config/database';
import { getOptions } from '../Models/options';
import { clearOptionsCountCache } from '../Utils/options_builder';
import type { OptionsResource } from '../Models/options';

const databaseTest = process.env.OPTIONS_DB_INTEGRATION === '1' ? it : it.skip;
const requiredResources: OptionsResource[] = [
  'employee',
  'user',
  'role',
  'department',
  'designation',
  'location',
  'vendor',
  'asset_category',
];

afterAll(async () => {
  if (process.env.OPTIONS_DB_INTEGRATION === '1') await sequelize.close();
});

describe('options database regression checks', () => {
  databaseTest(
    'walks every current options resource without gaps or duplicate IDs',
    async () => {
      for (const resource of requiredResources) {
        clearOptionsCountCache();
        const search = resource === 'employee' ? 'LOADTEST-000' : undefined;
        const collected: string[] = [];
        let cursor: { rank: number; label: string; id: number | string } | undefined;
        let page = await getOptions(resource, { search, page: 1, limit: 30 });
        collected.push(...page.rows.map((row) => String(row.value)));
        const expectedCount = page.count;
        let expectedHasMore = page.hasMore;

        while (page.hasMore && page.nextCursor) {
          cursor = page.nextCursor;
          page = await getOptions(resource, { search, cursor, limit: 30 });
          collected.push(...page.rows.map((row) => String(row.value)));
          expect(page.count).toBe(expectedCount);
          expectedHasMore = page.hasMore;
        }

        expect(expectedHasMore).toBe(false);
        expect(collected).toHaveLength(expectedCount);
        expect(new Set(collected).size).toBe(expectedCount);
      }
    },
    120_000,
  );

  databaseTest(
    'serves filtered asset options using the 100k asset seed',
    async () => {
      clearOptionsCountCache();
      const started = performance.now();
      const first = await getOptions('asset', {
        search: 'LOADTEST-000',
        page: 1,
        limit: 30,
        filters: { unassigned: true, asset_status: 1 },
      });
      const elapsed = performance.now() - started;
      expect(first.rows.length).toBeGreaterThan(0);
      expect(first.rows[0]?.label).toContain('AST-');
      expect(first.rows[0]?.subLabel).toContain('LOADTEST-');
      expect(first.count).toBeGreaterThanOrEqual(first.rows.length);
      expect(elapsed).toBeLessThan(1000);
    },
    30_000,
  );

  databaseTest(
    'matches a direct ordered query for a 2,010-row employee search walk',
    async () => {
      const term = 'LOADTEST-00';
      const prefix = `${term}%`;
      const contains = `%${term}%`;
      const fields = ['search_text', 'employee_code', 'email'];
      const containsPredicate = fields
        .map((field) => `\`${field}\` LIKE ? ESCAPE '!'`)
        .join(' OR ');
      const exactPredicate = fields.map((field) => `\`${field}\` = ?`).join(' OR ');
      const prefixPredicate = fields.map((field) => `\`${field}\` LIKE ? ESCAPE '!'`).join(' OR ');
      const directSql = `SELECT id FROM employees WHERE status = 1 AND (${containsPredicate}) ORDER BY CASE WHEN (${exactPredicate}) THEN 0 WHEN (${prefixPredicate}) THEN 1 ELSE 2 END, label_sort ASC, id ASC LIMIT 2010`;
      const direct = await sequelize.query<{ id: number | string }>(directSql, {
        replacements: [contains, contains, contains, term, term, term, prefix, prefix, prefix],
        type: QueryTypes.SELECT,
      });

      clearOptionsCountCache();
      const ids: string[] = [];
      let result = await getOptions('employee', { search: term, page: 1, limit: 30 });
      ids.push(...result.rows.map((row) => String(row.value)));
      while (ids.length < direct.length && result.nextCursor) {
        result = await getOptions('employee', {
          search: term,
          cursor: result.nextCursor,
          limit: 30,
        });
        ids.push(...result.rows.map((row) => String(row.value)));
      }

      expect(direct).toHaveLength(2010);
      expect(ids).toHaveLength(2010);
      expect(new Set(ids).size).toBe(2010);
      expect(ids).toEqual(direct.map((row) => String(row.id)));
    },
    60_000,
  );

  databaseTest(
    'keeps 200 identical employee labels stable across cursor pages',
    async () => {
      const now = new Date();
      const marker = `OPTIONS-TIE-${Date.now()}-`;
      const records = Array.from({ length: 200 }, (_, index) => {
        const suffix = String(index + 1).padStart(3, '0');
        return [
          `${marker}${suffix}`,
          'Options',
          'Tie',
          `options.tie.${suffix}@itam.local`,
          1,
          1,
          now,
          now,
        ];
      });
      const values = records.map(() => '(?, ?, ?, ?, ?, ?, ?, ?)').join(', ');

      try {
        await sequelize.query(
          `INSERT INTO employees (employee_code, first_name, last_name, email, employment_status, status, createdAt, updatedAt) VALUES ${values}`,
          { replacements: records.flat() },
        );
        const inserted = await sequelize.query<{ id: number }>(
          'SELECT id FROM employees WHERE employee_code LIKE ? ORDER BY id ASC',
          { replacements: [`${marker}%`], type: QueryTypes.SELECT },
        );
        clearOptionsCountCache();
        const collected: number[] = [];
        let result = await getOptions('employee', {
          search: marker,
          page: 1,
          limit: 30,
        });
        collected.push(...result.rows.map((row) => Number(row.value)));
        while (result.nextCursor) {
          result = await getOptions('employee', {
            search: marker,
            cursor: result.nextCursor,
            limit: 30,
          });
          collected.push(...result.rows.map((row) => Number(row.value)));
        }

        expect(inserted).toHaveLength(200);
        expect(result.count).toBe(200);
        expect(collected).toEqual(inserted.map((row) => row.id));
      } finally {
        await sequelize.query('DELETE FROM employees WHERE employee_code LIKE ?', {
          replacements: [`${marker}%`],
        });
        clearOptionsCountCache();
      }
    },
    60_000,
  );

  databaseTest(
    'meets first-page and deep cursor continuation p95 limits',
    async () => {
      const measureP95 = async (run: () => Promise<unknown>): Promise<number> => {
        const samples: number[] = [];
        for (let index = 0; index < 20; index += 1) {
          const start = performance.now();
          await run();
          samples.push(performance.now() - start);
        }
        samples.sort((left, right) => left - right);
        return samples[Math.ceil(samples.length * 0.95) - 1] ?? Infinity;
      };

      const firstPageP95 = await measureP95(() => getOptions('employee', { page: 1, limit: 30 }));
      const legacyDeepPage = await getOptions('employee', { page: 3000, limit: 30 });
      expect(legacyDeepPage.nextCursor).toBeDefined();
      const cursor = legacyDeepPage.nextCursor!;
      const cursorP95 = await measureP95(() => getOptions('employee', { cursor, limit: 30 }));

      console.info(
        `Employee options p95: first page ${firstPageP95.toFixed(2)} ms; deep cursor ${cursorP95.toFixed(2)} ms`,
      );
      expect(firstPageP95).toBeLessThan(150);
      expect(cursorP95).toBeLessThan(250);
    },
    60_000,
  );
});
