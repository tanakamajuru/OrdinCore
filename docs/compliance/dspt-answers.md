# DSPT Answer Worksheet — OrdinCore (IT Supplier / Category 2, v8 2025‑26)

> **Working draft, not a submission.** Source: the official NHS England DSPT v8 (2025‑26) "Assertions
> and Evidence items" spreadsheet for the **IT Suppliers (Category 2)** organisation type, downloaded
> 2026‑09‑07 from [dsptoolkit.nhs.uk](https://www.dsptoolkit.nhs.uk/News/161) (submission deadline
> **30 June 2026**). This lists every evidence item that category answers (122 items), with a draft
> answer/status against each, built from the existing [compliance](.) and [operations](../operations)
> pack and a targeted check of the codebase. Every **[NEEDS INPUT]** needs a fact only a human can
> supply (a name, a decision, a document to write) before this could be submitted for real — none of
> this should be pasted into the live portal as-is. **[CONFIRM]** items are technical facts a
> developer should verify against the live server/config rather than assume from this pass.
>
> **Read [dspt-readiness.md](./dspt-readiness.md) first** — it covers the §0 registration-type
> decision (do we even submit this?) and the Standard‑9 Cyber Essentials Plus strategic call, which
> this worksheet assumes rather than re-argues.
>
> **Why Cyber Essentials Plus matters here specifically:** columns in the source spreadsheet mark
> ~20 of these 122 items as "exempt if CE+ certified" — mostly the granular technical items under
> Standards 4, 6, 8 and 9 (antivirus specifics, patching cadence, backup testing, penetration
> testing, firewall rule detail, endpoint build standards). Getting certified doesn't just satisfy
> Standard 9's own assertion — it removes the evidence burden for roughly a sixth of the whole
> toolkit. Those items are marked **(CE+ exempt)** below.

## How to use this

Each row: **ref** — question (paraphrased) — **draft answer/status**. Mandatory items (must be
answered for "Standards Met") are marked **[M]**; items only mandatory at "Approaching Standards"
are marked **[A]**; unmarked items are optional/best-practice. Full original wording, tooltips and
links are in the source spreadsheet, not reproduced here — pull the specific item up on the portal
when actually answering it.

---

## Standard 1 — Personal confidential data / lawfulness, transparency, accountability, records

### 1.1 Framework for lawfulness, fairness and transparency
- **1.1.1** [M][A] ICO registration number. → **[NEEDS INPUT]** the actual registration number —
  see the **[ICO NUMBER]** placeholder in [DPIA.md](./DPIA.md) and [privacy-notice.md](./privacy-notice.md).
  If not yet registered, register now (this is a hard blocker, not just a DSPT item).
- **1.1.2** [M][A] Documented record of what personal data is held/shared (ROPA/IAR). → **Partially
  covered.** [DPIA.md](./DPIA.md) §2 describes data categories and flow; [subprocessors.md](./subprocessors.md)
  covers sharing. Neither is packaged as a single reviewed/approved register. **Action:** combine
  into one Information Asset Register, get it reviewed/approved (by whoever ends up named SIRO/DPO)
  and dated.
- **1.1.3** [M][A] Published privacy notice. → **Drafted, not published.** [privacy-notice.md](./privacy-notice.md)
  exists as a template for the *care-provider controller* to publish, not one for OrdinCore itself as
  processor. **[NEEDS INPUT]** decide whether OrdinCore (as a company) also needs its own public
  privacy notice (e.g. on the marketing site) — likely yes, for the landing page.
- **1.1.4** [M] Documented, classified hardware/software asset register with named ownership. →
  **Gap — none exists.** See [dspt-readiness.md](./dspt-readiness.md) §Standard 8. **Action:** a short
  register — server(s), DB, Redis, Node version, mobile app, key SaaS dependencies — with an owner.
- **1.1.5** [M][A] Names/titles of staff responsible for data protection & data security (DPO, SIRO,
  Caldicott Guardian, Head of IT, Cyber Security Lead). → **[NEEDS INPUT]** — same placeholder as
  DPIA/DPA/breach-response docs. For a small supplier these roles can combine onto very few people;
  they still need naming and a documented assignment (job description line, meeting minute, or email).
- **1.1.6** Consent-recording process reviewed. → **Likely N/A / not consent-based.** OrdinCore's
  lawful basis is Art. 6(1)(e)/(f) + Art. 9(2)(h) (health/social care), not consent — see
  [DPIA.md](./DPIA.md) §3. Tick "Yes" and state this basis in the comment.

