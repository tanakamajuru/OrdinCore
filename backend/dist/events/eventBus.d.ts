import { EventEmitter } from 'events';
declare class EventBus extends EventEmitter {
    constructor();
    emitEvent(event: string, payload: Record<string, unknown>): Promise<void>;
}
export declare const eventBus: EventBus;
export declare const EVENTS: {
    readonly RISK_CREATED: "risk_created";
    readonly RISK_UPDATED: "risk_updated";
    readonly RISK_ESCALATED: "risk_escalated";
    readonly RISK_RESOLVED: "risk_resolved";
    readonly INCIDENT_CREATED: "incident_created";
    readonly INCIDENT_UPDATED: "incident_updated";
    readonly INCIDENT_RESOLVED: "incident_resolved";
    readonly GOVERNANCE_DUE: "governance_due";
    readonly GOVERNANCE_OVERDUE: "governance_overdue";
    readonly GOVERNANCE_COMPLETED: "governance_completed";
    readonly ESCALATION_CREATED: "escalation_created";
    readonly ESCALATION_RESOLVED: "escalation_resolved";
    readonly USER_CREATED: "user_created";
    readonly USER_DEACTIVATED: "user_deactivated";
    readonly REPORT_REQUESTED: "report_requested";
    readonly REPORT_COMPLETED: "report_completed";
    readonly NOTIFICATION_SEND: "notification_send";
    readonly AUDIT_LOG: "audit_log";
};
export type EventType = (typeof EVENTS)[keyof typeof EVENTS];
export default eventBus;
//# sourceMappingURL=eventBus.d.ts.map