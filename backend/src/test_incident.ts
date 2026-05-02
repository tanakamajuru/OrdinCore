
import './config/env';
import { incidentsService } from './services/incidents.service';
import { getPool } from './config/database';

async function test() {
    const company_id = '11111111-1111-1111-1111-111111111111';
    const incident_id = 'bfbe07ba-9a72-44ee-a25f-ae3e09c2aab5';
    
    try {
        console.log('Testing findById...');
        const incident = await incidentsService.findById(incident_id, company_id);
        console.log('Success:', incident.title);
        
        console.log('Testing getGovernanceTimeline...');
        const timeline = await incidentsService.getGovernanceTimeline(incident_id, company_id);
        console.log('Success: Timeline events:', timeline.timeline.length);
    } catch (err) {
        console.error('FAILED:', err);
    } finally {
        await getPool().end();
    }
}

test();
