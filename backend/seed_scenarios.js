/**
 * seed_scenarios.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Seeds all 6 governance lifecycle test scenarios into OrdinCore.
 *
 * Scenarios:
 *  1 – Behavioural Escalation          (Rose House, Behaviour domain)
 *  2 – Medication Errors               (Rose House, Medication domain)
 *  3 – Staffing Shortages + Incident   (Oak Lodge,  Staffing + Incident)
 *  4 – Environmental Hazard Unresolved (Maple Court, Environment domain)
 *  5 – Cross-Service Systemic Risk     (Rose House + Oak Lodge, Medication)
 *  6 – Governance Missed Reviews       (Maple Court, Governance / absence)
 *
 * Usage:
 *   node seed_scenarios.js
 *
 * Prerequisites:
 *   - caresignal_db running locally on port 5432
 *   - Tanaka Care company already exists
 *   - Three houses exist: Rose House, Oak Lodge, Maple Court
 *   - At minimum one RM / TL user exists per house
 *   - npm packages: pg, uuid -> already in node_modules
 * ─────────────────────────────────────────────────────────────────────────────
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'caresignal_db',
  user: 'postgres',
  password: 'Chemz@25',
  ssl: false,
});

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Returns a date string (YYYY-MM-DD) offset by `daysAgo` from today */
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

/** Upsert a signal_cluster; returns the cluster id */
async function upsertCluster(client, { company_id, house_id, risk_domain, label, status, signal_count, first_signal_date, last_signal_date, trajectory = 'Stable' }) {
  const existing = await client.query(
    `SELECT id FROM signal_clusters WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 AND cluster_label = $4 LIMIT 1`,
    [company_id, house_id, risk_domain, label]
  );
  if (existing.rows.length > 0) {
    const id = existing.rows[0].id;
    await client.query(
      `UPDATE signal_clusters SET cluster_status=$1, signal_count=$2, last_signal_date=$3, trajectory=$4, updated_at=NOW() WHERE id=$5`,
      [status, signal_count, last_signal_date, trajectory, id]
    );
    console.log(`  ♻️  Updated cluster: ${label}`);
    return id;
  }
  const res = await client.query(
    `INSERT INTO signal_clusters (id, company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory, created_by_system)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,true) RETURNING id`,
    [uuidv4(), company_id, house_id, risk_domain, label, status, signal_count, first_signal_date, last_signal_date, trajectory]
  );
  console.log(`  ✅ Created cluster: ${label}`);
  return res.rows[0].id;
}

/** Insert a threshold_event (idempotent by rule_name + house_id + pulse_id) */
async function insertThresholdEvent(client, { company_id, house_id, pulse_id, cluster_id, output_type, rule_number, rule_name, description, status = 'Pending' }) {
  const existing = await client.query(
    `SELECT id FROM threshold_events WHERE house_id=$1 AND rule_name=$2 AND COALESCE(pulse_id::text,'')=COALESCE($3::text,'') LIMIT 1`,
    [house_id, rule_name, pulse_id ?? null]
  );
  if (existing.rows.length > 0) {
    console.log(`  ♻️  Threshold event already exists: "${rule_name}"`);
    return existing.rows[0].id;
  }
  const res = await client.query(
    `INSERT INTO threshold_events (id, company_id, house_id, pulse_id, cluster_id, output_type, rule_number, rule_name, description, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING id`,
    [uuidv4(), company_id, house_id, pulse_id ?? null, cluster_id ?? null, output_type, rule_number, rule_name, description, status]
  );
  console.log(`  ✅ Threshold event: "${rule_name}" (${output_type})`);
  return res.rows[0].id;
}

/** Insert a governance_pulse and return its id */
async function insertPulse(client, { company_id, house_id, created_by, entry_date, entry_time, related_person, signal_type, risk_domain, description, immediate_action, severity, has_happened_before, pattern_concern, escalation_required }) {
  const id = uuidv4();
  await client.query(
    `INSERT INTO governance_pulses (id, company_id, house_id, created_by, entry_date, entry_time, related_person, signal_type, risk_domain, description, immediate_action, severity, has_happened_before, pattern_concern, escalation_required, review_status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,'New')`,
    [id, company_id, house_id, created_by, entry_date, entry_time ?? '09:00', related_person ?? null,
     signal_type, risk_domain, description, immediate_action ?? null, severity,
     has_happened_before, pattern_concern, escalation_required]
  );
  return id;
}

