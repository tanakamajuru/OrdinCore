# Email / SMTP — OrdinCore

> DSPT evidence (Standard 9, secure transmission). How outbound email is sent and the TLS posture.

## Configuration

Outbound email is sent via SMTP using `nodemailer` ([backend/src/utils/mailer.ts](../../backend/src/utils/mailer.ts)).
Configured entirely through environment variables (never committed — see
[secret-management.md](./secret-management.md)):

| Variable | Meaning |
|---|---|
| `SMTP_HOST` / `SMTP_PORT` | Mail host and port (587 STARTTLS by default, 465 implicit TLS). |
| `SMTP_USER` / `SMTP_PASS` | Authentication credentials. |
| `SMTP_SECURE` | `true` for port 465 (implicit TLS); otherwise STARTTLS on 587. |
| `SMTP_TLS_REJECT_UNAUTHORIZED` | **Leave unset / `true`.** TLS certificate verification. |

If `SMTP_HOST/USER/PASS` are missing, email is logged, not sent (safe default in dev).

## TLS verification is on by default

`SMTP_TLS_REJECT_UNAUTHORIZED` defaults to **`true`**: the mail server's TLS certificate is verified,
protecting outbound mail against man-in-the-middle interception. This is the required posture.

Setting `SMTP_TLS_REJECT_UNAUTHORIZED=false` **disables** that verification. It is a **temporary
workaround only**, for when the org's own mail host presents a briefly-invalid certificate. When it is
set, the backend logs a **loud security warning on every startup** until it is removed. Do not ship
with it set.

## What needs to change on the Katapult (mail provider) side

The TLS workaround was introduced because the mail host's certificate was invalid at one point. The
permanent fix is on the provider side, not in code:

1. **Valid, trusted TLS certificate on the SMTP endpoint.** The mail host (**Katapult** /
   `[NEEDS INPUT: SMTP_HOST]`) must present a certificate that is:
   - issued by a publicly-trusted CA (e.g. via cPanel AutoSSL / Let's Encrypt), and
   - **valid for the exact `SMTP_HOST` name** OrdinCore connects to (SAN match — not just the web
     domain), and
   - **not expired** (AutoSSL renewal must be working — see [tls-cert-renewal note] in
     monitoring/runbooks).
2. **Correct submission port + encryption**: confirm 587 (STARTTLS) or 465 (implicit TLS) is open and
   presents the valid certificate.
3. Once the valid certificate is confirmed, **remove `SMTP_TLS_REJECT_UNAUTHORIZED` from the server
   environment** and restart; the startup warning should disappear and `TLS verify: on` should be
   logged.

Owner: **[NEEDS INPUT]** (who manages the Katapult/cPanel mail certificate). Target: verification on,
workaround removed.
