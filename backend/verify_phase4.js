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
    console.log('--- Phase 4 Report Verification ---');

    // 1. Check if we have any risks to test Evidence Pack
    const riskRes = await client.query('SELECT id, title FROM risks LIMIT 1');
    if (riskRes.rows.length > 0) {
        const risk = riskRes.rows[0];
        console.log(`Risk available for Evidence Pack: ${risk.title} (${risk.id})`);
    } else {
        console.log('No risks found. Can only verify the worker logic structure.');
    }

    // 2. Check Weekly Reviews
    const reviewRes = await client.query('SELECT house_id, week_ending FROM weekly_reviews LIMIT 1');
    if (reviewRes.rows.length > 0) {
        const review = reviewRes.rows[0];
        console.log(`Weekly Review available for Narrative: House ${review.house_id} ending ${review.week_ending}`);
    } else {
        console.log('No weekly reviews found.');
    }

    console.log('--- Database Check Complete ---');
  } catch (err) {
    console.error('Test failed:', err);
  } finally {
    await client.end();
  }
}

test();
