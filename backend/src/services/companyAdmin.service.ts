import { query, getClient } from '../config/database';

const safeRows = async (sql: string, params: any[] = []) => {
  try { return (await query(sql, params)).rows; } catch { return []; }
};
const num = (rows: any[], key = 'n') => Number(rows?.[0]?.[key] || 0);

// Turn a raw audit_logs row into a human sentence for the "Recent admin activity" feed.
const ACTIVITY_VERBS: Record<string, string> = {
  'user.created': 'invited a new user',
  'user.invited': 'invited a new user',
  'user.updated': "updated a user's details",
  'user.permissions_updated': "updated a user's permissions",
  'user.role_updated': "updated a user's role",
  'user.deactivated': 'deactivated a user',
  'house.created': 'added a service',
  'house.updated': 'updated a service',
  'service_user.created': 'added a service user',
  'service_user.transferred': 'transferred a service user',
  'access_review.completed': 'completed an access review',
  'security_policy.updated': 'updated the security policy',
  'auth.login_failed': 'had a failed sign-in',
};
function activityText(row: any): string {
  const key = String(row.action || '').toLowerCase();
  if (ACTIVITY_VERBS[key]) return ACTIVITY_VERBS[key];
  // Fallback: "<verb> a <resource>" from a dotted action, else the raw action.
  const parts = key.split('.');
  const verb = parts[1] || parts[0] || 'updated';
  const res = String(row.resource || parts[0] || 'record').replace(/_/g, ' ');
  return `${verb.replace(/_/g, ' ')} a ${res}`;
}

