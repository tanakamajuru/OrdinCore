I'll create comprehensive QAT and UAT scripts for the OrdinCore system. These are structured to be directly executable by testers and end users.

---

# OrdinCore: Quality Assurance Testing (QAT) Script

This script is for technical testers to verify system functionality against specifications.

## Test Environment Setup

| Item | Value |
|------|-------|
| Test Company | "QAT Care Group" |
| Houses | Rose House, Oak Lodge, Maple Court |
| Test Users | TL1 (Team Leader, Rose House), RM1 (Registered Manager, Rose House), Deputy1 (Deputy RM), Director1 (Director) |
| Test Period | Use current date; adjust date filters accordingly |

---

## Module 1: Authentication & Access Control

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AUTH-01 | Valid login | 1. Navigate to `/login`<br>2. Enter valid email/password<br>3. Click Login | User is authenticated, receives JWT, redirected to role‑based dashboard | [ ] |
| AUTH-02 | Invalid login | 1. Enter invalid credentials<br>2. Click Login | Error message displayed; no token issued | [ ] |
| AUTH-03 | Token refresh | 1. Wait for access token expiry (15 min)<br>2. Perform any API call | Refresh token automatically obtains new access token; request succeeds | [ ] |
| AUTH-04 | RBAC – TL access | Login as TL1; attempt to access `/admin/users` | 403 Forbidden or redirect | [ ] |
| AUTH-05 | RBAC – RM access | Login as RM1; access `/director` | 403 Forbidden or redirect | [ ] |
| AUTH-06 | Tenant isolation | Login as Company A user; attempt to fetch House from Company B via API | 404 or empty result | [ ] |

---

## Module 2: Signal Capture (Daily Pulse)

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| SC-01 | 12‑field sequence enforced | 1. Open `/pulse/new`<br>2. Observe field unlocking | Fields unlock in order: date/time → house → related_person → signal_type → risk_domain → description → immediate_action → severity → has_happened_before → pattern_concern → escalation_required → evidence | [ ] |
| SC-02 | Severity locked until risk_domain | 1. Attempt to set severity before selecting risk_domain | Severity field is disabled or hidden | [ ] |
| SC-03 | Submit valid signal | 1. Complete all 12 fields with valid data<br>2. Click Submit | Signal saved; success toast; review_status = 'New' | [ ] |
| SC-04 | Submit signal with evidence | 1. Attach a file at step 12<br>2. Submit | File uploaded to S3; evidence_url populated | [ ] |
| SC-05 | Signal appears in RM dashboard | 1. Submit signal as TL<br>2. Login as RM1<br>3. Navigate to Daily Oversight Board | Signal appears in Section A (if High/Critical) or triage queue | [ ] |
| SC-06 | No auto‑risk creation | 1. Submit signal with pattern_concern='Escalating' and escalation_required='Immediate Escalation'<br>2. Check Risk Register | No risk is automatically created; only signal appears | [ ] |
| SC-07 | Validation – required fields | 1. Attempt to submit with missing description | Form shows validation error; submission blocked | [ ] |

---

