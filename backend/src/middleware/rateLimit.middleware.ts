/**
 * middleware/rateLimit.middleware.ts
 * Authentication throttling + security-event logging (security remediation P2.8–P2.10).
 * These protect the EXISTING auth routes — no second auth system is introduced. All limits
 * are windowed (temporary restriction with automatic recovery); there is no permanent lockout,
 * so an attacker cannot use them to deny service to a real user.
 */
import { rateLimit } from 'express-rate-limit';
import { slowDown } from 'express-slow-down';
import type { Request, Response } from 'express';
import logger from '../utils/logger';

/** Normalise the client IP for keying: IPv6 is collapsed to its /64 prefix so an attacker
 *  cannot trivially rotate addresses within a single allocation to bypass the limit. */
function ipKey(ip?: string): string {
  if (!ip) return 'unknown';
  return ip.includes(':') ? `${ip.split(':').slice(0, 4).join(':')}::/64` : ip;
}

/** Mask an email so a security log can be correlated without disclosing the account. */
export function maskEmail(email?: unknown): string {
  const e = String(email || '').toLowerCase();
  const at = e.indexOf('@');
  if (at <= 0) return e ? '***' : '(none)';
  return `${e.slice(0, 2)}***@${e.slice(at + 1)}`;
}

/** Structured security-event log. NEVER logs passwords, tokens or Authorization headers. */
export function logSecurityEvent(event: string, req: Request, extra: Record<string, unknown> = {}): void {
  const parts = Object.entries(extra).map(([k, v]) => `${k}=${v}`).join(' ');
  logger.info(`[security] ${event} ip=${req.ip} ${parts}`.trim());
}

// Key by client IP + submitted email, so throttling is per-account-per-origin.
const loginKey = (req: Request) =>
  `${ipKey(req.ip)}|${String(req.body?.email || '').toLowerCase()}`;

// Progressive delay: the first few attempts are free; each further attempt in the window is
// slowed, discouraging automated guessing without permanently locking a real user out.
export const loginSlowDown = slowDown({
  windowMs: 15 * 60 * 1000,
  delayAfter: 5,
  delayMs: (used) => (used - 5) * 500,
  maxDelayMs: 5000,
  keyGenerator: loginKey,
  validate: false,
});

// Hard cap on login attempts — a temporary restriction that auto-recovers when the window
// elapses. The response is generic and never reveals whether the account exists.
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: loginKey,
  validate: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent('login.rate_limited', req, { email: maskEmail(req.body?.email) });
    res.status(429).json({
      success: false,
      message: 'Too many attempts. Please wait a few minutes and try again.',
      errors: [],
    });
  },
});

// Broader per-IP limiter for other sensitive auth endpoints (refresh, password reset, register).
export const authRouteLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => ipKey(req.ip),
  validate: false,
  handler: (req: Request, res: Response) => {
    logSecurityEvent('auth.rate_limited', req, { path: req.path });
    res.status(429).json({ success: false, message: 'Too many requests. Please try again shortly.', errors: [] });
  },
});
