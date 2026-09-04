# Personal Data Breach & Security Incident Response — OrdinCore

> **DRAFT procedure — adopt, fill contacts, and rehearse.** Covers the data‑protection *breach*
> procedure and the operational *incident response* control. Replace **[PLACEHOLDER]**.

## Key contacts (fill in)
| Role | Name | Contact | Backup |
|---|---|---|---|
| Security lead / incident manager | **[NAME]** | **[24/7 CONTACT]** | **[NAME]** |
| DPO / IG lead | **[NAME]** | **[EMAIL/PHONE]** | |
| Hosting owner (Krystal VPS) | **[NAME]** | **[CONTACT]** | |
| Controller contact per provider | **[PER‑PROVIDER]** | | |

## Severity levels
| Sev | Definition | Examples | Target response |
|---|---|---|---|
| **1 Critical** | Confirmed/likely exposure of service‑user data, cross‑tenant breach, or full outage | Cross‑company data visible; evidence files public; DB compromise | Immediate; engage all leads |
| **2 High** | Security control failure without confirmed exposure | Auth bypass, privilege error, backup failure | ≤ 4 h |
| **3 Medium** | Degraded/contained issue | Single‑user data error, transient job failure | ≤ 1 business day |
| **4 Low** | Minor, no data risk | Cosmetic, isolated bug | Normal backlog |

## Workflow
1. **Detect & log** — record time, reporter, what was seen. Open an incident record (id, severity).
2. **Contain** — stop the bleed: e.g. revoke sessions (`revokeAllForUser` / rotate), disable the
   affected endpoint/feature, block an IP, suspend a company, or take the service offline. Preserve
   evidence (logs, DB snapshot) before changes where possible.
3. **Assess** — what data, whose, how many, which providers, likelihood of harm.
4. **Notify:**
   - **Controller(s):** without undue delay, within **[24–48] h** (per DPA §8).
   - **ICO:** the controller must assess whether the breach is *likely to result in a risk* to
     individuals; if so, report to the ICO **within 72 hours** of the controller becoming aware.
   - **Data subjects:** if *high risk*, the controller informs affected individuals without undue delay.
5. **Recover** — restore from a known‑good backup (see [backup-and-restore.md](../operations/backup-and-restore.md)), verify integrity, resume service.
6. **Review** — post‑incident review within **[5 working days]**: root cause, timeline, fixes,
   lessons; update controls and this procedure.

## Evidence preservation
Preserve: application logs (`pm2 logs`), the security/audit log, relevant DB rows, a DB snapshot,
and the timeline. Restrict access to the incident record.

## Provider communication templates
- *Initial notification:* what happened, when detected, data/individuals potentially affected,
  immediate actions taken, next update time, contact. **[TEMPLATE]**
- *Closure notification:* root cause, remediation, preventative measures. **[TEMPLATE]**

## Rehearsal
Run a tabletop exercise of a Sev‑1 (e.g. suspected cross‑tenant exposure) at least **[annually]** and
record the outcome.
