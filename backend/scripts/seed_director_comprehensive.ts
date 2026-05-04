import path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const { query } = require('../src/config/database');

async function seedDirectorDataEnriched() {
  const company_id = '11111111-1111-1111-1111-111111111111';
  const userId = '11111111-1111-1111-1111-111111111102'; // Sam Rivers
  
  const houses = [
    { id: '11111111-2222-3333-4444-555555555555', name: 'Rose House' },
    { id: '22222222-2222-3333-4444-555555555555', name: 'Oak Lodge' },
    { id: '33333333-3333-3333-4444-555555555555', name: 'Maple Court' }
  ];

  console.log('Seeding comprehensive director dashboard data...');

  // 1. Clear some existing data to avoid conflicts if needed, but let's just add new
  
  // 2. Daily Governance Logs (Compliance) - Last 7 days for all houses
  for (const house of houses) {
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      await query(`
        INSERT INTO daily_governance_log (id, house_id, review_date, completed, reviewed_by, review_type, daily_note)
        VALUES (gen_random_uuid(), $1, $2, true, $3, 'Primary', 'Daily review completed.')
        ON CONFLICT (house_id, review_date) DO UPDATE SET completed = true
      `, [house.id, dateStr, userId]);
    }
  }

  // 3. Incidents - Last 7 days for all houses
  const incidentTitles = ['Medication Error', 'Unexplained Bruise', 'Environmental Hazard', 'Staffing Shortage', 'Resident Agitation'];
  for (const house of houses) {
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i % 7));
      await query(`
        INSERT INTO incidents (id, company_id, house_id, title, description, severity, status, created_at, occurred_at, created_by)
        VALUES (gen_random_uuid(), $1, $2, $3, 'Automated description for governance tracking.', 'High', 'Open', $4, $4, $5)
      `, [company_id, house.id, `${incidentTitles[i]} at ${house.name}`, date, userId]);
    }
  }

  // 4. Risks - Last 7 days for all houses
  const domains = ['Clinical', 'Safety', 'Quality', 'Staffing', 'Environment'];
  for (const house of houses) {
    for (let i = 0; i < 5; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (i % 7));
      const domain = domains[i % domains.length];
      
      await query(`
        INSERT INTO risks (id, company_id, house_id, title, severity, risk_domain, status, created_by, created_at)
        VALUES (gen_random_uuid(), $1, $2, $3, 'High', $4, 'Open', $5, $6)
      `, [company_id, house.id, `Strategic Risk: ${domain}`, domain, userId, date]);
    }
  }

  // 5. Signal Clusters (Pattern Detection)
  const clusterLabels = [
    'Repeated Behavioural Incidents - Evening Shift',
    'Clinical Governance Oversight Failure',
    'Environmental Safety Pattern - Communal Areas',
    'Medication Administration Trends'
  ];

  for (let i = 0; i < clusterLabels.length; i++) {
    const house = houses[i % houses.length];
    const domain = domains[i % domains.length];
    
    await query(`
      INSERT INTO signal_clusters (id, company_id, house_id, risk_domain, cluster_label, cluster_status, signal_count, first_signal_date, last_signal_date, trajectory, created_at)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, 'Escalated', $5, $6, $7, $8, NOW())
    `, [
      company_id, 
      house.id, 
      domain, 
      clusterLabels[i], 
      5 + i, 
      new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 
      new Date(), 
      i % 2 === 0 ? 'Deteriorating' : 'Stable'
    ]);
  }

  console.log('Comprehensive director data seeded successfully.');
}

seedDirectorDataEnriched().catch(console.error).finally(() => process.exit(0));
