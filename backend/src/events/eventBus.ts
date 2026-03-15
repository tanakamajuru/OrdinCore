import { EventEmitter } from 'events';
import { query } from '../config/database';
import logger from '../utils/logger';

class EventBus extends EventEmitter {
  constructor() {
    super();
    this.setMaxListeners(50);
  }

  async emitEvent(event: string, payload: Record<string, unknown>) {
    logger.info(`Event emitted: ${event}`, { payload });
    this.emit(event, payload);
    // Persist to system_events
    try {
      await query(
        `INSERT INTO system_events (event_type, payload, created_at)
         VALUES ($1, $2, NOW())`,
        [event, JSON.stringify(payload)]
      );
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
} as const;

export type EventType = (typeof EVENTS)[keyof typeof EVENTS];

export default eventBus;
