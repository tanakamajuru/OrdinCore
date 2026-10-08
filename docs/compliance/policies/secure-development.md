# Secure development — OrdinCore

> DSPT Standard 9; aligns to the UK Government **Software Security Code of Practice** (May 2025) and
> **OWASP Top 10**. Owner: **[NEEDS INPUT]**. Review: annually.

## Secure coding (OWASP Top 10)

- **Injection**: all database access uses **parameterised queries** (`pg` placeholders) — no string
  concatenation of user input into SQL.
- **Broken access control**: every route is authenticated and gated by role + service scope + tenant
  (see [access-control-and-least-privilege.md](./access-control-and-least-privilege.md)); tenant
  isolation is test-covered (C-04).
- **Authentication failures**: bcrypt password hashing, rate limiting, password expiry, MFA for
  privileged roles (see [password-policy.md](./password-policy.md)).
- **Cryptographic failures**: TLS in transit; secrets only in env vars; MFA secrets encrypted at rest,
  recovery codes hashed.
- **Security misconfiguration**: `helmet` headers; least-privilege DB role; no debug/secret output in
  prod logs.
- **Vulnerable components**: dependency audit gate + Dependabot
  ([patching-and-vulnerability-management.md](./patching-and-vulnerability-management.md)).
- **Logging/monitoring failures**: security events and audit logs (append-only); monitoring/alerting.

## Secret handling

- No secrets in source, logs or chat; gitleaks pre-commit + CI gate
  ([../../operations/secret-management.md](../../operations/secret-management.md)).

## Code review

- Changes are reviewed before merge to `main`; reviewer checks for the above (access control, input
  handling, secret handling, error handling). CI must be green.
  **[NEEDS INPUT]** confirm the review requirement (e.g. branch protection / required review on `main`).

## Build & release integrity

- CI runs a clean install, production build, full test suite and migrations on a blank DB on every
  push ([.github/workflows/ci.yml](../../../.github/workflows/ci.yml)); a failing build cannot ship.
- Mobile builds/signing keys are held by EAS; releases are versioned.

## Mapping to the Software Security Code of Practice (v8)

| Code of Practice theme | OrdinCore control |
|---|---|
| Secure by design/default | RBAC + tenant isolation enforced in middleware by default |
| Vulnerability management | CI audit gate + Dependabot + 14-day patch SLA |
| Secure build/deploy pipeline | CI gates (build/test/migrate/secret-scan); documented deploy + rollback |
| Secrets management | env-only secrets; gitleaks |
| Logging & monitoring | audit_logs (append-only) + monitoring |
| Communication of risk | asset register + this pack shared with customers |
