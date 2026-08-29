/**
 * routes/contact.routes.ts
 * Public website enquiry endpoint (Book a Demo / Pilot). Sends the enquiry to the
 * organisation's own inbox via the app's configured SMTP — no third-party form service.
 * Public + unauthenticated, so it is rate-limited and honeypot-protected against spam.
 */
import { Router, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { sendMail } from '../utils/mailer';
import logger from '../utils/logger';

const router = Router();
const CONTACT_EMAIL = process.env.CONTACT_EMAIL || 'support@ordincore.co.uk';

const contactLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  validate: false,
  handler: (_req: Request, res: Response) =>
    res.status(429).json({ success: false, message: 'Too many submissions — please try again later.', errors: [] }),
});

const esc = (s: unknown) => String(s ?? '').replace(/[<>&]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string));
const isEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

router.post('/', contactLimit, async (req: Request, res: Response) => {
  try {
    const b = req.body || {};
    // Honeypot — a hidden field real users never fill. Silently accept + drop bot submissions.
    if (b.company_website) return res.json({ success: true, data: { received: true }, meta: {} });

    const type = b.type === 'pilot' ? 'pilot' : 'demo';
    const name = String(b.name || '').trim();
    const email = String(b.email || '').trim();
    if (!name || !isEmail(email)) {
      return res.status(400).json({ success: false, message: 'Please provide your name and a valid email.', errors: [] });
    }

    const label = type === 'pilot' ? 'Pilot Programme application' : 'Demo request';
    const fields: [string, unknown][] = ([
      ['Name', b.name], ['Email', b.email], ['Phone', b.phone], ['Organisation', b.organisation],
      ['Role', b.role], ['Services / sites', b.number_of_services_sites], ['Type of service', b.type_of_service],
      ['Preferred contact', b.preferred_contact_method], ['Message', b.message],
      ['Current governance challenge', b.current_governance_challenge],
      ['How Ordin Core can help', b.what_ordin_core_can_help_with],
      ['Consent to be contacted', b.consent_to_be_contacted],
    ] as [string, unknown][]).filter(([, v]) => v != null && String(v).trim() !== '');

    const text = `${label} — submitted via the Ordin Core website\n\n` + fields.map(([k, v]) => `${k}: ${v}`).join('\n');
    const html = `<h2 style="font-family:system-ui,sans-serif;color:#0f1b2d">${esc(label)}</h2>`
      + `<table style="font-family:system-ui,sans-serif;font-size:14px;border-collapse:collapse">`
      + fields.map(([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#667085;vertical-align:top"><b>${esc(k)}</b></td><td style="padding:4px 0;color:#0f1b2d">${esc(v).replace(/\n/g, '<br>')}</td></tr>`).join('')
      + `</table>`;

    const result = await sendMail({ to: CONTACT_EMAIL, subject: `Ordin Core — ${label} — ${name}`, text, html, replyTo: email });
    logger.info(`[contact] ${type} enquiry from ${email} (sent=${result.sent})`);
    return res.json({ success: true, data: { received: true }, meta: {} });
  } catch (err) {
    logger.error('[contact] failed to send enquiry', err);
    return res.status(500).json({ success: false, message: 'Could not send your enquiry. Please email support@ordincore.co.uk directly.', errors: [] });
  }
});

export default router;
