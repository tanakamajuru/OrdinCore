import { query } from '../config/database';
import { trajectoryForRisk } from './trajectory.service';

export const canonicalEvidenceService = {
  async materialCount(companyId:string, countType:string, houseId?:string) {
    const params:any[]=[companyId,countType];
    let house='';
    if (houseId) { params.push(houseId); house=' AND house_id=$3'; }
    const rows=(await query(
      `SELECT evidence_id, house_id, due_at
         FROM canonical_material_count_v
        WHERE company_id=$1 AND count_type=$2${house}
        ORDER BY due_at NULLS LAST, evidence_id`, params)).rows;
    return {
      count_type: countType,
      count: rows.length,
      evidence_ids: rows.map((r:any)=>r.evidence_id),
      evidence: rows,
      calculated_at: new Date().toISOString(),
      source: 'canonical_material_count_v'
    };
  },

  async riskEvidence(companyId:string, riskId:string) {
    const risk=(await query(
      `SELECT * FROM canonical_risk_state_v WHERE company_id=$1 AND id=$2`,[companyId,riskId])).rows[0];
    if (!risk) return null;

    const signals=(await query(
      `SELECT DISTINCT cse.signal_id,cse.related_person,cse.risk_domain,cse.signal_type,cse.description,
              cse.severity,cse.entry_date,cse.created_at
         FROM canonical_signal_evidence_v cse
         JOIN risk_signal_links rsl ON rsl.pulse_entry_id=cse.signal_id AND rsl.company_id=cse.company_id
        WHERE cse.company_id=$1
          AND (rsl.risk_id=$2 OR (
            $3::uuid IS NOT NULL AND rsl.cluster_id=$3
            AND ($4::text IS NULL OR cse.related_person IS NULL OR LOWER(BTRIM(cse.related_person))=LOWER(BTRIM($4)))
          ))
        ORDER BY COALESCE(cse.entry_date,cse.created_at) DESC`,
      [companyId,riskId,risk.source_cluster_id||null,risk.linked_person||null])).rows;

    const trajectory=await trajectoryForRisk(riskId,risk.source_cluster_id).catch(()=>null);
    return {
      subject:{type:'RISK',id:riskId,title:risk.title,canonical_status:risk.canonical_status},
      as_of:new Date().toISOString(),
      evidence_scope:{
        signal_source:'canonical_signal_evidence_v',
        signal_count:signals.length,
        signal_ids:signals.map((s:any)=>s.signal_id),
        signals
      },
      derived:{
        needs_review:!!risk.needs_review,
        review_overdue:!!risk.review_overdue,
        open_actions_count:Number(risk.open_actions_count||0),
        trajectory
      },
      contracts:{
        signals:'ONLY_GOVERNANCE_PULSES',
        trajectory:'EXISTING_TRAJECTORY_SERVICE',
        ai:'NARRATION_ONLY'
      }
    };
  }
};
