/**
 * Assistive narrative for frozen governance reports.
 * The model receives a deliberately narrow, server-calculated fact projection only.
 * It is never permitted to calculate counts from raw arrays or determine severity.
 */
import logger from '../utils/logger';

const DEFAULT_API_URL = process.env.NARRATIVE_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.NARRATIVE_MODEL || 'llama-3.3-70b-versatile';
// Prompt-policy version — bump when SYSTEM_PROMPT / fact contract changes, so every stored
// draft records which policy produced it (doctrine §24).
const PROMPT_VERSION = 'narrative-v1';
const providerOf = (url: string) => { try { return new URL(url).host; } catch { return 'unknown'; } };

export type NarrativeProvenance = {
  source: 'ai' | 'deterministic-template';
  provider: string | null;
  model: string | null;
  prompt_version: string;
  generated_at: string;
};

const SYSTEM_PROMPT =
  'You are drafting a concise governance narrative for an adult social care provider in UK English. ' +
  'Use ONLY the supplied canonical facts. Never calculate totals, infer severity, invent outcomes, ' +
  'or convert missing evidence into assurance. If a fact is absent, say it is not evidenced. ' +
  'Do not say there are no risks, escalations, actions, high/critical signals or overdue items when the supplied count is above zero. ' +
  'Partially Effective is not the same as Effective. Too Early To Assess is interim, not a final positive outcome. ' +
  'Keep the wording factual, measured and suitable for management review.';

export interface NarrativeRequest {
  reportTitle: string;
  periodLabel?: string;
  serviceName?: string;
  data: any;
}

type Facts = {
  position?: string;
  governance_confidence?: number;
  evidence_confidence?: number;
  signals?: number;
  high_critical_signals?: number;
  open_risks?: number;
  critical_risks?: number;
  open_escalations?: number;
  overdue_escalations?: number;
  open_actions?: number;
  overdue_actions?: number;
  effectiveness?: any;
  themes?: Array<{ theme: string; signals: number }>;
  material_exceptions?: any[];
};

function factsFrom(req: NarrativeRequest): Facts {
  const d = req.data || {};
  if (d.narrative_facts) return d.narrative_facts;
  const t = d.totals || {};
  return {
    position: d.organisation?.status,
    governance_confidence: d.organisation?.governance_confidence,
    evidence_confidence: d.organisation?.evidence_confidence,
    signals: t.signals || 0,
    high_critical_signals: t.high_critical || 0,
    open_risks: t.open_risks || 0,
    critical_risks: t.critical_risks || 0,
    open_escalations: t.open_escalations || 0,
    overdue_escalations: t.overdue_escalations || 0,
    open_actions: t.open_actions || 0,
    overdue_actions: t.overdue_actions || 0,
    effectiveness: t.effectiveness || {},
    themes: (d.cross_site_themes || []).map((x: any) => ({ theme: x.theme, signals: x.n })),
    material_exceptions: d.material_exceptions || [],
  };
}

function templateFallback(req: NarrativeRequest): string {
  const f = factsFrom(req);
  const scope = req.serviceName ? ` for ${req.serviceName}` : '';
  const period = req.periodLabel ? ` covering ${req.periodLabel}` : '';
  const eff = f.effectiveness || {};
  const themes = (f.themes || []).slice(0, 4).map((x) => `${x.theme} (${x.signals})`).join(', ');
  const exceptions = (f.material_exceptions || []).map((x: any) => `${x.site_name} (${x.status})`).join(', ');
  return [
    `${req.reportTitle}${scope}${period}.`,
    `The recorded governance position is ${f.position || 'not calculated'}, with governance confidence ${f.governance_confidence ?? 'not recorded'}% and evidence confidence ${f.evidence_confidence ?? 'not recorded'}%.`,
    `The canonical snapshot records ${f.signals || 0} signal(s), including ${f.high_critical_signals || 0} high/critical signal(s); ${f.open_risks || 0} open risk(s), including ${f.critical_risks || 0} critical risk(s); ${f.open_escalations || 0} open escalation(s), of which ${f.overdue_escalations || 0} are overdue; and ${f.open_actions || 0} open action(s), of which ${f.overdue_actions || 0} are overdue.`,
    themes ? `The most frequently recorded themes in scope are ${themes}. Repetition alone does not prove a systemic pattern.` : 'No recurring theme count is available from the canonical snapshot.',
    `Effectiveness reviews record ${eff.effective || 0} Effective, ${eff.partially_effective || 0} Partially Effective, ${eff.not_effective || 0} Not Effective and ${eff.too_early || 0} Too Early To Assess.`,
    exceptions ? `Material service exceptions are ${exceptions}.` : 'No material service exception is recorded.',
    'This narrative is a wording layer only; the structured evidence remains authoritative.'
  ].join('\n\n');
}

