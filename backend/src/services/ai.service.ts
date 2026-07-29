import OpenAI from 'openai';
import logger from '../utils/logger';

// Server-side only. The API key lives in the environment (.env), never in the client, never in git.
const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
let client: OpenAI | null = null;
function getClient(): OpenAI | null {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return null;
  if (!client) client = new OpenAI({ apiKey: key });
  return client;
}

/**
 * AI text generation for governance narratives/reports. Grounding is enforced by the caller's
 * system prompt: the model must use ONLY the structured data it is given and must never invent
 * facts about residents or events — narratives are a CQC-defensible record, drafted by AI and
 * signed off by a human.
 */
export const aiService = {
  /** Is AI configured on this server? Lets endpoints degrade gracefully when no key is present. */
  available(): boolean {
    return !!process.env.OPENAI_API_KEY;
  },

  /** Plain-text completion. */
  async generate(system: string, user: string, maxTokens = 700): Promise<string> {
    const c = getClient();
    if (!c) throw new Error('AI is not configured on this server (no OPENAI_API_KEY).');
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: maxTokens,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    return (res.choices[0]?.message?.content || '').trim();
  },

  /** JSON completion — returns a parsed object with the given shape. */
  async generateJSON<T = any>(system: string, user: string, maxTokens = 800): Promise<T> {
    const c = getClient();
    if (!c) throw new Error('AI is not configured on this server (no OPENAI_API_KEY).');
    const res = await c.chat.completions.create({
      model: MODEL,
      temperature: 0.3,
      max_tokens: maxTokens,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
    });
    const text = res.choices[0]?.message?.content || '{}';
    try {
      return JSON.parse(text) as T;
    } catch (e) {
      logger.warn('AI returned non-JSON; returning raw under {text}');
      return { text } as unknown as T;
    }
  },
};
