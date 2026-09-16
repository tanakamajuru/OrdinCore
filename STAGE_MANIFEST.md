# Canonical Governance Data Repair — Stage Manifest

Apply the numbered patches in order. Each stage is a complete Git patch and has one commit.

| Stage | Commit | Purpose | Principal deployment effect |
|---|---|---|---|
| 1 | `1e1fc95` | Escalation/action closure | Carries corrective-action history into escalation detail and applies evidence gates across every lineage key. |
| 2 | `e4b709b` | Canonical lineage | Backfills signal → pattern → decision → risk → escalation → action links and adds one case resolver/timeline. |
| 3 | `937f23b` | Effectiveness/reviews | Creates durable review obligations and one effectiveness definition, including strategic and riskless actions. |
| 4 | `6dee290` | Patterns/trajectory | Materialises cross-service evidence and makes `trajectory.service` authoritative for all projections. |
| 5 | `28d3c2e` | Cross-interface sync | Adopts web/mobile decisions into the signed daily log and broadcasts one governance-case refresh event. |
| 6 | `f0a4068` | Registers/reports | Makes web/mobile registers and frozen reports consume canonical classifications, trajectories, controls and histories. |
| 7 | final package commit | Deployment assurance | Restricts migrations to versioned files, checks migration integrity, adds reconciliation and deployment instructions. |

The `patches/` directory in the delivery ZIP contains one replacement-ready patch per stage.

## Truth-hardening continuation (applied to this repo)

Deployment order: **147 → 149 → 150 → Stage 2B → 151**.

| Stage | Migration | Commit | Purpose |
|---|---|---|---|
| Canonical Read Side | `147_canonical_read_side.sql` | `e796414` (+ fix `345a6e5`) | Canonical `*_state_v` current-state views + `reconcile_canonical_read_side()`; operational readers use canonical flags, not free-text status. |
| Truth & Provenance Finalisation | `149_truth_provenance_contract.sql` | `a1fdf34` | A signal is only a `governance_pulses` row (`canonical_signal_evidence_v`); direct signal lineage; daily sign-off freezes `evidence_snapshot`. |
| Canonical Evidence & Assurance Hardening | `150_canonical_evidence_assurance_hardening.sql` | `edd2add` (+ verify fix `81a6328`) | Every material count is evidence-addressable (`canonical_material_count_v`); `canonical_derived_state_provenance_v`; `/canonical-evidence/{counts,risks}`. |
| Stage 2B — Canonical Evidence Consumer Adoption | *(no migration; uses 150 contracts)* | `fde0070` | `/canonical-evidence/summary`; shared `CanonicalEvidenceStrip` adopted by web My Work / Risk Register / RM5 / Director / RI and mobile My Work + Risk Detail. |
| Final Truth-Chain Release Gate | `151_truth_chain_release_gate.sql` | `cd6f4b0` | Daily evidence anchored to log `review_date`; provider-local governance timezone/cadence (`companies.governance_timezone` / `_dow` / `_time`); Guided Work cannot hide active work via `exclude`. |

Notes:
- Migration 148 (`company_security_settings` / `access_reviews`, Organisation Administration workspace) and 144–146 are separate feature migrations, not part of the truth chain above.
- Guided Work's `excludeId` parameter and its two `.filter(... !== excludeId)` statements were physically removed (`guidedWork.service.getForUser`): the full canonical population is always returned; completion removes an item only by changing canonical state.
