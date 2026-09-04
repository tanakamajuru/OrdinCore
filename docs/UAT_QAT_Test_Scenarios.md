# Ordin Core — UAT & QAT Test Scenarios

**Scope:** Whole system, all roles, all modules — plus full end-to-end (E2E) data-entry walkthroughs.

- **UAT (User Acceptance Testing):** does it meet the user's/business need — real role flows, acceptance criteria, happy paths.
- **QAT (Quality Assurance Testing):** does it hold up technically — functional + negative + edge + security + multi-tenancy + regression.

## Roles
| Code | Role |
|---|---|
| SA | Super Admin |
| ADM | Company Admin |
| DIR | Director |
| RI | Responsible Individual |
| RM | Registered Manager |
| TL | Team Leader |

## Environments
- **Production app:** `https://work.ordincore.co.uk`  •  **API:** `https://ordincore.co.uk/api/v1`  •  **Landing:** `https://ordincore.co.uk`
- **Seed login:** `@ordincore.com` accounts use password `admin123` (e.g. `pat@` DIR, `sam@`/`alex@` RM, `chris@` RI, `taylor@`/`jordan@`/`casey@` TL). `superadmin@caresignal.com / admin123` for SA.

## Legend
- IDs: `UAT-XX-n` / `QAT-XX-n` / `E2E-n`. Mark each **Pass/Fail** with notes.
- "Scoped" = RM/TL limited to assigned houses; DIR/RI/ADM = company-wide; SA = platform-wide.

---

# PART A — Module Test Scenarios

## 1. Authentication & Session (AUTH)
**UAT**
- AUTH-U1: Valid user logs in → lands on role-appropriate dashboard.
- AUTH-U2: Logout ends session and returns to login.
- AUTH-U3: Change password; log in with the new one.
- AUTH-U4: Forgot-password flow reachable with clear guidance.

**QAT**
- AUTH-Q1: Wrong password → "Invalid credentials"; no token.
- AUTH-Q2: Inactive account → 401 "Account is inactive".
- AUTH-Q3: User in suspended/archived org → 401 "Your organisation account has been suspended."
- AUTH-Q4: Mid-session account disabled → next call 401 and login shows the **reason** (not silent redirect).
- AUTH-Q5: Expired/invalid/tampered JWT → 401; forced re-login.
- AUTH-Q6: Password policy enforced (≥8 chars, letter+number).
- AUTH-Q7: No password hash returned in any payload.
- AUTH-Q8: Login from `work.` origin passes CORS (no preflight failure).

## 2. Role-Based Access Control (RBAC)
**UAT**
- RBAC-U1: Each role sees only its nav items and pages.

**QAT**
- RBAC-Q1: TL/RM cannot call admin-only endpoints → 403.
- RBAC-Q2: Non-RM cannot rate effectiveness; non-RM-min cannot finalise weekly review → 403 (no forced logout).
- RBAC-Q3: Role mismatch returns **403**, never logs the user out.
- RBAC-Q4: Direct-URL access to an unauthorised page is blocked.
- RBAC-Q5: `requireScope` confines RM/TL to assigned houses on every list endpoint.

## 3. Multi-Tenancy / Data Isolation (TENANT)
**UAT**
- TENANT-U1: Company admin sees only their org's data.
- TENANT-U2: A new company starts empty.

**QAT**
- TENANT-Q1: User A (Co 1) cannot read/modify Co 2 by ID → 403/empty.
- TENANT-Q2: Cross-tenant `company_id` in query/body rejected for non-SA.
- TENANT-Q3: SA global views aggregate; per-company admin views scoped.
- TENANT-Q4: New company admin: users/risks/escalations/service-users/oversight all return **0**.
- TENANT-Q5: Patients/signals/reviews never leak between companies.

## 4. Super Admin – Organisation Management (SADM)
**UAT**
- SADM-U1: Create org (name, plan, **sector**) → appears in list.
- SADM-U2: Create Company Admin for a specific org — **Organisation fixed** (no dropdown).
- SADM-U3: Suspend org → users blocked; unsuspend restores.
- SADM-U4: Archive/unarchive org.
- SADM-U5: Change org **sector** inline → domain library switches.
- SADM-U6: Total Users / Total Orgs / Active Orgs cards correct and update on Refresh.

