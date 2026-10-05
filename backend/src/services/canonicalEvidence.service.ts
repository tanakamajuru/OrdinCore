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


  async summary(companyId:string, houseId?:string) {
    const params:any[]=[companyId];
    let house='';
    if (houseId) { params.push(houseId); house=' AND house_id=$2'; }
    // Action/effectiveness evidence is an action id; its natural, role-agnostic home is the owning
    // risk (visible to every oversight role), so we resolve risk_id here. Screens like /my-actions
    // are person-scoped and show nothing to a Director/RI, which is why opening a count led nowhere.
    // Enrich every evidence row with a human title + its house, from the SAME canonical state views
    // the count is built from — so the list a card opens is literally the count's own population
    // (one engine: count === list), each row carrying a meaningful label instead of a raw UUID.
    const rows=(await query(
      `SELECT m.count_type, m.evidence_id, m.house_id, m.due_at,
              ra.risk_id AS action_risk_id,
              h.name AS house_name,
              CASE m.count_type
                WHEN 'RISK_REVIEW'          THEN rk.title
                WHEN 'ACTION_OPEN'          THEN COALESCE(NULLIF(BTRIM(ra.title),''), ra.description)
                WHEN 'EFFECTIVENESS_REVIEW' THEN COALESCE(NULLIF(BTRIM(ra.title),''), ra.description)
                WHEN 'ESCALATION_OPEN'      THEN es.reason
                WHEN 'PATTERN_REVIEW'       THEN pc.cluster_label
                ELSE NULL
              END AS title
         FROM canonical_material_count_v m
         LEFT JOIN canonical_action_state_v ra
           ON ra.company_id = m.company_id AND ra.id::text = m.evidence_id
          AND m.count_type IN ('ACTION_OPEN','EFFECTIVENESS_REVIEW')
         LEFT JOIN canonical_risk_state_v rk
           ON rk.company_id = m.company_id AND rk.id::text = m.evidence_id AND m.count_type='RISK_REVIEW'
         LEFT JOIN canonical_escalation_state_v es
           ON es.company_id = m.company_id AND es.id::text = m.evidence_id AND m.count_type='ESCALATION_OPEN'
         LEFT JOIN canonical_pattern_state_v pc
           ON pc.company_id = m.company_id AND pc.id::text = m.evidence_id AND m.count_type='PATTERN_REVIEW'
         LEFT JOIN houses h ON h.id = m.house_id
        WHERE m.company_id=$1${house}
        ORDER BY m.count_type, m.due_at NULLS LAST, m.evidence_id`, params)).rows;

    // The exact working destination for one evidence record, for any role.
    const routeFor=(type:string,r:any):string=>{
      const id=r.evidence_id;
      switch(type){
        case 'RISK_REVIEW': return `/risk-register/${id}?review=1`;
        case 'ACTION_OPEN': return r.action_risk_id ? `/risk-register/${r.action_risk_id}?section=actions&focus=${id}` : `/my-actions?focus=${id}`;
        case 'EFFECTIVENESS_REVIEW': return r.action_risk_id ? `/risk-register/${r.action_risk_id}?section=effectiveness&focus=${id}` : `/effectiveness?focus=${id}`;
        case 'ESCALATION_OPEN': return `/escalation-log?focus=${id}`;
        case 'PATTERN_REVIEW': return `/systemic-patterns?clusterId=${id}`;
        default: return '#';
      }
    };

    const types=['RISK_REVIEW','ACTION_OPEN','EFFECTIVENESS_REVIEW','ESCALATION_OPEN','PATTERN_REVIEW'];
    const groups:any={};
    for (const type of types) {
      const evidence=rows.filter((r:any)=>r.count_type===type).map((r:any)=>({...r, route:routeFor(type,r)}));
      groups[type]={
        count:evidence.length,
        evidence_ids:evidence.map((r:any)=>r.evidence_id),
        evidence
      };
    }
    return {
      as_of:new Date().toISOString(),
      scope:{company_id:companyId,house_id:houseId||null},
      source:'canonical_material_count_v',
      groups
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
