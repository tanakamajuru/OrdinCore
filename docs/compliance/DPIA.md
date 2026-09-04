# Data Protection Impact Assessment (DPIA) — OrdinCore

> **STATUS: DRAFT for completion and sign‑off.** This DPIA is a working document prepared by the
> development team to structure the assessment. It is **not legal advice** and must be reviewed,
> completed and approved by the data controller's DPO / Information Governance lead before
> identifiable data from additional providers is processed. Replace every **[PLACEHOLDER]**.

| | |
|---|---|
| System | OrdinCore — multi‑tenant care‑governance platform (web, iOS/Android, API) |
| Controller | **[LEGAL ENTITY NAME]**, ICO registration **[ICO NUMBER]** |
| Processor (platform operator) | **[OrdinCore operating entity]** |
| DPO / IG lead | **[NAME, EMAIL]** |
| Assessment owner | **[NAME]** |
| Version / date | v0.1 — 2026‑09‑04 |
| Review date | **[DATE — at least annually and on any material change]** |

## 1. Why a DPIA is required
OrdinCore processes **special category data** (health, mental‑health, behavioural information about
service users), about **vulnerable individuals**, at scale, across **multiple independent care
providers** on shared infrastructure, and includes **photo/voice evidence**. This meets several ICO
"likely high risk" triggers, so a DPIA is mandatory under UK GDPR Art. 35.

## 2. Describe the processing
- **Nature:** capture of governance "signals" about service users; management triage decisions;
  actions, escalations, risks, patterns, weekly reviews, incidents; reporting and assurance.
- **Scope:** service users, staff (support workers, team leaders, RMs, RIs, directors, admins),
  across multiple provider organisations (tenants), UK supported‑living / mental‑health settings.
- **Context:** front‑line staff use the mobile app; managers use the web app; each provider is a
  separate tenant isolated by `company_id`.
- **Data categories:**
  - Service users: name/initials, service/house, **health & mental‑health status, behaviour,
    medication, safeguarding, incidents** (special category); photo & voice **evidence**.
  - Staff: name, email, role, site assignment, authentication data.
- **Volumes / retention:** **[EXPECTED RECORD VOLUMES]**; retention per
  [data-retention-and-deletion.md](./data-retention-and-deletion.md).
- **Data flow:** mobile/web → API (Node/Express) → PostgreSQL; media to server disk
  (`backend/storage/uploads`, authenticated access only); async jobs via Redis/BullMQ; email via
  SMTP (Katapult); **narrative generation may call OpenAI (see §6, key risk)**.

## 3. Necessity and proportionality
- **Lawful basis (controller to confirm):** likely UK GDPR Art. 6(1)(e)/(f) and, for special
  category data, **Art. 9(2)(h)** (health/social care) — controller must document this and the
  associated Art. 9 condition and DPA 2018 Schedule 1 condition. **[CONFIRM]**
- **Data minimisation:** signals should record only what is necessary; discourage free‑text
  over‑collection; media (photo/voice) captured only as evidence and access‑controlled.
- **Purpose limitation:** governance oversight and CQC assurance only; no secondary use.

## 4. Consultation
- Front‑line staff, RMs and RIs consulted on workflow. **[RECORD DATES / OUTCOMES]**
- Service‑user / advocate consultation as appropriate. **[RECORD]**

## 5. Identify risks (to individuals)
| # | Risk | Likelihood | Severity |
|---|---|---|---|
| R1 | Cross‑tenant leakage — one provider seeing another's service‑user data | Med (pre‑C‑04 proof) | High |
| R2 | Unauthorised access to evidence media (photos/voice) | Low (post C‑01) | High |
| R3 | Special‑category data sent to a US LLM subprocessor (OpenAI) | **Med–High** | High |
| R4 | Credential compromise / weak session revocation | Low (post M‑05/M‑06) | High |
| R5 | Data loss (no tested backup/restore) | Med | High |
| R6 | Excessive retention / no deletion routine | Med | Med |
| R7 | Re‑identification via free‑text over‑collection | Med | Med |

## 6. Measures to reduce risk
| # | Measure | Status |
|---|---|---|
| R1 | Tenant isolation by `company_id` + role/site middleware; **automated two‑tenant isolation test suite (C‑04)** as the proof gate | Middleware ✅; **suite outstanding** |
| R2 | Evidence served only via authenticated, tenant/site‑scoped endpoint; files outside web root; access audit‑logged (C‑01) | ✅ Done |
| R3 | **Narrative/LLM (OpenAI) processing — KEY RISK.** Options, pick one before pilot expansion: (a) **do not send identifiable/special‑category data** to the LLM (de‑identify inputs); (b) sign an OpenAI DPA with **zero‑retention & no‑training** and document the US‑transfer safeguard (IDTA/UK Addendum + TRA); or (c) **disable** narrative LLM features for the pilot. Record which OpenAI features are live and exactly what data they receive. | **DECISION REQUIRED** |
| R4 | Refresh‑token rotation/revocation/reuse‑detection; fail‑closed sessions; login throttling; hashed single‑use reset tokens (M‑05/M‑06) | ✅ Done |
| R5 | Encrypted automated backups + tested restore | See [backup-and-restore.md](../operations/backup-and-restore.md) |
| R6 | Retention schedule + secure deletion routine | See [data-retention-and-deletion.md](./data-retention-and-deletion.md) |
| R7 | Field‑level guidance, character limits, review of free‑text prompts | **[PLAN]** |

## 7. Outcome / sign‑off
- Residual risk after measures: **[LOW / MEDIUM — controller to assess]**.
- **Do not onboard additional providers with identifiable data until R1 (C‑04 proof) and R3
  (LLM decision) are closed and backups/restore (R5) are demonstrated.**
- Approved by (DPO): **[NAME, DATE]** · Approved by (SIRO/controller): **[NAME, DATE]**
- ICO prior consultation required? Only if high residual risk cannot be mitigated. **[ASSESS]**
