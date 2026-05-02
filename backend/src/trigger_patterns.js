const { Client } = require('pg');
const { Queue } = require('bullmq');
const Redis = require('ioredis');
require('dotenv').config({ path: __dirname + '/../.env' });

async function triggerPatterns() {
    const client = new Client({
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        database: process.env.DB_NAME,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
    });

    const redis = new Redis({
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT || 6379,
        maxRetriesPerRequest: null,
    });

    const patternQueue = new Queue('pattern-detection', { connection: redis });

    try {
        await client.connect();
        console.log('Connected to DB');

        const res = await client.query('SELECT id, company_id, house_id, risk_domain FROM governance_pulses');
        console.log(`Found ${res.rows.length} pulses. Queuing pattern detection jobs...`);

        for (const pulse of res.rows) {
            await patternQueue.add('pattern:check', {
                pulse_id: pulse.id,
                company_id: pulse.company_id,
                house_id: pulse.house_id,
                risk_domain: pulse.risk_domain
            });
            console.log(`Queued job for pulse ${pulse.id}`);
        }

        console.log('All jobs queued successfully.');

    } catch (err) {
        console.error('Error', err);
    } finally {
        await client.end();
        await redis.quit();
    }
}

triggerPatterns();
