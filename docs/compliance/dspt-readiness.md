# DSPT Readiness — OrdinCore

> **DRAFT gap analysis, not a submission.** The Data Security and Protection Toolkit (DSPT,
> dsptoolkit.nhs.uk) is NHS Digital / NHS England's annual self-assessment against the National Data
> Guardian's 10 data security standards. Exact assertion wording and evidence requirements are
> published fresh each toolkit year (current cycle runs Apr–Jun submission) — **verify live wording
> on the portal before answering**; this document organises what we already have against the
> standing structure and lists genuine gaps. Replace every **[PLACEHOLDER]**.

## 0. Before anything else: registration type

DSPT self-assessment differs by **organisation type**, chosen at registration on the portal:

- **NHS organisation** (has an ODS code) — not us, unless OrdinCore itself becomes commissioned.
- **Social care provider** — the care providers who use OrdinCore (our controller-customers) are
  increasingly expected by CQC to hold a completed DSPT ("Standards Met") as part of their own
  registration/inspection evidence. **This is likely their obligation, not ours** — but they will
  ask us (as their processor/supplier) for evidence to complete *their own* assertions (see §9,
  Data Security & Protection: Supplier assurance).
- **Commercial third party / supplier** — the pathway for a company like ours that provides a
  digital system processing health/care data but isn't itself a commissioned NHS or care body.
  Registering under this type produces a DSPT organisation code our customers can cite as evidence
  in their own toolkit, and is the likely correct choice if we want NHSmail, GP Connect, or similar
  access later.

**[DECISION NEEDED]** Confirm which of the above applies, and whether the immediate driver is (a) a
customer/procurement asking "are you DSPT compliant / do you have a DSPT code", (b) preparing to
support customers' own DSPT evidence requests, or (c) pursuing NHS digital service access directly.
The answer changes whether we register on the portal at all this cycle, or simply produce an
evidence pack customers can rely on.

## 1. What we already have (from the pilot-readiness pack, 2026‑09‑04)

| Existing doc | DSPT relevance |
|---|---|
| [DPIA.md](./DPIA.md) | Standard 1 (confidential info identified, risk-assessed, DPIA on file) |
| [privacy-notice.md](./privacy-notice.md) | Standard 1 (transparency to data subjects) |
| [data-processing-agreement.md](./data-processing-agreement.md) | Standard 1 & supplier-assurance evidence for customers' own DSPT |
| [subprocessors.md](./subprocessors.md) | Standard 1 (data flow/third-party mapping) — also feeds Standard 9 supplier-chain assurance |
| [uk-hosting-and-data-transfers.md](./uk-hosting-and-data-transfers.md) | Standard 1 (transfers), Standard 9 (technical security) |
| [data-retention-and-deletion.md](./data-retention-and-deletion.md) | Standard 1 |
| [breach-and-incident-response.md](./breach-and-incident-response.md) | Standard 6 (incident management), feeds Standard 1 breach reporting |
| [../operations/backup-and-restore.md](../operations/backup-and-restore.md) | Standard 7 (continuity planning) — implemented & restore-tested |
| [../operations/monitoring-and-alerting.md](../operations/monitoring-and-alerting.md) | Standard 9 (IT protection — monitoring) |
| [../operations/audit-log-integrity.md](../operations/audit-log-integrity.md) | Standard 4 (access is monitored/logged) |
| C‑04 tenant-isolation test suite (see DPIA §6 R1) | Standard 4 (access control), Standard 2 evidence |

This is a genuinely useful head start — most DSPT evidence for **Standards 1, 6, 7** is largely
drafted already. The gaps below are concentrated in **Standards 2, 3, 5, 8, 9, 10**, which the
pilot-readiness pack didn't need to cover.

## 2. Gap map by National Data Guardian standard

