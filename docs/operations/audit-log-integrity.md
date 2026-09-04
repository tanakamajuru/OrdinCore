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
1. **Append‑only:** the application role (`ordinuser`) should be able to `INSERT`/`SELECT` on
   `audit_logs` but **not `UPDATE`/`DELETE`**. Enforce with table grants (revoke UPDATE/DELETE from
   `ordinuser`) so the app cannot rewrite history. **[IMPLEMENT + TEST]**
2. **Restricted alteration:** only a break‑glass DBA role may modify/prune, and that is itself
   logged. Document who holds it.
3. **Retention:** keep audit/security logs for **[e.g. 12 months]** (see
   [data-retention-and-deletion.md](../compliance/data-retention-and-deletion.md)); archive before pruning.
4. **Coverage:** ensure logins (success **and** failure), logout/revocation, evidence downloads,
   permission denials, exports and cross‑tenant denials are all captured — add where missing.
5. **Off‑box copy:** ship security logs off the server (see monitoring plan) so they survive host
   compromise/loss and can't be edited locally.

## Acceptance
Attempting an `UPDATE`/`DELETE` on `audit_logs` as the app user fails; a sample of
login/evidence/mutation events appears with actor, org, time, object and outcome; retention/archival
is demonstrated.