## Module 3: Pattern Detection Engine

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PE-01 | Rule 1 – Repetition (3 signals in 7d) | 1. Create 3 signals with same house, same risk_domain='Behaviour' within 7 days<br>2. Run pattern detection worker | `signal_clusters` record created with status='Emerging', signal_count=3 | [ ] |
| PE-02 | Rule 2 – Escalation (5 signals in 10d) | 1. Create 5 signals same domain in 10 days<br>2. Run worker | Cluster status='Escalated'; threshold_event with output_type='Risk Proposal' | [ ] |
| PE-03 | Rule 3 – Immediate (1 Critical) | 1. Create 1 signal with severity='Critical'<br>2. Run worker | threshold_event with output_type='Mandatory Review'; notification sent to RM | [ ] |
| PE-04 | Rule 3 – Immediate (2 High in 48h) | 1. Create 2 High severity signals within 48h<br>2. Run worker | Mandatory Review triggered | [ ] |
| PE-05 | Rule 4 – Trajectory Deterioration | 1. Create signals Low → Moderate → High within 7d same domain<br>2. Run worker | Cluster trajectory='Deteriorating' | [ ] |
| PE-06 | Rule 5 – Recurrence after closure | 1. Close a Behaviour risk<br>2. Create similar signal within 14 days<br>3. Run worker | threshold_event with 'Control Failure'; risk auto‑reopened | [ ] |
| PE-07 | Rule 6 – Behaviour domain | 1. Create 3 agitation/aggression signals in 7d | Pattern flag; cluster created | [ ] |
| PE-08 | Rule 7 – Medication domain | 1. Create 2 medication error signals in 7d | Pattern flag | [ ] |
| PE-09 | Rule 8 – Staffing domain | 1. Create 3 understaffed shift signals in 7d | Pattern flag | [ ] |
| PE-10 | Rule 9 – Environment | 1. Create hazard signal; leave unresolved >48h | Risk Review flag | [ ] |
| PE-11 | Rule 10 – Governance | 1. Miss 2 daily reviews | Pattern flag | [ ] |
| PE-12 | Cross‑service detection | 1. Create Behaviour cluster in Rose House<br>2. Create Behaviour cluster in Oak Lodge within 7d<br>3. Run worker | threshold_event with 'System‑Level Risk'; Director notified | [ ] |
| PE-13 | Cluster promotion | 1. As RM, navigate to cluster<br>2. Click "Promote to Risk" | Draft risk created; linked_risk_id populated | [ ] |
| PE-14 | Cluster dismissal | 1. As RM, click "Dismiss" on cluster<br>2. Enter reason | Cluster dismissed; dismiss_reason saved | [ ] |

---

## Module 4: Risk Governance

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| RG-01 | Risk creation requires cluster | 1. Attempt POST /risks without source_cluster_id | API returns 400 "source_cluster_id required" | [ ] |
| RG-02 | Risk creation with valid cluster | 1. Promote cluster to risk<br>2. Complete risk form (title, owner, next_review_date) | Risk created; status='Active'; signal_count shows cluster count | [ ] |
| RG-03 | Risk trajectory updates | 1. Mark 2 actions on risk as 'Effective' | Risk trajectory becomes 'Improving' | [ ] |
| RG-04 | Risk trajectory deteriorates | 1. Mark 2 actions as 'Ineffective' | Trajectory becomes 'Deteriorating'; governance concern flag | [ ] |
| RG-05 | Risk closure requires reason | 1. Click "Close Risk"<br>2. Leave reason empty | Validation error; closure blocked | [ ] |
| RG-06 | Risk closure with reason | 1. Enter closure reason<br>2. Submit | Risk status='Closed'; closed_at set; 14‑day watch starts | [ ] |
| RG-07 | Risk reopening (Rule 5 only) | 1. Attempt to reopen without Rule 5 flag | Reopen button disabled or API returns 400 | [ ] |
| RG-08 | Signal‑to‑risk traceability | 1. View risk detail<br>2. Click "Signals" tab | List of all linked pulse entries with timestamps | [ ] |
| RG-09 | Risk timeline | 1. View risk detail<br>2. Click "Timeline" tab | Chronological events: creation, trajectory changes, escalations | [ ] |

---

## Module 5: Daily RM Workflow

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DR-01 | Daily Oversight Board loads | 1. Login as RM1<br>2. Navigate to `/dashboard/oversight` | 4 sections displayed; data filtered to assigned houses, last 48h | [ ] |
| DR-02 | High Priority triage | 1. In Section A, click a signal<br>2. Update severity<br>3. Mark as Reviewed | Signal review_status updated; disappears from queue | [ ] |
| DR-03 | Pattern Signals grouping | 1. Section B displays signals grouped by domain | Similar signals grouped; multi‑select enabled | [ ] |
| DR-04 | Link signals to cluster | 1. Multi‑select 3 signals in Section B<br>2. Click "Link to Cluster"<br>3. Select existing or new cluster | Signals linked; cluster signal_count updated | [ ] |
| DR-05 | Create action from signal | 1. Click "Add Action" on signal<br>2. Fill title, owner, due date<br>3. Save | Action created; appears in Section D | [ ] |
| DR-06 | Daily review completion | 1. Complete triage of all signals<br>2. Click "Complete Daily Review" | daily_governance_log record created with completed=true | [ ] |
| DR-07 | Max 3 clicks rule | 1. Perform any triage action | Decision requires ≤3 clicks from selection to completion | [ ] |

