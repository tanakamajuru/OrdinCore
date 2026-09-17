# Truth-Chain Dependency Map

**Status:** Phase 2 deliverable — companion to the [Canonical Violation Register](./CANONICAL_VIOLATION_REGISTER.md)
**Date:** 2026-09-17
**Build:** `main` @ f0b8502

For every canonical object this map traces the single chain:
**write owner → base DB record → canonical read owner (view) → obligations → events → web consumers → mobile consumers → Guided Work consumer → report consumers.**

Any consumer not on the chain that reads state another way is a candidate violation (cross-referenced to the Register).

---

## 1. Risk (house/service risk)

| Link | Owner |
|---|---|
| Write owner | `risks.service.ts` (create/update); status transitions gated by canonical review |
| Base record | `risks` (+ `canonical_status`) |
| Canonical read | `canonical_risk_state_v` |
| Closure decider | `canonicalGovernanceStateService.closure(riskId, company)` — **sole** eligibility authority |
| Control position | `canonicalControlPosition.service` (control-position-v1) |
| Trajectory | `trajectoryForRisk()` → stored on canonical view |
| Obligations | `review_obligation` rows via `canonical_review_obligation_state_v` |
| Web consumers | RiskRegister, RiskDetail, RiskPromotion, DailyOversightBoard, GovernanceDashboard |
| Mobile consumers | RiskDetailScreen (`/canonical-evidence/risks/:id`), WorkList |
| Guided Work | routes risk review via `source_risk_id` → `/risk-register/:riskId` (exact id) |
| Report consumers | `reportsData.service`, `report.worker` |
| **Register refs** | P2-1 (DailyOversightBoard literal filter), P2-2 (report.worker literal) |

## 2. Risk Action

| Link | Owner |
|---|---|
| Write owner | **`canonicalGovernanceAction.service.ts` ONLY** (`INSERT INTO risk_actions` @ :27) |
| Base record | `risk_actions` (+ `review_requirement`, `evidence_contract_version`, `evidence_remediated_*`) |
| Canonical read | `canonical_action_state_v` |
| Evidence contract | `review_requirement ∈ {COMPLETION_ONLY, EFFECTIVENESS_REQUIRED}` (mig 152) |
| Effectiveness | `actionEffectiveness.service` → `action_effectiveness_reviews` (append-only) → `canonical_action_effectiveness_v` |
| Obligations | `ACTION_EFFECTIVENESS` obligation on EFFECTIVENESS_REQUIRED actions |
| Web consumers | MyActions, EffectivenessPanel, RiskDetail, RM5 dashboard |
| Mobile consumers | RiskDetailScreen action list |
| Guided Work | `waiting_action:{id}` → `/my-actions?focus={id}`; effectiveness → `/effectiveness?focus={id}` |
| Report consumers | `reportsData.service` |
| **Register refs** | COMPAT C-1/C-2/C-3 (non-lifecycle writes), P2-1 (dailyGovernance/weeklyReviews literal `ra.status`), HISTORICAL (13 unclassified rows) |

## 3. Escalation

| Link | Owner |
|---|---|
| Write owner | `escalations.service.ts` SET `lifecycle_status` (@398/543/571/630) |
| Base record | `escalations` (`lifecycle_status`) |
| Canonical read | `canonical_escalation_state_v` (open/closed flags) |
| Stats | `getEscalationStats` → canonical view (#58) |
| Obligations | escalation review obligations |
| Web consumers | EscalationLog, GovernanceDecisions, IncidentCaseHub, DailyOversightBoard |
| Mobile consumers | escalation views |
| Guided Work | escalation review deep-links |
| Report consumers | reportsData, escalationOverdue.worker |
| **Register refs** | P2-3 (stats FILTER literals @687-690), P2-2 (escalationOverdue.worker:55 literal) |

## 4. Signal / Pulse evidence

| Link | Owner |
|---|---|
| Write owner | governance pulse ingestion |
| Base record | `governance_pulses`; clustered into `signal_clusters` (`signal_count` cache) |
| Canonical read | `canonical_signal_evidence_v`, `canonical_material_count_v` |
| Cache maintained by | `governanceDecisions.service.ts:204/218` (`signal_count` write) |
| Web consumers | SignalDetail, GovernanceDecisions, analytics |
| Guided Work | signal-derived priority |
| Report consumers | reportsData |
| **Register refs** | P2-4 (`signal_count` cache read as truth @governance.service 117/129), P2-5 (analytics cluster count labelling) |

## 5. Pattern (systemic)

| Link | Owner |
|---|---|
| Write owner | `pattern.worker.ts` / pattern promotion |
| Base record | pattern tables |
| Canonical read | `canonical_pattern_state_v` |
| Obligations | `PATTERN_REVIEW` obligation |
| Web consumers | SystemicPatterns |
| Guided Work | PATTERN_REVIEW → `/systemic-patterns?focus` or promoted-risk route |
| Report consumers | reportsData |
| **Register refs** | P2-2 (pattern.worker:108 literal) |

## 6. Review Obligation (durable review spine)

| Link | Owner |
|---|---|
| Write owner | `reviewObligations.service` (`open`/`complete`) |
| Base record | review_obligation rows |
| Canonical read | `canonical_review_obligation_state_v` |
| Types | `ACTION_EFFECTIVENESS`, `PATTERN_REVIEW`, risk review |
| Web/mobile consumers | weekly reviews, daily governance |
| Guided Work | obligation → `requiredAction`/`completionCondition`; deep-route by type |
| **Register refs** | P2-1 (weeklyReviews literal predicates @273/419/467) |

## 7. Control Position & Closure (derived state)

| Link | Owner |
|---|---|
| Decider | `canonicalControlPosition.service` (position); `canonicalGovernanceStateService` (closure eligibility) |
| Canonical read | `canonical_derived_state_provenance_v` |
| Shared primitive | `domain/closurePosition` |
| Consumers | interventions.service, risks.service closure review, RM dashboards |
| **Register refs** | P1-1, P1-2 (interventions re-derives concern/readiness/closurePosition) |

## 8. Reconciliation

`reconcile_canonical_read_side(company)` refreshes all `canonical_*_state_v` projections. **Gap:** `signal_clusters.signal_count` (P2-4) is not currently declared a reconciled derivation — the release should either fold it into `reconcile_canonical_read_side` or remove it as a read-source.

---

## Consolidation-release scope implied by this map

The map shows a single coherent fix, not scattered patches:

1. **Read-flag consolidation** — replace every literal-status predicate (P2-1/2/3) with the canonical view flag. Touch points: dailyGovernance, weeklyReviews, reportsData, 4 workers, escalations stats, DailyOversightBoard.
2. **Signal-count truth source** — resolve `signal_count` cache vs `canonical_signal_evidence_v` (P2-4) and register it in reconcile.
3. **Single control/closure derivation** — collapse `interventions.service` concern/readiness/`closurePosition` onto the canonical services / shared `domain/closurePosition` (P1-1/2).
4. **Historical** — classify the 13 legacy `risk_actions` (Phase 6).

No screen-level correction programme. One release, driven by this map. **Freeze holds until both documents are accepted.**