**QAT**
- SADM-Q1: Create org sector=Domiciliary → `companies.sector='DOMICILIARY'`.
- SADM-Q2: Suspend → `status='suspended'`; login blocked.
- SADM-Q3: Total Users = sum of orgs' user_count (not hardcoded 0).
- SADM-Q4: Generic "Create Admin" still shows org dropdown + requires selection.
- SADM-Q5: Duplicate admin email → clear error, no partial user.

## 5. Company Admin & User Management (USER)
**UAT**
- USER-U1: ADM creates DIR/RI/RM/TL users; they log in.
- USER-U2: ADM assigns user to a service.
- USER-U3: ADM deactivates a user → login blocked.
- USER-U4: ADM searches/filters users.

**QAT**
- USER-Q1: Create enforces password policy + unique email.
- USER-Q2: RM with `house_id='all'` → assigned to all houses.
- USER-Q3: Deactivated user → 401 next request.
- USER-Q4: SA-created uses body `company_id`; ADM-created inherits ADM company.
- USER-Q5: Admin pages render the admin sidebar (no missing navbar).

## 6. Services/Houses & Patients (SVC / PAT)
**UAT**
- SVC-U1: ADM creates/edits a service.
- SVC-U2: ADM deactivates a service; state reflected correctly.
- PAT-U1: Open **Patients** page → all patients in scope.
- PAT-U2: Search patients by name — list filters live.
- PAT-U3: Filter patients by site/service.

**QAT**
- SVC-Q1: House active/inactive consistent between display and deactivate action.
- PAT-Q1: DIR/RI/ADM see all company patients; RM/TL scoped.
- PAT-Q2: Search case-insensitive, partial, combines with site filter.
- PAT-Q3: No cross-company service users.
- PAT-Q4: Empty states render.

## 7. Signal Capture & Governance Domains (SIG / DOM)
**UAT**
- SIG-U1: TL/RM records a signal: **Governance Domain → Signal**, severity, description, service, optional person.
- SIG-U2: SL shows 12 domains; DOM shows domiciliary set.
- SIG-U3: Submit confirms + appears in recent signals.

**QAT**
- SIG-Q1: Validation: service + domain + severity + description (≥10).
- SIG-Q2: Stored signal has `governance_domain`, drives `risk_domain`.
- SIG-Q3: `/governance/domains` matches the company's sector.
- SIG-Q4: Safeguarding-during-RM-absence triggers mandatory review.
- SIG-Q5: Sector switch changes domains offered, no code change.

## 8. Clustering / Thresholds (CLU)
**UAT**
- CLU-U1: Repeated signals surface as an **Emerging Concern**.

**QAT**
- CLU-Q1: Threshold (e.g. Visit Reliability 3/7d) → threshold_event + cluster + candidate.
- CLU-Q2: Thresholds sector-specific.
- CLU-Q3: Clusters group by domain/person, not raw category.
- CLU-Q4: Safeguarding = any single signal.

## 9. Governance Oversight Register (REG)
**UAT**
- REG-U1: Banner shows Active/Escalating/Critical/Stable/Improving/Control Failures/Last Review.
- REG-U2: Tabs Emerging/Active/Strategic/Closed work.
- REG-U3: Columns: Concern, Type, Position, Trajectory, Evidence, Controls, Effectiveness, Owner, Next Review.
- REG-U4: Emerging row → promote flow; others → detail.
- REG-U5: Detail shows Why-overseeing, Controls & Effectiveness, Leadership Decision Log, evidence trail.

**QAT**
- REG-Q1: RM/TL scoped; DIR/RI company-wide.
- REG-Q2: Bucketing correct (Closed/Strategic/Active/Emerging).
- REG-Q3: Banner counts consistent; Control Failures = ineffective controls.
- REG-Q4: Empty/zero states OK; no 5xx any role.