---

## Module 6: RM Absence Fallback

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AF-01 | Daily check worker runs | 1. Set system time to 08:01<br>2. Observe worker execution | Worker queries daily_governance_log for previous day | [ ] |
| AF-02 | 48h missed – deputy assigned | 1. Ensure no review completed for 2 days<br>2. Run daily check worker | Log updated with review_type='Deputy Cover'; notification sent to deputy_rm_id | [ ] |
| AF-03 | 72h missed – Director notified | 1. Ensure no review for 3 days<br>2. Run worker | Notification sent to Director; service flagged in coverage dashboard | [ ] |
| AF-04 | Safeguarding during absence | 1. RM absent; submit Safeguarding signal<br>2. Observe notifications | Deputy, Director, and on‑call receive Push+Email+SMS; "Enhanced Oversight Required" flag | [ ] |
| AF-05 | Coverage dashboard | 1. Login as Director<br>2. Navigate to `/governance/coverage` | Table shows all houses with last review date and missed status | [ ] |

---

## Module 7: Weekly Governance Review

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| WR-01 | Create weekly review | 1. As RM, POST /weekly-reviews with house and period | Review created; sections 2‑5 auto‑populated | [ ] |
| WR-02 | Auto‑population – signal count | 1. Open review | pulse_entries_reviewed matches COUNT of signals in period | [ ] |
| WR-03 | Auto‑population – repeating signals | 1. Open review | repeating_signals array contains clusters with status Emerging/Escalated | [ ] |
| WR-04 | Auto‑population – escalating signals | 1. Open review | escalating_signals contains clusters with trajectory='Deteriorating' | [ ] |
| WR-05 | Step locking – cannot skip | 1. Attempt PATCH with step_reached=7 while step 6 fields empty | API returns 400 with step dependency error | [ ] |
| WR-06 | Complete all 13 steps | 1. Fill each step in order<br>2. Click "Complete Review" at step 13 | Review locked; completed_at set; PDF report queued | [ ] |
| WR-07 | Governance position values | 1. At step 12, select each option | Dropdown contains: Stable, Watch, Concern, Escalating, Serious Concern | [ ] |
| WR-08 | Narrative generation | 1. Complete review<br>2. View generated narrative | Narrative includes summary of signals, patterns, actions taken | [ ] |

---

## Module 8: Action Effectiveness

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| AE-01 | Action completion | 1. As TL, open "My Actions"<br>2. Mark action complete with note | Action status='Complete'; completed_at set | [ ] |
| AE-02 | Effectiveness prompt (48‑72h) | 1. Complete action<br>2. Advance system time by 48h<br>3. Run effectiveness worker | Action appears in RM's pending‑effectiveness queue | [ ] |
| AE-03 | Rate effectiveness | 1. As RM, open effectiveness modal<br>2. Select 'Effective'<br>3. Save | Action.effectiveness set; effectiveness_reviewed_at populated | [ ] |
| AE-04 | Trajectory impact – 2 Effective | 1. Rate 2 actions on same risk as 'Effective' | Risk trajectory updates to 'Improving' | [ ] |
| AE-05 | Trajectory impact – 2 Ineffective | 1. Rate 2 actions as 'Ineffective' | Trajectory becomes 'Deteriorating'; governance concern flag | [ ] |

---

