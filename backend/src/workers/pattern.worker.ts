import { Worker, Job } from 'bullmq';
import { redis } from '../config/redis';
import { clustersRepo } from '../repositories/clusters.repo';
import { pulsesRepo } from '../repositories/pulses.repo';
import { query } from '../config/database';
import logger from '../utils/logger';
import { notificationsService } from '../services/notifications.service';

export const startPatternWorker = () => {
    const worker = new Worker('pattern-detection', async (job: Job) => {
        const { pulse_id, company_id, house_id, risk_domain } = job.data;
        logger.info(`Processing pattern detection for pulse ${pulse_id}`);

        // A pulse can have multiple risk domains. We evaluate each.
        for (const domain of risk_domain) {
            await evaluateDomain(company_id, house_id, domain, pulse_id);
        }
    }, { connection: redis });

    worker.on('completed', (job) => {
        logger.info(`Pattern detection job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Pattern detection job ${job?.id} failed`, err);
    });

    return worker;
};

async function evaluateDomain(company_id: string, house_id: string, domain: string, current_pulse_id: string) {
    // 1. Get recent signals for this domain and house
    const recentSignals = await clustersRepo.findSignalsForCluster(house_id, domain, 14); // Look back 14 days
    if (recentSignals.length === 0) return;

    const currentPulse = recentSignals.find(s => s.id === current_pulse_id);
    if (!currentPulse) return;

    // 2. Find or create active cluster
    let cluster = await clustersRepo.findActiveCluster(company_id, house_id, domain);
    
    if (!cluster) {
        cluster = await clustersRepo.createCluster({
            company_id,
            house_id,
            risk_domain: domain,
            cluster_label: `${domain} Signals – ${house_id} (New)`,
            cluster_status: 'Emerging',
            signal_count: 0,
            first_signal_date: currentPulse.entry_date,
            last_signal_date: currentPulse.entry_date,
            trajectory: 'Stable'
        });
    }

    // 3. Evaluate Global Rules
    
    // Rule 1: Repetition (>=3 in 7 days)
    const signals7d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
    if (signals7d.length >= 3) {
        await clustersRepo.updateCluster(cluster.id, { 
            cluster_status: 'Emerging',
            signal_count: signals7d.length,
            last_signal_date: currentPulse.entry_date
        });
        await clustersRepo.logThresholdEvent({
            house_id,
            rule_number: 1,
            rule_name: 'Repetition',
            cluster_id: cluster.id,
            output_type: 'Signal Flag'
        });
    }

    // Rule 2: Escalation (>=5 in 10d or >=2 'Escalating' entries)
    const signals10d = recentSignals.filter(s => new Date(s.entry_date) >= new Date(Date.now() - 10 * 24 * 60 * 60 * 1000));
    const escalatingEntries = signals10d.filter(s => s.pattern_concern === 'Escalating');
    if (signals10d.length >= 5 || escalatingEntries.length >= 2) {
        await clustersRepo.updateCluster(cluster.id, { 
            cluster_status: 'Escalated',
            trajectory: 'Deteriorating'
        });
        await clustersRepo.logThresholdEvent({
            house_id,
            rule_number: 2,
            rule_name: 'Escalation',
            cluster_id: cluster.id,
            output_type: 'Risk Proposal'
        });
    }

    // Rule 3: Immediate Risk (1 Critical or 2 High in 48h)
    const signals48h = recentSignals.filter(s => new Date(s.entry_date) >= new Date(Date.now() - 48 * 60 * 60 * 1000));
    const criticals = signals48h.filter(s => s.severity === 'Critical');
    const highs = signals48h.filter(s => s.severity === 'High');
    if (criticals.length >= 1 || highs.length >= 2) {
        await clustersRepo.logThresholdEvent({
            house_id,
            rule_number: 3,
            rule_name: 'Immediate Risk',
            cluster_id: cluster.id,
            output_type: 'Mandatory Review'
        });
    }

    // Rule 4: Trajectory Deterioration (Severity progression Low->Moderate->High in 7 days)
    // Simplified: if current is worse than any in last 7 days
    const hasLowerBefore = signals7d.some(s => s.id !== current_pulse_id && compareSeverity(s.severity, currentPulse.severity) < 0);
    if (hasLowerBefore && currentPulse.severity !== 'Low') {
       await clustersRepo.updateCluster(cluster.id, { trajectory: 'Deteriorating' });
       await clustersRepo.logThresholdEvent({
           house_id,
           rule_number: 4,
           rule_name: 'Trajectory Deterioration',
           cluster_id: cluster.id,
           output_type: 'Signal Flag'
       });
    }

    // Rule 5: Control Failure (Reappear within 14d of risk closure)
    const closedRiskRes = await query(
        `SELECT id FROM risks WHERE house_id = $1 AND status = 'Closed' 
         AND closed_at >= CURRENT_DATE - INTERVAL '14 days' 
         LIMIT 1`,
        [house_id]
    );
    if (closedRiskRes.rows.length > 0) {
        await clustersRepo.logThresholdEvent({ house_id, rule_number: 5, rule_name: 'Control Failure', cluster_id: cluster.id, output_type: 'Mandatory Review' });
    }

    // Rule 6: Behaviour (Same Person, 24h)
    if (currentPulse.related_person && currentPulse.signal_type === 'Behaviour') {
        const samePerson24h = recentSignals.filter(s => 
            s.id !== current_pulse_id && 
            s.related_person === currentPulse.related_person && 
            new Date(s.entry_date) >= new Date(Date.now() - 24 * 60 * 60 * 1000)
        );
        if (samePerson24h.length >= 1) {
            await clustersRepo.logThresholdEvent({ house_id, rule_number: 6, rule_name: 'Recurrent Behaviour', cluster_id: cluster.id, output_type: 'Signal Flag' });
        }
    }

    // Rule 7: Medication (Serious Error)
    if (currentPulse.signal_type === 'Medication' && currentPulse.medication_error_type === 'Serious Error') {
        await clustersRepo.logThresholdEvent({ house_id, rule_number: 7, rule_name: 'Serious Med Error', cluster_id: cluster.id, output_type: 'Risk Proposal' });
        await clustersRepo.updateCluster(cluster.id, { cluster_status: 'Escalated', trajectory: 'Deteriorating' });
    }

    // Rule 8: Staffing (Agency Correlation)
    if (currentPulse.signal_type === 'Staffing') {
        const agencyIncidents = await query(
            `SELECT id FROM incidents WHERE house_id = $1 AND incident_type = 'Staffing' 
             AND description ILIKE '%agency%' AND created_at >= CURRENT_DATE - INTERVAL '7 days'`,
            [house_id]
        );
        if (agencyIncidents.rows.length >= 2) {
            await clustersRepo.logThresholdEvent({ house_id, rule_number: 8, rule_name: 'Staffing Crisis', cluster_id: cluster.id, output_type: 'Risk Proposal' });
        }
    }

    // Rule 9: Environment (Recurrent Issues)
    if (domain === 'Environment') {
        const envSignals7d = recentSignals.filter(s => s.signal_type === 'Environment' && new Date(s.entry_date) >= new Date(Date.now() - 7 * 24 * 60 * 60 * 1000));
        if (envSignals7d.length >= 3) {
            await clustersRepo.logThresholdEvent({ house_id, rule_number: 9, rule_name: 'Environmental Deterioration', cluster_id: cluster.id, output_type: 'Signal Flag' });
        }
    }

    // Rule 10: Governance (Audit Failure)
    const lowAuditRes = await query(
        `SELECT id FROM governance_pulses WHERE house_id = $1 AND compliance_score < 80 
         AND completed_at >= CURRENT_DATE - INTERVAL '7 days'`,
        [house_id]
    );
    if (lowAuditRes.rows.length > 0) {
        await clustersRepo.logThresholdEvent({ house_id, rule_number: 10, rule_name: 'Governance Failure', cluster_id: cluster.id, output_type: 'Mandatory Review' });
    }

    // Cross-Service Detection (System-Level Risk)
    const acrossCompanyRes = await query(
        `SELECT COUNT(DISTINCT house_id) as house_count 
         FROM signal_clusters 
         WHERE company_id = $1 AND risk_domain = $2 
         AND cluster_status IN ('Emerging', 'Escalated')`,
        [company_id, domain]
    );
    if (parseInt(acrossCompanyRes.rows[0].house_count) >= 3) {
        await clustersRepo.logThresholdEvent({ house_id, rule_number: 0, rule_name: 'Systemic Risk', cluster_id: cluster.id, output_type: 'Director Alert' });
        // Notify Director
        await notificationsService.create({
            company_id,
            user_id: 'SYSTEM', // System-level
            type: 'SYSTEMIC_RISK',
            title: `Systemic Risk Detected: ${domain}`,
            body: `A systemic governance risk relating to ${domain} has been detected across ${acrossCompanyRes.rows[0].house_count} houses in your organization. This requires immediate review of group-wide policies.`,
            metadata: { domain }
        });
    }

    // Update cluster basics
    await clustersRepo.updateCluster(cluster.id, {
        signal_count: recentSignals.length,
        last_signal_date: currentPulse.entry_date,
        cluster_label: `${domain} Signals – ${signals7d.length} in 7 days`
    });
}

function compareSeverity(a: string, b: string): number {
    const levels: Record<string, number> = { 'Low': 1, 'Moderate': 2, 'High': 3, 'Critical': 4 };
    return levels[a] - levels[b];
}
