import { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { query } from '../config/database';
import { reviewObligationsService } from './reviewObligations.service';
import { escalationLifecycleService } from './escalationLifecycle.service';

export type ActionReviewRequirement='COMPLETION_ONLY'|'EFFECTIVENESS_REQUIRED';
export type GovernanceActionInput={
  companyId:string; createdBy:string; title:string; description?:string|null;
  assignedTo?:string|null; dueDate?:Date|string|null; houseId?:string|null; riskId?:string|null;
  governanceReviewId?:string|null; sourcePulseId?:string|null; sourceClusterId?:string|null;
  escalationId?:string|null; governanceDomain?:string|null;
  reviewRequirement:ActionReviewRequirement; intendedOutcome?:string|null;
};

const validate=(i:GovernanceActionInput)=>{
  if(!i.companyId||!i.createdBy) throw new Error('Canonical action requires company and creator.');
  if(!String(i.title||'').trim()) throw new Error('Canonical action requires a title.');
  if(!i.reviewRequirement) throw new Error('Choose whether this action is completion-only or requires effectiveness review.');
  if(i.reviewRequirement==='EFFECTIVENESS_REQUIRED' && String(i.intendedOutcome||'').trim().length<10)
    throw new Error('Effectiveness-bearing actions require an intended outcome before work starts.');
  const hasSource=!!(i.riskId||i.governanceReviewId||i.sourcePulseId||i.sourceClusterId||i.escalationId);
  if(i.reviewRequirement==='EFFECTIVENESS_REQUIRED'&&!hasSource)
    throw new Error('Effectiveness-bearing actions require canonical governance lineage.');
};

const insertSql=`INSERT INTO risk_actions
 (id,risk_id,company_id,house_id,title,description,assigned_to,due_date,created_by,status,
  governance_review_id,source_pulse_id,source_cluster_id,intended_outcome,escalation_id,
  governance_domain,review_requirement,evidence_contract_version)
 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'Open',$10,$11,$12,$13,$14,$15,$16,'action-evidence-v1')
 RETURNING *`;

export const canonicalGovernanceActionService={
  async create(input:GovernanceActionInput, client?:PoolClient){
    validate(input);
    const runner0=client?client.query.bind(client):query;
    // Idempotency (doctrine §7.5): tenant + source decision + normalised purpose + active
    // lifecycle. When the action carries a source lineage, an equivalent still-open action
    // from the SAME source must not be duplicated (e.g. a decision retried, or the same
    // signal actioned twice). Ad-hoc actions with no source are not deduped.
    const idemTitle=String(input.title||'').trim().toLowerCase();
    const hasLineage=!!(input.governanceReviewId||input.sourcePulseId||input.sourceClusterId||input.escalationId);
    if(hasLineage){
      const existing=(await runner0(
        `SELECT * FROM risk_actions
          WHERE company_id=$1
            AND LOWER(BTRIM(title))=$2
            AND completed_at IS NULL
            AND COALESCE(status,'') NOT IN ('Completed','Complete','Closed','Resolved','Cancelled')
            AND ( ($3::uuid IS NOT NULL AND governance_review_id=$3)
               OR ($4::uuid IS NOT NULL AND source_pulse_id=$4)
               OR ($5::uuid IS NOT NULL AND source_cluster_id=$5)
               OR ($6::uuid IS NOT NULL AND escalation_id=$6) )
          ORDER BY created_at LIMIT 1`,
        [input.companyId,idemTitle,input.governanceReviewId||null,input.sourcePulseId||null,input.sourceClusterId||null,input.escalationId||null]
      )).rows[0];
      if(existing) return existing;
    }
    const params=[uuidv4(),input.riskId||null,input.companyId,input.houseId||null,String(input.title).trim().slice(0,255),
      input.description||null,input.assignedTo||null,input.dueDate||null,input.createdBy,input.governanceReviewId||null,
      input.sourcePulseId||null,input.sourceClusterId||null,input.reviewRequirement==='EFFECTIVENESS_REQUIRED'?String(input.intendedOutcome).trim():null,
      input.escalationId||null,input.governanceDomain||null,input.reviewRequirement];
    const runner=client?client.query.bind(client):query;
    return (await runner(insertSql,params)).rows[0];
  },

  async complete(input:{companyId:string;actionId:string;completedBy:string;completionNote?:string|null;completionOutcome:string;completionRationale:string}){
    if(!input.completionOutcome) throw new Error('Outcome is mandatory for action completion.');
    if(String(input.completionRationale||'').trim().length<10) throw new Error('Completion rationale must be at least 10 characters.');
    const action=(await query(`SELECT * FROM risk_actions WHERE id=$1 AND company_id=$2`,[input.actionId,input.companyId])).rows[0];
    if(!action) throw new Error('Action not found.');
    if(/complete|completed|closed|resolved/i.test(String(action.status||''))||action.completed_at) throw new Error('Action is already completed.');
    if(action.review_requirement==='EFFECTIVENESS_REQUIRED' && String(action.intended_outcome||'').trim().length<10)
      throw new Error('Governance Block: this effectiveness-bearing action has no pre-existing intended outcome.');
    const evidence=String(input.completionNote||'').trim()||String(input.completionRationale).trim();
    if(evidence.length<10) throw new Error('Completion evidence is required.');
    const updated=(await query(`UPDATE risk_actions SET status='Completed',completion_note=$1,completion_outcome=$2,
      completion_rationale=$3,completion_evidence=$4,completed_at=NOW(),completed_by=$5
      WHERE id=$6 AND company_id=$7 RETURNING *`,
      [input.completionNote||null,input.completionOutcome,input.completionRationale,evidence,input.completedBy,input.actionId,input.companyId])).rows[0];
    await escalationLifecycleService.syncForAction(input.actionId,input.companyId);
    if(updated.review_requirement==='EFFECTIVENESS_REQUIRED'){
      await reviewObligationsService.open({companyId:input.companyId,type:'ACTION_EFFECTIVENESS',subjectType:'ACTION',subjectId:input.actionId,
        actionId:input.actionId,riskId:updated.risk_id||null,dueAt:updated.effectiveness_due_at||updated.completed_at||new Date(),
        ownerRole:'REGISTERED_MANAGER',reason:'Effectiveness-bearing action completed and requires an effectiveness decision.'});
    } else {
      await reviewObligationsService.complete(input.companyId,'ACTION_EFFECTIVENESS',input.actionId,input.completedBy,'Completion-only action: no effectiveness review required.');
    }
    return updated;
  },

  async remediateLegacyEvidence(input:{companyId:string;actionId:string;userId:string;evidence:string;reason:string;source:string;intendedOutcome?:string|null;reviewRequirement:ActionReviewRequirement}){
    const action=(await query(`SELECT * FROM risk_actions WHERE id=$1 AND company_id=$2`,[input.actionId,input.companyId])).rows[0];
    if(!action) throw new Error('Action not found.');
    if(action.evidence_contract_version==='action-evidence-v1') throw new Error('This is not a legacy evidence-gap action.');
    if(String(input.evidence||'').trim().length<10||String(input.reason||'').trim().length<10||String(input.source||'').trim().length<3)
      throw new Error('Historical remediation requires evidence, source and a clear reason.');
    if(input.reviewRequirement==='EFFECTIVENESS_REQUIRED'&&String(input.intendedOutcome||action.intended_outcome||'').trim().length<10)
      throw new Error('Historical effectiveness remediation requires a reconstructed intended outcome.');
    const updated=(await query(`UPDATE risk_actions SET
      completion_evidence=COALESCE(NULLIF(completion_evidence,''),$1),
      intended_outcome=CASE WHEN $2='EFFECTIVENESS_REQUIRED' THEN COALESCE(NULLIF(intended_outcome,''),NULLIF($3,'')) ELSE intended_outcome END,
      review_requirement=$2,evidence_contract_version='legacy-remediated-v1',
      evidence_remediated_at=NOW(),evidence_remediated_by=$4,evidence_remediation_reason=$5,evidence_remediation_source=$6
      WHERE id=$7 AND company_id=$8 RETURNING *`,
      [input.evidence.trim(),input.reviewRequirement,input.intendedOutcome||null,input.userId,input.reason.trim(),input.source.trim(),input.actionId,input.companyId])).rows[0];
    if(updated.review_requirement==='EFFECTIVENESS_REQUIRED'&&updated.completed_at&&!updated.effectiveness_outcome)
      await reviewObligationsService.open({companyId:input.companyId,type:'ACTION_EFFECTIVENESS',subjectType:'ACTION',subjectId:input.actionId,
        actionId:input.actionId,riskId:updated.risk_id||null,dueAt:updated.effectiveness_due_at||new Date(),ownerRole:'REGISTERED_MANAGER',
        reason:'Legacy evidence remediated; effectiveness review now requires a documented decision.'});
    return updated;
  }
};