## Module 9: Director Intelligence

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| DI-01 | Dashboard loads | 1. Login as Director<br>2. Navigate to `/director` | 5 panels displayed with live data | [ ] |
| DI-02 | Org Effectiveness Summary | 1. View Panel 1 | Shows 7‑day counts of Effective/Neutral/Ineffective actions | [ ] |
| DI-03 | Service Comparison Table | 1. View Panel 2 | Table lists all houses with effectiveness counts and RM coverage | [ ] |
| DI-04 | 7‑Day Trend Chart | 1. View Panel 3 | Recharts line chart showing daily effectiveness trend | [ ] |
| DI-05 | Control Failure Flags | 1. Create 2 ineffective actions on same domain/house<br>2. Refresh dashboard | Panel 4 shows flag: "Rose House: 2 ineffective actions on Behaviour" | [ ] |
| DI-06 | Domain Weakness Analysis | 1. View Panel 5 | Horizontal bar chart showing Ineffective counts per domain | [ ] |
| DI-07 | System‑Level Risk flag | 1. Trigger cross‑service rule<br>2. Refresh dashboard | Alert banner or dedicated panel shows System‑Level Risk | [ ] |

---

## Module 10: Incident Reconstruction

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| IR-01 | Create reconstruction | 1. Navigate to Incident Reconstruction<br>2. Click "+ New" | Form loads with 17‑section template | [ ] |
| IR-02 | Link pulse entries | 1. In Signal Timeline section, click "Link Pulse Entries"<br>2. Select multiple entries | Entries linked; timeline auto‑generated | [ ] |
| IR-03 | Trajectory assessment | 1. Complete trajectory fields (Stable/Emerging/Deteriorating/Critical)<br>2. Set foreseeable flag | Data saved | [ ] |
| IR-04 | Control failure analysis | 1. Fill control failure fields | Data saved | [ ] |
| IR-05 | Governance narrative | 1. Complete all sections<br>2. Click "Complete" | Reconstruction locked; narrative generated | [ ] |
| IR-06 | No‑linked‑risk view | 1. Navigate to Incidents with No Linked Risk view | Shows reconstructions missing risk linkage | [ ] |

---

## Module 11: Notifications

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| NOT-01 | In‑app notification – Pattern Emerging | 1. Trigger Rule 1<br>2. Check notification bell | Notification appears; can be marked read | [ ] |
| NOT-02 | Push + Email – Risk Review Required | 1. Trigger Rule 2<br>2. Check email inbox and push | Email delivered; push notification received | [ ] |
| NOT-03 | Critical – Immediate Risk | 1. Trigger Rule 3 | Urgent push + email; cannot be snoozed without acknowledgement | [ ] |
| NOT-04 | SMS – Safeguarding during absence | 1. Trigger safeguarding while RM absent | SMS delivered to configured phone number | [ ] |
| NOT-05 | Notification preferences | 1. Navigate to user settings<br>2. Toggle notification channels | Preferences saved and respected | [ ] |

---

## Module 12: Reports

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| REP-01 | Request PDF report | 1. POST /reports/request with type='weekly_governance' and house_id | Job queued; returns report_id | [ ] |
| REP-02 | Report generation | 1. Wait for worker to process<br>2. Poll status | Report status updates to 'completed'; download URL provided | [ ] |
| REP-03 | Download report | 1. GET /reports/:id/download | PDF file downloads; contains correct data | [ ] |
| REP-04 | Inspection evidence pack | 1. Request evidence pack for risk | PDF includes signal timeline, risk trajectory, actions, and narrative | [ ] |

---

## Module 13: Performance & Security

| Test ID | Test Case | Steps | Expected Result | Status |
|---------|-----------|-------|-----------------|--------|
| PERF-01 | Daily Oversight Board load time | 1. Measure time to load /dashboard/oversight | <2 seconds | [ ] |
| PERF-02 | Pattern worker processing | 1. Submit 100 signals<br>2. Measure worker completion time | <30 seconds | [ ] |
| SEC-01 | SQL injection | 1. Attempt SQL injection in description field | Input sanitized; no query executed | [ ] |
| SEC-02 | XSS | 1. Submit <script>alert('xss')</script> in description | Output escaped; script not executed | [ ] |
| SEC-03 | JWT expiration | 1. Use expired token | 401 Unauthorized | [ ] |

