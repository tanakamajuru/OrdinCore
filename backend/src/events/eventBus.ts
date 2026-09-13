import { EventEmitter } from 'events';
import { query } from '../config/database';
import logger from '../utils/logger';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  async emitEvent(event: string, payload: Record<string, unknown>, options?: { idempotencyKey?: string }) {
    logger.info(`Event emitted: ${event}`, { payload });
    // Persist before publishing. Material callers provide a stable idempotency key; replaying
    // the same transition then neither duplicates the durable row nor re-runs listeners.
    try {
      const companyId = typeof payload.company_id === 'string' ? payload.company_id : null;
      const inserted = await query(
        `INSERT INTO system_events (event_type, payload, company_id, idempotency_key, created_at)
         VALUES ($1,$2,$3,$4,NOW())
         ON CONFLICT (company_id,event_type,idempotency_key)
           WHERE company_id IS NOT NULL AND idempotency_key IS NOT NULL DO NOTHING
         RETURNING id`,
        [event, JSON.stringify(payload), companyId, options?.idempotencyKey || null]
      );
      if (inserted.rows[0]) this.emit(event, payload);
    } catch (err) {
      logger.error('Failed to persist system event', { event, err });
    }
  }
}

export const eventBus = new EventBus();

// ─── Event Constants ─────────────────────────────────────────────────────────
export const EVENTS = {
  RISK_CREATED: 'risk_created',
  RISK_UPDATED: 'risk_updated',
  RISK_ESCALATED: 'risk_escalated',
  RISK_RESOLVED: 'risk_resolved',
  INCIDENT_CREATED: 'incident_created',
  INCIDENT_UPDATED: 'incident_updated',
  INCIDENT_RESOLVED: 'incident_resolved',
  GOVERNANCE_DUE: 'governance_due',
  GOVERNANCE_OVERDUE: 'governance_overdue',
  GOVERNANCE_COMPLETED: 'governance_completed',
  ESCALATION_CREATED: 'escalation_created',
  ESCALATION_RESOLVED: 'escalation_resolved',
  USER_CREATED: 'user_created',
  USER_DEACTIVATED: 'user_deactivated',
  REPORT_REQUESTED: 'report_requested',
  REPORT_COMPLETED: 'report_completed',
  NOTIFICATION_SEND: 'notification_send',
  AUDIT_LOG: 'audit_log',
  SIGNAL_CREATED: 'signal.created',
  GOVERNANCE_CONCERN: 'governance_concern',
  ACTION_EFFECTIVENESS_REVIEWED: 'action_effectiveness_reviewed',
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export default eventBus;
