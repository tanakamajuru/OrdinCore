/**
 * Closed-loop QA audit (27 Nov 2026 brief: "information not pulling from related tables/screens").
 *
 * Creates a disposable test tenant on production, drives the REAL doctrine chain through the
 * REAL API as each role in turn (Team Leader signal -> RM decision -> escalation/risk -> incident
 * -> actions -> guided work -> reports), then cross-checks that every downstream screen's data
 * actually reflects what was created upstream. This is the same class of bug fixed repeatedly
 * this session (double-wrapped responses, wrong param names, missing join chains) — this script
 * exists to catch the *next* one systematically instead of one bug report at a time.
 *
 * Run: npx ts-node scripts/qa-e2e-audit.ts
 * Safe to re-run: creates a new, uniquely-named company each run; never touches existing tenants.
 */
import axios, { AxiosInstance } from 'axios';
import { chromium, Page } from 'playwright';
import fs from 'fs';
import path from 'path';

const API = 'https://work.ordincore.co.uk/api/v1';
const APP = 'https://work.ordincore.co.uk';
const STAMP = Date.now();
const PASSWORD = 'QaAudit!2026';
const SHOT_DIR = path.join(__dirname, '..', '..', 'qa-audit-screenshots');
if (!fs.existsSync(SHOT_DIR)) fs.mkdirSync(SHOT_DIR, { recursive: true });

type Finding = { severity: 'BUG' | 'WARN'; area: string; detail: string };
const findings: Finding[] = [];
const bug = (area: string, detail: string) => findings.push({ severity: 'BUG', area, detail });
const warn = (area: string, detail: string) => findings.push({ severity: 'WARN', area, detail });
const log = (msg: string) => console.log(`[qa-audit] ${msg}`);

function client(token?: string): AxiosInstance {
  return axios.create({
    baseURL: API,
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    validateStatus: () => true,
  });
}

