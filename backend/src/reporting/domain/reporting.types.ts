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
  governance: number;              // 0-100 (management responsiveness; retained for back-compat)
  evidence: number;                // 0-100 (retained for back-compat; == evidence_coverage)
  evidence_coverage: number;       // 0-100 — volume/spread of evidence
  control_assurance: number | null; // 0-100, or null when there are no controls to assure
  // B2 correction (21 Oct 2026): a period with literally no recorded activity must never read as
  // 100% confidence -- every component ratio defaults to 1 when its denominator is 0, which is
  // silence, not assurance. assurance_label makes that distinction explicit wherever the raw
  // percentages are shown.
  assurance_label: 'Assured' | 'Limited assurance' | 'Insufficient evidence';
  basis: string;
}

export interface ReportDefinition {
  key: string;
  title: string;
  scopes: ScopeType[];      // which scopes this report may be generated at
}