| # | Standard | Status | Gap |
|---|---|---|---|
| **1** | Personal confidential data is handled, stored and transmitted securely | 🟢 Largely drafted | Placeholders in DPIA/DPA/privacy notice need controller/DPO sign-off (see docs/README.md status table) |
| **2** | All staff understand their responsibilities under the National Data Guardian's Data Security Standards | 🔴 Not started | No **staff confidentiality/acceptable-use agreement**, no starters/movers/leavers process, no record of who has signed what. Need: a short staff data-security responsibilities policy + signed acknowledgement per employee/contractor. |
| **3** | All staff complete appropriate annual data security training | 🔴 Not started | DSPT requires evidence of **annual IG/data-security training** (NHS Digital Data Security Awareness Level 1, or equivalent) completed by all staff with data access, with completion records. Nothing exists yet — this is usually the single biggest last-mile gap for small suppliers. |
| **4** | Personal confidential data is only accessible to staff who need it | 🟢 Strong | Role/site/company-scoped access control + C‑04 isolation suite is real evidence. Gap: a written **access-control/least-privilege policy** doc and an **access review** record (who has access, reviewed how often) — the control exists in code but isn't described as a policy anyone can point to. |
| **5** | Processes are reviewed at least annually to identify and improve non-compliance | 🔴 Not started | No documented annual IG/security review cycle. Need a short policy: who reviews what, how often, where outcomes are logged. Can piggyback on the existing docs' "review annually" notes — currently scattered, not owned by a process. |
| **6** | Cyber-attacks and data breach responses are managed and understood | 🟡 Drafted | [breach-and-incident-response.md](./breach-and-incident-response.md) is solid but has open placeholders (named contacts, rehearsal not yet run). DSPT also expects evidence of **at least one rehearsal/exercise** in the assessment period. |
| **7** | Continuity planning ensures systems can recover from disaster | 🟡 Partially implemented | Backups implemented & restore-tested (real evidence). Gaps: off-server backup copy (flagged as outstanding), a written **business continuity/disaster recovery plan** beyond the backup runbook (what happens to the service, not just the data, during an extended outage), and a defined/rehearsed RTO. |
| **8** | Unsupported operating systems, software or internet browsers are not used | 🔴 Not assessed | No asset/software inventory exists. Need a short **software/OS support-status register**: server OS version + EOL date, Node/Postgres/Redis versions + support windows, and a patching cadence statement. |
| **9** | IT suppliers are held accountable via contracts; a suitable security certification is in place | 🔴 Biggest gap | Two distinct pieces: **(a)** technical protection — TLS, encryption at rest, access logging, monitoring are real (see ops docs) but not yet described as a single "technical security measures" summary DSPT can point an assertion at; **(b)** **certification** — DSPT strongly expects (and many customer procurement processes require) **Cyber Essentials** (minimum) or **Cyber Essentials Plus**, and increasingly ISO 27001 for larger suppliers. **Neither exists today.** This is usually the long-pole item (external audit/cert body, weeks to months lead time) — start early if pursued. |
| **10** | IT suppliers/subprocessors are accountable for security within their contracts | 🟡 Partially drafted | [subprocessors.md](./subprocessors.md) lists providers and flags DPA status per one, but doesn't yet confirm each subprocessor's own security certification/DSPT status (Krystal, Katapult especially). Action: ask each subprocessor for their Cyber Essentials/ISO27001/DSPT evidence and record it. |

## 3. Concrete next actions, roughly in order

1. **[DECISION]** Resolve §0 — confirm registration type and the actual driver (customer ask vs.
   direct NHS access vs. general readiness). This determines whether a portal submission happens
   this cycle at all.
2. Close the **existing placeholders** already flagged in [../README.md](../README.md) — this is
   shared work between DSPT and the original pilot-readiness gate, so it's not wasted effort either
   way: legal entity name, DPO/IG lead name, ICO registration number, sign-offs.
3. Write the **staff data-security responsibilities policy** + acknowledgement (Standard 2) — short,
   one page, everyone with system access signs it.
4. Stand up **annual data-security training** (Standard 3) — NHS Digital publishes a free e-learning
   package (Data Security Awareness Level 1) suppliers commonly use; record completion per person.
5. Write the **annual IG/security process-review policy** (Standard 5) — who, what, how often, where
   logged. Can be one paragraph naming an owner and a cadence.
6. Turn the ops docs into a **software/OS support register** (Standard 8) and a short **business
   continuity plan** (Standard 7, beyond backups).
7. **[DECISION]** Whether to pursue **Cyber Essentials** (Standard 9) — flag cost/lead time to the
   business owner; this is the item most likely to block a "Standards Met" self-assessment if a
   customer or DSPT reviewer checks for it.
8. Chase each subprocessor (Krystal, Katapult) for their own security certification status
   (Standard 10) and record it in [subprocessors.md](./subprocessors.md).
9. Once the above are in reasonable shape, do a **dry run against the live DSPT portal** — assertion
   wording changes yearly, so treat this document as a briefing pack for that exercise, not a
   substitute for reading the current toolkit.

## 4. What this document is not

- Not legal or IG advice — same caveat as the rest of `docs/compliance/`.
- Not a substitute for the live toolkit at dsptoolkit.nhs.uk, whose exact assertions/evidence
  requirements are versioned per assessment year.
- Not a decision on whether OrdinCore *should* register — that's a business call (§0) this document
  surfaces but doesn't make.