## 10. Risk Promotion (PROM)
**UAT**: PROM-U1: RM promotes cluster/candidate → moves Emerging → Active/Strategic.
**QAT**
- PROM-Q1: Promote from candidate and cluster both 201; provenance linked.
- PROM-Q2: Direct create blocked unless SA + override.
- PROM-Q3: Source status updates; no dangling links.
- PROM-Q4: No 500 from missing `linked_person` (regression).

## 11. Escalations (ESC)
**UAT**
- ESC-U1: RM escalates a risk → appears in queue with due date.
- ESC-U2: acknowledge → transition → add action → resolve → closure review with evidence.
- ESC-U3: After resolve, leaves the open queue (no stuck "Open").
- ESC-U4: Reopen works and is tracked.

**QAT**
- ESC-Q1: Resolve sets `status='Resolved'` AND `lifecycle_status='Closed'` (regression).
- ESC-Q2: Resolved/closed escalation locked.
- ESC-Q3: Closure enforces evidence (≥20) + closability rules.
- ESC-Q4: Queue/stat counts match lifecycle across dashboards.
- ESC-Q5: Add-action requires `action_type`.

## 12. Actions / Effectiveness (ACT)
**UAT**
- ACT-U1: RM creates + **assigns** an action with due date.
- ACT-U2: TL/RM completes (outcome + rationale).
- ACT-U3: RM rates effectiveness with evidence.
- ACT-U4: Effectiveness queue clears once rated.

**QAT**
- ACT-Q1: Completion requires outcome + rationale (≥10), valid outcome; persists `completion_*` (regression).
- ACT-Q2: Rating only on Completed actions; evidence ≥20 unless "Too Early".
- ACT-Q3: "Not Effective" → Control Failures count.
- ACT-Q4: RM can assign; TL cannot exceed rights.

## 13. Weekly Governance Review (WGR)
**UAT**
- WGR-U1: 5 questions; Q1 auto-calculated.
- WGR-U2: Answer Q2–Q5; save draft.
- WGR-U3: RM finalises → RI/DIR validation.
- WGR-U4: RI/DIR approve/reject with comment.
- WGR-U5: Finalised review feeds RI/DIR governance views.

**QAT**
- WGR-Q1: Required fields enforced (Q2, Q3, position; Q4 note when ineffective).
- WGR-Q2: `overall_position` + `governance_narrative` columns populate.
- WGR-Q3: Position scale Improving/Stable/Emerging Concern/Escalating/Critical; ranking order correct.
- WGR-Q4: Locked/validated review read-only.
- WGR-Q5: Per-service selection loads correct week auto-population.

## 14. Daily Governance / Oversight Board (DGR)
**UAT**: DGR-U1: RM board shows signals/clusters/candidates/actions/effectiveness/RI queries. DGR-U2: open/complete daily log.
**QAT**: DGR-Q1: No missing-user-id crash. DGR-Q2: deputy cover + RI query responses work.

## 15. Incidents & Reconstruction (INC / RECON)
**UAT**
- INC-U1: RM/TL reports incident (type, severity, occurred-at, description, action).
- INC-U2: assign / resolve / link to risks/escalations.
- RECON-U1: create reconstruction, update sequence, link pulses, complete.

**QAT**
- INC-Q1: Create persists regulatory columns (la_referral, cqc_notification, …) — regression.
- INC-Q2: Reconstruction detail/update works (no `incident_type` error) — regression.
- INC-Q3: Serious/critical triggers correct notifications/threshold.

## 16. Dashboards (DASH)
**UAT**: DASH-U1: Each role dashboard loads; **View All** navigates (no logout). DASH-U2: counts reflect live data.
**QAT**: DASH-Q1: All endpoints 200 for active users. DASH-Q2: widget `.catch` doesn't force 401-logout. DASH-Q3: heatmaps/trends render empty + populated.

