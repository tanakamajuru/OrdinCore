// Scope authorisation — the backend, never the frontend, decides what a user may report on.
// Resolves the authorised set of sites for the user + requested scope, and refuses anything
// outside their role/tenant/assignment.
import { query } from '../../config/database';
import { ReportScope, ResolvedScope, ScopeType } from '../domain/reporting.types';
import { ORG_WIDE_ROLES, reportAllowsScope, findReport } from '../config/report-catalog';

interface AuthUser {
  user_id: string;
  company_id: string | null;
  role: string;
  assigned_house_ids?: string[];
}

// Roles that may run SERVICE-wide reports (a managed service) — leadership plus the RM.
const SERVICE_ROLES = [...ORG_WIDE_ROLES, 'REGISTERED_MANAGER'];

class ReportAuthError extends Error {
  statusCode = 403;
  constructor(msg: string) { super(msg); }
}

/** All non-closed sites in the company. */
async function companySites(companyId: string): Promise<string[]> {
  return (await query(`SELECT id FROM houses WHERE company_id = $1 AND status <> 'closed'`, [companyId]))
    .rows.map((r: any) => r.id);
}

/** The sites a user is authorised to see at all (before the requested scope narrows them). */
async function authorisedSites(user: AuthUser): Promise<string[]> {
  const role = String(user.role || '').toUpperCase();
  const company = user.company_id!;
  if (['SUPER_ADMIN', 'ADMIN', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL'].includes(role)) {
    return companySites(company);
  }
  const assigned = (user.assigned_house_ids || []).filter((h) => h && h !== '00000000-0000-0000-0000-000000000000');
  // A Registered Manager with no explicit assignment oversees the whole registered service.
  if (role === 'REGISTERED_MANAGER' && assigned.length === 0) return companySites(company);
  return assigned;
}

export const reportScopeService = {
  // The pick-lists for the scope selector, limited to what this user is authorised to report on.
  async options(user: AuthUser) {
    const role = String(user.role || '').toUpperCase();
    const company = user.company_id!;
    const allowed = await authorisedSites(user);
    const sites = allowed.length
      ? (await query(`SELECT id, name, service_id, region_id FROM houses WHERE id = ANY($1::uuid[]) ORDER BY name`, [allowed])).rows
      : [];
    const services = (await query(`SELECT id, name FROM services WHERE company_id = $1 ORDER BY name`, [company])).rows;
    const regions = (await query(`SELECT id, name FROM regions WHERE company_id = $1 ORDER BY name`, [company])).rows;
    const persons = allowed.length
      ? (await query(
          `SELECT su.id, su.display_name AS name, su.house_id FROM service_users su
            WHERE su.house_id = ANY($1::uuid[]) AND su.is_active = true ORDER BY su.display_name`,
          [allowed]
        )).rows
      : [];
    return { role, sites, services, regions, persons };
  },

  /**
   * Validate a report+scope request and resolve the authorised sites. Throws (403) on any
   * attempt to report outside the user's role, tenant, or assigned sites.
   */
  async resolve(user: AuthUser, reportKey: string, scope: ReportScope): Promise<ResolvedScope> {
    const role = String(user.role || '').toUpperCase();
    const company = user.company_id;
    if (!company) throw new ReportAuthError('No company associated with this account.');
    const def = findReport(reportKey);
    if (!def) throw new ReportAuthError('Unknown report.');
    const type: ScopeType = scope.type;
    if (!reportAllowsScope(reportKey, type)) {
      throw new ReportAuthError(`${def.title} cannot be generated at ${type} scope.`);
    }

    // Role gates for the wider scopes.
    if ((type === 'ORGANISATION' || type === 'REGION') && !ORG_WIDE_ROLES.includes(role)) {
      throw new ReportAuthError(`${type} reports are restricted to Director, Responsible Individual or Admin.`);
    }
    if (type === 'SERVICE' && !SERVICE_ROLES.includes(role)) {
      throw new ReportAuthError('Service reports are restricted to a Registered Manager or above.');
    }

    const allowed = new Set(await authorisedSites(user));
    const within = (ids: string[]) => ids.every((id) => allowed.has(id));
    const base: ResolvedScope = { type, companyId: company, siteIds: [], label: '' };

    if (type === 'ORGANISATION') {
      return { ...base, siteIds: [...allowed], label: 'Organisation-wide' };
    }

    if (type === 'REGION') {
      if (!scope.regionId) throw new ReportAuthError('A region must be selected.');
      const sites = (await query(
        `SELECT id FROM houses WHERE company_id = $1 AND region_id = $2 AND status <> 'closed'`,
        [company, scope.regionId]
      )).rows.map((r: any) => r.id).filter((id: string) => allowed.has(id));
      if (sites.length === 0) throw new ReportAuthError('No authorised sites in that region.');
      const name = (await query(`SELECT name FROM regions WHERE id = $1 AND company_id = $2`, [scope.regionId, company])).rows[0]?.name;
      return { ...base, siteIds: sites, regionId: scope.regionId, label: `Region: ${name || '—'}` };
    }

    if (type === 'SERVICE') {
      if (!scope.serviceId) throw new ReportAuthError('A service must be selected.');
      const sites = (await query(
        `SELECT id FROM houses WHERE company_id = $1 AND service_id = $2 AND status <> 'closed'`,
        [company, scope.serviceId]
      )).rows.map((r: any) => r.id).filter((id: string) => allowed.has(id));
      if (sites.length === 0) throw new ReportAuthError('No authorised sites in that service.');
      const name = (await query(`SELECT name FROM services WHERE id = $1 AND company_id = $2`, [scope.serviceId, company])).rows[0]?.name;
      return { ...base, siteIds: sites, serviceId: scope.serviceId, label: `Service: ${name || '—'}` };
    }

    if (type === 'SITE') {
      const ids = (scope.siteIds || []).filter(Boolean);
      if (ids.length === 0) throw new ReportAuthError('At least one site must be selected.');
      if (!within(ids)) throw new ReportAuthError('You are not authorised for one or more of the selected sites.');
      const names = (await query(`SELECT name FROM houses WHERE id = ANY($1::uuid[])`, [ids])).rows.map((r: any) => r.name);
      return { ...base, siteIds: ids, label: `Site: ${names.join(', ')}` };
    }

    // PERSON — the resident's site must be authorised.
    if (type === 'PERSON') {
      if (!scope.personId) throw new ReportAuthError('A person must be selected.');
      const su = (await query(
        `SELECT su.id, su.display_name, su.house_id FROM service_users su
           JOIN houses h ON h.id = su.house_id
          WHERE su.id = $1 AND h.company_id = $2`,
        [scope.personId, company]
      )).rows[0];
      if (!su) throw new ReportAuthError('Person not found in your organisation.');
      if (!allowed.has(su.house_id)) throw new ReportAuthError('You are not authorised for this person\'s site.');
      return {
        ...base, siteIds: [su.house_id], personId: su.id,
        theme: scope.theme || null, reconstructionMode: scope.reconstructionMode,
        label: `Person: ${su.display_name}`,
      };
    }

    throw new ReportAuthError('Unsupported scope.');
  },
};
