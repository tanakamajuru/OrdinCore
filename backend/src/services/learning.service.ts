import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export type LearningState = 'IDENTIFIED' | 'NONE_IDENTIFIED' | 'NOT_YET_ASSESSED';
export type LearningProgress = 'RECORDED' | 'CHANGE_IMPLEMENTED' | 'IMPROVEMENT_VERIFIED';
export type LearningSource = 'EFFECTIVENESS' | 'ESCALATION_CLOSURE' | 'RISK_CLOSURE' | 'PATTERN_CLOSURE' | 'WEEKLY_REVIEW' | 'INCIDENT';

const STATES: LearningState[] = ['IDENTIFIED', 'NONE_IDENTIFIED', 'NOT_YET_ASSESSED'];
const PROGRESS: LearningProgress[] = ['RECORDED', 'CHANGE_IMPLEMENTED', 'IMPROVEMENT_VERIFIED'];
const SOURCES: LearningSource[] = ['EFFECTIVENESS', 'ESCALATION_CLOSURE', 'RISK_CLOSURE', 'PATTERN_CLOSURE', 'WEEKLY_REVIEW', 'INCIDENT'];

export interface CreateLearningInput {
  house_id?: string | null;
  source_type: LearningSource;
  source_id?: string | null;
  // The EXACT effectiveness review this lesson came from (distinct from the originating action in
  // source_id, and from linked_action_id which is any resulting improvement work).
  source_review_id?: string | null;
  // Per-attempt key: a retry of the SAME save returns the existing record instead of duplicating;
  // a distinct capture carries a new key and is never blocked.
  idempotency_key?: string | null;
  state?: LearningState;
  what_happened?: string;
  evidence_examined?: string;
  what_learnt?: string;
  change_needed?: string;
  no_learning_reason?: string;
  linked_action_id?: string | null;
  progress?: LearningProgress;
  owner_id?: string | null;
  review_date?: string | null;
  is_ai_suggested?: boolean;
  // Improvement plan (27 Oct developer review): required once a change is actually needed.
  // owner_id/review_date double as the plan's review owner/date (same fields the deferred
  // NOT_YET_ASSESSED state already uses for the same purpose: who is accountable, and when).
  success_criteria?: string;
  plan_deadline?: string | null;
}

