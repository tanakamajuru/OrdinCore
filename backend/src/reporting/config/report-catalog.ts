// Frozen report catalogue (v2.0.0). The ten report designs and the scopes each may be generated
// at are centrally frozen here — the single source of truth for report/scope compatibility.
import { ReportDefinition, ScopeType } from '../domain/reporting.types';

const P: ScopeType = 'PERSON';
const S: ScopeType = 'SITE';
const SV: ScopeType = 'SERVICE';
const R: ScopeType = 'REGION';
const O: ScopeType = 'ORGANISATION';

export const REPORT_CATALOG: ReportDefinition[] = [
  { key: 'weekly-governance-review',      title: 'Weekly Governance Review',       scopes: [S, SV, R, O] },
  { key: 'executive-governance-dashboard', title: 'Executive Governance Dashboard', scopes: [S, SV, R, O] },
  { key: 'strategic-risk-register',       title: 'Strategic Risk Register',         scopes: [P, S, SV, R, O] },
  { key: 'escalation-intervention',       title: 'Escalation & Intervention',       scopes: [P, S, SV, R, O] },
  { key: 'weekly-leadership-narrative',   title: 'Weekly Leadership Narrative',     scopes: [S, SV, R, O] },
  { key: 'cross-service-governance',      title: 'Cross-Service Governance',        scopes: [SV, R, O] },
  { key: 'inspection-evidence-pack',      title: 'Inspection Evidence Pack',        scopes: [P, S, SV, R, O] },
  { key: 'governance-reconstruction',     title: 'Governance Reconstruction',       scopes: [P, S, SV, R, O] },
  { key: 'board-ri-assurance',            title: 'Board & RI Assurance',            scopes: [SV, R, O] },
  { key: 'governance-audit-log',          title: 'Governance Audit Log',            scopes: [P, S, SV, R, O] },
];

// Organisation/Region/Service-wide reporting is restricted to leadership roles. Site/Person
// scopes remain available to the roles that own those sites (resolved in report-scope.service).
export const ORG_WIDE_ROLES = ['DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN'];

export function findReport(key: string): ReportDefinition | undefined {
  return REPORT_CATALOG.find((r) => r.key === key);
}

export function reportAllowsScope(key: string, scope: ScopeType): boolean {
  const def = findReport(key);
  return !!def && def.scopes.includes(scope);
}
