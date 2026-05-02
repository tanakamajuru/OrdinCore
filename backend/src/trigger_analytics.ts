import { Queue } from 'bullmq';
import { redisConnection } from './config/redis';
import logger from './utils/logger';

async function trigger() {
  const companyId = '11111111-1111-1111-1111-111111111111';
  const queue = new Queue('trend_analysis', { connection: redisConnection });
  
  logger.info('Triggering analytics snapshots for the last 30 days...');
  
  const now = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    
    await queue.add('snapshot', { company_id: companyId, date: dateStr });
  }
  
  logger.info('Jobs added to queue.');
  process.exit(0);
}

trigger().catch(console.error);