export class LearningService {
  // Record a learning assessment linked to a governance source. Human-authored entries are stamped
  // approved by their author; AI-suggested entries are stored unapproved and never presented as
  // approved human learning (L2/L6).
  async create(company_id: string, author_id: string, input: CreateLearningInput) {
    if (!SOURCES.includes(input.source_type)) throw new Error('Invalid learning source type.');
    const state: LearningState = input.state && STATES.includes(input.state) ? input.state : 'IDENTIFIED';
    // 27 Oct developer review, P1 bypass: progress accepted a client-supplied value, so a caller
    // could create a record already at CHANGE_IMPLEMENTED or IMPROVEMENT_VERIFIED with none of
    // the evidence recordImplementation()/verifyImprovement() require. Ordinary creation is
    // always forced to RECORDED; later transitions go through the gated methods only.
    const progress: LearningProgress = 'RECORDED';
    const isAi = !!input.is_ai_suggested;

    // Honest states: do not force staff to invent lessons. Each state has its own required field.
    if (state === 'IDENTIFIED' && !String(input.what_learnt || '').trim()) {
      throw new Error('Record what was learnt for an identified lesson.');
    }
    if (state === 'NONE_IDENTIFIED' && !String(input.no_learning_reason || '').trim()) {
      throw new Error('Give a brief reason when no learning was identified.');
    }
    if (state === 'NOT_YET_ASSESSED' && (!input.review_date || !input.owner_id)) {
      // Deferred assessments need accountable ownership AND a review date — both, so a deferred
      // lesson cannot drift without a named owner answerable for it.
      throw new Error('A not-yet-assessed learning review needs an accountable owner and a review date.');
    }
    // 27 Oct developer review ("Improvement plan... Require this when change is needed"): a
    // change_needed that names a real plan is not optional free text — it needs an accountable
    // owner, a review date and stated success criteria, the same as a deferred assessment does.
    const hasChangePlan = state === 'IDENTIFIED' && !!String(input.change_needed || '').trim();
    if (hasChangePlan && (!input.owner_id || !input.review_date || !String(input.success_criteria || '').trim())) {
      throw new Error('An improvement plan needs an accountable owner, a review date and stated success criteria.');
    }

    // When the lesson cites an exact effectiveness review, that review must genuinely belong to the
    // originating action and this provider (reject cross-provider / mismatched links).
    if (input.source_review_id) {
      const rev = await query(
        `SELECT action_id FROM action_effectiveness_reviews WHERE id = $1 AND company_id = $2`,
        [input.source_review_id, company_id],
      );
      if (!rev.rows[0]) throw new Error('The cited effectiveness review was not found for this provider.');
      if (input.source_id && String(rev.rows[0].action_id) !== String(input.source_id)) {
        throw new Error('The cited effectiveness review does not belong to the originating action.');
      }
    }

    // Idempotent retry: a repeated save with the same key returns the record already written rather
    // than inserting a duplicate. A different capture carries a different key and proceeds normally.
    if (input.idempotency_key) {
      const existing = await query(
        `SELECT * FROM learning_records WHERE company_id = $1 AND idempotency_key = $2`,
        [company_id, input.idempotency_key],
      );
      if (existing.rows[0]) return existing.rows[0];
    }

    const id = uuidv4();
    const res = await query(
      `INSERT INTO learning_records
        (id, company_id, house_id, source_type, source_id, state, what_happened, evidence_examined,
         what_learnt, change_needed, no_learning_reason, linked_action_id, progress, owner_id, review_date,
         is_ai_suggested, approved_by, approved_at, author_id, source_review_id, idempotency_key,
         success_criteria, plan_deadline)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23)
       ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
       RETURNING *`,
      [id, company_id, input.house_id ?? null, input.source_type, input.source_id ?? null, state,
       input.what_happened?.trim() || null, input.evidence_examined?.trim() || null,
       input.what_learnt?.trim() || null, input.change_needed?.trim() || null, input.no_learning_reason?.trim() || null,
       input.linked_action_id ?? null, progress, input.owner_id ?? null, input.review_date ?? null,
       isAi, isAi ? null : author_id, isAi ? null : new Date(), author_id, input.source_review_id ?? null,
       input.idempotency_key ?? null,
       hasChangePlan ? (input.success_criteria || '').trim() || null : null,
       hasChangePlan ? (input.plan_deadline || null) : null],
    );
    return res.rows[0];
  }

