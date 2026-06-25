import nodemailer, { Transporter } from 'nodemailer';
import logger from './logger';

/**
 * Minimal SMTP mailer.
 *
 * Works with any free SMTP provider — configure via env:
 *   SMTP_HOST, SMTP_PORT, SMTP_SECURE, SMTP_USER, SMTP_PASS, MAIL_FROM
 *
 * Free options that work out of the box:
 *   - Brevo (Sendinblue): smtp-relay.brevo.com:587  — 300 emails/day free
 *   - Gmail:              smtp.gmail.com:587         — use an App Password
 *   - Mailtrap:           sandbox.smtp.mailtrap.io   — dev inbox only
 *
 * If SMTP is not configured the mailer degrades gracefully: it logs the message
 * (including any reset link) instead of throwing, so local/dev flows still work.
 */

let transporter: Transporter | null = null;
let initialised = false;

function getTransporter(): Transporter | null {
  if (initialised) return transporter;
  initialised = true;

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    logger.warn('[mailer] SMTP not configured (SMTP_HOST/SMTP_USER/SMTP_PASS missing) — emails will be logged, not sent.');
    transporter = null;
    return null;
  }

  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: String(process.env.SMTP_SECURE).toLowerCase() === 'true', // true for 465, false for 587 (STARTTLS)
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });

  logger.info(`[mailer] SMTP configured via ${SMTP_HOST}:${SMTP_PORT || 587}`);
  return transporter;
}

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendMail(msg: MailMessage): Promise<{ sent: boolean }> {
  const from = process.env.MAIL_FROM || 'OrdinCore <no-reply@ordincore.local>';
  const tx = getTransporter();

  if (!tx) {
    // Dev fallback: surface the content so flows are testable without SMTP.
    logger.info(`[mailer:fallback] To: ${msg.to} | Subject: ${msg.subject}\n${msg.text || msg.html}`);
    return { sent: false };
  }

  try {
    await tx.sendMail({ from, to: msg.to, subject: msg.subject, text: msg.text, html: msg.html });
    logger.info(`[mailer] Sent "${msg.subject}" to ${msg.to}`);
    return { sent: true };
  } catch (err) {
    logger.error(`[mailer] Failed to send "${msg.subject}" to ${msg.to}`, err);
    return { sent: false };
  }
}
