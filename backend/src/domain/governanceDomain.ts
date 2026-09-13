/**
 * One SQL definition for action-domain precedence. Aliases must already exist in the query.
 * No caller may reorder these sources or infer a domain from narrative text.
 */
export function canonicalActionDomainSql(a: {
  action: string; risk: string; cluster: string; pulse: string;
}): string {
  return `COALESCE(
    NULLIF(TRIM(${a.risk}.risk_domain), ''),
    NULLIF(TRIM(${a.risk}.strategic_theme), ''),
    NULLIF(TRIM(${a.cluster}.risk_domain), ''),
    NULLIF(TRIM(${a.action}.governance_domain), ''),
    NULLIF(TRIM(${a.pulse}.governance_domain), ''),
    NULLIF(TRIM((${a.pulse}.risk_domain)[1]), ''),
    'Uncategorised'
  )`;
}