/** Upsert a risk and return its id */
async function upsertRisk(client, { company_id, house_id, created_by, title, description, severity, trajectory, source_cluster_id, status = 'Open' }) {
  const existing = await client.query(
    `SELECT id FROM risks WHERE company_id=$1 AND house_id=$2 AND title=$3 LIMIT 1`,
    [company_id, house_id, title]
  );
  if (existing.rows.length > 0) {
    console.log(`  ♻️  Risk already exists: "${title}"`);
    return existing.rows[0].id;
  }
  const reviewDue = new Date(); reviewDue.setDate(reviewDue.getDate() + 7);
  const res = await client.query(
    `INSERT INTO risks (id, company_id, house_id, created_by, title, description, severity, trajectory, source_cluster_id, status, review_due_date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING id`,
    [uuidv4(), company_id, house_id, created_by, title, description, severity, trajectory, source_cluster_id ?? null, status, reviewDue]
  );
  console.log(`  ✅ Risk created: "${title}"`);
  return res.rows[0].id;
}

/** Upsert a risk_action */
async function upsertAction(client, { company_id, risk_id, created_by, assigned_to, title, description, status, effectiveness, due_date, completed_at }) {
  const existing = await client.query(
    `SELECT id FROM risk_actions WHERE risk_id=$1 AND title=$2 LIMIT 1`,
    [risk_id, title]
  );
  if (existing.rows.length > 0) {
    console.log(`  ♻️  Action already exists: "${title}"`);
    return existing.rows[0].id;
  }
  const id = uuidv4();
  await client.query(
    `INSERT INTO risk_actions (id, company_id, risk_id, created_by, assigned_to, title, description, status, effectiveness, due_date, completed_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, company_id, risk_id, created_by, assigned_to ?? created_by, title, description ?? null,
     status ?? 'Pending', effectiveness ?? null, due_date ?? null, completed_at ?? null]
  );
  console.log(`  ✅ Action: "${title}" [${status ?? 'Pending'} / effectiveness: ${effectiveness ?? 'N/A'}]`);
  return id;
}

/** Link a pulse to a risk via risk_signal_links */
async function linkPulseToRisk(client, { risk_id, pulse_id, linked_by }) {
  const existing = await client.query(
    `SELECT id FROM risk_signal_links WHERE risk_id=$1 AND pulse_entry_id=$2 LIMIT 1`,
    [risk_id, pulse_id]
  );
  if (existing.rows.length > 0) return;
  await client.query(
    `INSERT INTO risk_signal_links (id, risk_id, pulse_entry_id, linked_by) VALUES ($1,$2,$3,$4)`,
    [uuidv4(), risk_id, pulse_id, linked_by]
  );
  await client.query(`UPDATE governance_pulses SET review_status='Linked' WHERE id=$1`, [pulse_id]);
}

/** Insert a daily_governance_log row (idempotent by house + date) */
async function upsertDailyLog(client, { company_id, house_id, rm_id, review_date, completed, review_type = 'Primary' }) {
  const existing = await client.query(
    `SELECT id FROM daily_governance_log WHERE house_id=$1 AND review_date=$2 LIMIT 1`,
    [house_id, review_date]
  );
  if (existing.rows.length > 0) return;
  await client.query(
    `INSERT INTO daily_governance_log (id, house_id, reviewed_by, review_date, completed, review_type)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [uuidv4(), house_id, rm_id, review_date, completed, review_type]
  );
}

// ─── Main seed function ──────────────────────────────────────────────────────