## 17. Reports / Exports / Evidence (REP)
**UAT**: REP-U1: generate Strategic/Monthly reports per scope+date. REP-U2: export + evidence pack produce documents.
**QAT**: REP-Q1: `/reports/strategic-risks` 200 (no missing-column 500) — regression. REP-Q2: scoped + date-filtered. REP-Q3: export integrity.

## 18. Notifications (NOTIF)
**UAT**: NOTIF-U1: receive escalation/safeguarding/assignment notifications; mark read.
**QAT**: NOTIF-Q1: tenant-scoped; read-all + per-item read; no leakage.

## 19. Domiciliary Sector (DOMI)
**UAT**
- DOMI-U1: SA creates Domiciliary org; users see domiciliary domains.
- DOMI-U2: domiciliary signals capture + cluster; missed-call threshold raises an emerging concern.
- DOMI-U3: full circuit works with domiciliary vocabulary.

**QAT**
- DOMI-Q1: `/governance/domains` returns DOMICILIARY library only for DOM orgs.
- DOMI-Q2: same engine/endpoints; only vocabulary + thresholds differ.

## 20. Navigation / UI Consistency (NAV)
**UAT**: NAV-U1: every page shows the correct navbar. NAV-U2: active item highlights; Patients/Oversight Register/Weekly Review appear for the right roles.
**QAT**: NAV-Q1: admin pages render admin sidebar (regression). NAV-Q2: "Governance Oversight Register" everywhere (no stray "Risk Register"). NAV-Q3: no dead links/404.

## 21. Security (SEC)
- SEC-Q1: IDOR — IDs across all resources tenant-checked.
- SEC-Q2: Authorization on every mutating endpoint.
- SEC-Q3: Injection-safe search/descriptions/names (parameterised).
- SEC-Q4: JWT secret hidden; tokens expire; no privilege escalation via body fields.
- SEC-Q5: Suspended org / disabled account locked out everywhere.

## 22. Performance & Reliability (PERF)
- PERF-Q1: Lists paginate/cap; large patient/signal lists render acceptably.
- PERF-Q2: Oversight summary + dashboards respond within target under load.
- PERF-Q3: Clustering degrades gracefully when Redis unavailable.
- PERF-Q4: Concurrent submissions don't double-create clusters/threshold events.

## 23. Data Integrity & Migration (DATA)
- DATA-Q1: Migrations additive; row counts unchanged post-deploy.
- DATA-Q2: Schema matches code (no "column does not exist") — regression of 055–058.
- DATA-Q3: FK integrity on delete/close (no dangling links).
- DATA-Q4: Backup/restore verified before schema changes.

## 24. Regression Pack (this session's fixes)
- REG-R1 Login/CORS (backend actually built & running).
- REG-R2 Escalation resolve closes lifecycle.
- REG-R3 Company deactivation blocks users.
- REG-R4 Promote-to-risk (cluster + candidate).
- REG-R5 Incident & action creation (regulatory/completion columns).
- REG-R6 View-All doesn't log out active users.
- REG-R7 Admin pages show navbar.
- REG-R8 Super Admin Total Users card populates.
- REG-R9 Create-Company-Admin binds to selected org.
- REG-R10 12-domain capture + sector switch + domiciliary path.

---

# PART B — End-to-End Scenarios (enter data, see the whole system work)

Each E2E is a full workflow with concrete data entry and the observable outcome at every stage. Run top-to-bottom; later steps depend on earlier data.