### 1.2 Individuals' rights
- **1.2.2** [M] Process to handle objections to processing. → **[NEEDS INPUT]** — not yet documented
  as a standalone process; the DPA (§7) commits OrdinCore to *assist* the controller, but the
  controller-facing process itself needs writing (who at OrdinCore handles a forwarded request, in
  what timeframe).
- **1.2.3** [M] Process for subject access requests (SARs), with evidence of timescale compliance. →
  **[NEEDS INPUT]** same as above — no SAR log exists yet because no requests have been received;
  document the process even with zero volume to date.
- **1.2.4** [M] National Data Opt-Out compliance. → **Likely N/A.** The opt-out applies to
  confidential patient information used for research/planning purposes by health bodies; OrdinCore's
  processing is direct care-governance, not secondary use. Tick and state "Not applicable — direct
  care governance only, no secondary research/planning use" — **[CONFIRM]** this reasoning with
  whoever ends up as DPO.

### 1.3 Accountability & governance
- **1.3.1** [M][A] Board-approved data security/protection policies, updated ≤3 years. → **Drafted,
  not approved.** The whole `docs/compliance/` pack is exactly this content but is explicitly marked
  "not signed off" — see [docs/README.md](../README.md) status table. **Action:** get a sign-off,
  even an informal directors' decision recorded in writing, dated.
- **1.3.2** [M] Annual monitoring/spot-checks of own compliance with policies. → **Gap.** No review
  cadence exists yet — this is exactly Standard 5's gap too. **Action:** the single process-review
  policy recommended in [dspt-readiness.md](./dspt-readiness.md) §3 covers this.
- **1.3.3** [M] SIRO responsibility assigned. → **[NEEDS INPUT]** — same as 1.1.5.
- **1.3.4** [M] Documented lines of responsibility/accountability. → **[NEEDS INPUT]** — depends on
  1.1.5/1.3.3 being resolved first; then a short org chart / RACI note closes this.
- **1.3.5** [M] (CE+ exempt only for the *lookup table entry*, not ISO27001) Data security risk
  register linked to corporate risk. → **Partially covered.** [DPIA.md](./DPIA.md) §5 is a risk
  register in substance (R1–R7 with likelihood/severity/status) but scoped to the DPIA, not a
  standing corporate risk register reviewed regularly. **Action:** either keep the DPIA table as the
  register and commit to a review cadence, or lift it into a dedicated risk register doc.
- **1.3.6** [M] Top three data security/protection risks. → **Answerable now** from
  [DPIA.md](./DPIA.md) §5: R1 (cross-tenant leakage, now largely mitigated by the C‑04 isolation
  suite), R5 (backup/restore — now implemented & tested), and the **currently open** one is really
  the **off-server backup copy** (single point of failure) — see
  [backup-and-restore.md](../operations/backup-and-restore.md) "Outstanding actions" #1.
- **1.3.7** [M][A] Data protection by design/default embedded in processing activities. → **Largely
  evidenced**: tenant isolation by `company_id`, role/site-scoped access, evidence media behind
  authenticated access, encrypted backups — all pre-existing architectural choices, not
  retrofits. **Action:** write one short paragraph making this explicit as a "data protection by
  design" statement, citing the DPIA measures table.
- **1.3.8** [M][A] Process to identify when a DPIA is needed. → **Partially covered** — a DPIA
  exists ([DPIA.md](./DPIA.md)) but there's no standing *trigger process* for deciding when a new
  DPIA is required for future changes (e.g. re-enabling the LLM feature, per DPIA R3). **Action:** a
  one-paragraph DPIA-screening procedure (a short checklist: new data type, new processing purpose,
  new high-risk technology → DPIA required).

### 1.4 Records management
- **1.4.1** [M][A] Records management policy incl. retention schedule. → **Drafted, periods not
  confirmed.** [data-retention-and-deletion.md](./data-retention-and-deletion.md) has the structure;
  every period is a **[CONFIRM]** placeholder. **Action:** get the controller-side retention periods
  agreed (these are usually set by the care-provider customers' own IG leads, informed by adult
  social-care record-retention norms — e.g. 8 years after last contact — not something OrdinCore can
  decide unilaterally).

---

## Standard 2 — Staff responsibilities

- **2.2.1** [M][A] (ISO27001 exempt) All employment contracts contain data security requirements. →
  **[NEEDS INPUT]** — check actual employment contract wording. If contracts predate this, an
  addendum or a signed acceptable-use policy referencing the contract closes the gap faster than
  reissuing contracts. See [dspt-readiness.md](./dspt-readiness.md) Standard 2.

---

## Standard 3 — Staff training

