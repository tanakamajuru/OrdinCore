import { startPatternWorker } from './workers/pattern.worker';
import { startAnalyticsWorker } from './workers/analytics.worker';
import { startReportWorker } from './workers/report.worker';
import logger from './utils/logger';

async function main() {
  logger.info('Starting OrdinCore Background Workers...');
  
  startPatternWorker();
  startAnalyticsWorker();
  startReportWorker();
  
  logger.info('Workers are running and listening for jobs in Redis.');
}

main().catch(err => {
  logger.error('Failed to start workers', err);
  process.exit(1);
});
