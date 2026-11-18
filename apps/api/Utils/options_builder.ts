import { QueryTypes } from 'sequelize';
import { sequelize } from '../Config/database';
import type { OptionItem, OptionsDto, OptionsResult } from '../Types/options';

interface OptionsSchema {
  table: string;
  idField?: string;
  statusField?: string;
}

interface OptionsBuilderConfig {
  schema: OptionsSchema;
  labelField?: string;
  labelExpr?: string;
  subLabelField?: string;
  searchFields: string[];
  allowedFilters: string[];
  defaultOrder?: Array<{ field: string; direction: 'ASC' | 'DESC' }>;
  specialFilters?: Record<string, (value: boolean) => string>;
}

interface DatabaseOption extends Record<string, unknown> {
  value: number | string;
  label: string | null;
  subLabel?: string | null;
  recordStatus?: number | string;
}

type OptionsQueryExecutor = (
  sql: string,
  replacements: readonly unknown[],
) => Promise<Record<string, unknown>[]>;

const COUNT_CACHE_TTL_MS = 60_000;
const MAX_COUNT_CACHE_ENTRIES = 2_000;
const countCache = new Map<string, { count: number; expiresAt: number }>();

const executeQuery: OptionsQueryExecutor = async (sql, replacements) =>
  sequelize.query<Record<string, unknown>>(sql, {
    type: QueryTypes.SELECT,
    replacements: [...replacements],
  });

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z0-9_]+$/.test(identifier)) {
    throw new Error(`Invalid options schema identifier: ${identifier}`);
  }
  return `\`${identifier}\``;
}

function escapeLikeTerm(value: string): string {
  return value.replace(/[!%_\\]/g, '!$&');
}

function normalizeRow(row: DatabaseOption): OptionItem {
  const rawValue = String(row.value);
  const numericValue = Number(rawValue);
  const value = Number.isSafeInteger(numericValue) ? numericValue : rawValue;
  const label = String(row.label ?? '');
  const meta = Number(row.recordStatus) === 1 ? {} : { inactive: true };
  const option: OptionItem = { value, label, meta, id: value, name: label };
  if (row.subLabel !== undefined && row.subLabel !== null) {
    option.subLabel = String(row.subLabel);
  }
  return option;
}

function normalizeFilters(
  filters: Record<string, unknown> | undefined,
  allowedFilters: Set<string>,
): Array<[string, string | number | boolean]> {
  return Object.entries(filters ?? {}).filter(
    (entry): entry is [string, string | number | boolean] =>
      allowedFilters.has(entry[0]) &&
      (typeof entry[1] === 'string' ||
        typeof entry[1] === 'number' ||
        typeof entry[1] === 'boolean'),
  );
}

function cacheKey(
  table: string,
  search: string,
  filters: Array<[string, string | number | boolean]>,
): string {
  return JSON.stringify([table, search, [...filters].sort(([a], [b]) => a.localeCompare(b))]);
}

function readCount(key: string): number | undefined {
  const cached = countCache.get(key);
  if (!cached) return undefined;
  if (cached.expiresAt <= Date.now()) {
    countCache.delete(key);
    return undefined;
  }
  countCache.delete(key);
  countCache.set(key, cached);
  return cached.count;
}

function storeCount(key: string, count: number): void {
  countCache.delete(key);
  countCache.set(key, { count, expiresAt: Date.now() + COUNT_CACHE_TTL_MS });
  if (countCache.size > MAX_COUNT_CACHE_ENTRIES) {
    const oldest = countCache.keys().next().value;
    if (oldest !== undefined) countCache.delete(oldest);
  }
}

