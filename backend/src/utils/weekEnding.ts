// week_ending is a DATE-ONLY governance key — never an instant in time. The database columns
// weekly_reviews.week_ending and provider_review_signoffs.week_ending are DATE columns; if a client
// (or a driver) hands back an ISO timestamp like "2026-09-25T23:00:00.000Z", that is midnight
// 26 Sep in British Summer Time, and naively slicing the string yields the WRONG day. These helpers
// are the single boundary that keeps every roll-up, sign-off and report on the same UK calendar date.

const UK_TZ = 'Europe/London';

/**
 * Coerce any week_ending input to a date-only 'YYYY-MM-DD' string on the UK calendar.
 * - Passes through a value already in 'YYYY-MM-DD'.
 * - Converts a timestamp/instant to its Europe/London date (so a BST 23:00Z maps to the next day).
 * Throws on values that are not a recognisable date.
 */
export function normalizeWeekEnding(input: unknown): string {
  const s = String(input ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const d = new Date(s);
  if (isNaN(d.getTime())) throw new Error('week_ending must be a date (YYYY-MM-DD)');
  // en-CA renders as YYYY-MM-DD; the timeZone makes it the UK calendar date.
  return new Intl.DateTimeFormat('en-CA', { timeZone: UK_TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
}

/** Human UK label, e.g. "26 September 2026". Never render the raw database value. */
export function formatWeekEndingUK(input: unknown): string {
  const iso = normalizeWeekEndingSafe(input);
  if (!iso) return '—';
  const d = new Date(`${iso}T12:00:00Z`); // noon avoids any DST edge when formatting
  return new Intl.DateTimeFormat('en-GB', { timeZone: UK_TZ, day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Like normalizeWeekEnding but returns '' instead of throwing (for display paths). */
export function normalizeWeekEndingSafe(input: unknown): string {
  try { return normalizeWeekEnding(input); } catch { return ''; }
}