export const companyAdminService = {
  async overview(companyId: string) {
    // Keep the access-review queue current before reading it.
    await safeRows(`SELECT sync_due_access_reviews($1::uuid)`, [companyId]);

    const [
      company, users, services, reviewsDue, alerts, inactiveAssigned, assignments, activity, policy,
    ] = await Promise.all([
      safeRows(`SELECT name FROM companies WHERE id=$1`, [companyId]),
      safeRows(
        `SELECT COUNT(*) FILTER (WHERE LOWER(COALESCE(status,'active'))='active')::int AS active,
                COUNT(*)::int AS total,
                COUNT(*) FILTER (WHERE mfa_enabled IS NOT TRUE AND LOWER(COALESCE(status,'active'))='active')::int AS no_mfa
           FROM users WHERE company_id=$1`, [companyId]),
      safeRows(`SELECT COUNT(*)::int AS n FROM canonical_house_state_v WHERE company_id=$1 AND is_active`, [companyId]),
      safeRows(`SELECT COUNT(*)::int AS n FROM access_reviews WHERE company_id=$1 AND status='OPEN' AND due_at<=NOW()`, [companyId]),
      safeRows(`SELECT COUNT(*)::int AS n FROM audit_logs WHERE company_id=$1 AND LOWER(action)='auth.login_failed' AND created_at > NOW() - INTERVAL '7 days'`, [companyId]),
      safeRows(
        `SELECT COUNT(DISTINCT u.id)::int AS n FROM users u
          WHERE u.company_id=$1 AND LOWER(COALESCE(u.status,''))='inactive'
            AND EXISTS (SELECT 1 FROM user_houses uh WHERE uh.user_id=u.id)`, [companyId]),
      safeRows(
        `SELECT h.id, h.name, COALESCE(NULLIF(h.sector,''),'Care service') AS service_type,
                (SELECT COUNT(*)::int FROM user_houses uh WHERE uh.house_id=h.id) AS staff_count
           FROM canonical_house_state_v h
          WHERE h.company_id=$1 AND h.is_active
          ORDER BY staff_count DESC, h.name ASC`, [companyId]),
      safeRows(
        `SELECT a.id, a.action, a.resource, a.created_at,
                TRIM(COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'')) AS actor_name
           FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id AND u.company_id=a.company_id
          WHERE a.company_id=$1
          ORDER BY a.created_at DESC LIMIT 8`, [companyId]),
      safeRows(
        `SELECT mfa_required, session_timeout_minutes, exports_restricted, updated_at
           FROM company_security_settings WHERE company_id=$1`, [companyId]),
    ]);

    const p = policy[0] || { mfa_required: true, session_timeout_minutes: 30, exports_restricted: true };
    return {
      company: company?.[0]?.name || 'Your organisation',
      stats: {
        active_users: num(users, 'active'),
        services: num(services),
        access_reviews_due: num(reviewsDue),
        security_alerts: num(alerts),
      },
      attention: {
        access_reviews_due: num(reviewsDue),
        inactive_assigned: num(inactiveAssigned),
        failed_login_alerts: num(alerts),
        accounts_without_mfa: num(users, 'no_mfa'),
      },
      assignments: assignments.map((h: any) => ({ id: h.id, name: h.name, service_type: h.service_type, staff: Number(h.staff_count) || 0 })),
      activity: activity.map((a: any) => ({
        id: a.id, actor: a.actor_name || 'A user', text: activityText(a), at: a.created_at,
      })),
      security: {
        mfa_required: !!p.mfa_required,
        session_timeout_minutes: Number(p.session_timeout_minutes) || 30,
        exports_restricted: !!p.exports_restricted,
      },
    };
  },

  async getSecurityPolicy(companyId: string) {
    const rows = await safeRows(
      `SELECT mfa_required, session_timeout_minutes, exports_restricted, updated_at FROM company_security_settings WHERE company_id=$1`,
      [companyId]);
    return rows[0] || { mfa_required: true, session_timeout_minutes: 30, exports_restricted: true };
  },

  async updateSecurityPolicy(
    companyId: string, userId: string,
    patch: { mfa_required?: boolean; session_timeout_minutes?: number; exports_restricted?: boolean }
  ) {
    if (patch.session_timeout_minutes != null &&
       (patch.session_timeout_minutes < 5 || patch.session_timeout_minutes > 480)) {
      throw new Error('Session timeout must be between 5 and 480 minutes.');
    }
    // Export access is enforced by server roles and cannot be opened by a tenant
    // preference. MFA and timeout are recorded as provider policy targets until
    // the authentication layer reports them as enforced.
    patch.exports_restricted = true;
    const res = await query(
      `INSERT INTO company_security_settings (company_id, mfa_required, session_timeout_minutes, exports_restricted, updated_by, updated_at)
       VALUES ($1, COALESCE($2, TRUE), COALESCE($3, 30), COALESCE($4, TRUE), $5, NOW())
       ON CONFLICT (company_id) DO UPDATE SET
         mfa_required = COALESCE($2, company_security_settings.mfa_required),
         session_timeout_minutes = COALESCE($3, company_security_settings.session_timeout_minutes),
         exports_restricted = COALESCE($4, company_security_settings.exports_restricted),
         updated_by = $5, updated_at = NOW()
       RETURNING mfa_required, session_timeout_minutes, exports_restricted, updated_at`,
      [companyId, patch.mfa_required ?? null, patch.session_timeout_minutes ?? null, patch.exports_restricted ?? null, userId]
    );
    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, new_values)
       VALUES (uuid_generate_v4(), $1, $2, 'security_policy.updated', 'security_policy', $3)`,
      [companyId, userId, JSON.stringify(res.rows[0])]
    ).catch(() => {});
    return res.rows[0];
  },

  // Weekly governance review schedule — the day/time all services are reviewed, used to compute the
  // reporting period and due date going forward. A change applies to FUTURE periods only; existing
  // weekly_reviews rows (keyed by their week_ending) and signed records are untouched.
  async getGovernanceSchedule(companyId: string) {
    // "Current" is the version in force TODAY (effective-dated), not simply the latest companies
    // columns — so a saved future change is not shown as if it were already live.
    const rows = await safeRows(
      `SELECT COALESCE(v.review_dow, c.weekly_governance_review_dow, 1) AS review_dow,
              COALESCE(v.review_time, c.weekly_governance_review_time, '09:00'::time)::text AS review_time,
              COALESCE(NULLIF(c.governance_timezone,''),'Europe/London') AS timezone
         FROM companies c
         LEFT JOIN LATERAL (
           SELECT review_dow, review_time FROM company_schedule_versions
            WHERE company_id=c.id AND effective_from <= (NOW() AT TIME ZONE COALESCE(NULLIF(c.governance_timezone,''),'Europe/London'))::date
            ORDER BY effective_from DESC LIMIT 1
         ) v ON TRUE
        WHERE c.id=$1`, [companyId]);
    // Scheduled future changes not yet in force — the provider can see what is coming and when.
    const pending = await safeRows(
      `SELECT review_dow, review_time::text AS review_time, effective_from::text AS effective_from, reason
         FROM company_schedule_versions
        WHERE company_id=$1
          AND effective_from > (NOW() AT TIME ZONE COALESCE((SELECT NULLIF(governance_timezone,'') FROM companies WHERE id=$1),'Europe/London'))::date
        ORDER BY effective_from ASC`, [companyId]);
    const history = await safeRows(
      `SELECT a.created_at, a.new_values,
              NULLIF(TRIM(COALESCE(u.first_name,'') || ' ' || COALESCE(u.last_name,'')),'') AS actor
         FROM audit_logs a LEFT JOIN users u ON u.id=a.user_id AND (u.company_id=a.company_id OR u.company_id IS NULL)
        WHERE a.company_id=$1 AND a.action='weekly_schedule.updated'
        ORDER BY a.created_at DESC LIMIT 20`, [companyId]);
    return { ...(rows[0] || { review_dow: 1, review_time: '09:00:00', timezone: 'Europe/London' }), pending, history };
  },

  async updateGovernanceSchedule(
    companyId: string, userId: string,
    patch: { review_dow?: number; review_time?: string; timezone?: string; reason?: string }
  ) {
    const dow = patch.review_dow;
    if (dow == null || !Number.isInteger(dow) || dow < 0 || dow > 6) throw new Error('Choose a valid review day (0 Sunday – 6 Saturday).');
    const time = String(patch.review_time || '09:00');
    if (!/^\d{2}:\d{2}(:\d{2})?$/.test(time)) throw new Error('Use a valid time (HH:MM).');
    if (String(patch.reason || '').trim().length < 10) throw new Error('Record a brief reason for the schedule change (at least 10 characters).');
    const tz = String(patch.timezone || 'Europe/London');
    // The schedule change and its audit record must succeed or fail TOGETHER. Previously the audit
    // insert was fire-and-forget (.catch(()=>{})), so an auditable change could be reported as fully
    // successful even if the audit event was never stored. Do both in one transaction.
    const client = await getClient();
    try {
      await client.query('BEGIN');
      // The schedule in force TODAY (effective-dated) — this is "before", and its day governs when
      // the upcoming review falls so we can place the change strictly AFTER it.
      const before = (await client.query(
        `SELECT COALESCE(v.review_dow, c.weekly_governance_review_dow, 1) AS review_dow,
                COALESCE(v.review_time, c.weekly_governance_review_time, '09:00'::time)::text AS review_time,
                COALESCE(NULLIF(c.governance_timezone,''),'Europe/London') AS timezone
           FROM companies c
           LEFT JOIN LATERAL (
             SELECT review_dow, review_time FROM company_schedule_versions
              WHERE company_id=c.id AND effective_from <= (NOW() AT TIME ZONE COALESCE(NULLIF(c.governance_timezone,''),'Europe/London'))::date
              ORDER BY effective_from DESC LIMIT 1
           ) v ON TRUE
          WHERE c.id=$1`, [companyId])).rows[0] || { review_dow: 1, review_time: '09:00:00', timezone: 'Europe/London' };

      // Effective from the day AFTER the next review under the CURRENT schedule, so the imminent
      // review and every established period keep their due date; the change applies from the
      // following period only. (next review day strictly after today, + 1 day)
      const ef = (await client.query(
        `WITH t AS (SELECT (NOW() AT TIME ZONE $1)::date AS today)
         SELECT (today + ((((($2::int - EXTRACT(DOW FROM today)::int + 7) % 7)
                  + CASE WHEN (($2::int - EXTRACT(DOW FROM today)::int + 7) % 7) = 0 THEN 7 ELSE 0 END)) + 1))::text AS effective_from
           FROM t`,
        [before.timezone, before.review_dow])).rows[0].effective_from;

      // Append the future-effective version (re-saving before it takes effect replaces that intent).
      await client.query(
        `INSERT INTO company_schedule_versions (company_id, review_dow, review_time, timezone, effective_from, reason, created_by)
         VALUES ($1, $2, $3::time, $4, $5::date, $6, $7)
         ON CONFLICT (company_id, effective_from)
         DO UPDATE SET review_dow=EXCLUDED.review_dow, review_time=EXCLUDED.review_time, timezone=EXCLUDED.timezone,
                       reason=EXCLUDED.reason, created_by=EXCLUDED.created_by, created_at=NOW()`,
        [companyId, dow, time, tz, ef, String(patch.reason).trim(), userId]
      );

      // Keep the companies columns as a convenience cache/fallback (timezone governs the clock).
      // Period calculations read the effective-dated versions, so this never moves existing periods.
      await client.query(
        `UPDATE companies SET weekly_governance_review_dow=$2, weekly_governance_review_time=$3::time, governance_timezone=$4 WHERE id=$1`,
        [companyId, dow, time, tz]
      );

      const after = { review_dow: dow, review_time: time, timezone: tz, effective_from: ef };
      await client.query(
        `INSERT INTO audit_logs (id, company_id, user_id, action, resource, new_values)
         VALUES (uuid_generate_v4(), $1, $2, 'weekly_schedule.updated', 'weekly_schedule', $3)`,
        [companyId, userId, JSON.stringify({ before, after, reason: String(patch.reason).trim() })]
      );
      await client.query('COMMIT');
      // Return the schedule still IN FORCE today, plus when the change takes effect.
      return { ...before, pending_change: after, effective_from: ef };
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  },

  async listAccessReviews(companyId: string, status: 'OPEN' | 'COMPLETED' = 'OPEN') {
    await safeRows(`SELECT sync_due_access_reviews($1::uuid)`, [companyId]);
    // The listing itself must NOT swallow errors into an empty array — an empty result then
    // reads as "no reviews due", hiding an outstanding governance obligation. Let it throw so the
    // caller surfaces an "unavailable" state instead. (The sync above stays best-effort.)
    return (await query(
      `SELECT ar.id, ar.status, ar.reason, ar.due_at, ar.completed_at, ar.note,
              u.id AS user_id, TRIM(COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'')) AS user_name,
              u.email, u.role, u.status AS account_status, u.last_login
         FROM access_reviews ar JOIN users u ON u.id=ar.subject_user_id
        WHERE ar.company_id=$1 AND ar.status=$2
        ORDER BY ar.due_at ASC`, [companyId, status])).rows;
  },

  async completeAccessReview(companyId: string, id: string, userId: string, note?: string) {
    const res = await query(
      `UPDATE access_reviews SET status='COMPLETED', completed_by=$3, completed_at=NOW(), note=$4
        WHERE id=$1 AND company_id=$2 AND status='OPEN' RETURNING id, subject_user_id`,
      [id, companyId, userId, note || null]);
    if (!res.rows[0]) throw new Error('Access review not found or already completed.');
    await query(
      `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id)
       VALUES (uuid_generate_v4(), $1, $2, 'access_review.completed', 'access_review', $3)`,
      [companyId, userId, id]
    ).catch(() => {});
    return res.rows[0];
  },
};
