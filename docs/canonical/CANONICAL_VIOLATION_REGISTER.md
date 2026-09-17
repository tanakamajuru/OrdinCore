# Canonical Violation Register

**Status:** Phase 1 deliverable — Repository-wide Canonical Ownership & Violation Audit. **Phase 3 consolidation release APPLIED (#78).**
**Date:** 2026-09-17
**Build audited:** `main` @ f0b8502 (post-#77, Guided Work orchestration reconciliation)
**Freeze status:** Register accepted; freeze lifted on user instruction ("do what's left"). Phase 3 consolidation executed — see resolution column below.

## Phase 3 resolution log (what was actually done)

| Finding | Action taken (#78) |
|---|---|
| P2-1 | `dailyGovernance.service` :365, `weeklyReviews.service` :273/:419/:467, `reportsData.service` :123 — literal status predicates replaced with canonical flags (`is_open`/`is_active`). ✅ Fixed |
| P2-2 | `escalationOverdue.worker`, `report.worker`, `trajectoryRefresh.worker` — swapped base-table literal sweeps to canonical views + flags. `pattern.worker:108` reclassified (write-path race lookup, not a read projection) — left. ✅ Fixed |
| P2-3 | Reclassified: escalation stats per-stage `FILTER`s are legitimate stage breakdowns (open/closed already use `is_open`). No change needed. |
| P2-4 | `governance.service` getClusters + getRiskCandidates now read `signal_count`/`trajectory` from `canonical_pattern_state_v` — the canonical view is the sole read surface; `signal_clusters.signal_count` remains a write-owned cache maintained by `governanceDecisions.service`. ✅ Fixed |
| P1-1 / P1-2 | **Deferred (documented).** `interventions.service` consumes the canonical closure engine's per-risk `closure().eligible`/`blockers`; `domain/closurePosition` only maps those canonical inputs to display messaging and cannot contradict the sole eligibility decider (`canonicalGovernanceStateService`). No integration-test coverage exists at theme level; a rewrite for cosmetic gain would be exactly the churn the freeze guards against. To be consolidated under a test-covered follow-up. |
| HISTORICAL | Migration **153** classifies the legacy unclassified residue as `COMPLETION_ONLY` (live: 36 rows, all confirmed to carry no effectiveness signals) with a post-condition guard that fails if any row remains NULL. ✅ Fixed |

## How to read this
Each finding is classified by remediation priority, **not** by how alarming it looks:

| Class | Meaning |
|---|---|
| **P0** | A non-owner writes canonical lifecycle state, or a reader can report a state that contradicts the canonical owner. Must fix before the consolidation release. |
| **P1** | A parallel calculator re-derives closure / effectiveness / control-position with its own rule instead of consuming the canonical engine. Fix in the consolidation release. |
| **P2** | A read path uses free-text status predicates or a denormalised cache instead of the canonical flag/view. Can drift; fix opportunistically inside the release. |
| **COMPAT** | A direct table write that touches only non-lifecycle metadata (assignment, lineage, staging). Legitimate today; note for eventual service-routing. |
| **PRESENTATION** | Display-only derivation. No authority. Left as-is unless it can visibly contradict canonical. |
| **HISTORICAL** | Pre-canonical data/rows needing remediation, not a code defect. Feeds Phase 6 queue. |

Rule of record (from the Action Evidence Contract, #75): **only `canonicalGovernanceAction.service.ts` may INSERT/UPDATE `risk_actions` lifecycle**; only `canonicalGovernanceStateService` decides closure; only `canonicalControlPosition.service` decides control position; only `trajectoryForRisk()` computes trajectory.

---

## Confirmed clean (owners verified)

- **`risk_actions` lifecycle writes** — the only `INSERT INTO risk_actions` is `canonicalGovernanceAction.service.ts:27`. No other service inserts action rows. ✅
- **Guided Work** — `guidedWork.service.ts` and `guidedWork.routes.ts` contain **no** INSERT/UPDATE/DELETE against governance tables. It is a pure projection/prioritisation reader. It never decides completion. ✅ (Doctrine held.)
- **Closure delegation** — `risks.service` closure review and `interventions.service.ts:273` both call `canonicalGovernanceStateService.closure(...)` rather than re-implementing eligibility. ✅
- **RM5 counts** — `rm5.service.ts:87/90/112/246` read `canonical_action_state_v` (`requires_effectiveness_review`, `closure_eligible`). ✅ Consuming canonical, not counting base tables.
- **Escalation write-owner** — `escalations.service.ts` SET `lifecycle_status` at 398/543/571/630 is the legitimate write path for escalations. ✅

---

## P0 — Contradiction / non-owner authority

_None confirmed._ No non-owner writes `risk_actions` lifecycle, closure state, or control position. The architecture's single-writer guarantees are intact at write level. (This is the key result: the freeze can proceed to a *read/derivation* consolidation, not an emergency write-path rescue.)

---

## P1 — Parallel derivation calculators

### P1-1 · Intervention "concern" + "ready to close" hint re-derives from effectiveness
- **File:** `backend/src/services/interventions.service.ts:107-116`, `:279-284`
- **What:** `concernOf()` maps `effectiveness === 'Not Effective' → 'Review required'`, `Improving+Effective → 'Controlled'`, etc.; `readyToClose = effectiveness === 'Effective' && every canonical closure review eligible`.
- **Why it matters:** `:279` *does* AND-in the canonical per-risk `closure().eligible`, so it cannot contradict closure. But it layers an **extra** `effectiveness === 'Effective'` gate and an independent display verdict (`concernOf`) that lives outside `canonicalControlPosition.service`. Two places now answer "is this controlled?".
- **Fix (release):** derive the concern/readiness label from `canonicalControlPosition.service` output; keep the canonical closure AND-gate.
- **Class:** P1.

### P1-2 · `closurePosition` domain helper invoked directly
- **File:** `backend/src/services/interventions.service.ts:7` (`import { closurePosition } from '../domain/closurePosition'`), used at `:286`.
- **What:** A domain pure-function computes a closure position from `{interventionExists, effectiveness, blockers}`.
- **Why:** This is the same concept `canonicalControlPosition.service` owns. Acceptable if `closurePosition` is the shared primitive the canonical service *also* uses; a violation if it is a second implementation. **Verify in release:** confirm `canonicalControlPosition.service` and `interventions.service` call the *same* `domain/closurePosition`. If yes → downgrade to PRESENTATION. If no → P1.
- **Class:** P1 (pending single-source verification).

---

## P2 — Free-text status predicates & denormalised caches

### P2-1 · Read paths filter on status literals instead of canonical flags
- **Files:**
  - `backend/src/services/dailyGovernance.service.ts:365` — `ra.status NOT IN (...)`
  - `backend/src/services/weeklyReviews.service.ts:273, 419, 467`
  - `backend/src/services/reportsData.service.ts:123` — `cluster_status IN (...)`
  - `frontend/src/app/components/DailyOversightBoard.tsx:154` — `!["Complete","Completed","Cancelled"].includes(a.status)`
- **Why:** These decide "open vs done" from free text rather than `canonical_action_state_v` / `canonical_escalation_state_v` flags. If the canonical flag and the literal set disagree (e.g. a new status value), the count drifts from the authoritative view.
- **Fix (release):** replace with the canonical boolean flag (`is_open`, `closure_eligible`, `requires_effectiveness_review`) from the relevant `canonical_*_state_v`.
- **Class:** P2.

### P2-2 · Worker jobs use lifecycle literals
- **Files:** `escalationOverdue.worker.ts:55`, `pattern.worker.ts:108`, `report.worker.ts:124`, `trajectoryRefresh.worker.ts:13, 18`
- **Why:** Same literal-status coupling in background jobs; a job that selects "open" work by literal can process the wrong set after a status vocabulary change.
- **Fix (release):** consume canonical flags/views.
- **Class:** P2.

### P2-3 · Escalation stats FILTER on `lifecycle_status` literals
- **File:** `backend/src/services/escalations.service.ts:687-690`
- **Why:** Stats aggregation filters on literal `lifecycle_status` values. `getEscalationStats` was already moved to `canonical_escalation_state_v` for the open/closed split (#58); these FILTER clauses are the residual literal usage.
- **Fix (release):** derive from the canonical view's flags.
- **Class:** P2.

### P2-4 · Denormalised `signal_clusters.signal_count` read as truth
- **Files:** read at `governance.service.ts:117, 129`; maintained (write) at `governanceDecisions.service.ts:204, 218`.
- **Why:** `signal_count` is a cached column. Canonical signal evidence is `canonical_signal_evidence_v` / `governance_pulses`. A cache that is written in one service and read as authoritative in another can diverge from the canonical pulse count — exactly the "identically-named counts must reconcile to canonical evidence IDs" invariant.
- **Fix (release):** either (a) read counts from `canonical_material_count_v` / `canonical_signal_evidence_v`, or (b) formally declare `signal_count` a derived cache with a reconcile step and add it to `reconcile_canonical_read_side`.
- **Class:** P2.

### P2-5 · Analytics counts clusters as a signal proxy
- **File:** `analytics.service.ts:391` — `COUNT(sc.id) AS open_signal_clusters`
- **Why:** Counting *clusters* is legitimate (clusters ≠ signals), but the field name invites confusion with signal counts. Presentation risk only.
- **Fix:** rename/label; no logic change.
- **Class:** P2 (labelling).

---

## COMPAT — Legitimate non-lifecycle direct writes

| # | File:line | Write | Verdict |
|---|---|---|---|
| C-1 | `risks.service.ts:266` | `UPDATE risk_actions SET assigned_to` | Assignment metadata, not lifecycle. Legitimate. Route through a service eventually. |
| C-2 | `risks.service.ts:778` | `UPDATE risk_actions SET risk_id` (lineage backfill) | Lineage repair, not lifecycle. Legitimate. |
| C-3 | `actionOverdue.worker.ts:99` | `UPDATE risk_actions SET escalation_stage` | Escalation staging metadata, not completion/status. Legitimate. |

None of these touch `status`, `completion_evidence`, `effectiveness_outcome`, or `review_requirement`, so the Action Evidence Contract's single-writer guarantee is not breached. Recorded for eventual service-routing tidiness, **not** for the release.

---

## PRESENTATION — display derivations, no authority

- `guidedWork.service.ts` uses `p.trajectory` / `r.trajectory` from canonical views for priority ordering and summary text — reads stored canonical trajectory, does not recompute. ✅
- `interventions.service.ts:39/61-69` `summariseRiskTrajectories()` aggregates the *directions returned by* `trajectoryForRisk()` — roll-up of canonical results, not a re-computation. ✅
- `directorInsights` trajectory vocabulary mapping — label formatting only.

---

## HISTORICAL — data remediation (feeds Phase 6, not code)

- **13 legacy unclassified `risk_actions`** with no `review_requirement` (from migration 152 dry-run: 140 classified, 13 unclassified). These pre-date the Action Evidence Contract. They must be remediated (classified `COMPLETION_ONLY` / `EFFECTIVENESS_REQUIRED`) before they can carry an effectiveness rating. **Queue for Phase 6 historical remediation.**

---

## Register summary

| Class | Count | Gate |
|---|---|---|
| P0 | 0 | — |
| P1 | 2 | Consolidation release |
| P2 | 5 | Consolidation release (opportunistic within) |
| COMPAT | 3 | No action for release |
| PRESENTATION | 3 | No action |
| HISTORICAL | 1 (13 rows) | Phase 6 |

**Headline finding:** the single-writer / single-decider guarantees hold at the **write** layer (0 P0). Every remaining violation is a **read-side or derivation-side** coupling — free-text status predicates (P2-1/2/3), a denormalised signal cache read as truth (P2-4), and two intervention display calculators that re-derive control/closure hints (P1-1/2). This is precisely the shape the Stabilisation Plan anticipated: the fix is **one consolidation release that routes all reads through the canonical views/flags and all control/closure derivations through the canonical services**, not a screen-by-screen correction programme.

**Freeze holds until this register and the [Truth-Chain Dependency Map](./TRUTH_CHAIN_DEPENDENCY_MAP.md) are accepted.**
