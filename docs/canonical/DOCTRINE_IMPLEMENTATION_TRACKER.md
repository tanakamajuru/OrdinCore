# Doctrine Implementation Tracker

**Source of truth:** *Ordin Core Consolidated Governance Doctrine and System Model (2026-09-23)*.
**Purpose:** track implementation of everything the doctrine requires that the current build does not yet do, in the doctrine's own release order (§20). Status is verified against code, not assumed.

Legend: ✅ done · 🟡 partial · ⬜ todo · 🔎 needs verification.

---

## Already satisfied before this programme (from #106–#110)
- ✅ Guided Work is read-only, split into **My Work** (assigned) + **Decisions Due** (role decisions) — doctrine §22.1 (`#106`/`#108`).
- ✅ One concern → one row (dedupe) — §22 (`#106`).
- ✅ Reads through canonical views, not base-table literals — §4.2.3 (`#110` compliance fix; earlier consolidation).
- ✅ Daily-governance signal gates scoped to the review day — relates to §9/§25 (`#109`).
- 🟡 Exact-record routing contract — §22.3: most routes deep-link to the exact record; **residual generic links remain** (Pipeline action stage → general My Actions without id; some Risk Detail escalation links → general log; completed-action history → unfiltered list).

---

## Release 1 — safety & single source of truth
- ⬜ **1. Incident tasks onto the canonical action spine.** `incident_actions` is a separate lifecycle path (`incidents.repo.ts`). Route accepted incident tasks through `canonicalGovernanceAction.service`; add `incident_id` to action lineage. *(§8.2)*
- ⬜ **2. Deduplicate/migrate legacy `incident_actions`.** Migration to classify/move existing rows; retire the second engine. *(§8.2)*
- 🔎 **3. Align incident interface permissions with backend role boundaries.** *(§8.1)* — audit needed.
- ⬜ **4. Canonical action idempotency.** No idempotency in `canonicalGovernanceAction.service`. Key: `tenant + source decision + normalised purpose + active lifecycle`. *(§7.5)*
- ✅ **5. No silent success in work queues.** `guidedWork.safeRows` swallowed errors → empty "nothing due". Now records failed sources, returns `degraded`/`degradedSources`; MyWork shows "Work list incomplete — data unavailable" and suppresses the green empty state. *(§4.2.8, §14)* — **`#111`**

## Release 2 — governance continuity
- ⬜ **1. Immutable same-day daily-governance addenda.** One-log-per-service/date leaves a gap after sign-off; add append-only addendum (parent log id, sequence, UK timestamps, evidence ids). *(§9.2)*
- ⬜ **2. Extend reconstruction evidence** to actions, completion, effectiveness, risks, closure, assurance. *(§8.4)*
- ⬜ **3. Remove unsupported automated conclusions** (e.g. "No systemic gap detected" from an incomplete dataset → "No gap identified in the records available; actions/effectiveness not available"). *(§8.4)*
- 🟡 **4. Reports render the locked reconstruction** (not a parallel narrative). *(§8.3)*

## Release 3 — assurance & language
- ⬜ **1. RI assurance states** (Assured / Partially / Not / Insufficient evidence) with evidence basis — replace tick logic. *(§11.2)*
- ⬜ **2. Resolution Effectiveness → Resolution Durability** with numerator/denominator/observation window/pending/min-sample warning. *(§13.1)*
- ⬜ **3. Confidence → Evidence Coverage + Control Assurance** (two measures). *(§7.9)*
- ⬜ **4. Risk index / attention priority shown as transparent decision-support** (components, assumptions, version, date). *(§7.9)*
- ⬜ **5. `CRITICAL` → "Critical Governance Exception"** with named supporting risk; frozen report fails validation without it. *(§13.2)*
- ⬜ **6. Human evidence narrative** for material themes (data → interpretation → decision → action → outcome → recurrence → assurance). *(§12)*

## Release 4 — interface simplification
- 🟡 **1. Pipeline → read-only Governance Overview.** My Work/Decisions Due done; Pipeline still duplicates decision controls — make it a read-only map. *(§14, §22.2)*
- ⬜ **2. Remove duplicated mini-workflows** after parity tests. *(§22.2)*
- 🟡 **3. Standardise source links / completion conditions / "why am I seeing this?"** across interfaces; fix residual generic links. *(§22.3)*

## Cross-cutting (from §23–§25, §27)
- ⬜ **Weekly evidence contract (§23):** consume canonical pattern state (not broad-domain counts); fix `last_effectiveness` NULL→Unknown; scope interventions to the service; add escalations, incidents, completed actions+effectiveness, dismissed/resolved patterns, addenda; remove the fixed "stabilisation" sentence.
- ⬜ **AI provenance & labelling (§24):** single narrative gateway; store provider/model/prompt-version/snapshot-id/approver; AI never overwrites original factual evidence (incident description → separate draft field); structural provenance, not string-compare.
- ⬜ **Signal durability (§25):** transactional outbox/job with the signal; retry + dead-letter; reconciliation for signals without pattern evaluation; detection-failure exception queue.
- 🟡 **Pattern qualifying-count display (§25):** `canonical_pattern_formation_v` exposes qualifying_count/threshold/basis; ensure UI shows "N of M qualifying + historical linked + subtheme + scope", not raw totals.

---

## Sequencing note
Executed in the doctrine's order (safety first). Each item ships and is verified on live independently. The invariants in §18 and acceptance criteria in §21/§27 are the exit tests.
