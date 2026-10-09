import { createHash } from 'crypto';
import { query } from '../config/database';

export type AssistClassification = 'ALLOWED' | 'PROHIBITED' | 'UNSUPPORTED' | 'INVALID';

export interface ScreenAssistRequest {
  companyId: string;
  userId: string;
  role: string;
  screenKey: string;
  question: string;
  workflowState?: 'editable' | 'signed_read_only' | 'historical_read_only' | 'historical_unpublished_read_only' | 'post_signoff_review';
}

const ROLE_SCREEN_PREFIX: Record<string, string> = {
  TEAM_LEADER: 'team_leader.', REGISTERED_MANAGER: 'registered_manager.',
  DIRECTOR: 'director.', RESPONSIBLE_INDIVIDUAL: 'responsible_individual.',
};

export const ALLOWED_SCREENS: Record<string, Set<string>> = {
  TEAM_LEADER: new Set(['my_work','dashboard','daily_governance','signals','my_actions','weekly_review','escalations','action_tracker','help']),
  REGISTERED_MANAGER: new Set(['my_work','daily_oversight','risk_register','strategic_oversight','interventions','escalations','action_tracker','weekly_review','incidents','reports','pipeline','patterns','effectiveness']),
  DIRECTOR: new Set(['my_work','dashboard','patterns','risks','effectiveness','interventions','rollup','reconstruction','escalations','actions','trends','incidents','reports']),
  RESPONSIBLE_INDIVIDUAL: new Set(['my_work','assurance','patterns','effectiveness','interventions','risks','rollup','reconstruction','escalations','actions','incidents','trends','reports']),
};

const PROHIBITED_PATTERNS: Array<{ code: string; pattern: RegExp }> = [
  { code: 'CLINICAL_ADVICE', pattern: /\b(diagnos(?:e|is)|treat(?:ment)?|clinical advice|medication advice|prescri(?:be|ption))\b/i },
  { code: 'CASE_JUDGEMENT', pattern: /\b(should|must|would you|do i need to)\b[\s\S]{0,45}\b(dismiss|change trajectory|rate|promote|reopen)\b/i },
  { code: 'SEVERITY_JUDGEMENT', pattern: /\b(how severe|severity should|is .* (?:high|medium|low) risk|risk score)\b/i },
  { code: 'SAFEGUARDING_THRESHOLD', pattern: /\b(is this safeguarding|meets? the safeguarding threshold|should .* safeguarding referral)\b/i },
  { code: 'PERSON_INTERPRETATION', pattern: /\b(is (?:the|this) (?:person|client|resident)|what is wrong with|likely to harm|deteriorat(?:ing|ion) because)\b/i },
];

const NORMALISE = (value: string) => value.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim();
const TOKENS_TO_IGNORE = new Set(['the','a','an','is','it','this','that','how','what','why','do','does','i','my','on','in','to','of','and','for','screen']);

function score(question: string, row: any): number {
  const normal = NORMALISE(question);
  let points = 0;
  if (row.topic === 'purpose' && /^(what is|explain|describe).*(screen|page)|what does.*show/.test(normal)) points += 5;
  if (row.topic === 'role' && /\b(role|responsib|director do|purpose here)\b/.test(normal)) points += 5;
  if (row.topic === 'use' && /\b(how|use|start|review|complete)\b/.test(normal)) points += 4;
  if (row.topic === 'use' && /\bhow (?:do|can) i\b|\bhow to\b/.test(normal)) points += 8;
  if (row.topic === 'controls' && /\b(control|button|status|card|heat map|trajectory|close|open|download)\b/.test(normal)) points += 4;
  if (row.topic === 'controls' && /\b(monitor|create action|escalate|close|reopen)\b/.test(normal) && /\b(what|mean|meaning|should|does)\b/.test(normal)) points += 6;
  if (row.topic === 'next' && /\b(next|after|happen|where.*go)\b/.test(normal)) points += 5;
  const wanted = new Set(normal.split(' ').filter((t) => t.length > 2 && !TOKENS_TO_IGNORE.has(t)));
  const content = [...(row.example_questions || []), row.topic, row.title, row.answer,
    ...(Array.isArray(row.steps) ? row.steps : [])].map(NORMALISE).join(' ');
  wanted.forEach((token) => { if (content.includes(token)) points += 2; });
  if (NORMALISE(question).includes(NORMALISE(row.topic))) points += 3;
  return points;
}

