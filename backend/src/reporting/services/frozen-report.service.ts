// The frozen report engine: generate -> immutable snapshot -> approve -> PDF-from-snapshot.
import { query } from '../../config/database';
import { reportScopeService } from './report-scope.service';
import { scopedReportDataService } from './scoped-report-data.service';
import { hashService } from './hash.service';
import { narrativeService } from '../../services/narrative.service';
import { findReport } from '../config/report-catalog';
import { GenerateReportRequest } from '../domain/reporting.types';

interface AuthUser { user_id: string; company_id: string | null; role: string; assigned_house_ids?: string[]; }

export const frozenReportService = {
  async generate(user: AuthUser, reportKey: string, req: GenerateReportRequest) {
    const def = findReport(reportKey);
    if (!def) throw new Error('Unknown report.');
    const resolved = await reportScopeService.resolve(user, reportKey, req.scope);
    const start = req.periodStart;
    const end = req.periodEnd;

    const data = await scopedReportDataService.build(resolved, start, end);

    // Defensibility gate (doctrine §13.2): a Critical Governance Exception must name the specific
    // supporting risk. A frozen report cannot assert CRITICAL it cannot substantiate.
    const unsupportedCritical = ((data as any).material_exceptions || [])
      .filter((x: any) => x.status === 'CRITICAL' && !(Array.isArray(x.supporting_risks) && x.supporting_risks.length > 0))
      .map((x: any) => x.site_name);
    if (unsupportedCritical.length > 0) {
      throw new Error(`Cannot freeze report: a Critical Governance Exception has no identifiable supporting risk for ${unsupportedCritical.join(', ')}. Record/link the supporting critical risk before publishing.`);
    }

    // Freeze report provenance at generation time so every PDF can identify the organisation,
    // producer and production timestamp without relying on mutable live profile data.
    const producedAt = new Date().toISOString();
    const producer = (await query(
      `SELECT c.name AS organisation_name,
              TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS produced_by_name
         FROM companies c
         LEFT JOIN users u ON u.id=$2 AND u.company_id=c.id
        WHERE c.id=$1`,
      [user.company_id, user.user_id]
    )).rows[0] || {};
    (data as any).report_metadata = {
      organisation: producer.organisation_name || 'Not recorded',
      produced_at: producedAt,
      produced_by_name: producer.produced_by_name || 'Not recorded',
      produced_by_role: user.role || 'Not recorded',
    };

    // Optional narrative drafted strictly from these facts — same engine as every other report.
    let narrative = '';
    try {
      const gen = await narrativeService.generate({
        reportTitle: def.title,
        periodLabel: `${String(start).slice(0, 10)} to ${String(end).slice(0, 10)}`,
        serviceName: resolved.label,
        data,
      });
      narrative = gen.narrative || '';
      // Store the provenance structurally in the frozen (hashed) snapshot: AI provider/model/
      // prompt-version, or "System-generated from canonical facts" for the deterministic template
      // (doctrine §24). This is data, not a string comparison of the draft.
      (data as any).narrative_provenance = gen.provenance;
      (data as any).narrative_label = gen.provenance.source === 'ai'
        ? `AI-assisted draft — ${gen.provenance.model} via ${gen.provenance.provider} (${gen.provenance.prompt_version}). Must be reviewed and approved by a responsible person.`
        : 'System-generated from canonical facts.';
    } catch { /* narrative is optional; the report is still valid without it */ }

    // Hash every fact that can affect the rendered document, including the narrative. Previous
    // hashes covered data but not narrative, so a PDF could contain unverified text.
    const contract_version = 'report-snapshot-v1';
    const source_cutoff_at = producedAt;
    const integrity_payload = {
      contract_version, report_key: reportKey, scope_type: resolved.type,
      requested_scope: req.scope, resolved_site_ids: resolved.siteIds,
      person_id: resolved.personId || null, service_id: resolved.serviceId || null,
      region_id: resolved.regionId || null, period_start: start, period_end: end,
      source_cutoff_at, data, narrative,
    };
    const evidence_hash = hashService.hash(integrity_payload);

    const row = (await query(
      `INSERT INTO report_snapshots
         (company_id, report_key, scope_type, scope_json, site_ids, person_id, service_id, region_id,
          period_start, period_end, data, narrative, confidence, evidence_hash, status, generated_by,
          contract_version, integrity_payload, source_cutoff_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'DRAFT',$15,$16,$17,$18)
       RETURNING id, created_at`,
      [user.company_id, reportKey, resolved.type, JSON.stringify(req.scope), resolved.siteIds,
       resolved.personId || null, resolved.serviceId || null, resolved.regionId || null,
       start, end, JSON.stringify(data), narrative, JSON.stringify(data.organisation), evidence_hash, user.user_id,
       contract_version, JSON.stringify(integrity_payload), source_cutoff_at]
    )).rows[0];

    return { id: row.id, report_key: reportKey, title: def.title, scope_label: resolved.label,
             data, narrative, evidence_hash, contract_version, source_cutoff_at,
             integrity_verified: true, status: 'DRAFT', created_at: row.created_at };
  },

  async approve(id: string, user: AuthUser) {
    const r = (await query(
      `UPDATE report_snapshots SET status='APPROVED', approved_by=$1, approved_at=NOW()
        WHERE id=$2 AND company_id=$3 AND status='DRAFT' RETURNING id`,
      [user.user_id, id, user.company_id]
    )).rows[0];
    if (!r) throw new Error('Report not found, or already approved.');
    return { id, status: 'APPROVED' };
  },

  async get(id: string, companyId: string) {
    const r = (await query(
      `SELECT rs.*, c.name AS organisation_name,
              TRIM(COALESCE(gu.first_name, '') || ' ' || COALESCE(gu.last_name, '')) AS generated_by_name,
              gu.role AS generated_by_role
         FROM report_snapshots rs
         LEFT JOIN companies c ON c.id=rs.company_id
         LEFT JOIN users gu ON gu.id=rs.generated_by
        WHERE rs.id=$1 AND rs.company_id=$2`,
      [id, companyId]
    )).rows[0];
    if (!r) throw new Error('Report not found.');
    if (r.contract_version === 'report-snapshot-v1') {
      if (!r.integrity_payload || hashService.hash(r.integrity_payload) !== r.evidence_hash) {
        throw new Error('Report integrity verification failed. Regenerate the report before use.');
      }
      r.integrity_verified = true;
    } else {
      r.integrity_verified = false;
      r.integrity_warning = 'Legacy snapshot: narrative and full render inputs were not covered by the original hash.';
    }
    return r;
  },

  async list(companyId: string, reportKey?: string) {
    const params: any[] = [companyId];
    let where = 'company_id = $1';
    if (reportKey) { where += ' AND report_key = $2'; params.push(reportKey); }
    return (await query(
      `SELECT rs.id, rs.report_key, rs.scope_type, rs.period_start, rs.period_end, rs.status,
              rs.created_at, rs.approved_at, rs.confidence,
              (u.first_name || ' ' || u.last_name) AS approved_by_name
         FROM report_snapshots rs LEFT JOIN users u ON u.id = rs.approved_by
        WHERE ${where} ORDER BY rs.created_at DESC LIMIT 100`,
      params
    )).rows;
  },
};
