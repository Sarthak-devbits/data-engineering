/**
 * Date utility functions for parsing Xero date formats
 *
 * Xero returns dates in the format: /Date(1234567890000+0000)/
 * This is a Microsoft JSON date format (milliseconds since epoch)
 */

/**
 * Converts Xero's /Date(timestamp+offset)/ format to an ISO date string.
 * Returns null if the input is falsy or unparseable.
 */
export function formatXeroDate(
  dateString: string | undefined | null,
): string | null {
  if (!dateString) return null;
  try {
    const timestampStart = dateString.indexOf("(") + 1;
    const timestampEnd = dateString.indexOf(")");
    if (timestampStart === 0 || timestampEnd === -1) return null;
    const timestampStr = dateString.slice(timestampStart, timestampEnd);
    const timestamp = parseInt(timestampStr.split("+")[0], 10) / 1000;
    return new Date(timestamp * 1000).toISOString();
  } catch {
    return null;
  }
}

/**
 * Converts Xero's /Date(...)/ format to a JavaScript Date object.
 */
export function parseXeroDate(
  dateString: string | undefined | null,
): Date | null {
  const iso = formatXeroDate(dateString);
  return iso ? new Date(iso) : null;
}

/**
 * Parses a datetime string with optional milliseconds component.
 * Supports: "YYYY-MM-DD HH:mm:ss" and "YYYY-MM-DD HH:mm:ss.SSS"
 */
export function parseDateTime(dateStr: string | undefined | null): Date | null {
  if (!dateStr) return null;
  try {
    return new Date(dateStr);
  } catch {
    return null;
  }
}

/**
 * Returns the last day of the given month as a Date.
 */
export function lastDayOfMonth(year: number, month: number): Date {
  return new Date(year, month, 0);
}

/**
 * Generate last N months of end-of-month dates going back from today.
 */
export function generateLastNMonthEndDates(n: number): Date[] {
  const dates: Date[] = [];
  const today = new Date();
  for (let i = 0; i < n; i++) {
    const d = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    dates.push(d);
  }
  return dates;
}

/**
 * Format a Date object as YYYY-MM-DD string.
 */
export function toDateString(date: Date): string {
  return date.toISOString().split("T")[0];
}

/**
 * Check if the existing DB date differs from the incoming Xero date.
 * Returns true if the record should be updated.
 */
export function shouldUpdate(
  existingDateUtc: Date | string | null | undefined,
  newDateUtcStr: string | null | undefined,
): boolean {
  if (!existingDateUtc || !newDateUtcStr) return false;
  const existingStr =
    existingDateUtc instanceof Date
      ? existingDateUtc.toISOString()
      : new Date(existingDateUtc).toISOString();
  const newDate = new Date(newDateUtcStr);
  return newDate.toISOString() !== existingStr;
}