async function audit(input: ScreenAssistRequest, classification: AssistClassification, code: string, guidance?: any) {
  const hash = createHash('sha256').update(input.question.trim()).digest('hex');
  await query(
    `INSERT INTO screen_assist_audit_events
       (company_id,user_id,active_role,screen_key,question_hash,classification,guidance_id,source_version,response_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [input.companyId, input.userId, input.role, input.screenKey, hash, classification,
     guidance?.id || null, guidance?.source_version || null, code]
  );
}

export const screenAssistService = {
  async answer(input: ScreenAssistRequest) {
    const role = String(input.role || '').toUpperCase().replace(/-/g, '_');
    const screenKey = String(input.screenKey || '').trim();
    const questionText = String(input.question || '').trim();

    const prefix = ROLE_SCREEN_PREFIX[role];
    const screenName = prefix && screenKey.startsWith(prefix) ? screenKey.slice(prefix.length) : '';
    if (!prefix || !ALLOWED_SCREENS[role]?.has(screenName)) {
      await audit(input, 'INVALID', 'ROLE_OR_SCREEN_NOT_ALLOWED');
      return { classification: 'INVALID', code: 'ROLE_OR_SCREEN_NOT_ALLOWED', answer: 'Screen Assist is not available for this role or screen.', source: null };
    }
    if (questionText.length < 3 || questionText.length > 500) {
      await audit(input, 'INVALID', 'QUESTION_LENGTH');
      return { classification: 'INVALID', code: 'QUESTION_LENGTH', answer: 'Ask a brief question about the current screen or one of its controls.', source: null };
    }

    const prohibited = PROHIBITED_PATTERNS.find((rule) => rule.pattern.test(questionText));
    if (prohibited) {
      await audit(input, 'PROHIBITED', prohibited.code);
      return {
        classification: 'PROHIBITED', code: prohibited.code,
        answer: 'I cannot interpret a person’s condition, assess clinical risk, determine a safeguarding threshold or recommend which governance decision you should make. I can explain the information displayed, the permitted controls and what happens after each option.',
        source: { name: 'Screen Assist Safety Policy', version: '1.0.0' },
      };
    }

    const needsWorkflowState = screenKey === 'registered_manager.daily_oversight';
    const workflowStates = new Set(['editable','signed_read_only','historical_read_only','historical_unpublished_read_only','post_signoff_review']);
    if (needsWorkflowState && !workflowStates.has(String(input.workflowState || ''))) {
      await audit(input, 'UNSUPPORTED', 'WORKFLOW_CONTEXT_REQUIRED');
      return {
        classification: 'UNSUPPORTED', code: 'WORKFLOW_CONTEXT_REQUIRED',
        answer: 'Is this an editable review, an already signed review, or a historical date?',
        source: null,
      };
    }

    const rows = (await query(
      `WITH eligible AS (
         SELECT id,screen_key,topic,title,answer,steps,example_questions,source_name,source_version
           FROM screen_assist_guidance
          WHERE screen_key=$1 AND published=TRUE AND retired_at IS NULL
            AND approved_by IS NOT NULL AND approved_at IS NOT NULL
            AND effective_from IS NOT NULL AND effective_from <= NOW()
            AND $2 = ANY(target_roles)
       ), latest AS (
         SELECT source_version FROM eligible
          ORDER BY string_to_array(source_version, '.')::int[] DESC LIMIT 1
       )
       SELECT * FROM eligible WHERE source_version=(SELECT source_version FROM latest)`,
      [screenKey, role]
    )).rows;

    const ranked = rows.map((row) => ({ row, score: score(questionText, row) }))
      .sort((a, b) => b.score - a.score);
    const selected = ranked[0]?.score > 0 ? ranked[0].row : null;
    if (!selected) {
      await audit(input, 'UNSUPPORTED', 'NO_APPROVED_GUIDANCE');
      return {
        classification: 'UNSUPPORTED', code: 'NO_APPROVED_GUIDANCE',
        answer: 'Which field or button are you asking about? I do not have approved guidance for that part of this screen, so I will not guess.',
        source: null,
      };
    }

    await audit(input, 'ALLOWED', 'APPROVED_GUIDANCE', selected);
    let answer = selected.answer;
    let steps = selected.steps || [];
    if (screenKey === 'registered_manager.daily_oversight'
      && ['use','next'].includes(selected.topic)
      && input.workflowState === 'historical_unpublished_read_only') {
      answer = 'No signed record exists for this historical date. Historical dates cannot be backdated or overwritten. Select today’s date to record current work.';
      steps = ['Confirm that no signed record is available for this date.', 'Use the service and date selectors to view another record.', 'Select today’s date to record current governance work.'];
    } else if (screenKey === 'registered_manager.daily_oversight'
      && ['use','next'].includes(selected.topic)
      && input.workflowState === 'historical_read_only') {
      answer = 'This is a historical date and is read-only. You can review the recorded Team Brief and decisions, but you cannot change or sign this date. Select today’s date to record current work.';
      steps = ['Review the signed Team Brief and recorded decisions for this date.', 'Use the service and date selectors to view another record.', 'Select today’s date to record current governance work.'];
    } else if (screenKey === 'registered_manager.daily_oversight'
      && ['use','next'].includes(selected.topic)
      && input.workflowState === 'signed_read_only') {
      answer = 'Today’s Team Brief is already signed and remains unchanged. Use Review outstanding signals for current-day follow-up, then Add signed addendum to attest those updates. Daily sign-off does not close outstanding actions or escalations.';
      steps = ['Choose Review outstanding signals if a signal arrived or became due after sign-off.', 'Record any required decision in the open review.', 'Choose Add signed addendum to attest the dated update; the signed Team Brief is not reopened.'];
    } else if (screenKey === 'registered_manager.daily_oversight'
      && ['use','next'].includes(selected.topic)
      && input.workflowState === 'post_signoff_review') {
      answer = 'The Team Brief remains signed while the current-day follow-up review is open. Record the outstanding signal decisions, then use Add signed addendum to attest them. This does not close outstanding actions or escalations.';
      steps = ['Review the outstanding signals shown in the open decision panel.', 'Record each decision and its required fields.', 'Choose Add signed addendum to attest the updates without reopening the Team Brief.'];
    }
    if (screenKey === 'registered_manager.daily_oversight' && selected.topic === 'controls') {
      if (input.workflowState === 'historical_read_only') {
        answer += ' This historical date is read-only; select today’s date to record a decision.';
      } else if (input.workflowState === 'historical_unpublished_read_only') {
        answer += ' No signed record exists for this historical date, and it is read-only. Select today’s date to record a decision.';
      } else if (input.workflowState === 'signed_read_only') {
        answer += ' Today’s Team Brief is signed. To review current-day outstanding signals, choose Review outstanding signals; the signed brief remains unchanged.';
      } else if (input.workflowState === 'post_signoff_review') {
        answer += ' When the current-day follow-up is complete, choose Add signed addendum to attest the updates.';
      }
    }
    return {
      classification: 'ALLOWED', code: 'APPROVED_GUIDANCE', title: selected.title,
      answer, steps, topic: selected.topic,
      source: { name: selected.source_name, version: selected.source_version },
      assistant_mode: 'READ_ONLY',
    };
  },
};
