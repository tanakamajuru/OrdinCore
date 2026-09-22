import { query } from '../config/database';
import { effectivenessReviewState, normalizeActionStatus } from '../domain/governanceVocabulary';
import { normalizeEffectiveness } from '../domain/effectiveness';

export type ControlFact = {
  id:string; title?:string|null; status?:unknown; governance_domain?:string|null;
  review_requirement?:'COMPLETION_ONLY'|'EFFECTIVENESS_REQUIRED'|null;
  effectiveness_outcome?:unknown; effectiveness?:unknown;
  effectiveness_reviewed_at?:string|Date|null; completed_at?:string|Date|null; created_at?:string|Date|null;
};
export type CanonicalControlPosition = {
  contract_version:'control-position-v1';
  total:number; completed:number; open:number; awaiting_final:number;
  current:{effective:number; partially_effective:number; not_effective:number; unreviewed:number; overall:'Effective'|'Mixed'|'Partially Effective'|'Not Effective'|'Not yet reviewed'};
  historical:{partially_or_not_effective:number};
  current_controls:Array<{domain:string;action_id:string;title?:string|null;outcome:string|null;reviewed_at:string|null}>;
};

/**
 * Canonical current control position.
 * Historical failed/partial reviews remain evidence, but a later FINAL review in the same
 * governance domain supersedes that older outcome for CURRENT closure readiness.
 * No record is deleted and the audit trail remains intact.
 */
export function deriveCanonicalControlPosition(actions:ControlFact[]):CanonicalControlPosition {
  // Only explicitly effectiveness-bearing actions are controls. Completion-only work remains
  // visible in action history but cannot become an unreviewed control or block effectiveness.
  const active=actions.filter(a=>normalizeActionStatus(a.status)!=='Cancelled'&&a.review_requirement==='EFFECTIVENESS_REQUIRED');
  const completed=active.filter(a=>normalizeActionStatus(a.status)==='Completed');
  const open=active.filter(a=>normalizeActionStatus(a.status)!=='Completed');
  const awaiting=completed.filter(a=>effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness)!=='FINAL');
  const finalised=completed.filter(a=>effectivenessReviewState(a.effectiveness_outcome ?? a.effectiveness)==='FINAL');

  const byDomain=new Map<string,ControlFact[]>();
  for(const a of completed){
    const domain=String(a.governance_domain||'GENERAL').trim()||'GENERAL';
    const arr=byDomain.get(domain)||[]; arr.push(a); byDomain.set(domain,arr);
  }
  const current_controls:Array<{domain:string;action_id:string;title?:string|null;outcome:string|null;reviewed_at:string|null}>=[];
  for(const [domain,rows] of byDomain){
    const latest=[...rows].sort((a,b)=>new Date(b.effectiveness_reviewed_at||b.completed_at||b.created_at||0).getTime()-new Date(a.effectiveness_reviewed_at||a.completed_at||a.created_at||0).getTime())[0];
    const isFinal=effectivenessReviewState(latest.effectiveness_outcome ?? latest.effectiveness)==='FINAL';
    const outcome=isFinal?normalizeEffectiveness(latest.effectiveness_outcome ?? latest.effectiveness):null;
    current_controls.push({domain,action_id:latest.id,title:latest.title,outcome:outcome==='Too Early To Assess'?null:outcome,reviewed_at:latest.effectiveness_reviewed_at?new Date(latest.effectiveness_reviewed_at).toISOString():null});
  }
  const effective=current_controls.filter(c=>c.outcome==='Effective').length;
  const partial=current_controls.filter(c=>c.outcome==='Partially Effective').length;
  const failed=current_controls.filter(c=>c.outcome==='Not Effective').length;
  const unreviewed=current_controls.filter(c=>!c.outcome).length;
  let overall:CanonicalControlPosition['current']['overall']='Not yet reviewed';
  if(failed>0) overall='Not Effective';
  else if(partial>0 && effective>0) overall='Mixed';
  else if(partial>0) overall='Partially Effective';
  else if(effective>0 && unreviewed===0) overall='Effective';
  else if(effective>0) overall='Mixed';

  const historicalBad=finalised.filter(a=>{
    const o=normalizeEffectiveness(a.effectiveness_outcome ?? a.effectiveness);
    return o==='Partially Effective'||o==='Not Effective';
  }).length;

  return {
    contract_version:'control-position-v1',total:active.length,completed:completed.length,open:open.length,awaiting_final:awaiting.length,
    current:{effective,partially_effective:partial,not_effective:failed,unreviewed,overall},
    historical:{partially_or_not_effective:historicalBad},current_controls
  };
}

export const canonicalControlPositionService={
  async forEscalation(companyId:string, escalation:any){
    const rows=(await query(`SELECT DISTINCT ra.id,ra.title,ra.status,ra.governance_domain,ra.review_requirement,
      ra.effectiveness_outcome,ra.effectiveness,ra.effectiveness_reviewed_at,ra.completed_at,ra.created_at
      FROM canonical_action_state_v ra
      WHERE ra.company_id=$1 AND (
        ra.escalation_id=$2
        OR ($3::uuid IS NOT NULL AND ra.risk_id=$3)
        OR ($4::uuid IS NOT NULL AND ra.governance_review_id=$4)
        OR ($5::uuid IS NOT NULL AND ra.source_pulse_id=$5)
        OR ($6::uuid IS NOT NULL AND ra.source_cluster_id=$6)
      )`,[companyId,escalation.id,escalation.risk_id||null,escalation.source_governance_review_id||null,escalation.source_pulse_id||null,escalation.source_cluster_id||null])).rows;
    return deriveCanonicalControlPosition(rows);
  }
};
