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
    if (state === 'NOT_YET_ASSESSED' && !input.review_date) {
      throw new Error('A not-yet-assessed learning review needs an owner and review date.');
    }

    const id = uuidv4();
    const res = await query(
      `INSERT INTO learning_records
        (id, company_id, house_id, source_type, source_id, state, what_happened, evidence_examined,
         what_learnt, change_needed, no_learning_reason, linked_action_id, progress, owner_id, review_date,
         is_ai_suggested, approved_by, approved_at, author_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19)
       RETURNING *`,
      [id, company_id, input.house_id ?? null, input.source_type, input.source_id ?? null, state,
       input.what_happened?.trim() || null, input.evidence_examined?.trim() || null,
       input.what_learnt?.trim() || null, input.change_needed?.trim() || null, input.no_learning_reason?.trim() || null,
       input.linked_action_id ?? null, progress, input.owner_id ?? null, input.review_date ?? null,
       isAi, isAi ? null : author_id, isAi ? null : new Date(), author_id],
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

  async listBySource(company_id: string, source_type: LearningSource, source_id: string) {
    return (await query(
      `SELECT lr.*,
              NULLIF(TRIM(COALESCE(au.first_name,'') || ' ' || COALESCE(au.last_name,'')),'') AS author_name,
              NULLIF(TRIM(COALESCE(ow.first_name,'') || ' ' || COALESCE(ow.last_name,'')),'') AS owner_name
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
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
              ra.title AS linked_action_title, ra.status::text AS linked_action_status
         FROM learning_records lr
         LEFT JOIN users au ON au.id = lr.author_id
         LEFT JOIN users ow ON ow.id = lr.owner_id
         LEFT JOIN risk_actions ra ON ra.id = lr.linked_action_id
        WHERE lr.company_id = $1 AND (lr.house_id = $2 OR lr.house_id IS NULL)
          AND lr.created_at::date BETWEEN ($3::date - INTERVAL '6 days') AND $3::date
        ORDER BY lr.created_at DESC`,
      [company_id, house_id, weekEnding],
    )).rows;
  }
}

export const learningService = new LearningService();
