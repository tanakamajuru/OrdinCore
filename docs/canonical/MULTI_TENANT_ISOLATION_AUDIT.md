# Multi-Tenant Isolation Audit

**Status:** Phase 8 deliverable (Stabilisation Plan).
**Date:** 2026-09-18
**Build:** `main` @ 1cecd56 (post-#80)

## Scope
OrdinCore is a multi-company SaaS: every governance record is owned by a `company_id`. This audit asks one question repository-wide: **can an authenticated user of company A read or write company B's data?**

## Enforcement model (verified sound)
1. **`requireTenant` middleware** ([tenant.middleware.ts](../../backend/src/middleware/tenant.middleware.ts)) — for non-SUPER_ADMIN callers, rejects any request whose supplied `company_id` (params/query/body) differs from the token's (`403 cross-tenant access prohibited`), and rejects users with no company context.
2. **Trusted tenant derivation** — controllers take `company_id` from `req.user.company_id`, never from the client, except SUPER_ADMIN paths that are explicitly role-gated (`users.controller.ts:12/50/247`).
3. **By-id query scoping** — tenant-scoped by-id reads/writes consistently carry `AND company_id = $n` (e.g. `risk_actions`, `escalations`, `risks`, `governance_pulses`, `generated_reports`, `governance_questions`, `houses.repo`).
4. **Global-config tables are SUPER_ADMIN-write-only** — `signal_library`, `governance_domains`, `threshold_rules`, escalation SLAs are platform-global (no `company_id`) and their write routes require `SUPER_ADMIN` ([governanceConfig.routes.ts:11](../../backend/src/routes/governanceConfig.routes.ts#L11)). Tenant-owned config (`action_templates`, `review_cycles`, `immediate_detection_rules` overrides) is ADMIN-writable and company-scoped in the controller.
5. **Verify-then-write** — `immediate_detection_rules` update reads the row's `company_id`, refuses platform defaults (`company_id IS NULL → 403`) and foreign rows (`!== company_id → 403`), and the UPDATE re-scopes `AND company_id`.

## Findings

| # | File:line | Severity | Verdict |
|---|---|---|---|
| T-1 | `exports.service.ts:35` | **P2 (info leak) — FIXED (#81)** | `exportEvidencePack` read the house **name** by `id` alone. The pack body is company-scoped (empty for a foreign house), but the PDF header would leak another tenant's house name for a foreign `house_id`. Fixed: `AND company_id = $2`. |
| T-2 | `escalations.service.ts:67` | Safe (defense-in-depth note) | Reads pulse `related_person` (PII) by id without company scope, but `source_pulse_id` comes from an already company-scoped escalation object (chained-trusted) inside an internal notification helper — not a client-reachable cross-tenant path. Adding `AND company_id` would be belt-and-braces. |
| T-3 | `pulse.service.ts:49`, `weeklyReviews.service.ts:312/508`, `governanceDomains.service.ts:19` | Safe | House name/sector read by id, chained from a company-validated parent record; low sensitivity. Defense-in-depth candidates. |
| T-4 | workers (`report.worker`, `pattern.worker`, `immediateDetection`) | Safe | `house_id`/`pulse_id` come from internal job payloads derived from the DB, not client input. No user-request tenant boundary crossed. |
| T-5 | `auditChecklist.service.ts:143` | Safe | Reads back a `governance_template` by an id generated in the same create call for the caller's `company_id`. Trusted id. |

## Conclusion
No cross-tenant **read/write of governance data** is reachable by a normal authenticated user. One low-severity **name-only info leak** (T-1) was found and fixed. T-2/T-3 are safe today (chained-trusted) and recorded as optional defense-in-depth hardening (scope the by-id reads to `company_id` regardless of provenance). SUPER_ADMIN is intentionally cross-tenant by role.

**Recommended follow-up (not blocking):** adopt a lint/CI check that flags any query on a `company_id`-bearing table whose `WHERE` lacks `company_id`, so new code cannot silently regress isolation.
