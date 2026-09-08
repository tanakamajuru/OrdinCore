import { createHash } from 'crypto';
import { query } from '../config/database';

export type AssistClassification = 'ALLOWED' | 'PROHIBITED' | 'UNSUPPORTED' | 'INVALID';

export interface ScreenAssistRequest {
  companyId: string;
  userId: string;
  role: string;
  screenKey: string;
  question: string;
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
  { code: 'CASE_JUDGEMENT', pattern: /\b(should|must|would you|do i need to)\b[\s\S]{0,45}\b(escalate|close|monitor|dismiss|change trajectory|rate)/i },
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
  if (row.topic === 'use' && /\b(how|use|start|review)\b/.test(normal)) points += 4;
  if (row.topic === 'controls' && /\b(control|button|status|card|heat map|trajectory|close|open|download)\b/.test(normal)) points += 4;
  if (row.topic === 'next' && /\b(next|after|happen|where.*go)\b/.test(normal)) points += 5;
  const wanted = new Set(normal.split(' ').filter((t) => t.length > 2 && !TOKENS_TO_IGNORE.has(t)));
  const examples = [...(row.example_questions || []), row.topic, row.title].map(NORMALISE).join(' ');
  wanted.forEach((token) => { if (examples.includes(token)) points += 1; });
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
        answer: 'I do not have approved guidance for that question. I will not invent how this function works. Please contact your organisation administrator or governance lead.',
        source: null,
      };
    }

    await audit(input, 'ALLOWED', 'APPROVED_GUIDANCE', selected);
    return {
      classification: 'ALLOWED', code: 'APPROVED_GUIDANCE', title: selected.title,
      answer: selected.answer, steps: selected.steps || [], topic: selected.topic,
      source: { name: selected.source_name, version: selected.source_version },
      assistant_mode: 'READ_ONLY',
    };
  },
};
