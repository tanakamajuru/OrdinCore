import { query } from '../../config/database';

/**
 * Single source of truth for reporting period boundaries. Every report surface (frozen/PDF,
 * scoped data, live summaries) should derive its window here so the same definition yields the
 * same boundaries everywhere.
 *
 * Boundary rule: start-INCLUSIVE, end-EXCLUSIVE. Calendar boundaries are computed in the
 * organisation governance timezone (default Europe/London) and converted to UTC, so UK
 * daylight-saving days (not always 24 hours) are handled correctly. DATE-typed columns use the
 * local calendar-date boundaries, never a UTC-cast of a timestamp (off by a day under BST).
 */
export type PeriodDefinition =
  | 'custom' | 'today' | 'weekly_governance' | 'calendar_month'
  | 'rolling_24h' | 'rolling_7d' | 'rolling_30d' | 'live';

export interface PeriodBounds {
  definition: PeriodDefinition;
  timezone: string;
  /** UTC instant, inclusive — for timestamptz columns (>= start). */
  start: string;
  /** UTC instant, exclusive — for timestamptz columns (< end). */
  end: string;
  /** Local calendar date, inclusive — for DATE columns (>= startDate). */
  startDate: string;
  /** Local calendar date, exclusive — for DATE columns (< endDateExcl). */
  endDateExcl: string;
  /** UTC instant of the inclusive last moment — for display/stored metadata headers. */
  endInclusive: string;
  /** Human label for the period (e.g. "5–11 Oct 2026"). */
  label: string;
}

const DEFAULT_TZ = 'Europe/London';

/**
 * Normalise an arbitrary requested range (two timestamps/dates) into exact calendar-day
 * boundaries in the given timezone: local midnight of the first day up to local midnight AFTER
 * the last day (exclusive).
 */
export async function boundsForRange(
  periodStart: string, periodEnd: string, timezone = DEFAULT_TZ, definition: PeriodDefinition = 'custom'
): Promise<PeriodBounds> {
  const tz = timezone || DEFAULT_TZ;
  const r = (await query(
    `SELECT (date_trunc('day', $1::timestamptz AT TIME ZONE $3)) AT TIME ZONE $3 AS start_utc,
            (date_trunc('day', $2::timestamptz AT TIME ZONE $3) + INTERVAL '1 day') AT TIME ZONE $3 AS end_utc,
            (date_trunc('day', $1::timestamptz AT TIME ZONE $3))::date AS start_date,
            (date_trunc('day', $2::timestamptz AT TIME ZONE $3) + INTERVAL '1 day')::date AS end_date_excl,
            to_char(($1::timestamptz AT TIME ZONE $3), 'FMDD Mon') AS start_label,
            to_char(($2::timestamptz AT TIME ZONE $3), 'FMDD Mon YYYY') AS end_label`,
    [periodStart, periodEnd, tz]
  )).rows[0];
  const start = new Date(r.start_utc).toISOString();
  const end = new Date(r.end_utc).toISOString();
  return {
    definition,
    timezone: tz,
    start,
    end,
    startDate: String(r.start_date),
    endDateExcl: String(r.end_date_excl),
    endInclusive: new Date(new Date(r.end_utc).getTime() - 1000).toISOString(),
    label: `${r.start_label}–${r.end_label} (UK time)`,
  };
}

/** Rolling window ending "now" (last N days). Used by live summaries; labelled, never a signed period. */
export function rollingWindow(days: number, timezone = DEFAULT_TZ): { definition: PeriodDefinition; days: number; start: string; end: string; timezone: string; label: string } {
  const definition: PeriodDefinition = days === 1 ? 'rolling_24h' : days === 7 ? 'rolling_7d' : days === 30 ? 'rolling_30d' : 'live';
  const end = new Date();
  const start = new Date(end.getTime() - days * 86400000);
  return {
    definition, days, timezone: timezone || DEFAULT_TZ,
    start: start.toISOString(), end: end.toISOString(),
    label: days === 1 ? 'Last 24 hours' : `Last ${days} days`,
  };
}

export const periodService = { boundsForRange, rollingWindow };