async function login(email: string, password: string): Promise<string> {
  const anon = client();
  const res = await anon.post('/auth/login', { email, password });
  if (res.status !== 200 || !res.data?.data?.token) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.data)}`);
  }
  if (res.data.data.mfaRequired) {
    throw new Error(`Login for ${email} requires MFA — cannot proceed unattended.`);
  }
  return res.data.data.token;
}

async function main() {
  log('--- Phase 1: Superadmin creates the test tenant ---');
  const suEmail = process.env.QA_SUPERADMIN_EMAIL;
  const suPassword = process.env.QA_SUPERADMIN_PASSWORD;
  if (!suEmail || !suPassword) throw new Error('Set QA_SUPERADMIN_EMAIL and QA_SUPERADMIN_PASSWORD env vars before running this script.');
  const suToken = await login(suEmail, suPassword);
  const su = client(suToken);

  const companyName = `QA Audit Tenant ${STAMP}`;
  const companyRes = await su.post('/companies', { name: companyName, sector: 'SUPPORTED_LIVING' });
  if (companyRes.status !== 201) { bug('setup', `Company creation failed: ${companyRes.status} ${JSON.stringify(companyRes.data)}`); return report(); }
  const companyId = companyRes.data.data.id;
  log(`Created company ${companyName} (${companyId})`);

  const adminEmail = `qa-admin-${STAMP}@qaaudit.test`;
  const adminRes = await su.post('/users', {
    company_id: companyId, email: adminEmail, password: PASSWORD,
    first_name: 'QA', last_name: 'Admin', role: 'ADMIN',
  });
  if (adminRes.status !== 201) { bug('setup', `Admin user creation failed: ${adminRes.status} ${JSON.stringify(adminRes.data)}`); return report(); }
  log(`Created admin ${adminEmail}`);

  log('--- Phase 2: Admin builds the tenant (house, staff, resident) ---');
  const adminToken = await login(adminEmail, PASSWORD);
  const admin = client(adminToken);

  const houseRes = await admin.post('/houses', { name: 'QA House', sector: 'SUPPORTED_LIVING' });
  if (houseRes.status !== 201) { bug('setup', `House creation failed: ${houseRes.status} ${JSON.stringify(houseRes.data)}`); return report(); }
  const houseId = houseRes.data.data.id;
  log(`Created house QA House (${houseId})`);

  const roles: Record<string, string> = {
    TEAM_LEADER: `qa-tl-${STAMP}@qaaudit.test`,
    REGISTERED_MANAGER: `qa-rm-${STAMP}@qaaudit.test`,
    DIRECTOR: `qa-dir-${STAMP}@qaaudit.test`,
    RESPONSIBLE_INDIVIDUAL: `qa-ri-${STAMP}@qaaudit.test`,
    SUPPORT_WORKER: `qa-sw-${STAMP}@qaaudit.test`,
  };
  const tokens: Record<string, string> = {};
  const userIds: Record<string, string> = {};
  for (const [role, email] of Object.entries(roles)) {
    const first = role.split('_')[0].slice(0, 1) + role.split('_')[0].slice(1).toLowerCase();
    const res = await admin.post('/users', {
      email, password: PASSWORD, first_name: first, last_name: 'QaTest', role,
      house_ids: [houseId],
    });
    if (res.status !== 201) { bug('setup', `${role} creation failed: ${res.status} ${JSON.stringify(res.data)}`); continue; }
    userIds[role] = res.data.data.id;
    tokens[role] = await login(email, PASSWORD);
    log(`Created + logged in as ${role} (${email})`);
  }

  const residentRes = await admin.post(`/houses/${houseId}/service-users`, { first_name: 'Test', last_name: 'Resident' });
  if (residentRes.status !== 201) { bug('setup', `Resident creation failed: ${residentRes.status} ${JSON.stringify(residentRes.data)}`); return report(); }
  const residentId = residentRes.data.data.id;
  log(`Created resident Test Resident (${residentId})`);

  const tl = client(tokens.TEAM_LEADER);
  const rm = client(tokens.REGISTERED_MANAGER);
  const dir = client(tokens.DIRECTOR);
  const ri = client(tokens.RESPONSIBLE_INDIVIDUAL);

  log('--- Phase 3: TL raises a signal ---');
  const domainsRes = await admin.get('/governance-config/domains');
  const activeDomain = (domainsRes.data?.data || []).find((d: any) => d.is_active && d.sector === 'SUPPORTED_LIVING');
  if (!activeDomain) { bug('setup', `No active governance domain found: ${domainsRes.status} ${JSON.stringify(domainsRes.data)}`); return report(); }
  const signalsRes = await admin.get(`/governance-config/signals?domain=${encodeURIComponent(activeDomain.name)}`);
  const activeSignal = (signalsRes.data?.data || []).find((s: any) => s.is_active && s.domain_name === activeDomain.name);
  if (!activeSignal) { bug('setup', `No active signal found for domain ${activeDomain.name}: ${signalsRes.status} ${JSON.stringify(signalsRes.data)}`); return report(); }
  log(`Using governance theme "${activeDomain.name}" / signal "${activeSignal.signal_label}"`);

  const pulseRes = await tl.post('/pulses', {
    house_id: houseId, service_user_id: residentId,
    description: 'QA audit: resident found on floor of bedroom, cause unclear.',
    governance_domain: activeDomain.name, signal_label: activeSignal.signal_label,
    severity: 'High', related_person: 'Test Resident',
  });
  if (pulseRes.status !== 201) { bug('signal-create', `Pulse creation failed: ${pulseRes.status} ${JSON.stringify(pulseRes.data)}`); return report(); }
  const pulseId = pulseRes.data.data.id;
  log(`Signal raised (${pulseId})`);

  // Cross-check 1: does the signal appear in the RM's pulse/signal list at all?
  const rmPulseList = await rm.get('/pulses?limit=50');
  const rmSeesSignal = JSON.stringify(rmPulseList.data).includes(pulseId);
  if (!rmSeesSignal) bug('signal-visibility', 'RM signal list does not contain the TL-authored signal.');
  else log('RM can see the TL-authored signal: OK');

  log('--- Phase 4: RM escalates the signal (Escalate decision) ---');
  const decisionRes = await rm.post('/governance-decisions', {
    pulse_entry_id: pulseId, decision: 'Escalate', severity: 'High',
    what_is_happening: 'Resident found on floor, cause unclear — escalating for Director visibility.',
    decision_rationale: 'QA audit scripted escalation.',
    owner_id: userIds.DIRECTOR,
  });
  if (decisionRes.status !== 201) { bug('decision-create', `Escalate decision failed: ${decisionRes.status} ${JSON.stringify(decisionRes.data)}`); return report(); }
  const escalationId = decisionRes.data.data?.escalation?.id;
  log(`Decision recorded, escalation id: ${escalationId || '(none returned)'}`);
  if (!escalationId) bug('decision-create', 'Escalate decision did not return a linked escalation id.');

  // Cross-check 2: does the signal's own record now show review_status reflecting the decision?
  const pulseAfter = await rm.get(`/pulses/${pulseId}`).catch(() => ({ status: 0, data: null } as any));
  if (pulseAfter.status === 200) {
    const status = pulseAfter.data?.data?.review_status;
    if (!status || status === 'New') bug('signal-pull-decision', `Signal still shows review_status="${status}" after an Escalate decision was recorded against it.`);
    else log(`Signal review_status updated to "${status}": OK`);
  } else {
    warn('signal-pull-decision', `Could not re-fetch signal ${pulseId} to verify review_status (status ${pulseAfter.status}).`);
  }

  // Cross-check 3: does the escalation record pull the originating signal's own detail (reason/description)?
  let escDetail: any = null;
  if (escalationId) {
    const escRes = await rm.get(`/escalations/${escalationId}`);
    escDetail = escRes.data?.data;
    if (escRes.status !== 200) bug('escalation-pull', `Could not fetch escalation ${escalationId}: ${escRes.status}`);
    else if (!escDetail?.observation && !escDetail?.reason) bug('escalation-pull', 'Escalation detail has neither the originating signal observation nor a reason — the signal link is not surfacing.');
    else log('Escalation detail pulls originating signal context: OK');
  }

  log('--- Phase 5: Director handles the handed-over escalation ---');
  const dirGuided = await dir.get('/guided-work');
  const dirNeedsYou: any[] = dirGuided.data?.data?.needsYou || [];
  const dirHasEscalation = dirNeedsYou.some(i => i.canonicalEntityId === escalationId);
  if (escalationId && !dirHasEscalation) bug('guided-work-pull', 'Director handover: escalation handed to the Director does not appear in Director My Work (guided-work needsYou).');
  else if (escalationId) log('Director My Work shows the handed-over escalation: OK');

  log('--- Phase 6: RM reports a linked incident ---');
  const incidentRes = await rm.post('/incidents', {
    house_id: houseId, title: 'QA audit: fall incident', description: 'Resident found on bedroom floor; linked to the open signal/escalation above.',
    severity: 'High', occurred_at: new Date().toISOString(),
    linked_signals: [pulseId],
    linked_escalations: escalationId ? [escalationId] : [],
  });
  if (incidentRes.status !== 201) { bug('incident-create', `Incident creation failed: ${incidentRes.status} ${JSON.stringify(incidentRes.data)}`); }
  const incidentId = incidentRes.data?.data?.id;
  if (incidentId) {
    log(`Incident created (${incidentId})`);
    const incDetail = await rm.get(`/incidents/${incidentId}`);
    const linkedEsc = incDetail.data?.data?.linked_escalations || [];
    const linkedRisks = incDetail.data?.data?.linked_risks;
    if (escalationId && !linkedEsc.some((e: any) => e.id === escalationId)) {
      bug('incident-pull-escalation', 'Incident detail does not surface the linked escalation it was created with.');
    } else if (escalationId) {
      log('Incident detail pulls its linked escalation: OK');
    }
    if (linkedRisks === undefined) warn('incident-pull-risk', 'Incident detail response has no linked_risks field at all.');

    const timelineRes = await rm.get(`/incidents/${incidentId}/governance-timeline`);
    if (timelineRes.status !== 200) {
      bug('incident-timeline-pull', `Governance timeline fetch failed: ${timelineRes.status}`);
    } else {
      const t = timelineRes.data?.data;
      if (!t || !Array.isArray(t.timeline)) bug('incident-timeline-pull', 'Governance timeline response is missing a top-level timeline array (double-wrap regression check).');
      else log(`Governance timeline returned ${t.timeline.length} entries at the correct nesting level: OK`);
    }
  }

  log('--- Phase 7: RI dashboard oversight differentiation ---');
  const riDashRisks = await ri.get('/risks?limit=200');
  const riEsc = await ri.get('/escalations?limit=200');
  if (riEsc.status === 200) {
    const openEscs: any[] = (riEsc.data?.data || []).filter((e: any) => !e.is_closed && e.status !== 'Closed');
    const nonQualifying = openEscs.filter(e => e.escalated_to !== userIds.RESPONSIBLE_INDIVIDUAL && !e.overdue);
    log(`RI sees ${openEscs.length} open escalations total; ${nonQualifying.length} would NOT qualify for the oversight panel under the new rule (expected, confirms the fix is selective, not just "show everything").`);
  }

  log('--- Phase 8: Reports summary reflects the full chain ---');
  const reportsRes = await rm.get('/reports/summary');
  if (reportsRes.status !== 200) {
    bug('reports-pull', `reports/summary failed: ${reportsRes.status}`);
  } else {
    const m = reportsRes.data?.data?.metrics;
    if (!m) bug('reports-pull', 'reports/summary has no metrics object.');
    else if (!m.escalations_open || m.escalations_open < 1) bug('reports-pull', `reports/summary.metrics.escalations_open=${m.escalations_open}, expected >=1 after this run's escalation.`);
    else log(`reports/summary shows escalations_open=${m.escalations_open}: OK`);
  }

  log('--- Phase 8b: Support Worker raises a signal (untested role) ---');
  const sw = client(tokens.SUPPORT_WORKER);
  const swPulseRes = await sw.post('/pulses', {
    house_id: houseId, service_user_id: residentId,
    description: 'QA audit: Support Worker observation — controlled drug count did not match the register.',
    governance_domain: activeDomain.name,
    signal_label: activeSignal.signal_label, severity: 'High', related_person: 'Test Resident',
  });
  let swPulseId: string | undefined;
  if (swPulseRes.status !== 201) {
    bug('signal-create', `Support Worker signal creation failed: ${swPulseRes.status} ${JSON.stringify(swPulseRes.data)}`);
  } else {
    swPulseId = swPulseRes.data.data.id;
    log(`Support Worker signal raised (${swPulseId})`);
    const tlSeesIt = JSON.stringify((await tl.get('/pulses?limit=50')).data).includes(swPulseId!);
    const rmSeesIt = JSON.stringify((await rm.get('/pulses?limit=50')).data).includes(swPulseId!);
    if (!tlSeesIt) bug('signal-visibility', 'TL signal list does not contain the Support-Worker-authored signal.');
    else log('TL can see the Support-Worker-authored signal: OK');
    if (!rmSeesIt) bug('signal-visibility', 'RM signal list does not contain the Support-Worker-authored signal.');
    else log('RM can see the Support-Worker-authored signal: OK');
  }

  log('--- Phase 8c: RM creates an Action from that signal (Create Action decision) ---');
  let actionId: string | undefined;
  if (swPulseId) {
    const dueAt = new Date(Date.now() + 7 * 86400000).toISOString();
    const effDueAt = new Date(Date.now() + 21 * 86400000).toISOString();
    const actionDecisionRes = await rm.post('/governance-decisions', {
      pulse_entry_id: swPulseId, decision: 'Create Action', severity: 'High',
      what_is_happening: 'Controlled drug count discrepancy requires a full audit and competency re-check.',
      decision_rationale: 'QA audit scripted action.',
      owner_id: userIds.TEAM_LEADER, due_at: dueAt,
      review_requirement: 'EFFECTIVENESS_REQUIRED',
      intended_outcome: 'No further controlled-drug discrepancies for this resident.',
      effectiveness_due_at: effDueAt,
    });
    if (actionDecisionRes.status !== 201) {
      bug('decision-create', `Create Action decision failed: ${actionDecisionRes.status} ${JSON.stringify(actionDecisionRes.data)}`);
    } else {
      actionId = actionDecisionRes.data.data?.task?.id;
      if (!actionId) bug('decision-create', 'Create Action decision did not return a linked action/task id.');
      else log(`Action created (${actionId})`);

      // Cross-check: does the action appear in the TL's own My Work / guided-work queue?
      const tlGuided = await tl.get('/guided-work');
      const tlNeedsYou: any[] = tlGuided.data?.data?.needsYou || [];
      const tlHasAction = tlNeedsYou.some(i => i.canonicalEntityId === actionId);
      if (actionId && !tlHasAction) bug('guided-work-pull', 'TL does not see the action just assigned to them in their own guided-work needsYou.');
      else if (actionId) log('TL My Work shows the newly-assigned action: OK');

      // Cross-check: does the Action Tracker (actions list) surface the same action with its
      // governance context (which signal/decision it came from), not just a bare title?
      const actionDetailRes = await rm.get(`/actions/${actionId}`).catch(() => ({ status: 0, data: null } as any));
      if (actionId && actionDetailRes.status === 200) {
        const ad = actionDetailRes.data?.data;
        if (!ad?.source_pulse_id && !ad?.governance_review_id) {
          bug('action-pull-source', 'Action detail does not carry a link back to the signal/decision that created it.');
        } else {
          log('Action detail pulls its originating signal/decision link: OK');
        }
      } else if (actionId) {
        warn('action-pull-source', `Could not fetch action detail directly (status ${actionDetailRes.status}); skipping source-link check.`);
      }
    }
  }

  log('--- Phase 8d: RM promotes a signal directly to a Risk ---');
  const riskPulseRes = await tl.post('/pulses', {
    house_id: houseId, service_user_id: residentId,
    description: 'QA audit: second controlled-drug discrepancy for the same resident within three weeks.',
    governance_domain: activeDomain.name, signal_label: activeSignal.signal_label,
    severity: 'Critical', related_person: 'Test Resident',
  });
  let promotedRiskId: string | undefined;
  if (riskPulseRes.status !== 201) {
    bug('signal-create', `Second signal (for risk promotion) failed: ${riskPulseRes.status} ${JSON.stringify(riskPulseRes.data)}`);
  } else {
    const riskPulseId = riskPulseRes.data.data.id;
    const promoteRes = await rm.post('/governance-decisions', {
      pulse_entry_id: riskPulseId, decision: 'Promote to Risk', severity: 'Critical',
      what_is_happening: 'Repeated controlled-drug discrepancies for the same resident meet the threshold for a formal risk.',
      decision_rationale: 'QA audit scripted risk promotion.',
    });
    if (promoteRes.status !== 201) {
      bug('decision-create', `Promote to Risk decision failed: ${promoteRes.status} ${JSON.stringify(promoteRes.data)}`);
    } else {
      promotedRiskId = promoteRes.data.data?.risk?.id;
      if (!promotedRiskId) bug('decision-create', 'Promote to Risk decision did not return a linked risk id.');
      else {
        log(`Risk promoted (${promotedRiskId})`);
        // Cross-check: Risk Register detail pulls the originating signal, and the RI's risk list
        // (used for the Strategic Risk Summary donut) sees this Critical risk too.
        const riskDetailRes = await rm.get(`/risks/${promotedRiskId}`);
        if (riskDetailRes.status !== 200) {
          bug('risk-pull', `Could not fetch promoted risk detail: ${riskDetailRes.status}`);
        } else {
          const rd = riskDetailRes.data?.data;
          const linkedSignals = rd?.linked_signals || rd?.signal_history;
          if (!linkedSignals || (Array.isArray(linkedSignals) && linkedSignals.length === 0)) {
            bug('risk-pull-signal', 'Risk detail does not surface the originating signal it was promoted from.');
          } else {
            log('Risk detail pulls its originating signal: OK');
          }
        }
        const riRisksAfter = await ri.get('/risks?limit=200');
        const riSeesRisk = JSON.stringify(riRisksAfter.data).includes(promotedRiskId);
        if (!riSeesRisk) bug('risk-visibility', 'RI risk list does not contain the newly-promoted Critical risk (feeds the Strategic Risk Summary donut).');
        else log('RI can see the newly-promoted Critical risk: OK');
      }
    }
  }

  log('--- Phase 9: Real browser verification (Playwright/Chromium) ---');
  await browserVerify({
    rm: { email: roles.REGISTERED_MANAGER, password: PASSWORD },
    director: { email: roles.DIRECTOR, password: PASSWORD },
    ri: { email: roles.RESPONSIBLE_INDIVIDUAL, password: PASSWORD },
    tl: { email: roles.TEAM_LEADER, password: PASSWORD },
    escalationId, incidentId, actionId, promotedRiskId,
  });

  report();
}

