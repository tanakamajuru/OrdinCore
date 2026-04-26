const { Pool } = require('pg');
const { Queue } = require('bullmq');
const IORedis = require('ioredis');

const pool = new Pool({ host: 'localhost', port: 5432, database: 'caresignal_db', user: 'postgres', password: 'Chemz@25' });
const redis = new IORedis({ host: 'localhost', port: 6379 });
const patternQueue = new Queue('pattern-detection', { connection: redis });

async function run() {
  try {
    const res = await pool.query("SELECT * FROM governance_pulses WHERE house_id = '38ba95e5-81a2-409b-992e-862b3f31e889'");
    for (const pulse of res.rows) {
      if (pulse.risk_domain && pulse.risk_domain.length > 0) {
        await patternQueue.add('pattern:check', {
          pulse_id: pulse.id,
          company_id: pulse.company_id,
          house_id: pulse.house_id,
          risk_domain: pulse.risk_domain
        });
        console.log(`Queued ${pulse.id} for ${pulse.risk_domain}`);
      }
    }
    console.log('Done queuing');
  } catch(e) {
    console.error(e);
  } finally {
    process.exit(0);
  }
}

run();
