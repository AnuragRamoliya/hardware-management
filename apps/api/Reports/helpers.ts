import type { ReportDefinition } from './types';

export const APP_DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export function parseDateBounds(
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } | null {
  if (!startDate && !endDate) return null;

  let start: Date;
  if (startDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      start = new Date(`${startDate}T00:00:00.000+05:30`);
    } else {
      start = new Date(startDate);
    }
    if (isNaN(start.getTime())) start = new Date(0);
  } else {
    start = new Date(0);
  }

  let end: Date;
  if (endDate) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(endDate)) {
      end = new Date(`${endDate}T23:59:59.999+05:30`);
    } else {
      end = new Date(endDate);
    }
    if (isNaN(end.getTime())) end = new Date('2099-12-31T23:59:59.999+05:30');
  } else {
    end = new Date('2099-12-31T23:59:59.999+05:30');
  }

  return { start, end };
}

export function validateAndWhitelistFilters(
  report: ReportDefinition,
  filters: Record<string, unknown> = {},
): Record<string, unknown> {
  const allowedKeys = new Set([
    ...report.filters.map((f) => f.key),
    'search',
    'general_search',
    'start_date',
    'end_date',
  ]);

  const sanitized: Record<string, unknown> = {};

  for (const [key, val] of Object.entries(filters)) {
    if (val === undefined || val === null || val === '') continue;
    if (!allowedKeys.has(key)) {
      const err = new Error(`Filter key '${key}' is not allowed for report '${report.key}'`);
      (err as unknown as { status: number }).status = 400;
      throw err;
    }
    if (typeof val === 'string') {
      const sqlInjectionRegex =
        /(\b(SELECT|UNION|INSERT|UPDATE|DELETE|DROP|ALTER|EXEC|EXECUTE|SCRIPT|CREATE|TRUNCATE)\b|--|\/\*|\*\/|;)/i;
      if (sqlInjectionRegex.test(val)) {
        const err = new Error(
          `Invalid filter value for '${key}': SQL syntax or dangerous characters detected.`,
        );
        (err as unknown as { status: number }).status = 400;
        throw err;
      }
    }
    sanitized[key] = val;
  }

  return sanitized;
}

export function sanitizeFormulaInjection(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

export async function* arrayToAsyncGenerator<T>(items: T[], chunkSize = 1000): AsyncIterable<T[]> {
  for (let i = 0; i < items.length; i += chunkSize) {
    yield items.slice(i, i + chunkSize);
  }
}
