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
