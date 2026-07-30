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
    } catch { /* narrative is optional; the report is still valid without it */ }

    const evidence_hash = hashService.hash({ reportKey, scope: resolved, data });

    const row = (await query(
      `INSERT INTO report_snapshots
         (company_id, report_key, scope_type, scope_json, site_ids, person_id, service_id, region_id,
          period_start, period_end, data, narrative, confidence, evidence_hash, status, generated_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'DRAFT',$15)
       RETURNING id, created_at`,
      [user.company_id, reportKey, resolved.type, JSON.stringify(req.scope), resolved.siteIds,
       resolved.personId || null, resolved.serviceId || null, resolved.regionId || null,
       start, end, JSON.stringify(data), narrative, JSON.stringify(data.organisation), evidence_hash, user.user_id]
    )).rows[0];

    return { id: row.id, report_key: reportKey, title: def.title, scope_label: resolved.label,
             data, narrative, evidence_hash, status: 'DRAFT', created_at: row.created_at };
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
    const r = (await query(`SELECT * FROM report_snapshots WHERE id=$1 AND company_id=$2`, [id, companyId])).rows[0];
    if (!r) throw new Error('Report not found.');
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