export function buildOptions(
  config: OptionsBuilderConfig,
  runQuery: OptionsQueryExecutor = executeQuery,
): (input: OptionsDto) => Promise<OptionsResult> {
  const table = quoteIdentifier(config.schema.table);
  const idField = quoteIdentifier(config.schema.idField ?? 'id');
  const statusField = quoteIdentifier(config.schema.statusField ?? 'status');
  const labelExpression = config.labelExpr
    ? config.labelExpr
    : quoteIdentifier(config.labelField ?? 'name');
  const subLabelExpression = config.subLabelField ? quoteIdentifier(config.subLabelField) : 'NULL';
  const searchFields = config.searchFields.map(quoteIdentifier);
  const allowedFilters = new Set(config.allowedFilters);
  const order = config.defaultOrder ?? [
    { field: config.labelField ?? 'name', direction: 'ASC' as const },
    { field: 'id', direction: 'ASC' as const },
  ];
  const defaultSortExpression = config.labelField
    ? quoteIdentifier(config.labelField)
    : labelExpression;
  const orderBy = config.defaultOrder
    ? order.map(({ field, direction }) => `${quoteIdentifier(field)} ${direction}`).join(', ')
    : `${defaultSortExpression} ASC, ${idField} ASC`;
  const stableOrder = orderBy.includes(`${quoteIdentifier('id')} `)
    ? orderBy
    : `${orderBy}, ${idField} ASC`;

  return async (input: OptionsDto): Promise<OptionsResult> => {
    const page = Number.isInteger(input.page) && Number(input.page) > 0 ? Number(input.page) : 1;
    const limit =
      Number.isInteger(input.limit) && Number(input.limit) > 0
        ? Math.min(Number(input.limit), 50)
        : 30;

    if (input.ids !== undefined) {
      const uniqueIds = new Map<string, number | string>();
      for (const id of input.ids) {
        const normalized = String(id);
        if (!/^[1-9]\d*$/.test(normalized)) continue;
        if (typeof id === 'number' && !Number.isSafeInteger(id)) continue;
        uniqueIds.set(normalized, id);
      }
      const ids = [...uniqueIds.values()].slice(0, 200);
      if (ids.length === 0) return { rows: [], count: 0, hasMore: false, page: 1 };
      const replacements: unknown[] = [...ids];
      const rows = await runQuery(
        `SELECT ${idField} AS value, ${labelExpression} AS label, ${subLabelExpression} AS subLabel, ${statusField} AS recordStatus FROM ${table} WHERE ${idField} IN (${ids.map(() => '?').join(', ')}) ORDER BY FIELD(${idField}, ${ids.map(() => '?').join(', ')})`,
        [...replacements, ...ids],
      );
      const options = rows.map((row) => normalizeRow(row as DatabaseOption));
      return { rows: options, count: options.length, hasMore: false, page: 1 };
    }

    const search = typeof input.search === 'string' ? input.search.trim().slice(0, 100) : '';
    const filters = normalizeFilters(input.filters, allowedFilters);
    const specialFilters = Object.entries(input.filters ?? {}).filter(
      (entry): entry is [string, boolean] =>
        Boolean(config.specialFilters?.[entry[0]]) && typeof entry[1] === 'boolean',
    );
    const cacheFilters = [...filters, ...specialFilters];
    const filterWhere: string[] = [`${statusField} = ?`];
    const filterReplacements: unknown[] = [1];
    for (const [field, value] of filters) {
      filterWhere.push(`${quoteIdentifier(field)} = ?`);
      filterReplacements.push(value);
    }

    const escapedSearch = escapeLikeTerm(search);
    const prefixPattern = `${escapedSearch}%`;
    const containsPattern = `%${escapedSearch}%`;
    const likeEscape = " ESCAPE '!'";
    const prefixPredicate = `(${searchFields
      .map((field) => `${field} LIKE ?${likeEscape}`)
      .join(' OR ')})`;
    const containsPredicate = `(${searchFields
      .map((field) => `${field} LIKE ?${likeEscape}`)
      .join(' OR ')})`;
    const exactMatch = searchFields.map((field) => `${field} = ?`).join(' OR ');
    const hasSearch = search.length > 0 && searchFields.length > 0;

    const countWhere = hasSearch
      ? [...filterWhere, containsPredicate].join(' AND ')
      : filterWhere.join(' AND ');
    const countReplacements = hasSearch
      ? [...filterReplacements, ...searchFields.map(() => containsPattern)]
      : filterReplacements;
    const key = cacheKey(config.schema.table, search, cacheFilters);
    let count = readCount(key);
    if (count === undefined) {
      const countRow = await runQuery(
        `SELECT COUNT(*) AS count FROM ${table} WHERE ${countWhere}`,
        countReplacements,
      );
      count = Number(countRow[0]?.count ?? 0);
      storeCount(key, count);
    }

    const offset = (page - 1) * limit;
    const cursorField = config.defaultOrder
      ? quoteIdentifier(order[0]?.field ?? config.labelField ?? 'name')
      : defaultSortExpression;
    const selectColumns = `${idField} AS value, ${idField} AS id, ${labelExpression} AS label, ${cursorField} AS cursorLabel, ${subLabelExpression} AS subLabel, ${statusField} AS recordStatus`;

    let selectedRows: Record<string, unknown>[] = [];
    if (hasSearch) {
      // Ranked, index-friendly phases: exact, then prefix, then contains.
      // Each phase is ordered by the stable order (ranked columns first), so
      // concatenating the phases yields rank, label ASC, id ASC globally.
      const phases: Array<{
        predicate: string;
        rank: number;
        replacements: unknown[];
      }> = [
        {
          predicate: `(${exactMatch})`,
          rank: 0,
          replacements: searchFields.map(() => search),
        },
        {
          predicate: `${prefixPredicate} AND NOT (${exactMatch})`,
          rank: 1,
          replacements: [
            ...searchFields.map(() => prefixPattern),
            ...searchFields.map(() => search),
          ],
        },
        {
          predicate: `${containsPredicate} AND NOT (${prefixPredicate}) AND NOT (${exactMatch})`,
          rank: 2,
          replacements: [
            ...searchFields.map(() => containsPattern),
            ...searchFields.map(() => prefixPattern),
            ...searchFields.map(() => search),
          ],
        },
      ];
      let remaining = input.cursor ? limit + 1 : offset + limit + 1;
      for (const phase of phases) {
        if (remaining <= 0) break;
        if (input.cursor && phase.rank < input.cursor.rank) continue;
        const cursorWhere =
          input.cursor && phase.rank === input.cursor.rank
            ? ` AND (${cursorField} > ? OR (${cursorField} = ? AND ${idField} > ?))`
            : '';
        const cursorReplacements =
          input.cursor && phase.rank === input.cursor.rank
            ? [input.cursor.label, input.cursor.label, input.cursor.id]
            : [];
        const phaseRows = await runQuery(
          `SELECT ${selectColumns}, ${phase.rank} AS searchRank FROM ${table} WHERE ${filterWhere.join(
            ' AND ',
          )} AND ${phase.predicate}${cursorWhere} ORDER BY ${stableOrder} LIMIT ?`,
          [...filterReplacements, ...phase.replacements, ...cursorReplacements, remaining],
        );
        selectedRows = selectedRows.concat(phaseRows);
        remaining -= phaseRows.length;
      }
    } else if (input.cursor) {
      const rows = await runQuery(
        `SELECT ${selectColumns}, 0 AS searchRank FROM ${table} WHERE ${filterWhere.join(
          ' AND ',
        )} AND (${cursorField} > ? OR (${cursorField} = ? AND ${idField} > ?)) ORDER BY ${stableOrder} LIMIT ?`,
        [...filterReplacements, input.cursor.label, input.cursor.label, input.cursor.id, limit + 1],
      );
      selectedRows = rows;
    } else {
      selectedRows = await runQuery(
        `SELECT ${selectColumns}, 0 AS searchRank FROM ${table} WHERE ${filterWhere.join(
          ' AND ',
        )} ORDER BY ${stableOrder} LIMIT ? OFFSET ?`,
        [...filterReplacements, limit + 1, offset],
      );
    }

    // The unsearched query already applies OFFSET in SQL. Search queries fetch
    // each ranked phase up to the global offset so the phases can be merged in
    // rank order before selecting the requested page.
    const hasMore = input.cursor
      ? selectedRows.length > limit
      : hasSearch
        ? selectedRows.length > offset + limit
        : selectedRows.length > limit;
    const pageRows = input.cursor
      ? selectedRows.slice(0, limit)
      : hasSearch
        ? selectedRows.slice(offset, offset + limit)
        : selectedRows.slice(0, limit);
    const rows = pageRows.map((row) => normalizeRow(row as DatabaseOption));
    const resolvedCount = count ?? offset + rows.length + (hasMore ? 1 : 0);
    const lastRow = pageRows[pageRows.length - 1];
    const nextCursor =
      hasMore && lastRow
        ? {
            rank: Number(lastRow.searchRank ?? 0),
            label: String(lastRow.cursorLabel ?? lastRow.label ?? ''),
            id: (lastRow.id ?? lastRow.value) as number | string,
          }
        : undefined;
    return { rows, count: resolvedCount, hasMore, page, ...(nextCursor ? { nextCursor } : {}) };
  };
}

export function clearOptionsCountCache(): void {
  countCache.clear();
}

export { escapeLikeTerm };
