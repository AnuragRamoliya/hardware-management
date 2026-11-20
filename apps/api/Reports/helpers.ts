export const APP_DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

export function parseDateBounds(
  startDate?: string,
  endDate?: string,
): { start: Date; end: Date } | null {
  if (!startDate && !endDate) return null;

  let start: Date;
  if (startDate) {
    start = new Date(`${startDate}T00:00:00.000Z`);
    if (isNaN(start.getTime())) start = new Date(startDate);
  } else {
    start = new Date(0);
  }

  let end: Date;
  if (endDate) {
    end = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(end.getTime())) end = new Date(endDate);
  } else {
    end = new Date('2099-12-31T23:59:59.999Z');
  }

  return { start, end };
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
