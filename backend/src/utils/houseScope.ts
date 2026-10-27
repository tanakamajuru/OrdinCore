import { Request } from 'express';

// VAPT report F1/F2/F5/F6 (26 Oct 2026): four separate :id-keyed endpoints enforced tenant
// (company_id) isolation correctly but never checked house-level isolation within a tenant,
// letting a house-restricted role (Support Worker, Team Leader) read or modify another house's
// safeguarding/incident/risk/signal data by guessing or enumerating an id. Confirmed by live
// exploitation against a local reproduction, including a real data mutation.
//
// Single shared helper so this stops being a per-controller judgement call. Mirrors the
// pre-existing, correct TEAM_LEADER check in risks.controller.ts findById — extended to also
// cover SUPPORT_WORKER (the gap that was F6) and reused everywhere else the same shape appears.
const HOUSE_RESTRICTED_ROLES = ['TEAM_LEADER', 'SUPPORT_WORKER'];

/**
 * Returns true if the given resource's house_id is outside the requesting user's assigned
 * houses AND the user's role is house-restricted. A resource with no house_id (house_id is
 * null — e.g. an organisation-wide/strategic record) is never blocked by this check; only an
 * explicit house mismatch is.
 */
export function isOutsideHouseScope(req: Request, resourceHouseId: string | null | undefined): boolean {
  const role = String(req.user?.role || '').toUpperCase().replace(/-/g, '_');
  if (!HOUSE_RESTRICTED_ROLES.includes(role)) return false;
  if (!resourceHouseId) return false;
  const userHouseIds: string[] = req.user?.assigned_house_ids || [];
  return !userHouseIds.includes(resourceHouseId);
}
