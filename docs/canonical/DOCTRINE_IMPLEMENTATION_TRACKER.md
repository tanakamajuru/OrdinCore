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
- ✅ **1. Incident tasks onto the canonical action spine.** Serious/critical incidents now create their 3 fixed governance tasks (investigation, notification, reconstruction) via `canonicalGovernanceAction.create` with `incident_id` lineage (migration 162 adds the column), so they appear in My Work / Action Tracker / effectiveness / closure / reports. Type-aware suggestions stay recommendations, not auto-tasks. *(§8.2, acceptance #4)* — **`#113`**
- ✅ **2. Legacy `incident_actions` — N/A.** The `incident_actions` table does **not exist** in production; its INSERTs were throwing (silently breaking serious-incident auto-tasks). Nothing to migrate — the broken path is now removed. Rerouting also fixes serious/critical incident creation, which was failing on the missing table. *(§8.2)* — **`#113`**
- ✅ **3. Incident interface permissions audited against the role matrix.** Findings: create/update/assign/resolve/bulk-resolve are correctly restricted to operational/admin roles; RI & Director are excluded from operational and reconstruction writes by fail-closed allow-lists (oversight cannot change operational state). **One gap fixed:** `POST /:id/attachments` had no role guard — any role (incl. RI, Support Worker) could write incident evidence; now restricted to SUPER_ADMIN/ADMIN/RM/TEAM_LEADER. *(§8.1)* — **`#114`**

**Release 1 complete.**
- ✅ **4. Canonical action idempotency.** `canonicalGovernanceAction.create` now dedupes on `tenant + source decision (review/pulse/cluster/escalation) + normalised title + active lifecycle`: an equivalent still-open action from the same source returns the existing row instead of inserting a duplicate. Ad-hoc (sourceless) actions are unaffected. *(§7.5, acceptance #3)* — **`#112`**
- ✅ **5. No silent success in work queues.** `guidedWork.safeRows` swallowed errors → empty "nothing due". Now records failed sources, returns `degraded`/`degradedSources`; MyWork shows "Work list incomplete — data unavailable" and suppresses the green empty state. *(§4.2.8, §14)* — **`#111`**

## Release 2 — governance continuity
- 🟡 **1. Immutable same-day daily-governance addenda — backend spine done.** Migration 164 adds `daily_governance_addendum` (parent_log_id, sequence, review_date, reason, evidence_ids, decisions_summary, signed_at; unique per parent+sequence). `dailyGovernance.addAddendum` requires the parent log to be **signed** (never unlocks it), applies any late decisions through the SAME canonical executor as the primary review, and appends an immutable sequenced addendum; `listAddenda` reads them. Routes: `POST/GET /daily-governance/:id/addenda` (RM-only + oversight guard on write). Late signals already reach Decisions Due via guided-work day-scoping (#109). **Remaining:** frontend "Add signed addendum" action on the daily board, and weekly aggregation of addenda (folds into §23 weekly evidence contract). *(§9.2, acceptance #9/#10)* — **`#118`**
- ✅ **2. Reconstruction evidence contract extended.** `getGovernanceTimeline` now also pulls the canonical **action** chain (created / completed-with-evidence / effectiveness-reviewed-with-outcome, incl. an "effectiveness outstanding" gap flag) and **risk closure** decisions, alongside the existing signals/risks/escalations/weekly reviews. Findings report completed-actions + effectiveness counts; a failed action/closure source is declared as a limitation (not silently dropped). Remaining: Director/RI review events + statutory-notification references (fold in when the assurance model lands, R3 #1). *(§8.4, acceptance #13)* — **`#116`**
- ✅ **3. Removed unsupported automated conclusions.** `incidents.repo.getGovernanceTimeline` no longer asserts "governance oversight was documented and regular" or emits "no cross-house patterns" when the pattern query failed or the dataset is incomplete. Findings are now evidence-qualified ("in the records available"), a failed source is declared, and a `limitations` list states actions/effectiveness were not assessed (so it can't read as a completed gap assessment). Frontend `ReconstructionReport` shows the limitations and no longer falls back to fabricated positive findings. *(§8.4)* — **`#115`**
- ✅ **4. Reports render the locked reconstruction.** Completing a reconstruction now freezes the governance timeline/findings/limitations into `incident_reconstruction.evidence_snapshot` (migration 163). `getGovernanceTimeline` returns that frozen snapshot (with `frozen`/`frozen_at`) for any completed/approved reconstruction, so the report publishes the exact locked evidence instead of re-deriving live; drafts still derive live. Report shows a "published from the locked snapshot" banner. *(§8.3)* — **`#117`**

*(Release 2 remaining: #1 same-day addenda — the largest R2 item.)*

## Release 3 — assurance & language
- ⬜ **1. RI assurance states** (Assured / Partially / Not / Insufficient evidence) with evidence basis — replace tick logic. *(§11.2)*
- ✅ **2. Resolution Durability.** `resolutionEffectivenessRate` already applied the 60-day maturity gate; now also returns `observation_window_days`, `min_sample`, `evidence_base` (none/limited/moderate/adequate) and a full `summary` sentence (numerator/denominator/window/pending). Effectiveness page relabelled "Resolution Durability" with the denominator, pending-under-observation and a "limited evidence base" warning. *(§13.1, acceptance #17)* — **`#119`**
- ✅ **3. Confidence → Evidence Coverage + Control Assurance.** `SiteMetrics` now carries controls_total/effective/unreviewed (effectiveness-bearing actions completed by the cut-off). `confidenceService.controlAssurance` = finally-Effective ÷ completed controls, **null when there are no controls** — so mere existence/completion never reads as assured (e.g. live: 10 controls completed, 0 finally Effective → 0% assurance, not inflated). `evidenceCoverage` renamed measure exposed alongside. Report per-site + PDF now show **Evidence cov.** and **Control assur.** instead of a single "Gov %". *(§7.9)* — **`#120`**
- ⬜ **4. Risk index / attention priority shown as transparent decision-support** (components, assumptions, version, date). *(§7.9)*
- ✅ **5. Critical Governance Exception.** Report status `CRITICAL` now carries `status_label` "Critical Governance Exception" and each critical exception is tied to its specific open Critical **supporting_risks** (id, service, direction, review-due). The frozen-report generator **fails** if a Critical exception has no identifiable supporting risk; the PDF names the supporting risk. *(§13.2, acceptance #20)* — **`#119`**
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
