# Role Permission Matrix

**Status:** Phase 9 deliverable (Stabilisation Plan).
**Date:** 2026-09-18
**Build:** `main` @ 60041c4 (post-#81)

## Role model
Seven roles, with a numeric hierarchy ([role.middleware.ts](../../backend/src/middleware/role.middleware.ts)):

| Role | Level | Nature |
|---|---|---|
| SUPER_ADMIN | 100 | Platform operator; `company_id` NULL; intentionally cross-tenant. |
| ADMIN | 95 | Company administrator (organisation/security config, users). |
| DIRECTOR | 90 | Provider-level governance oversight. |
| RESPONSIBLE_INDIVIDUAL (RI) | 80 | **Independent oversight** — sees everything, may not execute operational governance. |
| REGISTERED_MANAGER (RM) | 60 | Operational governance owner (daily log, closures, decisions). |
| TEAM_LEADER | 40 | Front-line supervision, house-scoped. |
| SUPPORT_WORKER | 30 | Front-line capture, most restricted, house-scoped. |

## Enforcement primitives
- **`requireRole(...roles)`** — **exact-match, fail-closed** ([role.middleware.ts:25](../../backend/src/middleware/role.middleware.ts#L25)). A role not in the list is denied; SUPER_ADMIN/ADMIN are **not** implicitly granted and must be listed. Consequence: RM-only operational endpoints deliberately exclude admins (operational actions are role-specific, not privilege-ranked).
- **`requireMinRole(min)`** — hierarchical; used where seniority genuinely subsumes capability (analytics, closure, escalations).
- **`blockOversightRole`** — §7 separation of duties: an active RI is blocked from operational **writes** (close escalation/risk, open/complete daily governance, record decisions) even though RI outranks RM. An RI who also holds an operational role switches `active_role` and the guard passes.
- **`requireTenant`** — SUPER_ADMIN bypasses; everyone else is pinned to their token's `company_id` (see [Multi-Tenant Isolation Audit](./MULTI_TENANT_ISOLATION_AUDIT.md)).

## Capability matrix (by tier, from the route guards)

| Capability area | SUPER_ADMIN | ADMIN | DIRECTOR | RI | RM | TEAM_LEADER | SUPPORT_WORKER |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Platform/global config (signal library, domains, thresholds, SLAs) | ✅ write | 👁 read | – | – | – | – | – |
| Company/org admin, security policy, access reviews, users | ✅ | ✅ | – | – | – | – | – |
| Director governance (interventions, monthly report finalise) | – | – | ✅ | – | – | – | – |
| Cross-site oversight reads (insights, heatmaps, effectiveness) | ✅ | ✅ | ✅ | 👁 | ✅ | – | – |
| Daily governance **open/complete** (operational write) | – | – | – | ⛔ oversight | ✅ | – | – |
| Escalation / risk **closure** (operational write) | – | – | – | ⛔ oversight | ✅ (min-role) | – | – |
| Escalations create/manage | – | – | ✅* | 👁 | ✅ | ✅* | – |
| Signal capture (pulses) / task actions | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Guided Work / My Work (read-only queue) | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

✅ = allowed · 👁 = read-only · ⛔ = explicitly blocked (oversight separation) · – = not granted (fail-closed) · * = subset of endpoints.

## Findings
- **No privilege-escalation hole.** `requireRole` is fail-closed exact-match; there is no implicit-grant path. Every non-public route carries `requireAuth` (file-level `router.use` or inline); the only unauthenticated endpoints are the intended ones: `/auth/login|refresh|forgot-password|reset-password`, `/contact` (rate-limited), `/health`.
- **Oversight/execution separation enforced** for the RI on all operational write routes via `blockOversightRole`.
- **Consistency observation (not a hole):** because guards are exact-match allow-lists, some RM-only operational endpoints exclude ADMIN/SUPER_ADMIN. This is intentional (admins are not operational actors and SUPER_ADMIN has no `company_id`), and it fails closed. If any admin genuinely needs an operational capability, it must be added to that endpoint's allow-list explicitly rather than relying on rank.

## Recommended follow-up (not blocking)
- A single source-of-truth capability map (constant) that route guards reference, so the 34 distinct ad-hoc `requireRole(...)` signatures collapse to named capability groups (the `OVERSIGHT` constant in `directorInsights.routes.ts` is the pattern to generalise). Reduces the risk of an inconsistent allow-list on a new endpoint.
