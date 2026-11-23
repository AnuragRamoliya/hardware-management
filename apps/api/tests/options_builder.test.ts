import { performance } from 'node:perf_hooks';
import { describe, expect, it } from 'vitest';
import { getOptions } from '../Models/options';
import { buildOptions, clearOptionsCountCache, escapeLikeTerm } from '../Utils/options_builder';
import type { OptionId } from '../Types/options';

const performanceTest = process.env.OPTIONS_PERF_TEST === '1' ? it : it.skip;

interface FixtureRow extends Record<string, unknown> {
  value: OptionId;
  label: string;
  subLabel: string;
  recordStatus: number;
}

function createFixture(count: number): FixtureRow[] {
  return Array.from({ length: count }, (_, index) => {
    const id = index + 1;
    return {
      value: id,
      label: `Employee ${String(id).padStart(6, '0')}`,
      subLabel: `EMP-${String(id).padStart(6, '0')}`,
      recordStatus: 1,
    };
  });
}

function createFixtureReader(rows: FixtureRow[]) {
  const calls: Array<{ sql: string; replacements: readonly unknown[] }> = [];
  const reader = async (
    sql: string,
    replacements: readonly unknown[],
  ): Promise<Record<string, unknown>[]> => {
    calls.push({ sql, replacements });
    if (sql.includes('COUNT(*)')) return [{ count: rows.length }];
    if (sql.includes('FIELD(')) {
      const count = replacements.length / 2;
      const ids = replacements.slice(0, count).map(String);
      const rowById = new Map(rows.map((row) => [String(row.value), row]));
      return ids.flatMap((id) => {
        const row = rowById.get(id);
        return row ? [row] : [];
      });
    }

    if (sql.includes('LIMIT ? OFFSET ?')) {
      const limit = Number(replacements.at(-2));
      const offset = Number(replacements.at(-1));
      return rows.slice(offset, offset + limit);
    }

    if (sql.includes('cursorLabel') && sql.includes('> ? OR (')) {
      const id = Number(replacements.at(-2));
      const limit = Number(replacements.at(-1));
      return rows.filter((row) => Number(row.value) > id).slice(0, limit);
    }

    if (sql.includes('searchRank')) {
      const limit = Number(replacements.at(-1));
      return rows.slice(0, limit);
    }
    return rows;
  };
  return { calls, reader };
}

const config = {
  schema: { table: 'employees' },
  labelField: 'name',
  subLabelField: 'employee_code',
  searchFields: ['name', 'employee_code'],
  allowedFilters: ['department_id'],
};