- **3.1.1** [M] (ISO27001 exempt) Training needs analysis covering all staff roles, endorsed by
  leadership. → **Gap — none exists.** Note the tooltip explicitly says: *"If your organisation is an
  IT supplier, this should cover staff involved in services provided in the role of supplier to
  health and care organisations"* — i.e. this can be scoped to the people who actually touch
  production/customer data, not the whole company if there are non-technical roles. **Action:** see
  [dspt-readiness.md](./dspt-readiness.md) §3 action 4 — adopt NHS Digital's free Data Security
  Awareness Level 1 e-learning as the baseline.
- **3.1.2** [M] Training activities implemented and followed by all (in-scope) staff. → Depends on
  3.1.1 existing first. **[NEEDS INPUT]** completion records once training is stood up.
- **3.1.3** [M] Evaluation of training effectiveness. → Depends on 3.1.1/3.1.2.
- **3.2.1** [M] IG/cyber security prioritised by leadership (board evidence). → **[NEEDS INPUT]** —
  answerable once 1.1.5/1.3.3 named roles exist and can point to concrete engagement (e.g. this very
  DSPT prep being leadership-initiated is itself evidence).
- **3.2.2** Actions taken openly re: IG/security concerns ("just culture"). → Optional (not
  mandatory) but easy: cite [breach-and-incident-response.md](./breach-and-incident-response.md)'s
  no-blame workflow once it has real contacts filled in.
- **3.2.3** Training programme informed by staff engagement. → Optional; **[NEEDS INPUT]**.

---

## Standard 4 — Managing data access

- **4.1.1** [M][A] Understand who has access to personal/confidential data across all systems. →
  **Well evidenced.** Role/site/company-scoped access control is the architectural backbone (see
  DPIA §6 R1, R4) and the C‑04 isolation test suite proves it. **Action:** just write the one-page
  summary [dspt-readiness.md](./dspt-readiness.md) flags under Standard 4.
- **4.1.2** Least-privilege access (RBAC), policy reviewed. → Same evidence as 4.1.1; needs the
  written policy artifact, not new controls.
- **4.2.1** [M] Date of last user-account access audit. → **[NEEDS INPUT]** — has this ever been
  formally done (comparing an HR leavers list against active accounts)? If not, do one now and record
  the date; this is cheap and fast to close.
- **4.2.2** Incident summary: role/access mismatches in last 12 months. → Answerable from the
  `audit_logs` table / security-event log once queried — **[NEEDS INPUT]** the actual query result
  (likely "none known" given the isolation suite, but confirm).
- **4.2.3** [M] (CE+ and ISO27001 exempt) Logs retained ≥6 months, managed securely, searchable. →
  **Partially covered** — `audit_logs` + app logs exist (see
  [audit-log-integrity.md](../operations/audit-log-integrity.md)) but retention period and
  searchability aren't formalised, and append-only hardening is still an open action item there.
- **4.2.4** [M][A] (CE+ exempt) Unnecessary accounts removed/disabled promptly. → **[NEEDS INPUT]** —
  confirm there's an actual offboarding step wired to account deactivation (technically the code
  supports revoking sessions per DPIA R4, but "is a leaver's account disabled same-day" is an
  operational practice question, not a code question).
- **4.3.1** [M] (ISO27001 exempt) System admins signed an accountability agreement. → **[NEEDS
  INPUT]** — likely doesn't exist as a distinct document; folds into 2.2.1 (contract clauses) if
  admins are also employees.
- **4.3.2** [M] (ISO27001 exempt) Users/systems authenticated before access, proportionate to
  criticality. → **Well evidenced** — bcrypt password hashing (`auth.service.ts`), refresh-token
  rotation/revocation/reuse-detection, fail-closed sessions, rate-limited auth routes
  (`rateLimit.middleware.ts`) all confirmed in the codebase.
- **4.4.1** [M] Privileged-account logs kept securely, read-only/tamper-proof. → **Gap** — same
  append-only hardening item as 4.2.3; see [audit-log-integrity.md](../operations/audit-log-integrity.md)
  action 1 (revoke UPDATE/DELETE from the `ordinuser` app role).
- **4.4.2** [M] Privileged accounts not used for email/web browsing. → **[CONFIRM]** — likely N/A in
  the sense that "privileged accounts" here means server/infra admin access (SSH/DB), which is
  already separate from any end-user email use; state this explicitly rather than leaving blank.
- **4.4.3** Privileged access only from organisation-owned/managed devices. → **[CONFIRM]** with
  whoever holds SSH/server access today.
