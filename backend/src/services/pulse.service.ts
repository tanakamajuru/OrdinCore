import { pulsesRepo, PulseDto } from '../repositories/pulses.repo';
import { Queue } from 'bullmq';
import { redis } from '../config/redis';
import logger from '../utils/logger';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';


const patternQueue = new Queue('pattern-detection', { connection: redis });

export class PulseService {
    async createPulse(company_id: string, user_id: string, dto: PulseDto) {
        const pulse = await pulsesRepo.create(company_id, user_id, dto);
        
        // [GOVERNANCE] Safeguarding Absence Override Rule (§5)
        if (pulse.signal_type === 'Safeguarding') {
            const today = new Date().toISOString().split('T')[0];
            const govLog = await query(
                'SELECT id FROM daily_governance_log WHERE house_id = $1 AND review_date = $2 AND completed = true',
                [pulse.house_id, today]
            );

            if (govLog.rows.length === 0) {
                logger.warn(`RM ABSENCE DETECTED: Safeguarding signal ${pulse.id} received for house ${pulse.house_id} without completed daily review.`);
                
                // Fetch escalation targets
                const houseInfo = await query('SELECT name, deputy_rm_id FROM houses WHERE id = $1', [pulse.house_id]);
                const houseName = houseInfo.rows[0]?.name || 'Unknown';
                const deputyId = houseInfo.rows[0]?.deputy_rm_id;

                const directorRes = await query("SELECT id FROM users WHERE company_id = $1 AND role = 'DIRECTOR' LIMIT 1", [company_id]);
                const directorId = directorRes.rows[0]?.id;

                // Create Mandatory Review event
                await query(
                    `INSERT INTO threshold_events (id, company_id, house_id, pulse_id, output_type, rule_number, rule_name, description, status)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'Pending')`,
                    [uuidv4(), company_id, pulse.house_id, pulse.id, 'Mandatory Review', 5, 'Safeguarding During Absence', `Immediate escalation: Safeguarding signal submitted while RM daily review is NOT complete.`]
                );

                // Notifications (Multi-channel simulated)
                const targets = [deputyId, directorId].filter(id => id);
                for (const targetId of targets) {
                    await eventBus.emitEvent(EVENTS.GOVERNANCE_CONCERN, {
                        pulse_id: pulse.id,
                        company_id,
                        user_id: targetId,
                        message: `URGENT: Safeguarding signal received for ${houseName} during RM absence. Action Required within 4h.`
                    });
                }
                
                // Deputy + Director are already notified via the GOVERNANCE_CONCERN events
                // emitted above. (Previous code used an inline require() and a sendSMS()
                // stub that only console.logged — removed to avoid a misleading "SMS sent"
                // impression. A real SMS provider can be wired into notifications.service.)

                // Set 4h acknowledgment timer via Queue
                const escalationQueue = new Queue('safeguarding-escalation', { connection: redis });
                await escalationQueue.add('check:acknowledgment', {
                    pulse_id: pulse.id,
                    company_id,
                    house_id: pulse.house_id
                }, { delay: 4 * 60 * 60 * 1000 }); // 4 hours
            }
        }

        // Emit Signal Created Event
        await eventBus.emitEvent(EVENTS.SIGNAL_CREATED, {
            pulse_id: pulse.id,
            company_id,
            house_id: pulse.house_id,
            signal_type: pulse.signal_type,
            risk_domain: pulse.risk_domain
        });

        // Trigger Pattern Detection Job
        try {
            await patternQueue.add('pattern:check', {
                pulse_id: pulse.id,
                company_id,
                house_id: pulse.house_id,
                risk_domain: pulse.risk_domain,
                related_person: pulse.related_person
            });
            logger.info(`Pattern detection job queued for pulse ${pulse.id}`);
        } catch (err) {
            logger.error(`Failed to queue pattern detection for pulse ${pulse.id}`, err);
        }

        return pulse;
    }

    async getPulses(company_id: string, filters: any, page = 1, limit = 50) {
        const offset = (page - 1) * limit;
        const pulses = await pulsesRepo.findAll(company_id, filters, limit, offset);
        return pulses;
    }

    async getPulseById(id: string, company_id: string) {
        const pulse = await pulsesRepo.findById(id, company_id);
        if (!pulse) throw new Error('Pulse not found');
        return pulse;
    }

    async reviewPulse(id: string, company_id: string, user_id: string, data: any) {
        return pulsesRepo.updateReview(id, company_id, user_id, data);
    }