## E2E-1 — New organisation onboarding → first governance signal (Supported Living)
**Roles:** SA → ADM → RM/TL
1. **SA** logs in → **Create Organisation**: name "Acme Care", plan Professional, **Sector = Supported Living** → Save. *Expect:* org appears; **Total Users** and **Total Orgs** increment.
2. **SA** → on the Acme row click **Add Admin** → first/last name, email `admin@acme.test`, password `Admin1234` → Create. *Expect:* Organisation field is **fixed to Acme** (no dropdown); admin created.
3. **ADM (admin@acme.test)** logs in → **Services** → create service "Oak House" (active). *Expect:* Oak House listed as Active.
4. **ADM** → **Users** → create RM `rm@acme.test` assigned to Oak House, and TL `tl@acme.test` assigned to Oak House. *Expect:* both can log in.
5. **ADM** → **Patients** → confirm empty; (add a service user via Service Users if available, e.g. "J Doe" at Oak House).
6. **TL (tl@acme.test)** logs in → **Record Signal**: Service Oak House, **Governance Domain = Medication Governance → Signal = Medication refusal**, Severity Medium, description "Refused evening meds." → Submit. *Expect:* success toast; signal in Recent Signals; clustering key = Medication Governance.
**Pass when:** a brand-new org is fully stood up from scratch and its first governance signal is captured under the 12-domain model — with zero inherited data from other orgs.

## E2E-2 — Signal → pattern → emerging concern → promote → active oversight
**Roles:** TL → RM
1. **TL** records **3 Medication Governance signals** for the same client within the threshold window (e.g. Medication refusal ×3).
2. **RM** opens **Governance Oversight Register → Emerging Concerns**. *Expect:* a Medication cluster/candidate appears (evidence = 3 signals).
3. **RM** clicks the emerging item → **Promote** flow → confirm title/severity/trajectory → Promote. *Expect:* 201; item moves out of Emerging.
4. **RM** opens **Active Oversight** tab. *Expect:* the new risk is listed (Concern, Position, Trajectory, Evidence, Owner = RM, Next Review).
5. **RM** opens the risk detail. *Expect:* **Governance Description (why overseeing)**, **Controls & Effectiveness**, **Leadership Decision Log**, evidence trail.
**Pass when:** repeated signals auto-surface as an emerging concern and promote cleanly into the active register with full provenance.

## E2E-3 — Controls & effectiveness loop
**Roles:** RM → TL → RM
1. On the active risk, **RM** adds an action "Daily MAR audit", assigns to **TL**, due in 7 days. *Expect:* action appears in TL's "My Actions".
2. **TL** opens **My Actions** → completes the action with **outcome = Risk reduced**, rationale ≥10 chars. *Expect:* status → Completed.
3. **RM** rates **effectiveness = Effective**, evidence ≥20 chars. *Expect:* effectiveness recorded; item leaves the Effectiveness Review queue.
4. (Negative) Repeat with **Not Effective** on another action. *Expect:* **Control Failures** count increments on the register banner.
**Pass when:** the action lifecycle (assign → complete → rate) works and effectiveness feeds the register/banner.

## E2E-4 — Escalation lifecycle to closure
**Roles:** RM (+ DIR view)
1. **RM** on the active risk → **Escalate** with reason. *Expect:* escalation in the queue with a due date; risk status Escalated.
2. **RM** → **Acknowledge** → **Transition** to "Under Review" → **Add action** (`action_type=update`) → **Resolve** with notes. *Expect:* each step 200.
3. **RM** confirms the escalation **leaves the open queue** and no longer shows "Open" on the dashboard. *Expect:* lifecycle_status = Closed.
4. **RM** → **Close with Evidence (Governance)** closure review: pattern reduced ✓, actions completed ✓, effectiveness reviewed ✓, evidence ≥20 → Close.
5. **DIR** views Escalations. *Expect:* the resolved/closed escalation reflected consistently; no stuck "Open".
**Pass when:** the full escalation lifecycle completes and the item is correctly closed everywhere (regression of the "still Open" bug).

## E2E-5 — Weekly Governance Review cycle (RM → RI/Director validation)
**Roles:** RM → RI/DIR
1. **RM** → **Weekly Review** for Oak House. *Expect:* **Q1 (what changed)** auto-shows this week's signal/repeat/worsening/improving counts.
2. **RM** answers **Q2** (concern), **Q3** (actions), **Q4** (mark a control "Partially" → control-failure note required), **Q5** position = **Emerging Concern** + narrative → **Save draft** then **Finalise**. *Expect:* status → pending validation; sent to RI/DIR.
3. **RI/DIR** opens the review → **Approve** (or Reject) with a comment. *Expect:* validation recorded; review locked/read-only.
4. **DIR** dashboard / RI assurance reflects the position + narrative (e.g. position ladder).
**Pass when:** the 5-question review is completed, finalised, validated, and feeds leadership views (`overall_position`/`governance_narrative`).