- **4.5.1** [M] (CE+ and ISO27001 exempt) Password policy exists covering reuse, storage, memorisation. →
  **Gap — no written policy**, though bcrypt hashing exists technically. **Action:** short written
  password policy (even one page) — cheap to close.
- **4.5.2** [M] (CE+ exempt) Technical controls enforce password policy / anti-guessing. → **Partially
  evidenced** — bcrypt hashing + auth rate limiting exist; a written policy (4.5.1) should describe
  these as the enforcement mechanism.
- **4.5.3** [M] MFA enforced on all remote/privileged accounts. → **Gap confirmed by codebase check
  — no MFA/2FA implementation found** in `backend/src`. This is a real, non-trivial gap: MFA is
  mandatory (not just approaching-standards) in v8. **Action:** flag to engineering — likely needs a
  TOTP-based second factor on the web app login, at minimum for admin/RM+ roles, before this item can
  be answered "Yes" honestly.
- **4.5.4** [M][A] Default passwords changed on privileged/system/social accounts. → **[NEEDS
  INPUT]** — infra-level check (server root, DB superuser, social media accounts if any exist).
- **4.5.5** Time-limited third-party/privileged access. → **[CONFIRM]** whether any third party
  (e.g. Krystal support) has standing vs. time-boxed access.
- **4.5.6** [M] Software provided to health/care supports identity federation or MFA to industry
  standard, or has a resourced plan by 30 Jun 2027. → **Same gap as 4.5.3.** Given the 2027 grace
  date, this can honestly be answered as "plan in progress" this cycle if MFA work is scheduled, but
  a real plan (not just an intention) needs to exist — this is the item most likely to force an
  actual engineering task out of this DSPT exercise.

---

## Standard 5 — Process reviews

- **5.1.1** [M] (ISO27001 exempt) Root-cause analysis after security incidents, findings acted on. →
  **Process exists in principle** — [breach-and-incident-response.md](./breach-and-incident-response.md)
  step 6 ("Review") — but has never been exercised (no incidents yet) and the rehearsal called for
  in that doc hasn't happened. **Action:** run the tabletop exercise that doc already asks for.
- **5.2.1** Actions from process reviews monitored, reported to leadership. → Depends on 1.3.2/5.1.1
  existing as a running practice, not just a written procedure.

---

## Standard 6 — Responding to incidents

- **6.1.1** [M][A] (ISO27001 exempt) Confidential incident/near-miss reporting system, used by all
  staff groups. → **Drafted, not rehearsed.** [breach-and-incident-response.md](./breach-and-incident-response.md)
  defines the workflow; **[NEEDS INPUT]** the actual incident count/near-miss count this year
  (likely zero — state that).
- **6.1.2** [M][A] (ISO27001 exempt) Board informed of action plans for ICO/DHSC-reported breaches. →
  **Likely N/A this cycle** if there have been no reportable breaches — tick and state "No breaches
  reported in the assessment period."
- **6.1.3** [M][A] High-risk-breach individuals notified. → Same — **likely N/A**, state "No
  breaches."
- **6.2.1** [M][A] (CE+ and ISO27001 exempt) Antivirus/anti-malware on all internet-connected
  computers. → **[NEEDS INPUT]** — confirm what's actually running on staff laptops/dev machines (the
  server itself is Linux/VPS, this item is really about staff endpoints).
- **6.2.3** [M] (CE+ exempt) AV kept continually up to date. → Same as above.
- **6.2.4** [M] (CE+ exempt) AV scans on access. → Same.
- **6.2.5** [M] (CE+ exempt) Malicious-website connections prevented. → **[CONFIRM]** — likely no
  formal control (web proxy/protective DNS) exists yet for staff endpoints.
- **6.2.6** Phishing emails reported per month. → **[NEEDS INPUT]** — no formal reporting channel
  exists yet; optional item, lowest priority.
- **6.2.8** [M] DMARC/DKIM/SPF implemented on organisation's email domains. → **[CONFIRM]** — this is
  a DNS-level setting for whichever domain sends OrdinCore's own staff email (not the Katapult
  transactional-email domain, which is a separate concern already flagged in
  [subprocessors.md](./subprocessors.md)). Check the DNS records for the company's own mail domain.
- **6.2.9** [M] Spam/malware filtering + DMARC enforcement on inbound email. → Same as 6.2.8 — likely
  whatever email provider is used (Google Workspace/Microsoft 365/etc.) already provides this;
  **[CONFIRM]** and name the provider.