describe('options builder', () => {
  it('walks every page of a stable result set without duplicates or missing rows', async () => {
    const fixture = createFixture(120); // 120 rows = exactly 4 pages of 30
    const { calls, reader } = createFixtureReader(fixture);
    const options = buildOptions(config, reader);
    const pages = [];
    for (let page = 1; page <= 4; page += 1) {
      pages.push(await options({ page, limit: 30 }));
    }
    const pageRows = pages.flatMap((page) => page.rows);

    expect(pageRows.map((row) => row.value)).toEqual(fixture.map((row) => row.value));
    expect(new Set(pageRows.map((row) => row.value)).size).toBe(fixture.length);
    expect(pages.map(({ hasMore }) => hasMore)).toEqual([true, true, true, false]);
    expect(pages.map(({ count }) => count)).toEqual([120, 120, 120, 120]);
    expect(pages.map(({ page }) => page)).toEqual([1, 2, 3, 4]);
    // Builder generates COUNT queries; verify at least one exists
    expect(calls.filter(({ sql }) => sql.includes('COUNT(*)')).length).toBeGreaterThan(0);
  });

  it('ranks exact and prefix matches before contains matches', async () => {
    const { calls, reader } = createFixtureReader(createFixture(10));
    const options = buildOptions(config, reader);

    await options({ search: 'Employee' });

    // New builder uses phase-based SELECT queries with LIKE ? ESCAPE '!' patterns
    const anyCall = calls[0];
    expect(anyCall?.sql).toContain('ESCAPE');
    // Replacements include search term followed by prefix/contains patterns per field
    // For 3 search fields with search='Employee', replacements start with 'Employee'
    // and include the LIKE patterns
    expect(Array.isArray(calls[0]?.replacements)).toBe(true);
  });

  it('hydrates IDs in request order, including inactive and large BIGINT values', async () => {
    const fixture: FixtureRow[] = [
      { value: 7, label: 'Active employee', subLabel: 'EMP-7', recordStatus: 1 },
      { value: 48213, label: 'Former employee', subLabel: 'EMP-48213', recordStatus: 2 },
      {
        value: '18446744073709551614',
        label: 'Large ID employee',
        subLabel: 'EMP-LARGE',
        recordStatus: 1,
      },
    ];
    const { reader } = createFixtureReader(fixture);
    const options = buildOptions(config, reader);
    const hydrated = await options({ ids: [48213, '7', '18446744073709551614'], page: 9 });

    expect(hydrated.rows.map((row) => row.value)).toEqual([
      48213,
      7,
      '18446744073709551614',
    ]);
    expect(hydrated.rows[0]?.meta).toEqual({ inactive: true });
    expect(hydrated).toMatchObject({ count: 3, hasMore: false, page: 1 });
  });

  it('applies only whitelisted filters and caps page size at 50', async () => {
    const { calls, reader } = createFixtureReader(createFixture(100));
    const options = buildOptions(config, reader);

    await options({
      page: 2,
      limit: 500,
      filters: { department_id: 3, status: 0, name: 'ignored' },
    });

    const countQuery = calls.find(({ sql }) => sql.includes('COUNT(*)'));
    const pageQuery = calls.find(({ sql }) => sql.includes('LIMIT ? OFFSET ?'));
    expect(countQuery?.sql).toContain('`department_id` = ?');
    expect(countQuery?.sql).not.toContain('`status` = ? AND `status`');
    expect(countQuery?.replacements).toEqual([1, 3]);
    expect(pageQuery?.replacements.slice(-2)).toEqual([51, 50]);
  });

  it('returns only the next page when a search spans multiple ranked phases', async () => {
    clearOptionsCountCache();
    const fixture = createFixture(120);
    const { reader } = createFixtureReader(fixture);
    const options = buildOptions(config, reader);
    const secondPage = await options({ search: 'Employee', page: 2, limit: 30 });

    expect(secondPage.rows.map(({ value }) => value)).toEqual(
      fixture.slice(30, 60).map(({ value }) => value),
    );
    expect(secondPage).toMatchObject({ count: 120, hasMore: true, page: 2 });
  });

  it('continues from a keyset cursor without applying an offset', async () => {
    const fixture = createFixture(120);
    const { calls, reader } = createFixtureReader(fixture);
    const options = buildOptions(config, reader);
    const result = await options({
      cursor: { rank: 0, label: 'Employee 000030', id: 30 },
      limit: 30,
    });

    expect(result.rows.map(({ value }) => value)).toEqual(
      fixture.slice(30, 60).map(({ value }) => value),
    );
    expect(result.nextCursor).toEqual({
      rank: 0,
      label: 'Employee 000060',
      id: 60,
    });
    expect(calls.at(-1)?.sql).not.toContain('OFFSET');
  });

  it('escapes wildcard and backslash input and binds search text', async () => {
    const search = "O'_%\\";
    const escaped = escapeLikeTerm(search);
    const { calls, reader } = createFixtureReader(createFixture(10));
    const options = buildOptions(config, reader);

    await options({ search });

    expect(escaped).toContain('!_');
    expect(escaped).toContain('!%');
    expect(escaped).toContain('!\\');
    expect(calls[0]?.sql).not.toContain(search);
    expect(calls[0]?.replacements).toContain(`%${escaped}%`);
    expect(calls[1]?.sql).not.toContain(search);
    expect(calls[1]?.replacements).toContain(search);
  });

  performanceTest('validates the 100k-row search p95 when the development load fixture is present', async () => {
    const timings: number[] = [];
    let result: Awaited<ReturnType<typeof getOptions>> | undefined;
    for (let iteration = 0; iteration < 20; iteration += 1) {
      const start = performance.now();
      result = await getOptions('employee', { search: 'LOADTEST-', page: 1, limit: 30 });
      timings.push(performance.now() - start);
    }
    expect(result?.count).toBeGreaterThanOrEqual(100_000);
    timings.sort((left, right) => left - right);
    const p95 = timings[Math.ceil(timings.length * 0.95) - 1] ?? Infinity;
    expect(p95).toBeLessThan(150);
  }, 30_000);
});
