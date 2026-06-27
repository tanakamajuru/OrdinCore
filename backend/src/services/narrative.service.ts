/**
 * narrative.service.ts — assistive AI narrative for governance reports.
 * ----------------------------------------------------------------------------
 * Turns the structured data the system has ALREADY computed (risks, themes,
 * trajectories, escalations, effectiveness) into a first-draft prose summary for
 * a CQC inspection pack. It is assistive, not decision-making: the model writes a
 * draft the manager reads and edits; it never invents figures or decides
 * escalations. This is the "draft -> human confirms" pattern.
 *
 * Uses the Anthropic Messages API when ANTHROPIC_API_KEY is set; otherwise it
 * degrades gracefully to a deterministic template (same as the mailer pattern),
 * so the feature never hard-fails when the key is absent.
 */
import logger from '../utils/logger';

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
const DEFAULT_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6';

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
    `An AI narrative is not configured on this server (set ANTHROPIC_API_KEY to enable ` +
    `auto-drafted prose). The structured data below is provided for the registered ` +
    `manager to summarise manually:\n\n${json}`
  );
}

export const narrativeService = {
  isEnabled(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  },

  async generate(req: NarrativeRequest): Promise<{ narrative: string; generated: boolean; model?: string }> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
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
      const res = await fetch(ANTHROPIC_URL, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: DEFAULT_MODEL,
          max_tokens: 1200,
          system: SYSTEM_PROMPT,
          messages: [{ role: 'user', content: userContent }],
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        logger.error(`[narrative] Anthropic API ${res.status}: ${errText.slice(0, 300)}`);
        return { narrative: templateFallback(req), generated: false };
      }

      const json: any = await res.json();
      const text = Array.isArray(json?.content)
        ? json.content.filter((b: any) => b?.type === 'text').map((b: any) => b.text).join('\n').trim()
        : '';
      if (!text) return { narrative: templateFallback(req), generated: false };
      return { narrative: text, generated: true, model: DEFAULT_MODEL };
    } catch (err) {
      logger.error('[narrative] generation failed', err);
      return { narrative: templateFallback(req), generated: false };
    }
  },
};