---

# OrdinCore: User Acceptance Testing (UAT) Script

This script is for business users (Team Leaders, Registered Managers, Directors, Responsible Individuals) to validate that the system meets operational needs.

## Test Data Setup (To be performed by Admin before UAT)

| Item | Value |
|------|-------|
| Company | "UAT Care Services Ltd" |
| Houses | Rose House (Residential), Oak Lodge (Supported Living) |
| Users | Sarah (Team Leader, Rose House), Mark (Registered Manager, Rose House), David (Deputy RM), Emma (Director), James (RI) |
| Residents | Resident A, Resident B (anonymized IDs) |

---

## Scenario 1: Team Leader – Recording a Safeguarding Concern

**User:** Sarah (Team Leader, Rose House)

**Context:** During morning shift, Resident A made verbal threats toward another resident. Sarah needs to record this immediately.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in to OrdinCore | Dashboard loads showing "Quick Actions" | |
| 2 | Click "Record Observation" | Daily Pulse form opens at Step 1 (Date/Time) | |
| 3 | Confirm today's date and current time | Step 2 unlocks (Service/House) | |
| 4 | Select "Rose House" | Step 3 unlocks (Related Person) | |
| 5 | Enter "Resident A" | Step 4 unlocks (Signal Type) | |
| 6 | Select "Safeguarding" | Step 5 unlocks (Risk Domain) | |
| 7 | Select "Behaviour" from multi‑select | Step 6 unlocks (Description) | |
| 8 | Type: "Resident A made verbal threats toward Resident B during breakfast. Staff intervened and separated." | Step 7 unlocks (Immediate Action) | |
| 9 | Type: "Staff used verbal de‑escalation; residents separated." | Step 8 unlocks (Severity) | |
| 10 | Select "High" | Step 9 unlocks (Has this happened before?) | |
| 11 | Select "Yes" | Step 10 unlocks (Pattern Concern) | |
| 12 | Select "Escalating" | Step 11 unlocks (Escalation Required) | |
| 13 | Select "Immediate Escalation" | Step 12 unlocks (Evidence) | |
| 14 | Skip evidence; click "Submit" | Success message: "Signal recorded" | |
| 15 | Log out | Return to login screen | |

**Post‑Condition:** The signal is in the system with `review_status='New'` and appears in Mark's Daily Oversight Board as High Priority.

---

## Scenario 2: Registered Manager – Daily Oversight Triage

**User:** Mark (Registered Manager, Rose House)

**Context:** Mark logs in for his daily 10‑minute governance check.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Mark | Dashboard loads; click "Daily Oversight Board" | |
| 2 | View Section A (High Priority) | Sarah's Safeguarding signal appears at top | |
| 3 | Click the signal | Right panel opens with full details | |
| 4 | Confirm severity is "High" | Severity displayed | |
| 5 | Confirm escalation is "Immediate Escalation" | Escalation level displayed | |
| 6 | Click "Add Action" | Action form appears | |
| 7 | Enter title: "Complete safeguarding referral to Local Authority" | Title populated | |
| 8 | Assign to yourself (Mark) | Owner set | |
| 9 | Set due date to today | Due date set | |
| 10 | Click "Save Action" | Action appears in Section D | |
| 11 | Change Review Status to "Reviewed" | Signal disappears from Section A | |
| 12 | View Section B (Pattern Signals) | No patterns yet (first occurrence) | |
| 13 | View Section C (Risk Touchpoint) | No cluster yet (<3 signals) | |
| 14 | Click "Complete Daily Review" | Green confirmation: "Daily review logged" | |
| 15 | Log out | | |