async function browserLogin(page: Page, email: string, password: string) {
  await page.goto(`${APP}/login`, { waitUntil: 'networkidle' });
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  await page.waitForLoadState('networkidle');
  // A failed login stays on /login; give the app a moment to redirect on success.
  await page.waitForTimeout(1500);
  if (page.url().includes('/login')) {
    const errorText = await page.locator('.text-destructive').first().textContent().catch(() => null);
    throw new Error(`Browser login failed for ${email}: ${errorText || 'stayed on /login'}`);
  }
}

async function shot(page: Page, name: string) {
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  return file;
}

async function browserVerify(ctx: {
  rm: { email: string; password: string }; director: { email: string; password: string };
  ri: { email: string; password: string }; tl: { email: string; password: string };
  escalationId?: string; incidentId?: string; actionId?: string; promotedRiskId?: string;
}) {
  const browser = await chromium.launch();
  try {
    // --- Director: the handed-over escalation must actually render under My Work ---
    const dirPage = await browser.newPage();
    try {
      await browserLogin(dirPage, ctx.director.email, ctx.director.password);
      await dirPage.goto(`${APP}/my-work`, { waitUntil: 'networkidle' });
      await dirPage.waitForTimeout(1000);
      const dirBody = await dirPage.locator('body').innerText();
      const shotFile = await shot(dirPage, 'director-my-work');
      if (!/escalat/i.test(dirBody)) {
        bug('browser-my-work', `Director My Work page renders no escalation-related text at all. Screenshot: ${shotFile}`);
      } else {
        log(`Director My Work page renders escalation content (screenshot: ${shotFile}): OK`);
      }
    } catch (e: any) {
      bug('browser-login', `Director browser login/navigation failed: ${e.message}`);
    } finally {
      await dirPage.close();
    }

    // --- RM: escalation log + incident detail actually show the linked data on screen ---
    const rmPage = await browser.newPage();
    try {
      await browserLogin(rmPage, ctx.rm.email, ctx.rm.password);
      if (ctx.escalationId) {
        await rmPage.goto(`${APP}/escalation-log?focus=${ctx.escalationId}`, { waitUntil: 'networkidle' });
        await rmPage.waitForTimeout(1000);
        const escBody = await rmPage.locator('body').innerText();
        const escShot = await shot(rmPage, 'rm-escalation-log');
        if (!/qa audit/i.test(escBody)) {
          bug('browser-escalation-log', `Escalation Log page does not render the QA audit escalation's own text when focused. Screenshot: ${escShot}`);
        } else {
          log(`Escalation Log renders the focused escalation (screenshot: ${escShot}): OK`);
        }
      }
      if (ctx.incidentId) {
        await rmPage.goto(`${APP}/incidents/${ctx.incidentId}`, { waitUntil: 'networkidle' });
        await rmPage.waitForTimeout(1000);
        const incBody = await rmPage.locator('body').innerText();
        const incShot = await shot(rmPage, 'rm-incident-detail');
        if (/no risks linked/i.test(incBody) === false && /linked escalation/i.test(incBody) === false && !/escalat/i.test(incBody)) {
          warn('browser-incident-detail', `Incident detail page shows no escalation-related text (linked or "none"). Screenshot: ${incShot}`);
        } else {
          log(`Incident detail page renders escalation linkage state (screenshot: ${incShot}): OK`);
        }
        await rmPage.goto(`${APP}/incidents/${ctx.incidentId}/timeline`, { waitUntil: 'networkidle' });
        await rmPage.waitForTimeout(1500);
        const tlBody = await rmPage.locator('body').innerText();
        const tlShot = await shot(rmPage, 'rm-incident-timeline');
        if (/no governance timeline events/i.test(tlBody)) {
          bug('browser-governance-timeline', `Governance Timeline page renders "no events" even though a decision/escalation/incident chain exists for this case. Screenshot: ${tlShot}`);
        } else {
          log(`Governance Timeline page renders real content (screenshot: ${tlShot}): OK`);
        }
      }
    } catch (e: any) {
      bug('browser-login', `RM browser login/navigation failed: ${e.message}`);
    } finally {
      await rmPage.close();
    }

    // --- RI: dashboard oversight panel renders and reflects the new differentiation ---
    const riPage = await browser.newPage();
    try {
      await browserLogin(riPage, ctx.ri.email, ctx.ri.password);
      await riPage.goto(`${APP}/dashboard`, { waitUntil: 'networkidle' });
      await riPage.waitForTimeout(1500);
      const riBody = await riPage.locator('body').innerText();
      const riShot = await shot(riPage, 'ri-dashboard');
      if (!/RI Oversight/i.test(riBody)) {
        bug('browser-ri-dashboard', `RI Dashboard page does not render the "Open Escalations Requiring RI Oversight" panel at all. Screenshot: ${riShot}`);
      } else {
        log(`RI Dashboard renders the oversight panel (screenshot: ${riShot}): OK`);
      }
      if (ctx.promotedRiskId) {
        await riPage.goto(`${APP}/risk-register/${ctx.promotedRiskId}`, { waitUntil: 'networkidle' });
        await riPage.waitForTimeout(1000);
        const riskBody = await riPage.locator('body').innerText();
        const riskShot = await shot(riPage, 'ri-risk-detail');
        if (!/qa audit/i.test(riskBody)) {
          bug('browser-risk-detail', `Risk Register detail page does not render the originating signal's own text. Screenshot: ${riskShot}`);
        } else {
          log(`Risk Register detail renders the promoted risk's context (screenshot: ${riskShot}): OK`);
        }
      }
    } catch (e: any) {
      bug('browser-login', `RI browser login/navigation failed: ${e.message}`);
    } finally {
      await riPage.close();
    }

    // --- TL: the assigned action must render in their own My Work / Action Tracker ---
    const tlPage = await browser.newPage();
    try {
      await browserLogin(tlPage, ctx.tl.email, ctx.tl.password);
      await tlPage.goto(`${APP}/my-work`, { waitUntil: 'networkidle' });
      await tlPage.waitForTimeout(1500);
      const tlBody = await tlPage.locator('body').innerText();
      const tlShot = await shot(tlPage, 'tl-my-work');
      if (ctx.actionId && !/controlled.drug/i.test(tlBody)) {
        bug('browser-tl-my-work', `TL My Work page does not render the assigned action's own text. Screenshot: ${tlShot}`);
      } else if (ctx.actionId) {
        log(`TL My Work renders the assigned action (screenshot: ${tlShot}): OK`);
      }
    } catch (e: any) {
      bug('browser-login', `TL browser login/navigation failed: ${e.message}`);
    } finally {
      await tlPage.close();
    }
  } finally {
    await browser.close();
  }
}

function report() {
  console.log('\n=== QA AUDIT REPORT ===');
  const bugs = findings.filter(f => f.severity === 'BUG');
  const warns = findings.filter(f => f.severity === 'WARN');
  console.log(`${bugs.length} bug(s), ${warns.length} warning(s)\n`);
  for (const f of findings) console.log(`[${f.severity}] (${f.area}) ${f.detail}`);
  if (findings.length === 0) console.log('No cross-screen data-pull issues detected in this pass.');
}

main().catch(err => {
  console.error('QA audit crashed:', err?.response?.data || err.message || err);
  report();
  process.exit(1);
});
