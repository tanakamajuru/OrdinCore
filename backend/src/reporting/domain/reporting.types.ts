// Scoped ("frozen") reporting — shared domain types (v2.0.0).

export type ScopeType = 'PERSON' | 'SITE' | 'SERVICE' | 'REGION' | 'ORGANISATION';

export type ReconstructionMode = 'PERSON' | 'SITE' | 'THEME' | 'ORGANISATION';

export interface ReportScope {
  type: ScopeType;
  siteIds?: string[];       // explicit sites (SITE scope, or the sites resolved for SERVICE/REGION)
  serviceId?: string;       // SERVICE scope
  regionId?: string;        // REGION scope
  personId?: string;        // PERSON scope
  theme?: string;           // THEME reconstruction
  reconstructionMode?: ReconstructionMode;
  includeComparativeSiteView?: boolean;
}

export interface GenerateReportRequest {
  scope: ReportScope;
  periodStart: string;      // ISO
  periodEnd: string;        // ISO
  timezone?: string;
}

// The set of sites a report is authorised to read, plus context resolved from the scope.
export interface ResolvedScope {
  type: ScopeType;
  companyId: string;
  siteIds: string[];        // the authorised sites the report will actually read
  personId?: string | null;
  serviceId?: string | null;
  regionId?: string | null;
  theme?: string | null;
  reconstructionMode?: ReconstructionMode;
  label: string;            // human label, e.g. "Site: Oak Lodge" / "Organisation-wide"
}

export type SiteStatus = 'STABLE' | 'ATTENTION' | 'CRITICAL';

export interface Confidence {
  governance: number;       // 0-100
  evidence: number;         // 0-100
  basis: string;
}

export interface ReportDefinition {
  key: string;
  title: string;
  scopes: ScopeType[];      // which scopes this report may be generated at
}