**Post‑Condition:** Daily review is logged; action is assigned to Mark.

---

## Scenario 3: Registered Manager – Pattern Emerges and Risk Created

**User:** Mark (Registered Manager, Rose House)

**Context:** Over the next 3 days, two more Behaviour signals are recorded for Resident A. Mark reviews the emerging pattern.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Mark | Navigate to Daily Oversight Board | |
| 2 | View Section B (Pattern Signals) | "Behaviour" group shows 3 linked signals | |
| 3 | Click the cluster | Cluster detail opens: "Repeated Agitation – Rose House (3 in 7 days)" | |
| 4 | Review linked signals | All three signals listed with dates | |
| 5 | Click "Promote to Risk" | Risk creation form opens pre‑filled with domain and source cluster | |
| 6 | Enter Risk Title: "Escalating Behavioural Risk – Resident A" | Title entered | |
| 7 | Set Trajectory: "Deteriorating" | Selected | |
| 8 | Set Severity: "High" | Selected | |
| 9 | Enter Control Measures: "1:1 supervision during communal times; PRN protocol reviewed" | Text entered | |
| 10 | Assign Owner: Mark | Selected | |
| 11 | Set Next Review Date: 7 days from today | Date selected | |
| 12 | Click "Create Risk" | Risk created; success message | |
| 13 | Navigate to Risk Register | New risk appears with "Built from 3 pulse entries" badge | |
| 14 | Click the risk | Detail panel opens | |
| 15 | Click "Signals" tab | All 3 signals listed as evidence | |
| 16 | Log out | | |

**Post‑Condition:** Formal risk exists with traceable evidence chain.

---

## Scenario 4: Team Leader – Completing an Assigned Action

**User:** Sarah (Team Leader, Rose House)

**Context:** Mark assigned Sarah an action: "Review Resident A's behaviour support plan."

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Sarah | Dashboard loads | |
| 2 | Click "My Actions" | List shows the assigned action | |
| 3 | Click the action | Detail view opens | |
| 4 | Click "Mark Complete" | Completion note field appears | |
| 5 | Type: "Reviewed plan with Behaviour Specialist; updated de‑escalation strategies added." | Note entered | |
| 6 | Click "Confirm Completion" | Action status changes to "Complete"; success message | |
| 7 | Log out | | |

**Post‑Condition:** Action is marked complete; system will prompt Mark for effectiveness rating in 48‑72 hours.

---

## Scenario 5: Registered Manager – Weekly Governance Review

**User:** Mark (Registered Manager, Rose House)

**Context:** It's Friday. Mark must complete the weekly governance review for Rose House.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Mark | Navigate to "Weekly Review" | |
| 2 | Click "Start New Review" | Wizard opens at Step 1 | |
| 3 | Select Service: Rose House; Period: Last 7 days | Dates auto‑suggested | |
| 4 | Click "Next" | Step 2 displays | |
| 5 | View Signal Count | Shows "12 signals reviewed this week" (auto‑populated) | |
| 6 | Click "Next" | Step 3 displays | |
| 7 | View Repeating Signals | "Behaviour pattern (3 signals)" listed | |
| 8 | Click "Next" | Step 4 displays | |
| 9 | View Escalating Signals | "Behaviour – Deteriorating" listed | |
| 10 | Click "Next" | Step 5 displays | |
| 11 | Enter Protective Signals | Type: "Medication round compliance 100% this week" | |
| 12 | Click "Next" | Step 6 displays | |
| 13 | Enter Leadership Interpretation | Type: "Behavioural risk is escalating despite interventions; requires Director awareness." | |
| 14 | Click "Next" | Step 7 displays | |
| 15 | Select Risks Affected | Check "Escalating Behavioural Risk – Resident A" | |
| 16 | Click "Next" | Step 8 displays | |
| 17 | Confirm Trajectory Changes | System suggests "Deteriorating" for the Behaviour risk; confirm | |
| 18 | Click "Next" | Step 9 displays | |
| 19 | Review Control Failures | System shows: "PRN protocol not consistently followed (see signals 3,5,7)" | |
| 20 | Click "Next" | Step 10 displays | |
| 21 | Enter Decisions Required | Type: "Escalate to Director for additional resource approval." | |
| 22 | Click "Next" | Step 11 displays | |
| 23 | Add Actions | Click "Add Action": "Request Director resource review" assigned to Mark, due 3 days | |
| 24 | Click "Next" | Step 12 displays | |
| 25 | Select Overall Position | Choose "Escalating" | |
| 26 | Click "Next" | Step 13 displays | |
| 27 | Review Narrative Draft | System displays auto‑generated summary; Mark edits for clarity | |
| 28 | Click "Complete Review" | Review locked; "Weekly Review Submitted" message | |
| 29 | Log out | | |

