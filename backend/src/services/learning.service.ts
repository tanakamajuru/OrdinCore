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
}

export class LearningService {
  // Record a learning assessment linked to a governance source. Human-authored entries are stamped
  // approved by their author; AI-suggested entries are stored unapproved and never presented as
  // approved human learning (L2/L6).
  async create(company_id: string, author_id: string, input: CreateLearningInput) {
    if (!SOURCES.includes(input.source_type)) throw new Error('Invalid learning source type.');
    const state: LearningState = input.state && STATES.includes(input.state) ? input.state : 'IDENTIFIED';
    const progress: LearningProgress = input.progress && PROGRESS.includes(input.progress) ? input.progress : 'RECORDED';
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
         is_ai_suggested, approved_by, approved_at, author_id, source_review_id, idempotency_key)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (company_id, idempotency_key) WHERE idempotency_key IS NOT NULL
         DO UPDATE SET idempotency_key = EXCLUDED.idempotency_key
       RETURNING *`,
      [id, company_id, input.house_id ?? null, input.source_type, input.source_id ?? null, state,
       input.what_happened?.trim() || null, input.evidence_examined?.trim() || null,
       input.what_learnt?.trim() || null, input.change_needed?.trim() || null, input.no_learning_reason?.trim() || null,
       input.linked_action_id ?? null, progress, input.owner_id ?? null, input.review_date ?? null,
       isAi, isAi ? null : author_id, isAi ? null : new Date(), author_id, input.source_review_id ?? null,
       input.idempotency_key ?? null],
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

  // Advance the progress ladder: recording a lesson is not the same as implementing or verifying it.
  async setProgress(id: string, company_id: string, progress: LearningProgress) {
    if (!PROGRESS.includes(progress)) throw new Error('Invalid progress stage.');
    const res = await query(
      `UPDATE learning_records SET progress = $3, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, progress],
    );
    if (!res.rows[0]) throw new Error('Learning record not found.');
    return res.rows[0];
  }

  // Learning register: recent records across the company (optionally scoped to houses / filtered by
  // state or progress), with author, linked improvement action and scope — for the follow-through view.
  async list(company_id: string, opts: { houseIds?: string[] | null; state?: string; progress?: string; limit?: number } = {}) {
    const params: any[] = [company_id];
    let where = 'lr.company_id = $1';
    if (opts.houseIds && opts.houseIds.length) { params.push(opts.houseIds); where += ` AND (lr.house_id = ANY($${params.length}::uuid[]) OR lr.house_id IS NULL)`; }
    if (opts.state) { params.push(opts.state); where += ` AND lr.state = $${params.length}`; }
    if (opts.progress) { params.push(opts.progress); where += ` AND lr.progress = $${params.length}`; }
    params.push(Math.min(Math.max(Number(opts.limit) || 100, 1), 300));
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              h.name AS house_name,
              ra.title AS linked_action_title, ra.status::text AS linked_action_status,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN houses h ON h.id = lr.house_id
         LEFT JOIN risk_actions ra ON ra.id = lr.linked_action_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
         LEFT JOIN action_effectiveness_reviews aer ON aer.id = lr.source_review_id
        WHERE ${where}
        ORDER BY lr.created_at DESC
        LIMIT $${params.length}`,
      params,
    )).rows;
  }

  async listBySource(company_id: string, source_type: LearningSource, source_id: string) {
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name,
              sa.title AS source_action_title,
              aer.outcome::text AS source_review_outcome, aer.reviewed_at AS source_review_at,
              aer.evidence AS source_review_evidence
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN risk_actions sa ON sa.id = lr.source_id AND lr.source_type = 'EFFECTIVENESS'
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