async function seed() {
  const client = await pool.connect();
  try {
    // ── Resolve baseline IDs ─────────────────────────────────────────────────
    const companyRes = await client.query(`SELECT id FROM companies WHERE name ILIKE 'Tanaka Care' LIMIT 1`);
    if (!companyRes.rows.length) { console.error('❌ Tanaka Care not found'); process.exit(1); }
    const companyId = companyRes.rows[0].id;
    console.log(`✅ Company: ${companyId}`);

    // Resolve the three houses
    const houseNames = ['Rose House', 'Oak Lodge', 'Maple Court'];
    const houses = {};
    for (const name of houseNames) {
      const r = await client.query(
        `SELECT id FROM houses WHERE company_id=$1 AND name ILIKE $2 LIMIT 1`,
        [companyId, name]
      );
      if (!r.rows.length) {
        // Create the house if it doesn't exist yet
        const h = await client.query(
          `INSERT INTO houses (id, company_id, name, address, city, postcode, capacity, status)
           VALUES ($1,$2,$3,'1 Care Lane','London','W1A 1AA',10,'active') RETURNING id`,
          [uuidv4(), companyId, name]
        );
        houses[name] = h.rows[0].id;
        console.log(`✅ Created house: ${name}`);
      } else {
        houses[name] = r.rows[0].id;
        console.log(`✅ Found house: ${name} (${houses[name]})`);
      }
    }

    // Find the RM user (used as the author for all seeded signals)
    const rmRes = await client.query(
      `SELECT id FROM users WHERE company_id=$1 AND role='REGISTERED_MANAGER' LIMIT 1`,
      [companyId]
    );
    if (!rmRes.rows.length) { console.error('❌ No REGISTERED_MANAGER found'); process.exit(1); }
    const rmId = rmRes.rows[0].id;

    // Find a TL user if any (fallback to RM)
    const tlRes = await client.query(
      `SELECT id FROM users WHERE company_id=$1 AND role='TEAM_LEADER' LIMIT 1`,
      [companyId]
    );
    const tlId = tlRes.rows.length ? tlRes.rows[0].id : rmId;
    console.log(`✅ RM: ${rmId}  |  TL: ${tlId}`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 1 – Behavioural Escalation (Rose House, Behaviour)
    // ────────────────────────────────────────────────────────────────────────
    console.log('\n📋 Scenario 1: Behavioural Escalation — Rose House');

    const rh = houses['Rose House'];

    const s1p1 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(13), entry_time: '08:30', related_person: 'Resident A',
      signal_type: 'Concern', risk_domain: '{Behaviour}',
      description: 'Resident A was restless during breakfast, pacing continuously.',
      severity: 'Low', has_happened_before: 'No', pattern_concern: 'None', escalation_required: 'None',
    });

    const s1p2 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(11), entry_time: '09:15', related_person: 'Resident A',
      signal_type: 'Concern', risk_domain: '{Behaviour}',
      description: 'Resident A shouted at staff when prompted to shower.',
      immediate_action: 'Verbal de-escalation used; resident settled after 15 minutes.',
      severity: 'Moderate', has_happened_before: 'Yes', pattern_concern: 'Possible', escalation_required: 'Manager Review',
    });

    const s1p3 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(9), entry_time: '13:00', related_person: 'Resident A',
      signal_type: 'Incident', risk_domain: '{Behaviour}',
      description: 'Resident A threw a cup at another resident during lunch. No injury occurred.',
      immediate_action: 'Residents separated; incident documented; RM notified.',
      severity: 'High', has_happened_before: 'Yes', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    const s1p4 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(7), entry_time: '10:45', related_person: 'Resident A',
      signal_type: 'Safeguarding', risk_domain: '{Behaviour}',
      description: 'Resident A physically struck Resident B. Minor bruising to Resident B\'s forearm. GP notified.',
      immediate_action: 'GP called; residents separated; family of Resident B informed.',
      severity: 'Critical', has_happened_before: 'Yes', pattern_concern: 'Escalating', escalation_required: 'Immediate Escalation',
    });

    console.log(`  ✅ 4 signals created (Day -13 → Day -7)`);

    // Cluster: Rule 1 triggered after signal 3 (≥3 in 7 days)
    const s1ClusterId = await upsertCluster(client, {
      company_id: companyId, house_id: rh, risk_domain: 'Behaviour',
      label: 'Repeated Agitation – Rose House (4 in 7 days)',
      status: 'Escalated', signal_count: 4, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(13), last_signal_date: daysAgo(7),
    });

    // Mandatory Review (Rule 3 – 1 Critical signal)
    await insertThresholdEvent(client, {
      company_id: companyId, house_id: rh, pulse_id: s1p4, cluster_id: s1ClusterId,
      output_type: 'Mandatory Review', rule_number: 3,
      rule_name: 'Immediate Critical Signal',
      description: 'Critical safeguarding signal raised for Resident A – immediate RM review required.',
    });

    // Risk promoted from cluster
    const s1RiskId = await upsertRisk(client, {
      company_id: companyId, house_id: rh, created_by: rmId,
      title: 'Escalating Behavioural Risk – Resident A',
      description: 'Repeated and escalating behavioural incidents involving Resident A posing risk to other residents. Pattern confirmed over 7 days.',
      severity: 'High', trajectory: 'Deteriorating', source_cluster_id: s1ClusterId,
    });

    // Link all pulses to the risk
    for (const pid of [s1p1, s1p2, s1p3, s1p4]) {
      await linkPulseToRisk(client, { risk_id: s1RiskId, pulse_id: pid, linked_by: rmId });
    }

    // Two ineffective actions → trajectory becomes Critical, Director flag
    const actionDue1 = new Date(); actionDue1.setDate(actionDue1.getDate() - 5);
    const completedAt1 = new Date(); completedAt1.setDate(completedAt1.getDate() - 4);
    const a1 = await upsertAction(client, {
      company_id: companyId, risk_id: s1RiskId, created_by: rmId, assigned_to: tlId,
      title: 'Review PRN protocol for Resident A',
      description: 'Conduct a joint review of the existing PRN medication and de-escalation plan with the Behaviour Specialist.',
      status: 'Completed', effectiveness: 'Ineffective',
      due_date: actionDue1, completed_at: completedAt1,
    });

    const actionDue2 = new Date(); actionDue2.setDate(actionDue2.getDate() - 3);
    const completedAt2 = new Date(); completedAt2.setDate(completedAt2.getDate() - 2);
    const a2 = await upsertAction(client, {
      company_id: companyId, risk_id: s1RiskId, created_by: rmId, assigned_to: rmId,
      title: 'Implement 1:1 supervision during communal times',
      description: 'Resident A to receive dedicated 1:1 supervision during all communal meals and activities.',
      status: 'Completed', effectiveness: 'Ineffective',
      due_date: actionDue2, completed_at: completedAt2,
    });

    // After 2 × Ineffective → trajectory update
    await client.query(`UPDATE risks SET trajectory='Critical' WHERE id=$1`, [s1RiskId]);
    console.log(`  ✅ Risk trajectory set to Critical (2 consecutive Ineffective actions)`);

    // Control Failure threshold event
    await insertThresholdEvent(client, {
      company_id: companyId, house_id: rh, pulse_id: null, cluster_id: s1ClusterId,
      output_type: 'Mandatory Review', rule_number: 4,
      rule_name: 'Control Failure – Consecutive Ineffective Actions',
      description: 'Two consecutive ineffective control actions on "Escalating Behavioural Risk – Resident A". Director notification required.',
    });

    console.log(`  🏁 Scenario 1 complete\n`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 2 – Medication Errors (Rose House, Medication)
    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 Scenario 2: Medication Errors — Rose House');

    const s2p1 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(6), entry_time: '08:00', related_person: 'Resident B',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'PRN pain relief administered 1 hour late due to staffing handover delay.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'None', escalation_required: 'None',
    });

    const s2p2 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(4), entry_time: '08:15', related_person: 'Resident B',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'Resident B missed morning antibiotic dose. Error noticed during lunchtime medication round.',
      immediate_action: 'Dose administered late with GP guidance. GP documented.',
      severity: 'Moderate', has_happened_before: 'Yes', pattern_concern: 'Possible', escalation_required: 'Manager Review',
    });

    const s2p3 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(3), entry_time: '08:30', related_person: 'Resident B',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'Wrong dose of warfarin administered during morning round. Resident B received double dose. GP notified immediately.',
      immediate_action: 'GP called; INR test arranged; family informed. Medication withheld pending review.',
      severity: 'High', has_happened_before: 'Yes', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    console.log(`  ✅ 3 signals created (medication)`);

    // Cluster: Rule 7 (≥2 medication errors in 7 days)
    const s2ClusterId = await upsertCluster(client, {
      company_id: companyId, house_id: rh, risk_domain: 'Medication',
      label: 'Medication Errors – Rose House (3 in 4 days)',
      status: 'Escalated', signal_count: 3, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(6), last_signal_date: daysAgo(3),
    });

    await insertThresholdEvent(client, {
      company_id: companyId, house_id: rh, pulse_id: s2p3, cluster_id: s2ClusterId,
      output_type: 'Risk Proposal', rule_number: 7,
      rule_name: 'Medication Domain Threshold',
      description: '3 medication errors in 4 days – risk proposal required. Pattern escalated.',
    });

    const s2RiskId = await upsertRisk(client, {
      company_id: companyId, house_id: rh, created_by: rmId,
      title: 'Medication Administration Errors – Rose House',
      description: 'Repeated medication errors including missed doses and incorrect dosing over 4 days for Resident B.',
      severity: 'High', trajectory: 'Deteriorating', source_cluster_id: s2ClusterId,
    });

    for (const pid of [s2p1, s2p2, s2p3]) {
      await linkPulseToRisk(client, { risk_id: s2RiskId, pulse_id: pid, linked_by: rmId });
    }

    // Effective action → trajectory improves
    const actionDue3 = new Date(); actionDue3.setDate(actionDue3.getDate() - 1);
    const completedAt3 = new Date(); completedAt3.setDate(completedAt3.getDate() - 1);
    completedAt3.setHours(completedAt3.getHours() - 50); // > 48h ago
    await upsertAction(client, {
      company_id: companyId, risk_id: s2RiskId, created_by: rmId, assigned_to: rmId,
      title: 'Staff training on MAR chart completion',
      description: 'Mandatory MAR chart refresher training for all care staff. Sign-off required before next shift.',
      status: 'Completed', effectiveness: 'Effective',
      due_date: actionDue3, completed_at: completedAt3,
    });

    await client.query(`UPDATE risks SET trajectory='Improving' WHERE id=$1`, [s2RiskId]);
    console.log(`  ✅ Risk trajectory set to Improving (Effective action)`);
    console.log(`  🏁 Scenario 2 complete\n`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 3 – Staffing Shortages + Incident (Oak Lodge)
    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 Scenario 3: Staffing Shortages + Incident — Oak Lodge');

    const ol = houses['Oak Lodge'];

    const s3p1 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(10), entry_time: '07:00', related_person: null,
      signal_type: 'Staffing', risk_domain: '{Staffing}',
      description: 'Only 2 care staff on morning shift. Safe staffing ratio requires minimum 3. Ratio was 1:8.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'None', escalation_required: 'Manager Review',
    });

    const s3p2 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(8), entry_time: '14:00', related_person: null,
      signal_type: 'Staffing', risk_domain: '{Staffing}',
      description: 'Agency staff cancelled at short notice. Afternoon shift short-staffed again. Manager covered.',
      immediate_action: 'Manager covered part of shift; bank staff contacted but unavailable.',
      severity: 'Moderate', has_happened_before: 'Yes', pattern_concern: 'Possible', escalation_required: 'Manager Review',
    });

    const s3p3 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(6), entry_time: '22:00', related_person: 'Resident C',
      signal_type: 'Staffing', risk_domain: '{Staffing}',
      description: 'Night shift operating with only 1 staff member. Resident C fell during unsupervised bathroom visit.',
      immediate_action: 'First aid applied; ambulance called as precaution. Ambulance cleared Resident C — no fracture. On-call manager notified.',
      severity: 'High', has_happened_before: 'Yes', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    // Correlated incident signal (same day as staffing)
    const s3p4 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(6), entry_time: '22:30', related_person: 'Resident C',
      signal_type: 'Incident', risk_domain: '{Behaviour,Staffing}',
      description: 'Resident C fell in bathroom during unsupervised night shift. Bruising to left hip. Believed linked to low staffing.',
      immediate_action: 'Ambulance attended; paramedic cleared Resident C. Body map completed. Family informed.',
      severity: 'High', has_happened_before: 'No', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    console.log(`  ✅ 4 signals created (3 staffing + 1 incident)`);

    // Cluster: Rule 8 (≥3 understaffed signals in 7 days)
    const s3ClusterId = await upsertCluster(client, {
      company_id: companyId, house_id: ol, risk_domain: 'Staffing',
      label: 'Staffing Shortages – Oak Lodge (3 in 5 days)',
      status: 'Escalated', signal_count: 3, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(10), last_signal_date: daysAgo(6),
    });

    await insertThresholdEvent(client, {
      company_id: companyId, house_id: ol, pulse_id: s3p3, cluster_id: s3ClusterId,
      output_type: 'Risk Proposal', rule_number: 8,
      rule_name: 'Staffing Domain Threshold',
      description: '3 understaffed shifts in 5 days at Oak Lodge – immediate risk consideration required.',
    });

    const s3RiskId = await upsertRisk(client, {
      company_id: companyId, house_id: ol, created_by: rmId,
      title: 'Staffing Levels – Oak Lodge',
      description: 'Persistent staffing shortages across shifts at Oak Lodge, leading to unsafe resident-to-staff ratios and a resident fall.',
      severity: 'High', trajectory: 'Deteriorating', source_cluster_id: s3ClusterId,
    });

    for (const pid of [s3p1, s3p2, s3p3, s3p4]) {
      await linkPulseToRisk(client, { risk_id: s3RiskId, pulse_id: pid, linked_by: rmId });
    }

    await upsertAction(client, {
      company_id: companyId, risk_id: s3RiskId, created_by: rmId, assigned_to: rmId,
      title: 'Contact bank and agency providers to secure standby cover',
      description: 'Establish a minimum of 2 bank staff on standby for each shift. Review agency SLAs.',
      status: 'In Progress', effectiveness: null,
      due_date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), completed_at: null,
    });

    console.log(`  🏁 Scenario 3 complete\n`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 4 – Environmental Hazard Unresolved (Maple Court)
    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 Scenario 4: Environmental Hazard — Maple Court');

    const mc = houses['Maple Court'];

    const s4p1 = await insertPulse(client, {
      company_id: companyId, house_id: mc, created_by: tlId,
      entry_date: daysAgo(5), entry_time: '10:00', related_person: null,
      signal_type: 'Environment', risk_domain: '{Environment}',
      description: 'Wet floor warning sign missing in main corridor near dining room. No slip guard in place.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'None', escalation_required: 'None',
    });

    const s4p2 = await insertPulse(client, {
      company_id: companyId, house_id: mc, created_by: tlId,
      entry_date: daysAgo(4), entry_time: '11:30', related_person: null,
      signal_type: 'Environment', risk_domain: '{Environment}',
      description: 'Loose handrail in main bathroom reported by care staff. Risk of fall for residents who use the rail for support.',
      immediate_action: 'Tape placed around area; maintenance request submitted.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'Possible', escalation_required: 'Manager Review',
    });

    const s4p3 = await insertPulse(client, {
      company_id: companyId, house_id: mc, created_by: tlId,
      entry_date: daysAgo(2), entry_time: '09:00', related_person: null,
      signal_type: 'Environment', risk_domain: '{Environment}',
      description: 'Handrail still not fixed — maintenance not attended. Resident narrowly avoided fall while using handrail.',
      immediate_action: 'Bathroom access restricted. Escalated urgently to maintenance provider and manager.',
      severity: 'High', has_happened_before: 'Yes', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    console.log(`  ✅ 3 signals created (environmental hazard progression)`);

    // Cluster: Rule 9 (≥2 hazards unresolved >48h)
    const s4ClusterId = await upsertCluster(client, {
      company_id: companyId, house_id: mc, risk_domain: 'Environment',
      label: 'Environmental Hazards – Maple Court (3 in 4 days)',
      status: 'Escalated', signal_count: 3, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(5), last_signal_date: daysAgo(2),
    });

    await insertThresholdEvent(client, {
      company_id: companyId, house_id: mc, pulse_id: s4p3, cluster_id: s4ClusterId,
      output_type: 'Mandatory Review', rule_number: 9,
      rule_name: 'Environmental Hazard Unresolved >48h',
      description: 'Handrail hazard unresolved for >48 hours at Maple Court. Immediate risk review required.',
    });

    const s4RiskId = await upsertRisk(client, {
      company_id: companyId, house_id: mc, created_by: rmId,
      title: 'Unresolved Maintenance Issues – Maple Court',
      description: 'Multiple environmental hazards including loose handrail and absent slip signs remain unresolved, posing fall risk to residents.',
      severity: 'High', trajectory: 'Deteriorating', source_cluster_id: s4ClusterId,
    });

    for (const pid of [s4p1, s4p2, s4p3]) {
      await linkPulseToRisk(client, { risk_id: s4RiskId, pulse_id: pid, linked_by: rmId });
    }

    // Overdue action — due yesterday, not yet complete
    const overdueDate = new Date(); overdueDate.setDate(overdueDate.getDate() - 1);
    await upsertAction(client, {
      company_id: companyId, risk_id: s4RiskId, created_by: rmId, assigned_to: rmId,
      title: 'Urgent repair request – handrail and corridor hazards',
      description: 'Contact maintenance contractor urgently. Require same-day attendance. Document all remedial work.',
      status: 'Pending', effectiveness: null, due_date: overdueDate, completed_at: null,
    });

    console.log(`  🏁 Scenario 4 complete\n`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 5 – Cross-Service Systemic Risk (Rose House + Oak Lodge, Medication)
    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 Scenario 5: Cross-Service Systemic Risk — Rose House + Oak Lodge (Medication)');

    // Rose House medication signals (in addition to Scenario 2 — new set dated differently)
    const s5p1 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(5), entry_time: '08:00', related_person: 'Resident D',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'Resident D missed morning antibiotic dose — MAR chart not signed.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'None', escalation_required: 'None',
    });

    const s5p2 = await insertPulse(client, {
      company_id: companyId, house_id: rh, created_by: tlId,
      entry_date: daysAgo(3), entry_time: '08:45', related_person: 'Resident D',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'PRN pain relief given 2 hours late for Resident D due to shift changeover confusion.',
      severity: 'Moderate', has_happened_before: 'Yes', pattern_concern: 'Possible', escalation_required: 'None',
    });

    // Oak Lodge medication signals
    const s5p3 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(4), entry_time: '09:00', related_person: 'Resident E',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'Wrong resident (Resident F) received Resident E\'s blood pressure medication. Both residents monitored.',
      immediate_action: 'GP notified. Both residents monitored hourly for 4 hours. No adverse effects.',
      severity: 'Moderate', has_happened_before: 'No', pattern_concern: 'Possible', escalation_required: 'Manager Review',
    });

    const s5p4 = await insertPulse(client, {
      company_id: companyId, house_id: ol, created_by: tlId,
      entry_date: daysAgo(2), entry_time: '07:30', related_person: 'Resident E',
      signal_type: 'Medication', risk_domain: '{Medication}',
      description: 'Insulin error at Oak Lodge — Resident E received incorrect units. GP called immediately.',
      immediate_action: 'Emergency GP attendance. Blood sugar monitored. Resident stable. Full incident report filed.',
      severity: 'High', has_happened_before: 'No', pattern_concern: 'Clear', escalation_required: 'Urgent Review',
    });

    console.log(`  ✅ 4 signals created (2 per house)`);

    // Cluster in Rose House (Emerging after 2 signals)
    const s5ClusterRH = await upsertCluster(client, {
      company_id: companyId, house_id: rh, risk_domain: 'Medication',
      label: 'Medication Errors – Rose House (Cross-Service)',
      status: 'Emerging', signal_count: 2, trajectory: 'Stable',
      first_signal_date: daysAgo(5), last_signal_date: daysAgo(3),
    });

    // Cluster in Oak Lodge (Escalated after serious insulin error)
    const s5ClusterOL = await upsertCluster(client, {
      company_id: companyId, house_id: ol, risk_domain: 'Medication',
      label: 'Medication Errors – Oak Lodge (Cross-Service)',
      status: 'Escalated', signal_count: 2, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(4), last_signal_date: daysAgo(2),
    });

    // Cross-service threshold event (System-Level Risk)
    await client.query(
      // threshold_output_type enum may not include 'System-Level Risk' — cast as text to avoid constraint error
      `INSERT INTO threshold_events (id, company_id, house_id, cluster_id, output_type, rule_number, rule_name, description, status)
       VALUES ($1,$2,$3,$4,'Mandatory Review'::threshold_output_type,$5,$6,$7,'Pending')
       ON CONFLICT DO NOTHING`,
      [uuidv4(), companyId, ol, s5ClusterOL, 12, 'Cross-Service Systemic Risk',
       'Medication errors occurring simultaneously at Rose House (Emerging) and Oak Lodge (Escalated) within 7 days. System-level risk identified — Director notification required.']
    );
    console.log(`  ✅ Cross-service threshold event fired`);

    console.log(`  🏁 Scenario 5 complete\n`);

    // ────────────────────────────────────────────────────────────────────────
    // SCENARIO 6 – Governance Missed Reviews (Maple Court)
    // ────────────────────────────────────────────────────────────────────────
    console.log('📋 Scenario 6: Governance Missed Reviews — Maple Court');

    // Simulate 3 missed daily reviews (Day -3, Day -2, Day -1)
    await upsertDailyLog(client, {
      company_id: companyId, house_id: mc, rm_id: rmId,
      review_date: daysAgo(3), completed: false, review_type: 'Primary',
    });
    await upsertDailyLog(client, {
      company_id: companyId, house_id: mc, rm_id: rmId,
      review_date: daysAgo(2), completed: false, review_type: 'Primary',
    });

    // Day -1: Deputy Cover assigned (48h escalation fired)
    await upsertDailyLog(client, {
      company_id: companyId, house_id: mc, rm_id: rmId,
      review_date: daysAgo(1), completed: false, review_type: 'Deputy Cover',
    });

    console.log(`  ✅ 3 missed daily_governance_log entries seeded`);

    // Rule 10 cluster: ≥2 missed governance reviews
    const s6ClusterId = await upsertCluster(client, {
      company_id: companyId, house_id: mc, risk_domain: 'Governance',
      label: 'Missed Governance Reviews – Maple Court (3 in 3 days)',
      status: 'Escalated', signal_count: 3, trajectory: 'Deteriorating',
      first_signal_date: daysAgo(3), last_signal_date: daysAgo(1),
    });

    // Threshold event: 48h missed → Deputy Cover
    await insertThresholdEvent(client, {
      company_id: companyId, house_id: mc, pulse_id: null, cluster_id: s6ClusterId,
      output_type: 'Mandatory Review', rule_number: 10,
      rule_name: 'Governance Review Absence – 48h',
      description: 'Daily oversight review not completed for 48 hours at Maple Court. Deputy RM notified and review reassigned.',
    });

    // Threshold event: 72h missed → Director notified
    await insertThresholdEvent(client, {
      company_id: companyId, house_id: mc, pulse_id: null, cluster_id: s6ClusterId,
      output_type: 'Mandatory Review', rule_number: 10,
      rule_name: 'Governance Review Absence – 72h',
      description: 'Daily oversight review not completed for 72 hours at Maple Court. Director escalated. CQC governance gap identified.',
    });

    console.log(`  🏁 Scenario 6 complete\n`);

    // ── Final summary ────────────────────────────────────────────────────────
    console.log('═'.repeat(60));
    console.log('🎉 All 6 scenarios seeded successfully!\n');
    console.log('Scenario 1 – Behavioural Escalation     → Rose House');
    console.log('Scenario 2 – Medication Errors          → Rose House');
    console.log('Scenario 3 – Staffing + Incident        → Oak Lodge');
    console.log('Scenario 4 – Environmental Hazard       → Maple Court');
    console.log('Scenario 5 – Cross-Service Systemic     → Rose House + Oak Lodge');
    console.log('Scenario 6 – Missed Reviews             → Maple Court');
    console.log('\nDashboards now populated:');
    console.log('  ✔ Daily Oversight Board (Section A & B)');
    console.log('  ✔ Risk Register with trajectory timelines');
    console.log('  ✔ Director Dashboard: Panels 2, 4, 5 + System-Level Risk alert');
    console.log('  ✔ Coverage Dashboard: Maple Court flagged as missed');
    console.log('  ✔ Weekly Review: All auto-population steps have data');
    console.log('═'.repeat(60));

  } finally {
    client.release();
    pool.end();
  }
}

seed().catch(err => {
  console.error('❌ Seed failed:', err.message);
  console.error(err.stack);
  process.exit(1);
});
