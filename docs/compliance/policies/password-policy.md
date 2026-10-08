# Password policy — OrdinCore

> DSPT Standards 2, 4. Owner: **[NEEDS INPUT]**. Review: annually.

## Requirements

- **Length & strength**: minimum **12 characters**; passphrases encouraged. No single-word or common
  passwords. **[CONFIRM]** the enforced minimum in the registration/reset flow and align this number.
- **Uniqueness**: the OrdinCore password must not be reused from any other system.
- **Storage**: passwords are stored **hashed with bcrypt** (salted, one-way) — never in plaintext,
  never logged (see [../security-controls.md](../security-controls.md) §2).
- **Expiry**: passwords expire after **45 days**; users are routed to set a new one on expiry.
- **Reset**: self-service "forgotten password" via a time-limited emailed link; no password is ever
  sent in plaintext.
- **Lockout / throttling**: repeated failed logins are rate-limited and slowed
  ([../../backend/src/middleware/rateLimit.middleware.ts](../../../backend/src/middleware/rateLimit.middleware.ts)).
- **MFA**: a second factor (TOTP) is required in addition to the password for Admin/Super-Admin and
  Registered-Manager-and-above, and for all users when a company enables it.

## Do not

- Share passwords, write them on stickies, or store them in code/chat/spreadsheets.
- Reuse a breached password (check against Have I Been Pwned if unsure).

## Administrators

Admin and infrastructure accounts must use a password manager, a unique strong password, and MFA at
all times. Shared admin accounts are prohibited.
