import { Worker, Job, Queue } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import logger from '../utils/logger';
import { notificationsService } from '../services/notifications.service';

const dailyCheckQueue = new Queue('daily-governance-check', { connection: redisConnection });

export async function scheduleDailyGovernanceCheck() {
  // Add repeatable job to run at 08:00 daily
  await dailyCheckQueue.add('check-absences', {}, {
    repeat: { pattern: '0 8 * * *' }
  });
  logger.info('Scheduled daily governance check at 08:00');
}

export function startDailyGovernanceWorker() {
  const worker = new Worker('daily-governance-check', async (job: Job) => {
    logger.info('Running daily governance absence check');

    // Fetch all active houses
    const housesRes = await query('SELECT id, name, company_id, primary_rm_id, deputy_rm_id FROM houses WHERE status = $1', ['active']);
    const houses = housesRes.rows;

    for (const house of houses) {
      // 1. Check for 48h absence (yesterday and day before both missing/incomplete)
      const logsRes = await query(
        `SELECT review_date, completed, escalation_sent 
         FROM daily_governance_log 
         WHERE house_id = $1 
         AND review_date >= CURRENT_DATE - INTERVAL '3 days'
         ORDER BY review_date DESC`,
        [house.id]
      );
      
      const logs = logsRes.rows;
      const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1);
      const dayBefore = new Date(); dayBefore.setDate(dayBefore.getDate() - 2);
      const yesterdayStr = yesterday.toISOString().split('T')[0];
      const dayBeforeStr = dayBefore.toISOString().split('T')[0];

      const logYesterday = logs.find(l => l.review_date.toISOString().split('T')[0] === yesterdayStr);
      const logDayBefore = logs.find(l => l.review_date.toISOString().split('T')[0] === dayBeforeStr);

      // Rule: 48h Missed (Yesterday AND Day Before both incomplete)
      const isYesterdayMissing = !logYesterday || !logYesterday.completed;
      const isDayBeforeMissing = !logDayBefore || !logDayBefore.completed;

      if (isYesterdayMissing && isDayBeforeMissing) {
        // 72h check (Yesterday, Day Before, and 3 days ago missing)
        const threeDaysAgo = new Date(); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
        const threeDaysAgoStr = threeDaysAgo.toISOString().split('T')[0];
        const logThreeDaysAgo = logs.find(l => l.review_date.toISOString().split('T')[0] === threeDaysAgoStr);
        const isThreeDaysAgoMissing = !logThreeDaysAgo || !logThreeDaysAgo.completed;

        if (isThreeDaysAgoMissing) {
          // 72h EXCALATION
          await notifyDirector(house);
        } else {
          // 48h EXCALATION (only if not already escalated to deputy for yesterday)
          if (house.deputy_rm_id) {
            await escalateToDeputy(house);
          }
        }
      }
    }

    return { status: 'success', processed: houses.length };

  }, { connection: redisConnection });

  worker.on('failed', (job, err) => logger.error(`Daily governance check failed`, err));
  return worker;
}

async function escalateToDeputy(house: any) {
  logger.warn(`Escalating 48h absence for ${house.name} to Deputy RM ${house.deputy_rm_id}`);
  
  // Create/Update log to mark as Deputy Cover
  await query(
    `UPDATE daily_governance_log 
     SET review_type = 'Deputy Cover', escalation_sent = true, deputy_assigned_at = NOW()
     WHERE house_id = $1 AND review_date = CURRENT_DATE - INTERVAL '1 day'`,
    [house.id]
  );

  await notificationsService.create({
    company_id: house.company_id,
    user_id: house.deputy_rm_id,
    type: 'GOVERNANCE_ABSENCE_48H',
    title: `Action Required: Daily Governance Review Missed – ${house.name}`,
    body: `The daily oversight review for ${house.name} has not been completed for 48 hours. As the designated Deputy Registered Manager, this review has been reassigned to you. Please log in to OrdinCore and complete the Daily Oversight Board within the next 24 hours.`,
    metadata: { house_id: house.id }
  });
}

async function notifyDirector(house: any) {
  logger.error(`Escalating 72h absence for ${house.name} to Director`);
  
  // Find Director for this company
  const directorsRes = await query(
    `SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR' AND status = 'active' LIMIT 1`,
    [house.company_id]
  );
  const directorId = directorsRes.rows[0]?.id;

  if (directorId) {
    await query(
      `UPDATE daily_governance_log 
       SET director_alerted_at = NOW()
       WHERE house_id = $1 AND review_date = CURRENT_DATE - INTERVAL '1 day'`,
      [house.id]
    );
    
    await query(`
        INSERT INTO system_prompts (company_id, user_id, title, message, prompt_type)
        VALUES ($1, $2, $3, $4, $5)
    `, [house.company_id, directorId, '72h Absence Fallback', `The daily oversight review for ${house.name} has been missed for 72 hours.`, 'ABSENCE_ALERT']);

    await notificationsService.create({
      company_id: house.company_id,
      user_id: directorId,
      type: 'GOVERNANCE_ABSENCE_72H',
      title: `Escalation: Missed Governance Review – ${house.name}`,
      body: `The daily oversight review for ${house.name} has now been missed for 72 consecutive hours. The review was previously reassigned to the Deputy RM but remains incomplete.\n\nThis constitutes a governance gap under CQC Well-Led standards. Please ensure oversight is restored immediately.`,
      metadata: { house_id: house.id, escalation_level: 'Critical' }
    });
  }
}
