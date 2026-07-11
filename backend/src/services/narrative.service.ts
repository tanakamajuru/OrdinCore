/**
 * narrative.service.ts — assistive AI narrative for governance reports.
 * ----------------------------------------------------------------------------
 * Turns the structured data the system has ALREADY computed (risks, themes,
 * trajectories, escalations, effectiveness) into a first-draft prose summary for
 * a CQC inspection pack. It is assistive, not decision-making: the model writes a
 * draft the manager reads and edits; it never invents figures or decides
 * escalations. This is the "draft -> human confirms" pattern.
 *
 * Uses any OpenAI-compatible chat-completions endpoint via env config, so you can
 * use a FREE provider:
 *   - Groq (free tier, fast):   NARRATIVE_API_URL=https://api.groq.com/openai/v1/chat/completions
 *                               NARRATIVE_MODEL=llama-3.3-70b-versatile
 *   - OpenRouter free models, a local Ollama, etc. also work.
 * If NARRATIVE_API_KEY is absent it degrades gracefully to a deterministic
 * template (same as the mailer pattern), so the feature never hard-fails.
 */
import logger from '../utils/logger';

const DEFAULT_API_URL = process.env.NARRATIVE_API_URL || 'https://api.groq.com/openai/v1/chat/completions';
const DEFAULT_MODEL = process.env.NARRATIVE_MODEL || 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT =
  'You are a governance analyst writing the narrative section of a CQC inspection ' +
  'evidence pack for an adult social care provider. Write in clear, professional UK ' +
  'English, in the third person, factual and measured. STRICT RULES: use ONLY the ' +
  'figures and facts in the supplied data — never invent numbers, names, dates or ' +
  'events; do not make clinical or safeguarding decisions or recommendations beyond ' +
  'what the data states; if data is missing say so plainly. Structure: a short opening ' +
  'summary, then themes/risks, then escalations and their timeliness, then control ' +
  'effectiveness, then a brief closing on governance assurance. Keep it concise ' +
  '(roughly 250-450 words). This is a draft for a registered manager to review and edit.';

export interface NarrativeRequest {
  reportTitle: string;
  periodLabel?: string;
  serviceName?: string;
  data: unknown; // the structured report rows/summary the system already computed
}

function templateFallback(req: NarrativeRequest): string {
  const scope = req.serviceName ? ` for ${req.serviceName}` : '';
  const period = req.periodLabel ? ` covering ${req.periodLabel}` : '';
  const json = JSON.stringify(req.data ?? {}, null, 2);
  return (
    `${req.reportTitle}${scope}${period}.\n\n` +
    `Auto-drafted narrative is not available for this report. The structured governance ` +
    `data below is provided for the registered manager to review and summarise:\n\n${json}`
  );
}

export const narrativeService = {
  isEnabled(): boolean {
    return !!process.env.NARRATIVE_API_KEY;
  },

  async generate(req: NarrativeRequest): Promise<{ narrative: string; generated: boolean; model?: string }> {
    const apiKey = process.env.NARRATIVE_API_KEY;
    if (!apiKey) {
      return { narrative: templateFallback(req), generated: false };
    }

    const userContent =
      `Report: ${req.reportTitle}\n` +
      (req.serviceName ? `Service: ${req.serviceName}\n` : '') +
      (req.periodLabel ? `Period: ${req.periodLabel}\n` : '') +
      `\nStructured data (the only facts you may use):\n` +
      '```json\n' + JSON.stringify(req.data ?? {}, null, 2) + '\n```\n\n' +
      'Write the inspection narrative draft now.';

    try {
      const res = await fetch(DEFAULT_API_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 1200,
          temperature: 0.3,
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: userContent },
          ],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error(`[narrative] API ${res.status}: ${errText.slice(0, 300)}`);
        return { narrative: templateFallback(req), generated: false };
      }

      const json: any = await res.json();
      const text: string = json?.choices?.[0]?.message?.content?.trim() || '';
      if (!text) return { narrative: templateFallback(req), generated: false };
      return { narrative: text, generated: true, model: DEFAULT_MODEL };
    } catch (err) {
      logger.error('[narrative] generation failed', err);
      return { narrative: templateFallback(req), generated: false };
    }
  },
};
