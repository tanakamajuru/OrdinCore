import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../.env') });
import { incidentsRepo } from '../src/repositories/incidents.repo';

async function testTimeline() {
  const incidentId = 'e4be90b0-54bb-4094-830e-bc0ae41c12c9'; // From seeding output
  const companyId = '11111111-1111-1111-1111-111111111111';

  try {
    const reconstruction = await incidentsRepo.getGovernanceTimeline(incidentId, companyId);
    console.log('--- Timeline Events ---');
    reconstruction.timeline.forEach((e: any) => {
      console.log(`[${e.timestamp.toISOString ? e.timestamp.toISOString() : e.timestamp}] ${e.label}: ${e.detail} (${e.sourceType})`);
    });
    console.log('\n--- Metrics ---');
    console.log(JSON.stringify(reconstruction.metrics, null, 2));
  } catch (err) {
    console.error('Test failed:', err);
  }
}

testTimeline().catch(console.error).finally(() => process.exit(0));