- **6.3.1** [M] Whether any incident was caused by a known vulnerability. → **Answerable now: "None"**
  (no incidents recorded to date, per the breach-response doc's blank incident log).
- **6.3.3** [M] Proportionate monitoring solution to detect security events. → **Partially covered** —
  [monitoring-and-alerting.md](../operations/monitoring-and-alerting.md) documents the implemented
  watchdog (health/cert/backup checks every 5 min) plus the explicitly flagged gap (log-based
  alerting on `refresh-token reuse` / anomalous evidence access / 5xx bursts is "still to add").
- **6.3.4** [M] New fraud-attractive digital services get transactional monitoring from the outset. →
  **Likely N/A** — OrdinCore isn't a payments/financial-transaction system; tick and state this.
- **6.3.5** Repeat incidents in the last 12 months. → **Answerable now: "None"** (no incidents to
  date).

---

## Standard 7 — Continuity planning

- **7.1.1** [M] Document(s) describing key operational services, their dependencies, and impact of
  loss. → **Gap** — no such document exists distinct from the technical architecture already
  described piecemeal across the compliance pack. **Action:** short document naming the service
  (OrdinCore platform), its dependencies (Krystal VPS, PostgreSQL, Redis, Katapult SMTP), and impact
  of each failing.
- **7.1.2** [M] (ISO27001 exempt) Business continuity plan covers data/cyber security, tested. →
  **Gap, flagged already** in [dspt-readiness.md](./dspt-readiness.md) Standard 7 — the backup
  runbook covers *data* continuity but not *service* continuity (what happens to the app/company
  during an extended outage). **Action:** the short BCP recommended there.
- **7.1.3** Resources/information needed for incident response identified. → Folds into 7.1.1/7.1.2.
- **7.1.4** Threat intelligence used to make temporary security changes. → Optional; **[NEEDS
  INPUT]** — likely no formal threat-intel subscription exists yet (NCSC's free Early Warning
  service, flagged separately at 8.3.8, would cover this).
- **7.1.5** [M] Plan to communicate incidents to customers within 24h. → **Partially covered** —
  [breach-and-incident-response.md](./breach-and-incident-response.md) commits to notifying
  controllers within 24–48h (per the DPA §8); tighten the stated window to ≤24h to match this
  assertion exactly, or justify the 24–48h range in the comment.
- **7.2.1** [M] (ISO27001 exempt) Incident response plan tested since 1 Jul 2025, with board/business
  participation. → **Gap** — the rehearsal called for in
  [breach-and-incident-response.md](./breach-and-incident-response.md) ("Rehearsal" section) hasn't
  happened yet. **Action:** run it, and this item, 5.1.1 and 6.1.1 all close together.
- **7.2.2** [M] (ISO27001 exempt) Issues/actions from the BC exercise, with named owners. → Output of
  running 7.2.1.
- **7.3.1** [M][A] Mitigating measures assessed/applied on incident discovery, drawing on expert
  advice where needed. → **Partially covered** by the breach-response workflow's "Contain" step;
  "expert advice" route (e.g. an external incident-response retainer) isn't named — **[NEEDS
  INPUT]**.
- **7.3.2** [M][A] Emergency contacts kept securely in hardcopy, up to date. → **Gap** — the breach
  doc has a contacts table full of **[NAME]** placeholders; once named, someone needs to actually
  print/store it offline per the assertion's letter.
- **7.3.3** Draft press materials ready for a data security incident. → Optional; **[NEEDS INPUT]** —
  unlikely to exist for a company this size; low priority.
- **7.3.4** [M] Backups made, tested, documented, reviewed. → **Strongly evidenced** — see
  [backup-and-restore.md](../operations/backup-and-restore.md): daily encrypted DB + evidence-media
  backups, restore tested 2026‑09‑04 with a verified row-count match.
- **7.3.5** [M] (CE+ and ISO27001 exempt) Backups tested regularly (≥ annually) for full restore. →
  **Evidenced** — same restore test as above; **Action:** commit to a recurring (e.g. quarterly)
  re-test cadence, not just the one-off test on record.
- **7.3.6** [M] Backups kept offline/separate from the network. → **Gap, already flagged** — the
  backup runbook's own "Outstanding actions" #1 calls for an off-server copy in a separate UK
  location; today's backups sit on the same VPS as production, which fails this item as written.
  **This is the single highest-priority operational action in this whole worksheet** — it's cheap,
  already scoped, and blocks both this item and 1.3.6 (top risks).

---

## Standard 8 — Unsupported systems

- **8.1.1** [M] (CE+ exempt) Documented process tracking software assets/versions. → **Gap** — see
  [dspt-readiness.md](./dspt-readiness.md) Standard 8 action.
