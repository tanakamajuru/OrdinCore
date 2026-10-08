# Audit‑Log Integrity — OrdinCore

> **DRAFT — what exists today and the hardening needed.** Replace **[PLACEHOLDER]**.

## What is recorded today
- **`audit_logs`** table — governance/account mutations are written here (actor `user_id`,
  `company_id`, `action`, `resource`, `resource_id`, `new_values`) from auth, pulse, users and other
  services. Readable by admins via Governance Config → Audit.
- **Security events in application logs** (pm2/app log): `[security] refresh-token reuse detected`,
  `[evidence-access] user=… file=…`, login throttling and reset events.

## Required properties (Section 4)
Each security‑sensitive access and governance mutation should record **actor, organisation,
timestamp, object and outcome** — `audit_logs` covers actor/org/object/action/time; **outcome**
(success/failure) is inconsistent — **[ACTION: standardise an outcome field]**.

## Integrity hardening (actions)
1. **Append‑only — ✅ DONE (2026‑10‑08, verified).** `audit_logs` ownership moved to `postgres`; the
   application role (`ordinuser`) holds **only `INSERT` + `SELECT`** — `UPDATE`, `DELETE` and
   `TRUNCATE` are revoked — and a `BEFORE UPDATE OR DELETE` trigger (`trg_audit_logs_append_only`,
   owned by postgres) refuses any attempt at the row level as defence‑in‑depth. Because the app role
   is no longer the owner it cannot re‑grant itself write rights or drop the trigger. Verified live:
   as `ordinuser`, `INSERT`/`SELECT` succeed and `UPDATE`/`DELETE`/`TRUNCATE` are denied
   (`ins=t sel=t upd=f del=f trunc=f`). Applied via
   [../../backend/scripts/harden-audit-logs.sql](../../backend/scripts/harden-audit-logs.sql)
   (operator script, run as postgres — **not** the app migration runner, which runs as `ordinuser`
   and cannot change ownership).
2. **Restricted alteration (break‑glass):** only the **postgres superuser / DBA** can modify or prune
   `audit_logs`. That access is held by **[NEEDS INPUT: named DBA]** and its use is itself recorded
   (the pruning/archival action is logged in the operations/change record). The app can never do it.
3. **Retention:** audit/security logs are retained for **at least 6 months** (recommended **12
   months**) — see [data-retention-and-deletion.md](../compliance/data-retention-and-deletion.md).
   Any pruning after the retention period is a **break‑glass DBA action that archives rows off‑box
   first**, never a routine app operation (the app cannot delete). Confirm/record the exact period
   with **[NEEDS INPUT]**.
4. **Coverage:** ensure logins (success **and** failure), logout/revocation, evidence downloads,
   permission denials, exports and cross‑tenant denials are all captured — add where missing.
5. **Off‑box copy:** ship security logs off the server (see monitoring plan) so they survive host
   compromise/loss and can't be edited locally.

## Acceptance
Attempting an `UPDATE`/`DELETE` on `audit_logs` as the app user fails; a sample of
login/evidence/mutation events appears with actor, org, time, object and outcome; retention/archival
is demonstrated.
