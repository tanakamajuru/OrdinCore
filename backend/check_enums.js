const { Client } = require('pg');
const client = new Client({ host:'localhost', port:5432, database:'caresignal_db', user:'postgres', password:'Chemz@25' });

async function run() {
  await client.connect();

  // Check signal_type enum values
  const enumRes = await client.query(
    `SELECT e.enumlabel FROM pg_type t 
     JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = 'signal_type'
     ORDER BY e.enumsortorder`
  );
  console.log('=== signal_type ENUM VALUES ===');
  console.log(enumRes.rows.map(r => r.enumlabel).join(', '));

  // Also check review_status enum
  const rsRes = await client.query(
    `SELECT e.enumlabel FROM pg_type t 
     JOIN pg_enum e ON e.enumtypid = t.oid
     WHERE t.typname = 'review_status'
     ORDER BY e.enumsortorder`
  );
  console.log('\n=== review_status ENUM VALUES ===');
  console.log(rsRes.rows.map(r => r.enumlabel).join(', '));

  // Check existing weekly reviews for Oak Lodge
  const wrRes = await client.query(
    `SELECT id, house_id, week_ending, status, step_reached, created_at 
     FROM weekly_reviews 
     WHERE house_id = '22222222-2222-3333-4444-555555555555'
     ORDER BY week_ending DESC
     LIMIT 5`
  );
  console.log('\n=== EXISTING WEEKLY REVIEWS (Oak Lodge) ===');
  console.log(JSON.stringify(wrRes.rows, null, 2));

  await client.end();
}
run().catch(e => { console.error(e); process.exit(1); });
