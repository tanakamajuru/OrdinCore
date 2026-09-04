# Data Retention & Deletion Policy — OrdinCore

> **DRAFT — the controller sets the actual periods (legal/regulatory judgement).** This provides the
> structure and the technical deletion routes. Replace **[PLACEHOLDER]**.

## Principles
- Keep personal data only as long as necessary for care and legal/regulatory purposes.
- Retention is **per provider (tenant)**; deletion must not affect other tenants.
- Deletion must remove data from the live database **and** from backups on their expiry cycle.

## Retention schedule (controller to confirm periods)
| Data | Suggested basis | Retention **[CONFIRM]** |
|---|---|---|
| Service‑user governance records (signals, risks, actions, escalations, incidents) | Adult social‑care record retention | **[e.g. 8 years after last contact]** |
| Evidence media (photos/voice) | As above; minimise | **[CONFIRM]** |
| Weekly reviews / assurance reports | Regulatory evidence | **[CONFIRM]** |
| Staff accounts & audit/security logs | Security & accountability | **[e.g. 12 months for security logs; account life + [X]]** |
| Refresh tokens | Session security | Auto‑expire (30 d) + revoked on logout/reset |
| Password‑reset tokens | Single‑use, time‑limited | 1 hour |

## Deletion & account closure
- **Provider offboarding:** on termination, return or securely delete the tenant's data (DPA §10) and
  certify. Confirm no residual rows remain in shared tables (all are `company_id`‑scoped).
- **Individual erasure requests:** the controller assesses; where upheld, delete/anonymise the
  service‑user's records for that tenant.
- **Evidence files:** deleting a record must also remove its media from `backend/storage/uploads`.
  **[ACTION: add a deletion routine that removes orphaned media; today files are not auto‑purged.]**
- **Backups:** deleted data persists in encrypted backups until those backups age out
  (retention **[e.g. 30 days]**); document this in erasure responses.

## Actions
1. Controller to confirm the periods above.
2. Implement a scheduled **retention/deletion job** (purge records + orphaned media past retention).
3. Verify tenant‑scoped deletion leaves no cross‑tenant residue (ties into C‑04 testing).