    // Reassign a signal to a different Team Leader (deliberate human allocation).
    // Validates the target is an active staff member in the same company, logs the
    // change, and notifies the new owner.
    async reassignSignal(pulse_id: string, company_id: string, new_assignee: string, acting_user_id: string) {
        if (!new_assignee) throw new Error('A target user (assigned_to) is required');
        const target = await query(
            `SELECT id, role FROM users WHERE id = $1 AND company_id = $2 AND status = 'active'`,
            [new_assignee, company_id]
        );
        if (!target.rows[0]) throw new Error('Target user not found in this organisation');

        const updated = await pulsesRepo.reassign(pulse_id, company_id, new_assignee, acting_user_id);
        if (!updated) throw new Error('Signal not found');

        await query(
            `INSERT INTO audit_logs (id, company_id, user_id, action, resource, resource_id, new_values)
             VALUES ($1, $2, $3, 'SIGNAL_REALLOCATED', 'governance_pulse', $4, $5)`,
            [uuidv4(), company_id, acting_user_id, pulse_id, JSON.stringify({ assigned_to: new_assignee })]
        );

        try {
            const { notificationsService } = await import('./notifications.service');
            await notificationsService.create({
                company_id, user_id: new_assignee, type: 'signal_allocated',
                title: 'Signal allocated to you',
                body: 'A signal has been allocated to you for follow-up.',
                link: `/signals/${pulse_id}`, metadata: { pulse_id },
            });
        } catch (err) {
            logger.error('Failed to notify new signal assignee', err);
        }

        return updated;
    }

    async linkToRisk(pulse_id: string, company_id: string, user_id: string, risk_id: string, note?: string) {
        return pulsesRepo.linkRisk(pulse_id, risk_id, user_id, note);
    }

    async getDashboardFeed(company_id: string, house_ids: string[]) {
        // Single source of truth for the promotion gate (≥ this many signals, or one
        // Critical). Exposed in the payload so the board's meter and the backend agree.
        const PROMOTION_THRESHOLD = 3;
        if (house_ids.length === 0) return { highPriority: [], pattern_signals: [], risk_candidates: [], actions: [], promotion_threshold: PROMOTION_THRESHOLD, open_escalations: 0 };

        // 1. High Priority Signals: severity=High/Critical or escalation!=None, last 48h
        const highPriority = await pulsesRepo.findAll(company_id, {
            house_id: house_ids,
            start_date: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString().split('T')[0],
            severity: ['High', 'Critical']
        });

        // 2. Pattern Signals: Active clusters (Emerging, Confirmed, Escalated).
        // has_critical lets the gate open on a single Critical signal without waiting
        // for the cluster to reach the threshold (matching the promote rule).
        const placeholderIds = house_ids.map((_, i) => `$${i + 2}`).join(', ');
        const patternSignals = await query(
            `SELECT sc.*, h.name as house_name,
                    EXISTS (
                      SELECT 1 FROM governance_pulses gp
                       WHERE gp.house_id = sc.house_id AND gp.company_id = sc.company_id
                         AND gp.severity = 'Critical' AND gp.risk_domain && sc.risk_domain
                         AND gp.entry_date BETWEEN sc.first_signal_date AND sc.last_signal_date
                    ) AS has_critical
             FROM signal_clusters sc
             JOIN houses h ON h.id = sc.house_id
             WHERE sc.company_id = $1 AND sc.house_id IN (${placeholderIds})
             AND sc.cluster_status IN ('Emerging', 'Confirmed', 'Escalated')
             ORDER BY sc.last_signal_date DESC`,
            [company_id, ...house_ids]
        );

        // 3. Risk Candidates: clusters at/over threshold OR carrying a Critical, not yet promoted.
        const riskCandidates = patternSignals.rows.filter((c: any) => (c.signal_count >= PROMOTION_THRESHOLD || c.has_critical) && !c.linked_risk_id);

        // Open escalations across these houses (for the shape-of-day strip).
        let openEscalations = 0;
        try {
            const escRes = await query(
                `SELECT COUNT(*)::int AS n FROM escalations
                  WHERE company_id = $1 AND house_id IN (${placeholderIds})
                    AND COALESCE(lifecycle_status, status) NOT IN ('Closed', 'Resolved')`,
                [company_id, ...house_ids]
            );
            openEscalations = escRes.rows[0]?.n || 0;
        } catch { openEscalations = 0; }

        // 4. Actions: Due today or overdue
        const actions = await query(
            `SELECT ra.*, h.name as house_name, r.title as risk_title
             FROM risk_actions ra
             LEFT JOIN risks r ON r.id = ra.risk_id
             LEFT JOIN houses h ON h.id = r.house_id
             WHERE ra.company_id = $1 AND ra.status IN ('Pending', 'In Progress', 'Overdue')
             AND (ra.due_date <= CURRENT_DATE OR ra.status = 'Overdue')
             AND (r.house_id IN (${placeholderIds}) OR ra.risk_id IS NULL)
             ORDER BY ra.due_date ASC`,
            [company_id, ...house_ids]
        );

        return {
            highPriority,
            pattern_signals: patternSignals.rows,
            risk_candidates: riskCandidates,
            actions: actions.rows,
            promotion_threshold: PROMOTION_THRESHOLD,
            open_escalations: openEscalations
        };
    }
}

export const pulseService = new PulseService();
