const { Client } = require('pg');

async function test() {
  const client = new Client({
    host: 'localhost',
    user: 'postgres',
    password: 'Chemz@25',
    database: 'caresignal_db'
  });

  try {
    await client.connect();
    console.log('--- Phase 3 Verification Test ---');

    // 1. Get a risk and an action
    const actionRes = await client.query('SELECT * FROM risk_actions LIMIT 1');
    if (actionRes.rows.length === 0) {
      console.log('No actions found to test. Please create an action first.');
      return;
    }
    const action = actionRes.rows[0];
    console.log(`Testing with Action: ${action.id} (Created by: ${action.created_by})`);

    // 2. Simulate Four-Eyes check: Same user verifying their own action
    // In code this is handled in risks.service.ts:
    // if (action.created_by === user.id) throw new Error(...)
    
    // We can verify the db columns are correct
    const columns = await client.query(`
      SELECT column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name = 'risk_actions' 
      AND column_name IN ('verified_by_rm', 'verified_by_ri', 'verification_notes')
    `);
    console.log('Database columns for verification:');
    columns.rows.forEach(c => console.log(`- ${c.column_name}: ${c.data_type}`));

    console.log('--- Test Complete ---');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await client.end();
  }
}

test();