  // Approve an AI-suggested learning entry (promotes it to approved human learning).
  async approve(id: string, company_id: string, approver_id: string) {
    const res = await query(
      `UPDATE learning_records SET approved_by = $3, approved_at = NOW(), is_ai_suggested = false, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, approver_id],
    );
    if (!res.rows[0]) throw new Error('Learning record not found.');
    return res.rows[0];
  }

  // Record implementation: the change itself, not just the stage label. Requires evidence of what
  // was actually done, so "Change implemented" can never be set with nothing behind it.
  async recordImplementation(id: string, company_id: string, actor_id: string, evidence: string) {
    if (!String(evidence || '').trim()) throw new Error('Describe the change that was implemented.');
    const cur = (await query(`SELECT progress FROM learning_records WHERE id = $1 AND company_id = $2`, [id, company_id])).rows[0];
    if (!cur) throw new Error('Learning record not found.');
    if (cur.progress === 'IMPROVEMENT_VERIFIED') throw new Error('This learning has already been verified as implemented.');
    const res = await query(
      `UPDATE learning_records
          SET progress = 'CHANGE_IMPLEMENTED', implementation_evidence = $3,
              implemented_at = NOW(), implemented_by = $4, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, evidence.trim(), actor_id],
    );
    return res.rows[0];
  }

  // Verify improvement: a formal review of whether the implemented change actually worked.
  //
  // 27 Oct developer review, P1 "Correct false verification": this previously wrote
  // progress = IMPROVEMENT_VERIFIED for EVERY outcome -- a "Partly Effective"/"Not Effective"/
  // "Too Early"/"Insufficient Evidence" verdict showed on screen as a fully green "Improvement
  // verified" pill, and the record left the CHANGE_IMPLEMENTED queue even though nothing was
  // actually confirmed. Only "Effective" now advances progress; every other outcome keeps the
  // record at CHANGE_IMPLEMENTED (still awaiting a genuine confirmation) and requires a review
  // date (owner instruction, 27 Oct) so follow-through surfaces in guided work: Waiting until
  // that date, then Decisions Due on the day. Each attempt is appended to verification_history
  // rather than overwriting the last one, so an inconclusive review is never the only trace of
  // what was actually found.
  async verifyImprovement(
    id: string, company_id: string, actor_id: string,
    outcome: 'Effective' | 'Partly Effective' | 'Not Effective' | 'Too Early' | 'Insufficient Evidence',
    evidence: string,
    reviewDueAt?: string | null,
  ) {
    const OUTCOMES = ['Effective', 'Partly Effective', 'Not Effective', 'Too Early', 'Insufficient Evidence'];
    if (!OUTCOMES.includes(outcome)) throw new Error('Invalid verification outcome.');
    if (!String(evidence || '').trim()) throw new Error('Give the evidence behind this verification.');
    if (outcome !== 'Effective' && !reviewDueAt) {
      throw new Error('This outcome is not Effective — give a review date for the follow-up.');
    }
    const cur = (await query(`SELECT progress FROM learning_records WHERE id = $1 AND company_id = $2`, [id, company_id])).rows[0];
    if (!cur) throw new Error('Learning record not found.');
    if (cur.progress !== 'CHANGE_IMPLEMENTED' && cur.progress !== 'IMPROVEMENT_VERIFIED') {
      throw new Error('Record the implementation before verifying its effect.');
    }
    const nextProgress = outcome === 'Effective' ? 'IMPROVEMENT_VERIFIED' : 'CHANGE_IMPLEMENTED';
    const res = await query(
      `UPDATE learning_records
          SET progress = $3, verification_outcome = $4, verification_evidence = $5,
              verified_at = NOW(), verified_by = $6, updated_at = NOW(),
              verification_review_due_at = $7,
              verification_history = verification_history || jsonb_build_object(
                'outcome', $4::text, 'evidence', $5::text, 'reviewed_by', $6::uuid,
                'reviewed_at', NOW(), 'review_due_at', $7::date
              )
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, nextProgress, outcome, evidence.trim(), actor_id, outcome === 'Effective' ? null : reviewDueAt],
    );
    return res.rows[0];
  }

  // "Learning already recorded" — short-circuits a duplicate capture (e.g. the same lesson surfaced
  // from two sources) by linking it to the existing record rather than inventing a second lesson.
  async markDuplicate(id: string, company_id: string, duplicate_of_id: string) {
    if (id === duplicate_of_id) throw new Error('A learning cannot duplicate itself.');
    const original = (await query(`SELECT id FROM learning_records WHERE id = $1 AND company_id = $2`, [duplicate_of_id, company_id])).rows[0];
    if (!original) throw new Error('The learning record it duplicates was not found.');
    const res = await query(
      `UPDATE learning_records SET duplicate_of_id = $3, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, duplicate_of_id],
    );
    if (!res.rows[0]) throw new Error('Learning record not found.');
    return res.rows[0];
  }

  // Complete a deferred ("Not yet assessed") learning when its review date arrives: resolve it to an
  // identified lesson or an explicit "no learning". Only a NOT_YET_ASSESSED record can be assessed;
  // the original deferral (owner + due date) is preserved as history on the row.
  async assess(id: string, company_id: string, actor_id: string, input: { state?: LearningState; what_happened?: string; what_learnt?: string; change_needed?: string; no_learning_reason?: string }) {
    const cur = (await query(`SELECT state FROM learning_records WHERE id = $1 AND company_id = $2`, [id, company_id])).rows[0];
    if (!cur) throw new Error('Learning record not found.');
    if (cur.state !== 'NOT_YET_ASSESSED') throw new Error('This learning has already been assessed.');
    const next: LearningState = input.state === 'NONE_IDENTIFIED' ? 'NONE_IDENTIFIED' : 'IDENTIFIED';
    if (next === 'IDENTIFIED' && !String(input.what_learnt || '').trim()) throw new Error('Record what was learnt.');
    if (next === 'NONE_IDENTIFIED' && !String(input.no_learning_reason || '').trim()) throw new Error('Give a brief reason why no learning was identified.');
    const res = await query(
      `UPDATE learning_records
          SET state = $3,
              what_happened = COALESCE($4, what_happened),
              what_learnt = $5,
              change_needed = $6,
              no_learning_reason = $7,
              approved_by = $8, approved_at = NOW(), is_ai_suggested = false, updated_at = NOW()
        WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, next,
       input.what_happened?.trim() || null,
       next === 'IDENTIFIED' ? String(input.what_learnt).trim() : null,
       next === 'IDENTIFIED' ? (input.change_needed?.trim() || null) : null,
       next === 'NONE_IDENTIFIED' ? String(input.no_learning_reason).trim() : null,
       actor_id],
    );
    return res.rows[0];
  }

  // Learning register: recent records across the company (optionally scoped to houses / filtered by
  // state or progress), with author, linked improvement action and scope — for the follow-through view.
  async list(company_id: string, opts: { houseIds?: string[] | null; state?: string; progress?: string; limit?: number; startDate?: string; endDate?: string } = {}) {
    const params: any[] = [company_id];
    let where = 'lr.company_id = $1';
    if (opts.houseIds && opts.houseIds.length) { params.push(opts.houseIds); where += ` AND (lr.house_id = ANY($${params.length}::uuid[]) OR lr.house_id IS NULL)`; }
    if (opts.state) { params.push(opts.state); where += ` AND lr.state = $${params.length}`; }
    if (opts.progress) { params.push(opts.progress); where += ` AND lr.progress = $${params.length}`; }
    // 27 Oct developer review ("Finish the learning PDF" — date-basis/range): date basis is
    // created_at (when the lesson was recorded), stated explicitly by the caller.
    if (opts.startDate) { params.push(opts.startDate); where += ` AND lr.created_at::date >= $${params.length}`; }
    if (opts.endDate) { params.push(opts.endDate); where += ` AND lr.created_at::date <= $${params.length}`; }
    // 27 Oct developer review: the summary export was hard-capped at 300 with no pagination, so a
    // larger provider's export silently truncated. No cap for an explicit opts.limit of 0 ("all").
    const rawLimit = opts.limit === 0 ? 100000 : Math.max(Number(opts.limit) || 100, 1);
    params.push(Math.min(rawLimit, 100000));
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              NULLIF(TRIM(COALESCE(iu.first_name,'') || ' ' || COALESCE(iu.last_name,'')),'') AS implemented_by_name,
              NULLIF(TRIM(COALESCE(vu.first_name,'') || ' ' || COALESCE(vu.last_name,'')),'') AS verified_by_name,
              h.name AS house_name,
              ra.title AS linked_action_title, ra.status::text AS linked_action_status,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence,
              -- Pattern-closure learnings point at a cluster, not an action — surface its label
              -- so the reviewer still has context for what the learning is about.
              COALESCE(sc.cluster_label, (sc.risk_domain)::text) AS source_pattern_label,
              -- 29 Oct 2026 live bug report ("the learning section ... not pulling complete
              -- correct info"): ESCALATION_CLOSURE and RISK_CLOSURE sources had no join at all, so
              -- opening a learning record from either source showed no "From review/pattern"
              -- context whatsoever -- the exact gap already fixed for frozen reporting earlier in
              -- this revision. Added here for the live review screen.
              esc.reason AS source_escalation_reason,
              sr.strategic_theme AS source_risk_title,
              -- 29 Oct 2026 live bug report ("we need the whole bundle ... effectiveness maybe
              -- give us a link to the whole escalation history"): an EFFECTIVENESS source action
              -- can itself carry its own escalation_id/risk_id (the governance chain the action
              -- was actually raised against) — entirely separate from source_escalation_reason
              -- above (which is only for an ESCALATION_CLOSURE-sourced learning). Neither the
              -- screen nor the PDF ever followed that chain; a learning whose action resolved a
              -- real escalation showed only the bare action title, with no visibility of what
              -- happened in the escalation itself (reason, response, closure evidence).
              sa_esc.reason AS action_escalation_reason, sa_esc.status AS action_escalation_status,
              sa_esc.lifecycle_status::text AS action_escalation_lifecycle_status,
              sa_esc.created_at AS action_escalation_created_at, sa_esc.due_by AS action_escalation_due_by,
              sa_esc.closed_at AS action_escalation_closed_at,
              COALESCE(sa_esc.closure_evidence, sa_esc.resolution_notes) AS action_escalation_closure_evidence,
              NULLIF(TRIM(COALESCE(sa_esc_to.first_name,'') || ' ' || COALESCE(sa_esc_to.last_name,'')),'') AS action_escalation_to_name,
              sa_risk.strategic_theme AS action_risk_title, sa_risk.status::text AS action_risk_status,
              sa_risk.severity::text AS action_risk_severity
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN users iu ON iu.id = lr.implemented_by
         LEFT JOIN users vu ON vu.id = lr.verified_by
         LEFT JOIN houses h ON h.id = lr.house_id
         LEFT JOIN risk_actions ra ON ra.id = lr.linked_action_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN signal_clusters sc ON sc.id = lr.source_id AND lr.source_type = 'PATTERN_CLOSURE'
         LEFT JOIN escalations esc ON esc.id = lr.source_id AND lr.source_type = 'ESCALATION_CLOSURE'
         LEFT JOIN risks sr ON sr.id = lr.source_id AND lr.source_type = 'RISK_CLOSURE'
         LEFT JOIN escalations sa_esc ON sa_esc.id = sa.escalation_id
         LEFT JOIN users sa_esc_to ON sa_esc_to.id = sa_esc.escalated_to
         LEFT JOIN risks sa_risk ON sa_risk.id = sa.risk_id
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
        WHERE ${where}
        ORDER BY lr.created_at DESC
        LIMIT $${params.length}`,
      params,
    )).rows;
  }

  // Single record detail for the individual-record PDF export — same joined shape as list(),
  // scoped by id so the export can never be used to reach another tenant's record.
  async findById(id: string, company_id: string) {
    const res = await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              NULLIF(TRIM(COALESCE(ap.first_name,'') || ' ' || COALESCE(ap.last_name,'')),'') AS approved_by_name,
              NULLIF(TRIM(COALESCE(iu.first_name,'') || ' ' || COALESCE(iu.last_name,'')),'') AS implemented_by_name,
              NULLIF(TRIM(COALESCE(vu.first_name,'') || ' ' || COALESCE(vu.last_name,'')),'') AS verified_by_name,
              h.name AS house_name,
              ra.title AS linked_action_title, ra.status::text AS linked_action_status,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence,
              COALESCE(sc.cluster_label, (sc.risk_domain)::text) AS source_pattern_label,
              esc.reason AS source_escalation_reason,
              sr.strategic_theme AS source_risk_title,
              -- 29 Oct 2026 live bug report: the full escalation/risk chain behind the
              -- EFFECTIVENESS source action itself — see list() for the detailed rationale.
              sa_esc.reason AS action_escalation_reason, sa_esc.status AS action_escalation_status,
              sa_esc.lifecycle_status::text AS action_escalation_lifecycle_status,
              sa_esc.created_at AS action_escalation_created_at, sa_esc.due_by AS action_escalation_due_by,
              sa_esc.closed_at AS action_escalation_closed_at,
              COALESCE(sa_esc.closure_evidence, sa_esc.resolution_notes) AS action_escalation_closure_evidence,
              NULLIF(TRIM(COALESCE(sa_esc_to.first_name,'') || ' ' || COALESCE(sa_esc_to.last_name,'')),'') AS action_escalation_to_name,
              sa_risk.strategic_theme AS action_risk_title, sa_risk.status::text AS action_risk_status,
              sa_risk.severity::text AS action_risk_severity
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN users ap ON ap.id = lr.approved_by
         LEFT JOIN users iu ON iu.id = lr.implemented_by
         LEFT JOIN users vu ON vu.id = lr.verified_by
         LEFT JOIN houses h ON h.id = lr.house_id
         LEFT JOIN risk_actions ra ON ra.id = lr.linked_action_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN signal_clusters sc ON sc.id = lr.source_id AND lr.source_type = 'PATTERN_CLOSURE'
         LEFT JOIN escalations esc ON esc.id = lr.source_id AND lr.source_type = 'ESCALATION_CLOSURE'
         LEFT JOIN risks sr ON sr.id = lr.source_id AND lr.source_type = 'RISK_CLOSURE'
         LEFT JOIN escalations sa_esc ON sa_esc.id = sa.escalation_id
         LEFT JOIN users sa_esc_to ON sa_esc_to.id = sa_esc.escalated_to
         LEFT JOIN risks sa_risk ON sa_risk.id = sa.risk_id
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
        WHERE lr.id = $1 AND lr.company_id = $2`,
      [id, company_id],
    );
    if (!res.rows[0]) throw new Error('Learning record not found.');
    return res.rows[0];
  }

  async listBySource(company_id: string, source_type: LearningSource, source_id: string) {
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence,
              COALESCE(sc.cluster_label, (sc.risk_domain)::text) AS source_pattern_label,
              esc.reason AS source_escalation_reason,
              sr.strategic_theme AS source_risk_title
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN signal_clusters sc ON sc.id = lr.source_id AND lr.source_type = 'PATTERN_CLOSURE'
         LEFT JOIN escalations esc ON esc.id = lr.source_id AND lr.source_type = 'ESCALATION_CLOSURE'
         LEFT JOIN risks sr ON sr.id = lr.source_id AND lr.source_type = 'RISK_CLOSURE'
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
        WHERE lr.company_id = $1 AND lr.source_type = $2 AND lr.source_id = $3
        ORDER BY lr.created_at DESC`,
      [company_id, source_type, source_id],
    )).rows;
  }

  // Learning recorded in a given week for a house (or org-wide), for weekly governance reporting (L6).
  async listForWeek(company_id: string, house_id: string, weekEnding: string) {
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              ra.title AS linked_action_title, ra.status::text AS linked_action_status,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN risk_actions ra ON ra.id = lr.linked_action_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
        WHERE lr.company_id = $1 AND (lr.house_id = $2 OR lr.house_id IS NULL)
          AND lr.created_at::date BETWEEN ($3::date - INTERVAL '6 days') AND $3::date
        ORDER BY lr.created_at DESC`,
      [company_id, house_id, weekEnding],
    )).rows;
  }
}

export const learningService = new LearningService();
