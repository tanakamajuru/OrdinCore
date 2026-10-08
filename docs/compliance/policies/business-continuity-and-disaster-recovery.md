# Business continuity & disaster recovery (BCP/DR) — OrdinCore

> DSPT Standard 7 (v8-strengthened). Owner: **[NEEDS INPUT]**. Review: annually; **rehearse at least
> once per year**.

## Scope

Keeping the OrdinCore service available and recoverable, and keeping care data safe, during
disruption — from a short outage to loss of the primary server or a data-corruption/ransomware event.

## Recovery objectives

| Objective | Target | Notes |
|---|---|---|
| RPO (max data loss) | **[NEEDS INPUT]** (e.g. ≤ 24h) | Set by backup frequency. |
| RTO (max downtime) | **[NEEDS INPUT]** (e.g. ≤ 24h) | Time to restore service. |

## Backups (the data)

- Automated, **restore-tested** backups ([../../operations/backup-and-restore.md](../../operations/backup-and-restore.md)).
- **v8 requirement:** an **independent/off-server backup copy** that a single incident (incl.
  ransomware on the primary) cannot destroy. **Status: outstanding — must be implemented.**
- Backups are restore-tested periodically; the last test date is recorded in the backup runbook.

## Prioritised recovery sequence (v8)

On a major outage, restore in this order so the most safety-critical functions return first:
1. **Database** (care records, governance decisions, audit logs).
2. **API/backend** (auth, data access).
3. **Web app** and **mobile API connectivity** (staff can record/retrieve care info).
4. Secondary features (reports/exports, notifications).

## Communications during an outage (v8)

- **Affected people/customers**: notify the provider contacts that the service is degraded, expected
  restoration, and any interim manual process (paper/phone) for safety-critical recording. Channel &
  holding message: **[NEEDS INPUT]**.
- **IT suppliers**: contact the hosting provider (Krystal) and email provider (Katapult) as needed;
  contacts in [../asset-register.md](../asset-register.md) / [../subprocessors.md](../subprocessors.md).
- **Internal**: incident lead coordinates per [../breach-and-incident-response.md](../breach-and-incident-response.md).

## Scenarios (brief runbooks)

- **Primary server lost**: provision replacement, restore DB from latest off-server backup, redeploy
  app, repoint DNS, verify health.
- **Data corruption / ransomware**: isolate, restore from a known-good **immutable/off-server** copy
  (never trust on-box backups alone), rotate credentials, investigate as an incident.
- **Extended provider outage**: invoke manual interim process for safety-critical recording; keep
  customers informed.

## Rehearsal

- Conduct at least **one BCP/DR exercise per assessment period** (e.g. a restore drill + a tabletop
  of the comms plan). Record date, participants and lessons by **[NEEDS INPUT]**.
