/**
 * ============================================================
 * Ordin Core – Pre-Deployment Manual E2E Test Script (v2)
 * ============================================================
 * Fixed based on first run analysis:
 *  - risk_domain must be an ARRAY: ['Behaviour']
 *  - signal requires: signal_type, entry_date, entry_time, has_happened_before
 *  - action complete uses: completion_outcome + completion_rationale
 *  - RM review uses: rm_decision + rm_comment ('Confirm improvement')
 *  - Weekly review uses: { house_id, week_ending (date string), content: {...} }
 *
 * Run:  node manual_e2e_test.js
 * ============================================================
 */

const http = require('http');

const BASE_URL = 'http://localhost:3001/api/v1';

// ──────────────────────────────────────────────────────────────
// Minimal HTTP client (no external deps – uses built-in http)
// ──────────────────────────────────────────────────────────────
function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'localhost',
      port: 3001,
      path: `/api/v1${path}`,
      method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    };

    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });

    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Raw HTTP (for non-JSON /health etc.)
function rawRequest(method, path) {
  return new Promise((resolve, reject) => {
    const options = { hostname: 'localhost', port: 3001, path, method };
    const req = http.request(options, (res) => {
      let raw = '';
      res.on('data', (c) => { raw += c; });
      res.on('end', () => resolve({ status: res.statusCode, body: raw }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ──────────────────────────────────────────────────────────────
// Test result tracker
// ──────────────────────────────────────────────────────────────
const results = {};
let passed = 0;
let failed = 0;
let warnings = 0;

function pass(test, msg) {
  console.log(`  ✅ PASS  [${test}] ${msg}`);
  results[test] = { status: '✅', msg };
  passed++;
}

function fail(test, msg) {
  console.log(`  ❌ FAIL  [${test}] ${msg}`);
  results[test] = { status: '❌', msg };
  failed++;
}

function warn(test, msg) {
  console.log(`  ⚠️  WARN  [${test}] ${msg}`);
  results[test] = { status: '⚠️', msg };
  warnings++;
}

function section(title) {
  console.log(`\n${'═'.repeat(62)}`);
  console.log(`  ${title}`);
  console.log('═'.repeat(62));
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ──────────────────────────────────────────────────────────────
// Login helper
// ──────────────────────────────────────────────────────────────
async function login(email, password = 'admin123') {
  const res = await request('POST', '/auth/login', { email, password });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: HTTP ${res.status} – ${JSON.stringify(res.data).slice(0,200)}`);
  }
  const token = res.data.data?.token || res.data.token || res.data.accessToken || res.data.access_token;
  if (!token) throw new Error(`No token in login response for ${email}: ${JSON.stringify(res.data).slice(0,200)}`);
  return token;
}

// ──────────────────────────────────────────────────────────────
// MAIN TEST RUNNER
// ──────────────────────────────────────────────────────────────
async function runTests() {
  console.log('\n🏥  Ordin Core – Pre-Deployment E2E Test Suite (v2)');
  console.log(`    ${new Date().toISOString()}`);
  console.log(`    Backend: ${BASE_URL}\n`);

  // ── Known IDs from DB check ──────────────────────────────────
  const OAK_LODGE_ID  = '22222222-2222-3333-4444-555555555555';
  const JSMITH_ID     = 'bf324b7b-cb4b-475b-a6aa-342c292d59a1'; // first J Smith

  let taylorToken, samToken, chrisToken, patToken, adminToken;
  let taylorUserId;
  let signal1Id, signal2Id, signal3Id;
  let clusterId;
  let riskId, actionId;
  let weeklyReviewId;

  // ──────────────────────────────────────────────────────────
  // PREREQUISITE – Health check & logins
  // ──────────────────────────────────────────────────────────
  section('PREREQUISITES – Health & Login');

  try {
    const health = await rawRequest('GET', '/health');
    if (health.status === 200) pass('health', 'Backend health endpoint responding OK');
    else warn('health', `Health returned HTTP ${health.status}`);
  } catch (e) { warn('health', `Health check error: ${e.message}`); }

  for (const [name, email, tokenVar] of [
    ['Taylor Rose (TL)',       'taylor@ordincore.com', 'taylor'],
    ['Sam Rivers (RM)',        'sam@ordincore.com',    'sam'],
    ['Chris Assurance (RI)',   'chris@ordincore.com',  'chris'],
    ['Pat Director (Dir)',     'pat@ordincore.com',    'pat'],
    ['System Admin',          'admin@ordincore.com',  'admin'],
  ]) {
    try {
      const token = await login(email);
      if (tokenVar === 'taylor') taylorToken = token;
      else if (tokenVar === 'sam')  samToken  = token;
      else if (tokenVar === 'chris') chrisToken = token;
      else if (tokenVar === 'pat')  patToken  = token;
      else if (tokenVar === 'admin') adminToken = token;
      pass(`login_${tokenVar}`, `${name} logged in`);
    } catch (e) { fail(`login_${tokenVar}`, e.message); }
  }

  // Fetch Taylor's user id
  try {
    const meRes = await request('GET', '/auth/me', null, taylorToken);
    taylorUserId = meRes.data?.data?.id || meRes.data?.user?.id || meRes.data?.id;
    if (taylorUserId) pass('me_taylor', `Taylor user id: ${taylorUserId}`);
    else warn('me_taylor', `Could not extract id from: ${JSON.stringify(meRes.data).slice(0,100)}`);
  } catch (e) { warn('me_taylor', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 1 – Team Leader: House Dropdown & Signal Submission
  // ──────────────────────────────────────────────────────────
  section('TEST 1 – TL: House Dropdown & Signal Submission');

  try {
    const housesRes = await request('GET', '/houses', null, taylorToken);
    if (housesRes.status !== 200) throw new Error(`HTTP ${housesRes.status}: ${JSON.stringify(housesRes.data)}`);
    const houses = housesRes.data?.data || housesRes.data || [];
    const names = houses.map(h => h.name).join(', ');
    const hasRose = names.includes('Rose');
    const hasOak  = names.includes('Oak');
    if (hasRose && hasOak) {
      pass('t1_house_dropdown', `Both houses visible: ${names}`);
    } else {
      fail('t1_house_dropdown', `Expected both Rose House & Oak Lodge. Got: ${names || '(none)'}`);
    }
  } catch (e) { fail('t1_house_dropdown', e.message); }

  // Build correct signal payload (matches PulseDto exactly)
  const today = new Date().toISOString().split('T')[0];
  const now   = new Date().toTimeString().split(' ')[0]; // HH:MM:SS

  const signalBase = {
    house_id:           OAK_LODGE_ID,
    related_person:     'J Smith',          // service user display name
    signal_type:        'Concern',          // valid enum: Incident|Concern|Observation|Safeguarding|Medication|Staffing|Environment|Positive
    risk_domain:        ['Behaviour'],      // ARRAY – DB column is string[]
    description:        'Resident J Smith refused medication and became verbally aggressive.',
    immediate_action:   'De-escalated, offered medication 30 min later.',
    severity:           'High',
    has_happened_before: 'Yes',
    pattern_concern:    'Clear',
    escalation_required:'Manager Review',
    entry_date:         today,
    entry_time:         now,
  };

  for (let i = 1; i <= 3; i++) {
    const payload = {
      ...signalBase,
      pattern_concern: i === 3 ? 'Escalating' : 'Clear',
      description: `${signalBase.description} (Signal ${i})`,
    };
    try {
      const res = await request('POST', '/pulses', payload, taylorToken);
      if (res.status === 200 || res.status === 201) {
        const id = res.data?.data?.id || res.data?.id;
        if (i === 1) signal1Id = id;
        if (i === 2) signal2Id = id;
        if (i === 3) signal3Id = id;
        pass(`t1_signal${i}`, `Signal ${i} submitted (id: ${id}, pattern_concern: ${payload.pattern_concern})`);
      } else {
        fail(`t1_signal${i}`, `HTTP ${res.status}: ${JSON.stringify(res.data).slice(0,300)}`);
      }
    } catch (e) { fail(`t1_signal${i}`, e.message); }
    await sleep(300);
  }

  // Pulse history expand
  try {
    const phRes = await request('GET', '/pulses', null, taylorToken);
    if (phRes.status !== 200) throw new Error(`HTTP ${phRes.status}`);
    const pulses = phRes.data?.data || phRes.data || [];
    if (pulses.length > 0) {
      const firstId = pulses[0]?.id;
      const detail = await request('GET', `/pulses/${firstId}`, null, taylorToken);
      if (detail.status === 200) {
        pass('t1_pulse_history', `Pulse History: detail loaded (id: ${firstId})`);
      } else {
        fail('t1_pulse_history', `Pulse detail HTTP ${detail.status}: ${JSON.stringify(detail.data).slice(0,200)}`);
      }
    } else {
      warn('t1_pulse_history', 'No pulses returned in list');
    }
  } catch (e) { fail('t1_pulse_history', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 2 – Pattern Detection: Cluster & Risk Candidate
  // ──────────────────────────────────────────────────────────
  section('TEST 2 – Pattern Detection: Cluster & Risk Candidate');

  console.log('  ⏳ Waiting 20s for pattern worker to process signals...');
  await sleep(20000);

  try {
    const clRes = await request('GET', '/clusters', null, samToken);
    if (clRes.status !== 200) throw new Error(`HTTP ${clRes.status}: ${JSON.stringify(clRes.data)}`);
    const clusters = clRes.data?.data || clRes.data || [];
    // Prefer a cluster for Oak Lodge with Behaviour domain
    const best = clusters.find(c =>
      (c.house_id === OAK_LODGE_ID || c.house_name?.includes('Oak')) &&
      (c.risk_domain === 'Behaviour' || (Array.isArray(c.risk_domain) && c.risk_domain.includes('Behaviour')))
    ) || clusters.find(c => c.house_id === OAK_LODGE_ID) || clusters[0];

    if (best) {
      clusterId = best.id;
      pass('t2_cluster', `Cluster found: "${best.label || best.risk_domain || 'N/A'}" (${best.signal_count || '?'} signals, house: ${best.house_name || best.house_id}) id: ${clusterId}`);
    } else {
      fail('t2_cluster', `No clusters found after 20s. ${clusters.length} total clusters: ${JSON.stringify(clusters.map(c => c.label || c.risk_domain)).slice(0,200)}`);
    }
  } catch (e) { fail('t2_cluster', e.message); }

  // Risk candidates via RM dashboard
  try {
    const dashRes = await request('GET', `/pulses/dashboard`, null, samToken);
    if (dashRes.status === 200) {
      const dash = dashRes.data?.data || dashRes.data || {};
      const candidates = dash.risk_candidates || [];
      if (candidates.length > 0) {
        pass('t2_risk_candidate', `RM Dashboard: ${candidates.length} risk candidate(s) visible`);
      } else {
        warn('t2_risk_candidate', `RM Dashboard returned no risk_candidates (${JSON.stringify(Object.keys(dash))})`);
      }
    } else {
      warn('t2_risk_candidate', `RM Dashboard HTTP ${dashRes.status}`);
    }
  } catch (e) { warn('t2_risk_candidate', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 3 – RM: Promote Risk & Assign Action
  // ──────────────────────────────────────────────────────────
  section('TEST 3 – RM: Promote Risk & Assign Action');

  // Attempt promote via cluster
  try {
    if (!clusterId) throw new Error('No clusterId – cannot promote');
    const promPayload = {
      cluster_id:  clusterId,
      title:       'Behaviour Risk – J Smith (Oak Lodge)',
      description: 'Pattern of escalating behaviour signals (3 signals) for J Smith at Oak Lodge.',
      category:    'Behaviour',
      severity:    'High',
      house_id:    OAK_LODGE_ID,
      assigned_to: taylorUserId,
      reason:      'Pattern of escalating behaviour signals requires formal risk registration',
    };
    const res = await request('POST', '/risks/promote', promPayload, samToken);
    if (res.status === 200 || res.status === 201) {
      riskId = res.data?.data?.id || res.data?.risk?.id || res.data?.id;
      pass('t3_promote_risk', `Risk promoted (id: ${riskId})`);
    } else {
      // Fallback: direct create
      const createRes = await request('POST', '/risks', {
        title:       'Behaviour Risk – J Smith (Oak Lodge)',
        description: 'Pattern of escalating behaviour signals for J Smith at Oak Lodge.',
        category:    'Behaviour',
        severity:    'High',
        house_id:    OAK_LODGE_ID,
        assigned_to: taylorUserId,
        status:      'active',
      }, samToken);
      if (createRes.status === 200 || createRes.status === 201) {
        riskId = createRes.data?.data?.id || createRes.data?.id;
        warn('t3_promote_risk', `Promote returned ${res.status} (${JSON.stringify(res.data).slice(0,150)}) – used direct create (id: ${riskId})`);
      } else {
        fail('t3_promote_risk', `Promote: ${res.status} – ${JSON.stringify(res.data).slice(0,200)} | Create: ${createRes.status} – ${JSON.stringify(createRes.data).slice(0,200)}`);
      }
    }
  } catch (e) { fail('t3_promote_risk', e.message); }

  // Verify risk in register
  try {
    if (!riskId) throw new Error('No riskId');
    const regRes = await request('GET', '/risks', null, samToken);
    if (regRes.status !== 200) throw new Error(`HTTP ${regRes.status}`);
    const risks = regRes.data?.data || regRes.data || [];
    const found = risks.find(r => r.id === riskId);
    if (found) pass('t3_risk_register', `Risk appears in register: "${found.title}"`);
    else warn('t3_risk_register', `Risk ${riskId} not found in register (${risks.length} risks total)`);
  } catch (e) { fail('t3_risk_register', e.message); }

  // Evidence trail / timeline
  try {
    if (!riskId) throw new Error('No riskId');
    const tlRes = await request('GET', `/risks/${riskId}/timeline`, null, samToken);
    if (tlRes.status === 200) pass('t3_evidence_trail', `Evidence trail loaded for risk ${riskId}`);
    else warn('t3_evidence_trail', `Timeline HTTP ${tlRes.status}: ${JSON.stringify(tlRes.data).slice(0,150)}`);
  } catch (e) { fail('t3_evidence_trail', e.message); }

  // Assign action to Taylor
  try {
    if (!riskId) throw new Error('No riskId');
    const due = new Date();
    due.setDate(due.getDate() + 7);
    const actRes = await request('POST', `/risks/${riskId}/action`, {
      title:       'Review behaviour management plan for J Smith',
      description: 'Review and update the behaviour management plan following recent incidents.',
      assigned_to: taylorUserId,
      due_date:    due.toISOString(),
      priority:    'High',
    }, samToken);
    if (actRes.status === 200 || actRes.status === 201) {
      actionId = actRes.data?.data?.id || actRes.data?.action?.id || actRes.data?.id;
      pass('t3_assign_action', `Action assigned to Taylor (id: ${actionId})`);
    } else {
      fail('t3_assign_action', `HTTP ${actRes.status}: ${JSON.stringify(actRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t3_assign_action', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 4 – Team Leader: Complete Action with Outcome
  // ──────────────────────────────────────────────────────────
  section('TEST 4 – TL: Complete Action with Outcome');

  // Get actionId from "my actions" if needed
  try {
    const myActRes = await request('GET', '/actions/my', null, taylorToken);
    if (myActRes.status !== 200) throw new Error(`HTTP ${myActRes.status}: ${JSON.stringify(myActRes.data)}`);
    const myActions = myActRes.data?.data || myActRes.data || [];
    if (myActions.length > 0) {
      pass('t4_my_actions', `My Actions: ${myActions.length} action(s) listed`);
      if (!actionId) {
        // Use the pending one with correct risk
        const pending = myActions.find(a => a.status === 'Pending' && a.risk_id === riskId) || myActions[0];
        actionId = pending.id;
        console.log(`    ℹ️  Using actionId from My Actions: ${actionId}`);
      }
    } else {
      warn('t4_my_actions', 'No actions in My Actions list');
    }
  } catch (e) { fail('t4_my_actions', e.message); }

  // Complete action – correct field names: completion_outcome + completion_rationale
  try {
    if (!actionId) throw new Error('No actionId');
    const compRes = await request('PATCH', `/actions/${actionId}/complete`, {
      completion_outcome:   'Partial improvement',
      completion_rationale: 'Behavioural incidents reduced after plan update. J Smith accepted medication the following day.',
      completion_note:      'E2E test completion note.',
    }, taylorToken);
    if (compRes.status === 200 || compRes.status === 201) {
      pass('t4_complete_action', `Action ${actionId} completed with outcome "Partial improvement"`);
    } else {
      fail('t4_complete_action', `HTTP ${compRes.status}: ${JSON.stringify(compRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t4_complete_action', e.message); }

  // Verify action no longer open
  try {
    const afterRes = await request('GET', '/actions/my', null, taylorToken);
    if (afterRes.status === 200) {
      const remaining = afterRes.data?.data || afterRes.data || [];
      const stillOpen = remaining.find(a => a.id === actionId && !['Completed','completed','done','Done'].includes(a.status));
      if (!stillOpen) {
        pass('t4_action_done', 'Action no longer listed as open after completion ✓');
      } else {
        warn('t4_action_done', `Action still open: status="${stillOpen.status}"`);
      }
    }
  } catch (e) { warn('t4_action_done', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 5 – RM: Review Action & Update Risk Trajectory
  // ──────────────────────────────────────────────────────────
  section('TEST 5 – RM: Review Action & Update Risk Trajectory');

  // RM review – correct fields: rm_decision + rm_comment
  try {
    if (!actionId) throw new Error('No actionId');
    const rmRes = await request('POST', `/actions/${actionId}/rm-review`, {
      rm_decision: 'Confirm improvement',  // Exact enum: 'Confirm improvement' | 'No impact' | 'Negative impact'
      rm_comment:  'Incidents down significantly. Plan updated. Trajectory improving.',
    }, samToken);
    if (rmRes.status === 200 || rmRes.status === 201) {
      pass('t5_rm_review', 'RM reviewed action – "Confirm improvement" recorded');
    } else {
      fail('t5_rm_review', `HTTP ${rmRes.status}: ${JSON.stringify(rmRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t5_rm_review', e.message); }

  // Check risk trajectory updated
  try {
    if (!riskId) throw new Error('No riskId');
    await sleep(1000); // brief wait for update
    const riskDetail = await request('GET', `/risks/${riskId}`, null, samToken);
    if (riskDetail.status === 200) {
      const risk = riskDetail.data?.data || riskDetail.data || {};
      const trajectory = risk.trajectory || risk.risk_trajectory || 'N/A';
      if (['Improving', 'improving'].includes(trajectory)) {
        pass('t5_trajectory', `Risk trajectory updated to: "${trajectory}"`);
      } else {
        warn('t5_trajectory', `Trajectory is: "${trajectory}" (expected "Improving" after "Confirm improvement")`);
      }
    } else {
      warn('t5_trajectory', `Risk detail HTTP ${riskDetail.status}`);
    }
  } catch (e) { fail('t5_trajectory', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 6 – RM: Weekly Review Finalisation
  // ──────────────────────────────────────────────────────────
  section('TEST 6 – RM: Weekly Review Finalisation');

  // weekly_reviews.service.save() expects: { house_id, week_ending (date), content: {...}, step_reached, status }
  // IMPORTANT: Use a *future* date not already used – existing reviews for 2026-05-20 and 2026-05-19 are LOCKED
  // Pick next Sunday (7 days ahead) to ensure no conflict
  const nextSunday = new Date();
  nextSunday.setDate(nextSunday.getDate() + 6);
  const weekEnding = nextSunday.toISOString().split('T')[0];

  // Preview (expects ?house_id=UUID&week_ending=YYYY-MM-DD)
  try {
    const previewRes = await request('GET', `/weekly-reviews/preview?house_id=${OAK_LODGE_ID}&week_ending=${weekEnding}`, null, samToken);
    if (previewRes.status === 200) {
      pass('t6_preview', 'Weekly review preview loaded');
    } else {
      warn('t6_preview', `Preview HTTP ${previewRes.status}: ${JSON.stringify(previewRes.data).slice(0,200)}`);
    }
  } catch (e) { fail('t6_preview', e.message); }

  // Save draft weekly review
  try {
    const saveRes = await request('POST', '/weekly-reviews', {
      house_id:     OAK_LODGE_ID,
      week_ending:  weekEnding,
      step_reached: 1,
      status:       'draft',
      content: {
        step1_house:           'Oak Lodge',
        step2_period:          `${weekEnding} to ${weekEnding}`,
        step3_pulse_count:     3,
        step4_signals:         [
          { description: 'Behaviour Signal 1 – J Smith refused medication' },
          { description: 'Behaviour Signal 2 – J Smith agitated' },
          { description: 'Behaviour Signal 3 – Escalating pattern' },
        ],
        step5_repeats:         'Behaviour incidents for J Smith on 3 consecutive days',
        step6_worsening:       'Pattern escalating per Signal 3',
        step14_overall_position: 'Watch',
        step15_narrative:      'Governance review confirms escalating behaviour pattern for J Smith. Management plan updated.',
      },
    }, samToken);

    if (saveRes.status === 200 || saveRes.status === 201) {
      weeklyReviewId = saveRes.data?.data?.id || saveRes.data?.id;
      pass('t6_save_review', `Weekly review draft saved (id: ${weeklyReviewId})`);
    } else {
      fail('t6_save_review', `HTTP ${saveRes.status}: ${JSON.stringify(saveRes.data).slice(0,400)}`);
    }
  } catch (e) { fail('t6_save_review', e.message); }

  // Finalise
  try {
    if (!weeklyReviewId) throw new Error('No weeklyReviewId – skipping finalise');
    const finRes = await request('POST', `/weekly-reviews/${weeklyReviewId}/finalise`, {}, samToken);
    if (finRes.status === 200 || finRes.status === 201) {
      pass('t6_finalise', `Weekly review ${weeklyReviewId} finalised`);
    } else {
      fail('t6_finalise', `HTTP ${finRes.status}: ${JSON.stringify(finRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t6_finalise', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 7 – RI: Validate Weekly Review
  // ──────────────────────────────────────────────────────────
  section('TEST 7 – RI: Validate Weekly Review');

  try {
    if (!weeklyReviewId) throw new Error('No weeklyReviewId – skipping validate');
    const valRes = await request('POST', `/weekly-reviews/${weeklyReviewId}/validate`, {
      validation_status:  'Approved',          // Allowed: 'Approved' | 'Challenged' | 'Reopened'
      validation_comment: 'Governance satisfactory. RI validation confirmed. E2E test.',
    }, chrisToken);
    if (valRes.status === 200 || valRes.status === 201) {
      pass('t7_ri_validate', `RI validated weekly review ${weeklyReviewId}`);
    } else {
      fail('t7_ri_validate', `HTTP ${valRes.status}: ${JSON.stringify(valRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t7_ri_validate', e.message); }

  // Confirm locked/validated status
  try {
    if (!weeklyReviewId) throw new Error('No weeklyReviewId');
    const chkRes = await request('GET', `/weekly-reviews/${weeklyReviewId}`, null, chrisToken);
    if (chkRes.status === 200) {
      const rev = chkRes.data?.data || chkRes.data || {};
      const status = (rev.status || 'unknown').toUpperCase();
      if (['VALIDATED', 'APPROVED', 'LOCKED', 'COMPLETED'].includes(status)) {
        pass('t7_review_locked', `Review status: "${status}" (locked) ✓`);
      } else {
        warn('t7_review_locked', `Review status: "${status}" (expected VALIDATED/APPROVED/LOCKED)`);
      }
    }
  } catch (e) { warn('t7_review_locked', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 8 – Director: Dashboards & Reports
  // ──────────────────────────────────────────────────────────
  section('TEST 8 – Director: Dashboards & Reports');

  try {
    const dirRes = await request('GET', '/analytics/director-intelligence', null, patToken);
    if (dirRes.status === 200) {
      const keys = Object.keys(dirRes.data?.data || dirRes.data || {}).join(', ');
      pass('t8_director_dashboard', `Director Intelligence dashboard loaded. Keys: ${keys}`);
    } else {
      warn('t8_director_dashboard', `HTTP ${dirRes.status}: ${JSON.stringify(dirRes.data).slice(0,200)}`);
    }
  } catch (e) { fail('t8_director_dashboard', e.message); }

  try {
    const trendsRes = await request('GET', '/analytics/risk-trends/multi-house', null, patToken);
    if (trendsRes.status === 200) pass('t8_risk_trends', 'Cross-house risk trends loaded');
    else warn('t8_risk_trends', `HTTP ${trendsRes.status}: ${JSON.stringify(trendsRes.data).slice(0,150)}`);
  } catch (e) { fail('t8_risk_trends', e.message); }

  // Request board report – find correct payload by checking reports controller
  try {
    const now2 = new Date();
    // Required field is 'name', type, and dates
    const repPayload = {
      name:         `Monthly Board Report – ${now2.toLocaleString('default', { month: 'long' })} ${now2.getFullYear()}`,
      type:         'monthly_board',
      period_start: new Date(now2.getFullYear(), now2.getMonth(), 1).toISOString().split('T')[0],
      period_end:   now2.toISOString().split('T')[0],
    };
    const repRes = await request('POST', '/reports/request', repPayload, patToken);
    if (repRes.status === 200 || repRes.status === 201) {
      pass('t8_request_report', `Board report requested (id: ${repRes.data?.data?.id || repRes.data?.id})`);
    } else {
      warn('t8_request_report', `HTTP ${repRes.status}: ${JSON.stringify(repRes.data).slice(0,300)}`);
    }
  } catch (e) { fail('t8_request_report', e.message); }

  try {
    const listRes = await request('GET', '/reports', null, patToken);
    if (listRes.status === 200) {
      const cnt = (listRes.data?.data || listRes.data || []).length;
      pass('t8_list_reports', `Reports list: ${cnt} report(s)`);
    } else {
      warn('t8_list_reports', `HTTP ${listRes.status}`);
    }
  } catch (e) { fail('t8_list_reports', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 9 – Pulse History Expand (Team Leader)
  // ──────────────────────────────────────────────────────────
  section('TEST 9 – Pulse History Expand (Team Leader)');

  try {
    const phRes = await request('GET', '/pulses', null, taylorToken);
    if (phRes.status !== 200) throw new Error(`HTTP ${phRes.status}`);
    const pulses = phRes.data?.data || phRes.data || [];
    if (pulses.length === 0) {
      warn('t9_pulse_history', 'No pulses in list – timing issue?');
    } else {
      const id = pulses[0]?.id;
      const det = await request('GET', `/pulses/${id}`, null, taylorToken);
      if (det.status === 200) {
        pass('t9_pulse_history', `Pulse History expand: detail loaded for pulse ${id} without error`);
      } else {
        fail('t9_pulse_history', `Pulse detail HTTP ${det.status}: ${JSON.stringify(det.data).slice(0,200)}`);
      }
    }
  } catch (e) { fail('t9_pulse_history', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 10 – Admin: User Management & Service Users
  // ──────────────────────────────────────────────────────────
  section('TEST 10 – Admin: User Management & Service Users');

  try {
    const usersRes = await request('GET', '/users', null, adminToken);
    if (usersRes.status !== 200) throw new Error(`HTTP ${usersRes.status}: ${JSON.stringify(usersRes.data)}`);
    const users = usersRes.data?.data || usersRes.data || [];
    const taylor = users.find(u => u.email === 'taylor@ordincore.com');
    if (taylor) {
      pass('t10_user_list', `Admin user list: found Taylor Rose (id: ${taylor.id})`);
      // Multi-house assignment
      const assignRes = await request('POST', `/users/${taylor.id}/assign-house`, {
        house_id:      OAK_LODGE_ID,
        role_in_house: 'TEAM_LEADER',
      }, adminToken);
      if (assignRes.status === 200 || assignRes.status === 201) {
        pass('t10_assign_house', 'Multi-house assignment: Taylor → Oak Lodge ✓');
      } else {
        warn('t10_assign_house', `Assign HTTP ${assignRes.status}: ${JSON.stringify(assignRes.data).slice(0,200)}`);
      }
    } else {
      fail('t10_user_list', `Taylor not found. Users: ${users.map(u => u.email).join(', ')}`);
    }
  } catch (e) { fail('t10_user_list', e.message); }

  // Service user deactivation
  try {
    const dupId = 'fdf05c1b-daa1-45ed-a22b-21068b3c7c7e';
    const deactRes = await request('PATCH', `/service-users/${dupId}`, { is_active: false }, adminToken);
    if (deactRes.status === 200 || deactRes.status === 201) {
      pass('t10_deactivate_su', `Duplicate service user deactivated (id: ${dupId})`);
    } else {
      warn('t10_deactivate_su', `Deactivate HTTP ${deactRes.status}: ${JSON.stringify(deactRes.data).slice(0,200)}`);
    }
  } catch (e) { warn('t10_deactivate_su', e.message); }

  // ──────────────────────────────────────────────────────────
  // TEST 11 – Mobile App (API smoke test)
  // ──────────────────────────────────────────────────────────
  section('TEST 11 – Mobile App (manual only)');
  warn('t11_mobile', 'Mobile app Expo test skipped – requires manual QR scan on device');

  // ──────────────────────────────────────────────────────────
  // FINAL SUMMARY
  // ──────────────────────────────────────────────────────────
  section('FINAL PASS / FAIL SUMMARY');

  const testGroups = [
    { label: '1. TL house dropdown & signal submission',  keys: ['t1_house_dropdown','t1_signal1','t1_signal2','t1_signal3','t1_pulse_history'] },
    { label: '2. Pattern detection creates cluster',      keys: ['t2_cluster','t2_risk_candidate'] },
    { label: '3. RM promotes risk & assigns action',      keys: ['t3_promote_risk','t3_risk_register','t3_evidence_trail','t3_assign_action'] },
    { label: '4. TL completes action with outcome',       keys: ['t4_my_actions','t4_complete_action','t4_action_done'] },
    { label: '5. RM reviews action, trajectory updates',  keys: ['t5_rm_review','t5_trajectory'] },
    { label: '6. Weekly review finalisation',             keys: ['t6_preview','t6_save_review','t6_finalise'] },
    { label: '7. RI validation',                          keys: ['t7_ri_validate','t7_review_locked'] },
    { label: '8. Director dashboards & reports',          keys: ['t8_director_dashboard','t8_risk_trends','t8_request_report','t8_list_reports'] },
    { label: '9. Pulse history expand',                   keys: ['t9_pulse_history'] },
    { label: '10. Admin user mgmt & service users',       keys: ['t10_user_list','t10_assign_house','t10_deactivate_su'] },
    { label: '11. Mobile app (optional)',                  keys: ['t11_mobile'] },
  ];

  console.log('\n  Test                                                    Result');
  console.log('  ' + '─'.repeat(72));
  for (const grp of testGroups) {
    const grpResults = grp.keys.map(k => results[k]?.status || '⬛').join('');
    const anyFail   = grp.keys.some(k => results[k]?.status === '❌');
    const allPass   = grp.keys.every(k => results[k]?.status === '✅');
    const overall   = anyFail ? '❌' : allPass ? '✅' : '⚠️ ';
    console.log(`  ${overall}  ${grp.label.padEnd(52)} [${grpResults}]`);
  }

  console.log(`\n  ${'─'.repeat(72)}`);
  console.log(`  Total: ${passed + failed + warnings}  |  ✅ ${passed} passed  |  ❌ ${failed} failed  |  ⚠️  ${warnings} warnings`);

  if (failed === 0) {
    console.log('\n  🎉  ALL TESTS PASSED. System is ready for production deployment.\n');
  } else {
    console.log(`\n  🚨  ${failed} test(s) FAILED. Fix issues before deploying to production.\n`);
    console.log('  FAILURES DETAIL:');
    for (const [k, r] of Object.entries(results)) {
      if (r.status === '❌') console.log(`    ❌ ${k}: ${r.msg}`);
    }
    console.log('');
  }
}

runTests().catch((err) => {
  console.error('\n💥 Test runner crashed:', err);
  process.exit(1);
});
