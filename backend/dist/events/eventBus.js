"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EVENTS = exports.eventBus = void 0;
const events_1 = require("events");
const database_1 = require("../config/database");
const logger_1 = __importDefault(require("../utils/logger"));
class EventBus extends events_1.EventEmitter {
    constructor() {
        super();
        this.setMaxListeners(50);
    }
    async emitEvent(event, payload) {
        logger_1.default.info(`Event emitted: ${event}`, { payload });
        this.emit(event, payload);
        // Persist to system_events
        try {
            await (0, database_1.query)(`INSERT INTO system_events (event_type, payload, created_at)
         VALUES ($1, $2, NOW())`, [event, JSON.stringify(payload)]);
        }
        catch (err) {
            logger_1.default.error('Failed to persist system event', { event, err });
        }
    }
}
exports.eventBus = new EventBus();
// ─── Event Constants ─────────────────────────────────────────────────────────
exports.EVENTS = {
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
};
exports.default = exports.eventBus;
//# sourceMappingURL=eventBus.js.map