function contradictsFacts(text: string, f: Facts): boolean {
  const x = text.toLowerCase();
  if ((f.high_critical_signals || 0) > 0 && /no (high|critical|high or critical|high\/critical) (risk|risks|signal|signals)/i.test(text)) return true;
  if ((f.open_risks || 0) > 0 && /no open risks?|no risks? (?:were|are) (?:open|identified)/i.test(text)) return true;
  if ((f.open_escalations || 0) > 0 && /no open escalations?|no escalations? (?:were|are) (?:open|identified)/i.test(text)) return true;
  if ((f.open_actions || 0) > 0 && /no open actions?|no outstanding actions?/i.test(text)) return true;
  if ((f.overdue_escalations || 0) > 0 && /no overdue escalations?/i.test(text)) return true;
  if ((f.overdue_actions || 0) > 0 && /no overdue actions?/i.test(text)) return true;
  if ((f.effectiveness?.partially_effective || 0) > 0 && x.includes('all controls were effective')) return true;
  return false;
}

function instructionFor(title: string): string {
  const t = title.toLowerCase();
  if (t.includes('cross') || t.includes('pattern')) return 'Focus on what repeats across services, the recorded pattern position, and unresolved organisation-wide response. Do not treat repeated categories alone as proof of a systemic cause.';
  if (t.includes('reconstruction')) return 'Focus on chronology, what was known, recorded responses and evidence gaps. Do not infer causation or hindsight knowledge.';
  if (t.includes('assurance') || t.includes('board') || t.includes('ri')) return 'Focus on what leadership can and cannot be assured about, material exceptions, control effectiveness and required response.';
  if (t.includes('weekly') || t.includes('leadership')) return 'Focus on the week\'s material position, decisions, unresolved work, learning and what needs attention next.';
  if (t.includes('audit') || t.includes('decision')) return 'Focus on recorded decisions, rationale completeness, ownership and follow-through.';
  return 'Summarise the recorded governance position, material risks, escalations, effectiveness and limitations.';
}

export const narrativeService = {
  isEnabled(): boolean { return !!process.env.NARRATIVE_API_KEY; },

  async generate(req: NarrativeRequest): Promise<{ narrative: string; generated: boolean; model?: string; provenance: NarrativeProvenance }> {
    const apiKey = process.env.NARRATIVE_API_KEY;
    const facts = factsFrom(req);
    const templateProvenance = (): NarrativeProvenance => ({ source: 'deterministic-template', provider: null, model: null, prompt_version: PROMPT_VERSION, generated_at: new Date().toISOString() });
    if (!apiKey) return { narrative: templateFallback(req), generated: false, provenance: templateProvenance() };

    const userContent =
      `Report: ${req.reportTitle}\n` +
      (req.serviceName ? `Scope: ${req.serviceName}\n` : '') +
      (req.periodLabel ? `Period: ${req.periodLabel}\n` : '') +
      `Report-specific instruction: ${instructionFor(req.reportTitle)}\n\n` +
      `Canonical facts (authoritative; do not recalculate):\n${JSON.stringify(facts, null, 2)}\n\n` +
      'Write a concise narrative. Do not add any number, status or factual claim that is not represented above.';

    try {
      const res = await fetch(DEFAULT_API_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 900,
          temperature: 0.1,
          messages: [{ role: 'system', content: SYSTEM_PROMPT }, { role: 'user', content: userContent }],
        }),
      });
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error(`[narrative] API ${res.status}: ${errText.slice(0, 300)}`);
        return { narrative: templateFallback(req), generated: false, provenance: templateProvenance() };
      }
      const json: any = await res.json();
      const text: string = json?.choices?.[0]?.message?.content?.trim() || '';
      if (!text || contradictsFacts(text, facts)) {
        logger.error('[narrative] generated wording failed canonical fact validation; deterministic fallback used');
        return { narrative: templateFallback(req), generated: false, provenance: templateProvenance() };
      }
      return { narrative: text, generated: true, model: DEFAULT_MODEL,
        provenance: { source: 'ai', provider: providerOf(DEFAULT_API_URL), model: DEFAULT_MODEL, prompt_version: PROMPT_VERSION, generated_at: new Date().toISOString() } };
    } catch (err) {
      logger.error('[narrative] generation failed', err);
      return { narrative: templateFallback(req), generated: false, provenance: templateProvenance() };
    }
  },
};