**Post‑Condition:** Weekly review is locked; Director receives notification of "Escalating" status.

---

## Scenario 6: Director – Monitoring Organisational Control

**User:** Emma (Director)

**Context:** Emma logs in to assess risk control across all services.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as Emma | Director Dashboard loads | |
| 2 | View Org Effectiveness Summary | Panel 1 shows: Effective 18, Neutral 7, Ineffective 6 | |
| 3 | View Service Comparison Table | Rose House shows 3 ineffective actions (red highlight) | |
| 4 | View 7‑Day Trend Chart | Line chart shows upward trend in ineffective actions | |
| 5 | View Control Failure Flags | Panel 4 shows: "Rose House: 3 ineffective actions on Behaviour" | |
| 6 | Click the Rose House flag | Drills down to Risk Register for Rose House | |
| 7 | View the Escalating Behavioural Risk | Risk detail shows trajectory 'Deteriorating' | |
| 8 | Click "Add Director Note" | Type: "Discussed with Mark – additional Behaviour Specialist hours approved." | |
| 9 | Navigate to Coverage Dashboard | Rose House shows daily reviews completed 5/7 days | |
| 10 | Log out | | |

**Post‑Condition:** Director has clear visibility of where intervention is needed.

---

## Scenario 7: Responsible Individual – Inspection Readiness

**User:** James (Responsible Individual)

**Context:** CQC inspection is scheduled. James needs to prepare evidence of governance.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | Log in as James | RI Dashboard loads | |
| 2 | Navigate to "Weekly Reviews" | List of all completed reviews across houses | |
| 3 | Select Rose House review from last week | Review detail opens (read‑only) | |
| 4 | Review Governance Position | Shows "Escalating" | |
| 5 | Review Narrative Summary | Clear explanation of what happened and actions taken | |
| 6 | Click "Export Evidence Pack" | PDF downloads | |
| 7 | Open PDF | Contains: Signal timeline, risk register extract, action log, weekly narrative | |
| 8 | Verify traceability | Can trace from incident back to individual daily pulse entries | |
| 9 | Navigate to Incident Reconstructions | View any serious incidents | |
| 10 | Select an incident | Full reconstruction with pre‑incident signals and control failure analysis | |
| 11 | Log out | | |

**Post‑Condition:** James is confident he can answer CQC questions about oversight and risk management.

---

## Scenario 8: RM Absence – Deputy Cover

**User:** David (Deputy RM)

**Context:** Mark (RM) is on leave for 3 days. David receives a notification.

| Step | Action | Expected Result | Pass/Fail |
|------|--------|-----------------|-----------|
| 1 | David receives email and push notification | Subject: "Action Required: Daily Governance Review Missed – Rose House" | |
| 2 | Log in as David | Dashboard loads | |
| 3 | Navigate to Daily Oversight Board | Board shows "Deputy Cover" banner | |
| 4 | Complete the daily triage (same as Scenario 2) | Review logged with review_type='Deputy Cover' | |
| 5 | Log out | | |

---

These scripts provide end‑to‑end validation of the OrdinCore system from both technical and business perspectives. Execute QAT first to ensure functional correctness, then UAT to confirm operational fit.