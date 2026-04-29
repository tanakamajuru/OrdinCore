import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { directorGovernanceService } from '../services/directorGovernance.service';
import logger from '../utils/logger';

export const startDirectorGovernanceWorker = () => {
    const worker = new Worker('director-governance', async (job: Job) => {
        logger.info(`Running Director Governance Job: ${job.name}`);

        const companiesRes = await query('SELECT id FROM companies WHERE is_active = true');
        
        for (const company of companiesRes.rows) {
            try {
                if (job.name === 'detect-control-failures') {
                    await directorGovernanceService.detectControlFailures(company.id);
                } else if (job.name === 'publish-monthly-reports') {
                    await publishMonthlyReports(company.id);
                }
            } catch (err) {
                logger.error(`Failed to run director job ${job.name} for company ${company.id}`, err);
            }
        }
    }, { connection: redisConnection });

    worker.on('completed', (job) => {
        logger.info(`Director governance job ${job.id} (${job.name}) completed`);
    });

    worker.on('failed', (job, err) => {
        logger.error(`Director governance job ${job?.id} (${job?.name}) failed`, err);
    });

    return worker;
};

async function publishMonthlyReports(companyId: string) {
    const now = new Date();
    // Previous month
    const periodStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth(), 0);

    const startStr = periodStart.toISOString().split('T')[0];
    const endStr = periodEnd.toISOString().split('T')[0];

    // Find a director for this company to assign as generator
    const directorRes = await query(
        "SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR' LIMIT 1",
        [companyId]
    );

    if (directorRes.rows.length > 0) {
        const directorId = directorRes.rows[0].id;
        await directorGovernanceService.generateMonthlyBoardReportDraft(
            companyId,
            directorId,
            startStr,
            endStr
        );
        logger.info(`Draft monthly report generated for company ${companyId} for period ${startStr} to ${endStr}`);
    } else {
        logger.warn(`No director found for company ${companyId} to generate monthly report draft`);
    }
}
