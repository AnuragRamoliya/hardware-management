import {
  subDays,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  startOfQuarter,
  endOfQuarter,
  format,
} from "date-fns";

export const APP_TIMEZONE = "Asia/Kolkata";

/**
 * Safely parse a YYYY-MM-DD string or ISO date string into a local Date object
 * avoiding UTC-midnight timezone rollback bugs.
 */
export function parseDateString(
  str: string | null | undefined,
): Date | undefined {
  if (!str || typeof str !== "string") return undefined;
  const trimmed = str.trim();
  if (!trimmed) return undefined;

  // ISO with time: YYYY-MM-DDTHH:mm(:ss)?
  const isoTimeMatch =
    /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?/.exec(trimmed);
  if (isoTimeMatch) {
    const year = parseInt(isoTimeMatch[1], 10);
    const month = parseInt(isoTimeMatch[2], 10) - 1;
    const day = parseInt(isoTimeMatch[3], 10);
    const hours = parseInt(isoTimeMatch[4], 10);
    const minutes = parseInt(isoTimeMatch[5], 10);
    const seconds = isoTimeMatch[6] ? parseInt(isoTimeMatch[6], 10) : 0;
    const d = new Date(year, month, day, hours, minutes, seconds);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  // Match pure date YYYY-MM-DD
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (match) {
    const year = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const day = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    return Number.isNaN(d.getTime()) ? undefined : d;
  }

  // Fallback to ISO parsing
  const d = new Date(trimmed);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Format a Date object into YYYY-MM-DD strictly based on local calendar values.
 */
export function formatDateString(date: Date | null | undefined): string {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime()))
    return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Format a date into user-friendly display string, e.g. "Nov 23, 2026"
 */
export function formatDateDisplay(
  date: Date | string | null | undefined,
): string {
  if (!date) return "";
  const parsed = typeof date === "string" ? parseDateString(date) : date;
  if (!parsed || !(parsed instanceof Date) || Number.isNaN(parsed.getTime()))
    return "";
  try {
    return format(parsed, "MMM dd, yyyy");
  } catch {
    return formatDateString(parsed);
  }
}

/**
 * Format a date range into user-friendly display string, e.g. "Nov 01, 2026 – Nov 23, 2026"
 */
export function formatDateRangeDisplay(
  range: { from?: string | Date; to?: string | Date } | null | undefined,
): string {
  if (!range) return "";
  const fromStr =
    range.from instanceof Date
      ? formatDateDisplay(range.from)
      : typeof range.from === "string"
        ? formatDateDisplay(range.from)
        : "";
  const toStr =
    range.to instanceof Date
      ? formatDateDisplay(range.to)
      : typeof range.to === "string"
        ? formatDateDisplay(range.to)
        : "";

  if (fromStr && toStr) {
    return `${fromStr} – ${toStr}`;
  }
  if (fromStr) {
    return `${fromStr} – ...`;
  }
  if (toStr) {
    return `... – ${toStr}`;
  }
  return "";
}

export interface DateRangePreset {
  id: string;
  label: string;
  getRange: (referenceDate?: Date) => { from: string; to: string };
}

/**
 * Standard date range presets compliant with business standards and Indian Financial Year.
 */
export const DATE_PRESETS: DateRangePreset[] = [
  {
    id: "today",
    label: "Today",
    getRange: (ref = new Date()) => {
      const s = formatDateString(ref);
      return { from: s, to: s };
    },
  },
  {
    id: "yesterday",
    label: "Yesterday",
    getRange: (ref = new Date()) => {
      const s = formatDateString(subDays(ref, 1));
      return { from: s, to: s };
    },
  },
  {
    id: "last-7d",
    label: "Last 7 Days",
    getRange: (ref = new Date()) => ({
      from: formatDateString(subDays(ref, 6)),
      to: formatDateString(ref),
    }),
  },
  {
    id: "last-30d",
    label: "Last 30 Days",
    getRange: (ref = new Date()) => ({
      from: formatDateString(subDays(ref, 29)),
      to: formatDateString(ref),
    }),
  },
  {
    id: "this-month",
    label: "This Month",
    getRange: (ref = new Date()) => ({
      from: formatDateString(startOfMonth(ref)),
      to: formatDateString(endOfMonth(ref)),
    }),
  },
  {
    id: "last-month",
    label: "Last Month",
    getRange: (ref = new Date()) => {
      const prev = subMonths(ref, 1);
      return {
        from: formatDateString(startOfMonth(prev)),
        to: formatDateString(endOfMonth(prev)),
      };
    },
  },
  {
    id: "this-quarter",
    label: "This Quarter",
    getRange: (ref = new Date()) => ({
      from: formatDateString(startOfQuarter(ref)),
      to: formatDateString(endOfQuarter(ref)),
    }),
  },
  {
    id: "this-fy",
    label: "This Financial Year",
    getRange: (ref = new Date()) => {
      const fyStartYear =
        ref.getMonth() >= 3 ? ref.getFullYear() : ref.getFullYear() - 1;
      const fyStart = new Date(fyStartYear, 3, 1); // April 1
      const fyEnd = new Date(fyStartYear + 1, 2, 31); // March 31
      return {
        from: formatDateString(fyStart),
        to: formatDateString(fyEnd),
      };
    },
  },
  {
    id: "this-year",
    label: "This Year",
    getRange: (ref = new Date()) => ({
      from: formatDateString(startOfYear(ref)),
      to: formatDateString(endOfYear(ref)),
    }),
  },
];
