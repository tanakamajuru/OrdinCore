import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis';
import { query } from '../config/database';
import { notificationsService } from '../services/notifications.service';
import logger from '../utils/logger';

export class ActionEffectivenessPromptWorker {
  private worker: Worker;

  constructor() {
    this.worker = new Worker(
      'action-effectiveness-prompt',
      async (job: Job) => {
        // 1. Find actions completed 48-72h ago that haven't been evaluated yet
        const actions = await query(`
          SELECT ra.*, h.primary_rm_id, h.name as house_name, r.risk_domain
          FROM risk_actions ra
          JOIN risks r ON r.id = ra.risk_id
          JOIN houses h ON h.id = r.house_id
          WHERE ra.status = 'Completed' 
          AND NOT EXISTS (SELECT 1 FROM action_effectiveness ae WHERE ae.action_id = ra.id)
          AND ra.completed_at <= NOW() - INTERVAL '48 hours'
          AND ra.completed_at >= NOW() - INTERVAL '72 hours'
        `);

        for (const action of actions.rows) {
          const { id: action_id, risk_id, company_id, house_id, risk_domain, completed_at } = action;
          
          // 2. Fetch signals in the same domain/service: 7 days BEFORE vs 48-72h AFTER
          const afterRes = await query(
            `SELECT severity FROM governance_pulses 
             WHERE house_id = $1 AND entry_date >= $2 AND $3 = ANY(risk_domain)`,
            [house_id, completed_at, risk_domain]
          );
          
          const beforeRes = await query(
            `SELECT severity FROM governance_pulses 
             WHERE house_id = $1 AND entry_date < $2 AND entry_date >= $2::date - INTERVAL '7 days' AND $3 = ANY(risk_domain)`,
            [house_id, completed_at, risk_domain]
          );

          const beforeSignals = beforeRes.rows;
          const afterSignals = afterRes.rows;

          // 3. Calculate Effectiveness
          let outcome: 'Effective' | 'Neutral' | 'Ineffective' = 'Neutral';
          const beforeFreq = beforeSignals.length;
          const afterFreq = afterSignals.length;
          
          const maxBeforeSev = beforeSignals.length > 0 ? Math.max(...beforeSignals.map(s => this.getSevLevel(s.severity))) : 0;
          const maxAfterSev = afterSignals.length > 0 ? Math.max(...afterSignals.map(s => this.getSevLevel(s.severity))) : 0;
          const hasNewCritical = afterSignals.some(s => s.severity === 'Critical');

          if (hasNewCritical || afterFreq > beforeFreq * 1.25 || maxAfterSev > maxBeforeSev) {
            outcome = 'Ineffective';
          } else if (afterFreq <= beforeFreq * 0.5 || (maxAfterSev < maxBeforeSev && afterFreq <= beforeFreq)) {
            outcome = 'Effective';
          } else if (Math.abs(afterFreq - beforeFreq) <= beforeFreq * 0.25) {
            outcome = 'Neutral';
          }

          // 4. Store Result
          await query(
            `INSERT INTO action_effectiveness (action_id, risk_id, company_id, house_id, risk_domain, outcome, data)
             VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [action_id, risk_id, company_id, house_id, risk_domain, outcome, JSON.stringify({
              before: { frequency: beforeFreq, max_severity: maxBeforeSev },
              after: { frequency: afterFreq, max_severity: maxAfterSev, has_critical: hasNewCritical }
            })]
          );

          // 5. Notify RM
          if (action.primary_rm_id) {
            await notificationsService.create({
              company_id: company_id,
              user_id: action.primary_rm_id,
              type: 'ACTION_EFFECTIVENESS_CALCULATED',
              title: `Action Effectiveness: ${outcome}`,
              body: `The action "${action.title}" has been evaluated as ${outcome.toLowerCase()}. Review details in the action tracker.`,
              link: `/dashboard/oversight`,
              metadata: { action_id, risk_id, outcome }
            });
          }
        }
      },
      { connection: redisConnection }
    );
  }

  private getSevLevel(sev: string): number {
    const levels: Record<string, number> = { 'Low': 1, 'Moderate': 2, 'High': 3, 'Critical': 4 };
    return levels[sev] || 1;
  }

  public async start() {
    logger.info('Action Effectiveness Worker started');
  }

  public async stop() {
    await this.worker.close();
  }
}

export const startActionEffectivenessPromptWorker = () => {
    return new ActionEffectivenessPromptWorker();
};

export const scheduleActionEffectivenessPrompt = async (queue: any) => {
    // Schedule to run every hour
    await queue.add('action-effectiveness-prompt', {}, {
        repeat: { cron: '0 * * * *' }
    });
};