- **8.1.2** [M] Tracks end-user devices and removable media assets. → **Gap** — no device inventory
  exists (mainly relevant to staff laptops, not the server fleet).
- **8.1.4** Unsupported software uninstalled or isolated. → Depends on 8.1.1 existing to know what's
  unsupported. **[CONFIRM]** current OS/Node/Postgres/Redis versions are in-support before answering.
- **8.2.1** [M] List of unsupported software with remediation plan. → Same — **Action:** the
  software/OS support-status register from [dspt-readiness.md](./dspt-readiness.md) doubles as this.
- **8.2.2** [M] SIRO confirms unsupported-system risk is managed and reported to the board. →
  **[NEEDS INPUT]** — if the register comes back clean (nothing unsupported), tick and state "No
  unsupported systems" per the tooltip's own suggested wording.
- **8.3.1** [M] How systems receive updates, how often. → **[NEEDS INPUT]** — describe the actual
  patching practice for the VPS (OS packages) and app dependencies (npm/pnpm) — likely ad hoc today;
  worth formalising even briefly (e.g. "OS security patches applied within X days via unattended
  upgrades; app dependencies updated at each deploy").
- **8.3.2** How often (days) automatic patching reaches remote endpoints. → **[NEEDS INPUT]** —
  applies to any staff laptops with managed patching; likely N/A if there's no MDM, in which case say
  so rather than leaving blank.
- **8.3.3** [M] (CE+ exempt) Documented, SIRO-approved patching approach. → Depends on 8.3.1 + SIRO
  being named.
- **8.3.4** [M] (CE+ exempt) Critical/high patches applied within 14 days, or risk formally accepted. →
  **[NEEDS INPUT]** — needs an actual practice commitment, then evidence of adherence over time.
- **8.3.5** Explanation where a critical patch wasn't applied. → Only needed if 8.3.4 has exceptions.
- **8.3.6** [M] Advanced Threat Protection capability actively managed (e.g. Defender for Endpoint). →
  **[CONFIRM]** — likely N/A/not applicable to a small Linux VPS estate without Windows endpoints;
  if so, state what equivalent protection exists (e.g. fail2ban, the existing monitoring watchdog) —
  don't leave this blank since it's mandatory.
- **8.3.7** [M] 95%/98% server/desktop estate on supported OS versions, or SIRO-approved plan. →
  **[CONFIRM]** current server OS version and its support end-of-life date — likely fine, just needs
  stating explicitly with a date.
- **8.3.8** [M] Registered and actively using the NCSC Early Warning service. → **Gap — easy win.**
  Free service, quick to register: https://www.ncsc.gov.uk/information/early-warning-service.
  **Action:** do this regardless of anything else — cheapest item on this whole list relative to
  value.
- **8.4.1** [M] Infrastructure protected via secure configuration/patching, mitigations where not
  possible. → **Partially evidenced** — TLS on the public domain, firewall/access-control middleware,
  cert-expiry monitoring per [monitoring-and-alerting.md](../operations/monitoring-and-alerting.md);
  needs writing up as one coherent statement.
- **8.4.2** [M] All infrastructure in vendor support, patched regularly, or isolated + SIRO
  risk-accepted. → Same as 8.3.x — depends on the asset register existing.
- **8.4.3** [M] Current understanding of hardware/software exposure to known vulnerabilities
  (vulnerability management process). → **Gap** — no vulnerability-scanning practice exists today;
  ties to the Cyber Essentials decision (a CE/CE+ assessment effectively forces this to exist).

---

## Standard 9 — IT protection (technical security + certification)

- **9.1.1** [M] (CE+ exempt) Head of IT confirms all networking-component default passwords changed. →
  **[CONFIRM]** with whoever manages the VPS/router-level config, if any networking hardware exists
  beyond the hosted VPS itself (likely minimal/managed-by-Krystal — state that).
- **9.2.1** [M] (CE+ exempt) Annual penetration test scoped/undertaken (incl. vulnerability scan,
  default-password check), since 1 Jul 2024. → **Confirmed gap — no penetration test has ever been
  run** (verified: no mention anywhere in the compliance/ops pack or codebase). This is one of the
  two biggest gaps in the whole toolkit (with MFA at 4.5.3/4.5.6). **Action:** commission an external
  penetration test — budget and schedule this explicitly; it's also a customer-procurement staple
  independent of DSPT.
- **9.2.3** [M] (CE+ exempt) SIRO reviewed pentest results with an action plan. → Depends on 9.2.1.
- **9.3.1** [M] Web apps protected against OWASP Top 10 (SSDLC in place). → **[CONFIRM]** — the
  codebase shows security-conscious middleware (helmet, CORS allow-list, rate limiting, tenant
  isolation tests) but no documented secure-SDLC process or OWASP-aligned review practice. **Action:**
  a short paragraph describing current practice (code review, the C‑04 isolation test suite as a
  security regression gate) counts as a start; a proper SSDLC statement is better.
- **9.3.3** [M] Protective DNS / malicious-site-blocking in place. → **[CONFIRM]** — likely no
  protective DNS service is configured; UK Public Sector DNS is free to adopt.
- **9.3.4** [M] Authoritative DNS changes restricted to authenticated/authorised admins. → **[CONFIRM]**
  with whoever holds the domain registrar/DNS provider account for `ordincore.co.uk`.
- **9.3.5** [M] Organisation understands/records all IP ranges in use. → **Answerable now** — the
  known estate is small: one Krystal VPS (`185.116.215.178`) plus whatever IP ranges Katapult/OpenAI
  (dormant)/Expo/Apple/Google touch as listed in [subprocessors.md](./subprocessors.md). Write this
  up as the answer directly.
- **9.3.6** [M] Data in transit (incl. email) protected by encryption (TLS ≥1.2). → **Evidenced** —
  TLS on `work.ordincore.co.uk` (monitored for expiry), UK hosting doc confirms encryption in
  transit.
- **9.3.9** Medical-device data-security assurance process. → **N/A** — OrdinCore has no medical
  devices connected to its network. Tick and state "Not applicable."
- **9.4.1** Validation that security measures remain effective over time. → Optional; **[NEEDS
  INPUT]** — folds into whatever annual review process comes out of Standard 5.
- **9.4.4** [M] Security deficiencies from assurance activities tracked to remediation. → Depends on
  9.2.1 (pentest) and 8.4.3 (vuln management) existing to generate findings to track.
- **9.4.5** [M] Independent audit of the DSPT itself, reported to the board. → **This is the
  "Independent Assessment" — a distinct, separate requirement from the self-assessment**, only
  triggered for certain organisation types/thresholds. **[NEEDS INPUT]** — confirm on the portal at
  registration whether OrdinCore's category requires this; likely not for a small IT supplier below
  the independent-assessment threshold, but verify rather than assume.
- **9.5.1** [M] Technical controls manage software installation on devices (application allow-listing
  or restricted admin rights). → **[CONFIRM]** — mainly relevant to staff laptops; likely informal
  today.
- **9.5.2** [M] Mobile devices/removable media encrypted at rest; remote wipe capability. → **[CONFIRM]
  / likely N/A for company-owned devices** — the OrdinCore *mobile app* is used on staff's own
  devices at care-provider customers (BYOD, out of OrdinCore's control as processor, not asset
  owner); this item is about OrdinCore's *own* corporate devices (laptops), not customer end-user
  phones. Answer for the former only.
- **9.5.3** [M] Change management process for network/system configuration. → **[CONFIRM]** — likely
  informal (git-based deploys via `deployment/deploy.sh`); worth writing up even briefly as "changes
  are made via reviewed code changes deployed through `deploy.sh`, with pre-release backups per the
  backup runbook."
- **9.5.5** [M] (CE+ exempt) End-user devices built from consistent approved base image. → **[CONFIRM]**
  — likely N/A/informal for a small team; state actual practice.
- **9.5.6** [M] (CE+ exempt) End-user device security settings centrally managed. → **[CONFIRM]** —
  likely no MDM in place; note as a gap if so.
- **9.5.7** [M] (CE+ exempt) AutoRun disabled. → **[CONFIRM]** on staff devices; a Windows-specific
  default that's usually already off on modern builds.
- **9.5.8** [M] (CE+ exempt) All remote access authenticated. → **Evidenced** for the application
  layer (auth required for all API access); **[CONFIRM]** for infrastructure-level remote access
  (SSH to the VPS) — should already be key-based, confirm no password SSH auth is enabled.
- **9.5.9** (CE+ exempt) Plan for devices natively unable to connect to the internet. → **Likely
  N/A** — no air-gapped/standalone devices in the estate; tick and state so.
- **9.5.10** Secure email standard (DCB1596) compliance. → Marked exempt for NHSmail users; **[CONFIRM]**
  whether this applies given Katapult is the transactional email provider, not NHSmail.
- **9.5.11** [M] Software provided to health/care follows the government Software Security Code of
  Practice. → **[CONFIRM]** — no formal assessment against this code exists yet; worth a short
  self-assessment against the NCSC template, since OrdinCore's core product *is* software provided
  to health and care.
- **9.6.1** [M] (CE+ and ISO27001 exempt) Firewall(s) on all network boundaries. → **[CONFIRM]** —
  likely covered by Krystal's hosting-level network security plus OS-level firewall (e.g. `ufw`) on
  the VPS; confirm and document what's actually configured.
- **9.6.2**–**9.6.6** [M, all CE+ exempt] Firewall admin-interface access, default-deny inbound,
  documented rules, regular rule review, personal firewalls on endpoints. → **[CONFIRM]** each — all
  depend on documenting the actual VPS firewall configuration, which likely exists technically
  (a production server wouldn't run without *some* inbound restriction) but isn't written up
  anywhere. **This entire 9.6 block is a strong argument for pursuing Cyber Essentials Plus** — CE+
  exempts all six items at once.

---

## Standard 10 — Suppliers accountable for security

- **10.1.1** [M][A] Up-to-date supplier list (who processes personal data / provides critical IT,
  contract durations). → **Well covered** — [subprocessors.md](./subprocessors.md) is exactly this;
  needs a "last reviewed" date and confirmed contract-duration details to fully match the wording.
- **10.1.2** Contracts with third parties handling personal data comply with ICO guidance (Art. 28). →
  **Partially covered** — [data-processing-agreement.md](./data-processing-agreement.md) is the
  Art. 28 template OrdinCore offers *its own customers*; whether OrdinCore's own upstream contracts
  (Krystal, Katapult) have equivalent Art. 28 terms **[NEEDS INPUT]** — action item #3 in
  [subprocessors.md](./subprocessors.md) already flags "confirm a signed DPA is on file for every
  subprocessor."
- **10.2.1** [M] Suppliers of IT/PII-handling systems have appropriate certification (ISO27001,
  Cyber Essentials, CE+, Digital Marketplace). → **Gap for the same reason OrdinCore itself lacks
  CE+** — ask Krystal and Katapult directly what they hold; this is the item [subprocessors.md](./subprocessors.md)
  action #1/#2 already gestures at but doesn't close.
- **10.2.3** % of suppliers with data-security contract clauses. → **[NEEDS INPUT]** — a quick count
  across the subprocessor list once 10.1.2 is resolved.
- **10.2.4** [M] Understands which security responsibilities remain with OrdinCore vs. the supplier
  (shared responsibility). → **Partially evidenced** — [uk-hosting-and-data-transfers.md](./uk-hosting-and-data-transfers.md)
  implicitly describes this (Krystal hosts, OrdinCore operates the app); worth making the shared-
  responsibility split explicit in one short paragraph.
- **10.2.5** All suppliers handling health/care PII have completed a DSPT or equivalent. → **[NEEDS
  INPUT]** — ask Krystal/Katapult whether *they* hold a DSPT entry; if not, this becomes an open risk
  to note (mirrors the same ask as 10.2.1).
- **10.3.1** Log of past/present data security incidents with current suppliers. → **Answerable now:
  "None known"** — no incidents involving Krystal/Katapult/OpenAI/Expo/Apple/Google are recorded
  anywhere in the compliance pack.

---

## Priority order (cheapest/highest-value first)

1. **Off-server backup copy** (7.3.6, 1.3.6) — already scoped in the backup runbook, just needs
   doing.
2. **NCSC Early Warning registration** (8.3.8) — free, five minutes.
3. **Name the people**: DPO, SIRO, Caldicott Guardian, security/incident lead (1.1.5, 1.3.3, 1.3.4,
   breach-response contacts) — unlocks a dozen other items that are otherwise stuck on placeholders.
4. **Rehearse the incident/BC plan once** (5.1.1, 6.1.1, 7.2.1, 7.2.2) — one tabletop exercise closes
   four items simultaneously.
5. **Write the four missing policies**: staff data-security responsibilities (Standard 2), password
   policy (4.5.1), asset register (1.1.4/8.1.x), change-management statement (9.5.3) — all short,
   all things this pack already has the raw material for.
6. **Decide on MFA** (4.5.3, 4.5.6) — the one item that's a genuine engineering task, not a
   documentation task. Flag early given lead time.
7. **Decide on a penetration test** (9.2.1, 9.2.3) — external, needs budget/scheduling; start now
   given lead time.
8. **Decide on Cyber Essentials Plus** (Standard 9 broadly) — the highest-leverage single certification
   given how many items it exempts; also needs external lead time — start in parallel with the pentest
   decision, not after it.
9. Everything marked **[CONFIRM]** — quick technical checks a developer can close in a single pass
   once someone is tasked with it.