## E2E-6 — Incident → reconstruction
**Roles:** RM/TL → RM/DIR
1. **RM** → **Incidents** → report incident at Oak House (severity Moderate, occurred-at now, description, immediate action). *Expect:* created (no "column does not exist").
2. **RM/DIR** → **create reconstruction** referencing the incident → **update** sequence_of_events + contributing_factors → **complete**. *Expect:* reconstruction detail/update works (no `incident_type` error).
**Pass when:** an incident can be logged and reconstructed end-to-end.

## E2E-7 — Domiciliary care full circuit (configuration, not rebuild)
**Roles:** SA → ADM → RM
1. **SA** → **Create Organisation** "Bedford Homecare", **Sector = Domiciliary Care** (or set an existing org's sector inline to Domiciliary).
2. **SA** → add an ADM; **ADM** creates a service "North Bedford Round" + an RM.
3. **RM** → **Record Signal**. *Expect:* domains are the **domiciliary** set (Visit Reliability, Care Continuity, Workforce Reliability, …) — not the supported-living set.
4. **RM/TL** records **3 × Visit Reliability / Missed call** within 7 days. *Expect:* threshold trips → emerging concern (cluster + candidate) in the register.
5. Continue the circuit: promote → action → escalate → weekly review with domiciliary vocabulary.
**Pass when:** the identical governance engine runs domiciliary care purely via sector configuration (`/governance/domains` returns DOMICILIARY; signals cluster by domiciliary domain).

## E2E-8 — Multi-tenancy isolation (negative E2E)
**Roles:** two companies
1. With **Acme Care** populated (E2E-1..5) and a **second company** "Beacon Support" created with its own admin + a few signals/risks:
2. Log in as **Beacon admin/RM** → open Patients, Oversight Register, Escalations, Reports. *Expect:* **only Beacon data** — none of Acme's appears, counts are Beacon-only.
3. Attempt direct access to an Acme risk/escalation ID as a Beacon user. *Expect:* 403/empty.
4. As **SA**, confirm global views aggregate both; as each ADM, confirm scoping.
**Pass when:** no data crosses between companies in any view, and SA aggregation still works.

## E2E-9 — Cross-role collaboration & dashboards
**Roles:** TL → RM → DIR → RI
1. **TL** captures several signals across domains.
2. **RM** triages on the **Oversight Board**, promotes one, escalates another, runs the weekly review.
3. **DIR** opens the strategic dashboard / heatmap / trends. *Expect:* cross-site risk heatmap, escalations by status, effectiveness summary populate; **View All** links navigate (no logout).
4. **RI** opens assurance dashboard. *Expect:* governance review completion, escalation assurance, key assurance questions reflect the week's activity.
**Pass when:** data entered by lower roles flows up into Director/RI oversight without manual re-entry, and every dashboard + View All works for active users.

## E2E-10 — Organisation deactivation (lifecycle close-out)
**Roles:** SA
1. **SA** suspends "Acme Care". *Expect:* status Suspended.
2. Attempt to log in as an Acme user. *Expect:* 401 "organisation suspended" with reason shown on login.
3. **SA** unsuspends. *Expect:* Acme users can log in again; data intact.
**Pass when:** deactivating an org genuinely locks out all its users and reactivation restores access with no data loss.

---

## Suggested execution order
Smoke (REG-R1..R10) → Module UAT happy paths → E2E-1 → E2E-2 → E2E-3 → E2E-4 → E2E-5 → E2E-6 → E2E-7 → E2E-8 → E2E-9 → E2E-10 → QAT negative/edge/security → Performance.

## Reporting template (per scenario)
| ID | Role | Pre-conditions | Steps | Expected | Actual | Pass/Fail | Notes |
|----|------|----------------|-------|----------|--------|-----------|-------|
