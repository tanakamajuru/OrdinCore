# OrdinCore — Compliance & Operations Pack

Prepared 2026‑09‑04 to close the **Data‑protection gate** and **Section‑4 operational controls**
from the five‑provider pilot‑readiness report.

> **These are working drafts by the development team, not legal advice.** Every document needs review
> and sign‑off by the data controller's DPO / IG lead (and legal for the DPA), and every
> **[PLACEHOLDER]** must be completed. They are deliberately kept as repo files (sensitive
> organisational records), not published.

## Data protection (`compliance/`)
- [DPIA.md](./compliance/DPIA.md) — impact assessment; flags the **OpenAI/LLM** transfer as a key risk.
- [privacy-notice.md](./compliance/privacy-notice.md) — notice for staff & service users.
- [data-processing-agreement.md](./compliance/data-processing-agreement.md) — Art. 28 processor terms.
- [subprocessors.md](./compliance/subprocessors.md) — Krystal (UK host), Katapult (email), OpenAI (US), Expo/Apple/Google.
- [breach-and-incident-response.md](./compliance/breach-and-incident-response.md) — breach + incident procedure.
- [uk-hosting-and-data-transfers.md](./compliance/uk-hosting-and-data-transfers.md) — UK hosting position.
- [data-retention-and-deletion.md](./compliance/data-retention-and-deletion.md) — retention schedule & deletion routes.

## Operations (`operations/`)
- [backup-and-restore.md](./operations/backup-and-restore.md) — **implemented & restore‑tested** (daily encrypted backups).
- [monitoring-and-alerting.md](./operations/monitoring-and-alerting.md) — plan (alerting is the gap).
- [audit-log-integrity.md](./operations/audit-log-integrity.md) — `audit_logs` + append‑only hardening.
- [load-and-capacity-test-plan.md](./operations/load-and-capacity-test-plan.md) — five‑provider load plan.

## Status at a glance
| Control | State |
|---|---|
| Encrypted backups + tested restore | ✅ Implemented on the server; **off‑server copy + media backup outstanding** |
| DPIA / privacy / DPA / subprocessors / breach / hosting / retention | ✅ Drafted — **need controller/DPO/legal sign‑off + placeholders** |
| Monitoring & alerting | 🔶 Plan written — implement uptime/cert/backup/log alerts |
| Audit‑log integrity | 🔶 Exists; **make append‑only (revoke UPDATE/DELETE from app role)** |
| Load/capacity test | 🔶 Plan written — run on staging |
| **OpenAI/LLM data‑transfer decision** | ⛔ **Open — resolve before identifiable data expands** |
