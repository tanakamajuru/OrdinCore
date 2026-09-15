import { query } from '../config/database';

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

  async listAccessReviews(companyId: string, status: 'OPEN' | 'COMPLETED' = 'OPEN') {
    await safeRows(`SELECT sync_due_access_reviews($1::uuid)`, [companyId]);
    return safeRows(
      `SELECT ar.id, ar.status, ar.reason, ar.due_at, ar.completed_at, ar.note,
              u.id AS user_id, TRIM(COALESCE(u.first_name,'')||' '||COALESCE(u.last_name,'')) AS user_name,
              u.email, u.role, u.status AS account_status, u.last_login
         FROM access_reviews ar JOIN users u ON u.id=ar.subject_user_id
        WHERE ar.company_id=$1 AND ar.status=$2
        ORDER BY ar.due_at ASC`, [companyId, status]);
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
