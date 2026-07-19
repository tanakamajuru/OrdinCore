import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PulseDto {
    house_id?: string;
    service_id?: string;          // simplified form alias for house_id
    entry_date?: string;
    entry_time?: string;
    occurred_at?: string;         // simplified form: ISO datetime
    related_person?: string;
    client_id?: string;           // simplified form alias for related_person
    signal_type?: string;
    category?: string;            // simplified form: single theme -> risk_domain[0]
    governance_domain?: string;   // 12-domain clustering key (Supported Living / Domiciliary)
    signal_label?: string;        // specific signal chosen within the domain
    risk_domain?: string[];
    description: string;
    immediate_action?: string;
    severity: string;
    has_happened_before?: string;
    pattern_concern?: string;
    escalation_required?: string;
    evidence_url?: string;
    medication_error_type?: string;
}

// Resolve the default Team Leader a freshly captured signal should be allocated to.
// 1. If the creator is a TL for this house, keep ownership with them.
// 2. Otherwise the house's designated Team Leader (user_houses.role_in_house preferred).
// 3. Otherwise the house manager (houses.manager_id).
// 4. Otherwise null — surfaces in the UI as "Allocate to a Team Leader" (never silently ownerless).
async function resolveDefaultAssignee(house_id: string, created_by: string): Promise<string | null> {
    if (!house_id) return null;
    const isTL = await query(
        `SELECT 1 FROM user_houses uh JOIN users u ON u.id = uh.user_id
          WHERE uh.user_id = $1 AND uh.house_id = $2 AND u.role = 'TEAM_LEADER'`,
        [created_by, house_id]
    );
    if (isTL.rows.length) return created_by;

    const tl = await query(
        `SELECT uh.user_id FROM user_houses uh JOIN users u ON u.id = uh.user_id
          WHERE uh.house_id = $1 AND u.role = 'TEAM_LEADER' AND u.status = 'active'
          ORDER BY (uh.role_in_house = 'team_leader') DESC LIMIT 1`,
        [house_id]
    );
    if (tl.rows[0]) return tl.rows[0].user_id;

    const mgr = await query(`SELECT manager_id FROM houses WHERE id = $1`, [house_id]);
    const managerId = mgr.rows[0]?.manager_id || null;
    if (!managerId) return null;
    // Guard: only return the manager if they still exist as an active user. A stale
    // manager_id (deleted/disabled user) would otherwise cause an assigned_to
    // foreign-key violation and block signal capture entirely.
    const mgrValid = await query(`SELECT 1 FROM users WHERE id = $1 AND status = 'active'`, [managerId]);
    return mgrValid.rows.length ? managerId : null;
}

export const pulsesRepo = {
    async create(company_id: string, user_id: string, dto: PulseDto) {
        const id = uuidv4();

        // Normalise the simplified signal payload (spec module 1) into the
        // underlying governance_pulses shape. Legacy fields are now nullable.
        const houseId = dto.house_id || dto.service_id;
        const occurred = dto.occurred_at ? new Date(dto.occurred_at) : null;
        const entryDate = dto.entry_date || (occurred ? occurred.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const entryTime = dto.entry_time || (occurred ? occurred.toTimeString().slice(0, 8) : new Date().toTimeString().slice(0, 8));
        // The 12-domain governance clustering key. Prefer the explicit governance_domain,
        // fall back to legacy category. Clustering groups signals by this value, so it
        // also drives risk_domain.
        const governanceDomain = dto.governance_domain || dto.category || null;
        const riskDomain = (dto.risk_domain && dto.risk_domain.length > 0)
            ? dto.risk_domain
            : (governanceDomain ? [governanceDomain] : []);
        // signal_type is a constrained enum; the free-text category lives in
        // risk_domain. Never put the category into signal_type.
        const signalType = dto.signal_type || 'Concern';
        const relatedPerson = dto.related_person || dto.client_id || null;

        // Auto-allocate the signal to the house's responsible Team Leader on capture.
        const assignedTo = houseId ? await resolveDefaultAssignee(houseId, user_id) : null;

        const result = await query(
            `INSERT INTO governance_pulses (
                id, company_id, house_id, created_by, entry_date, entry_time, related_person,
                signal_type, risk_domain, governance_domain, description, immediate_action, severity,
                has_happened_before, pattern_concern, escalation_required, evidence_url, review_status, medication_error_type,
                assigned_to, assigned_at, assigned_by, allocation_is_auto
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, 'New', $18,
                $19, ${'CASE WHEN $19::uuid IS NULL THEN NULL ELSE NOW() END'}, $20, TRUE)
            RETURNING *`,
            [
                id, company_id, houseId, user_id, entryDate, entryTime, relatedPerson,
                signalType, riskDomain, governanceDomain, dto.description, dto.immediate_action || null, dto.severity,
                dto.has_happened_before || null, dto.pattern_concern || null, dto.escalation_required || null, dto.evidence_url || null,
                dto.medication_error_type || null,
                assignedTo, assignedTo ? user_id : null
            ]
        );
        return result.rows[0];
    },

    // Reassign a signal to a different Team Leader. Flips allocation_is_auto=false
    // (now a deliberate human choice). The caller logs + notifies the new owner.
    async reassign(pulse_id: string, company_id: string, new_assignee: string, acting_user_id: string) {
        const result = await query(
            `UPDATE governance_pulses
                SET assigned_to = $1, assigned_at = NOW(), assigned_by = $2,
                    allocation_is_auto = false, updated_at = NOW()
              WHERE id = $3 AND company_id = $4
              RETURNING *`,
            [new_assignee, acting_user_id, pulse_id, company_id]
        );
        return result.rows[0] || null;
    },

    async findAll(company_id: string, filters: any = {}, limit = 50, offset = 0) {
        const conditions: string[] = ['gp.company_id = $1'];
        const params: unknown[] = [company_id];
        let idx = 2;

        if (filters.house_id) { 
            conditions.push(Array.isArray(filters.house_id) ? `gp.house_id = ANY($${idx++}::uuid[])` : `gp.house_id = $${idx++}`); 
            params.push(filters.house_id); 
        }
        if (filters.review_status) {
            conditions.push(Array.isArray(filters.review_status) ? `gp.review_status = ANY($${idx++}::review_status[])` : `gp.review_status = $${idx++}`);
            params.push(filters.review_status);
        }
        // Exclude terminal / already-decided states so a signal that has been linked to a
        // risk, closed, or reviewed-and-not-promoted stops re-appearing on the live queues.
        // NULL-safe: a NULL review_status is treated as still-active. (Signal-flow closure.)
        if (filters.exclude_review_status) {
            const arr = Array.isArray(filters.exclude_review_status) ? filters.exclude_review_status : [filters.exclude_review_status];
            conditions.push(`(gp.review_status IS NULL OR gp.review_status <> ALL($${idx++}::review_status[]))`);
            params.push(arr);
        }
        if (filters.severity) {
            let severityValues = filters.severity;
            if (typeof severityValues === 'string' && severityValues.includes(',')) {
                severityValues = severityValues.split(',');
            }
            conditions.push(Array.isArray(severityValues) ? `gp.severity = ANY($${idx++}::severity_level[])` : `gp.severity = $${idx++}`); 
            params.push(severityValues); 
        }
        if (filters.start_date) { conditions.push(`gp.entry_date >= $${idx++}`); params.push(filters.start_date); }
        if (filters.end_date) { conditions.push(`gp.entry_date <= $${idx++}`); params.push(filters.end_date); }
        if (filters.created_by) { conditions.push(`gp.created_by = $${idx++}`); params.push(filters.created_by); }
        if (filters.assigned_to) { conditions.push(`gp.assigned_to = $${idx++}`); params.push(filters.assigned_to); }

        const where = conditions.join(' AND ');
        const result = await query(
            `SELECT gp.*, gp.review_status as status, (gp.entry_date + gp.entry_time) as pulse_date, h.name as house_name,
                    u.first_name || ' ' || u.last_name as created_by_name,
                    au.first_name || ' ' || au.last_name as assigned_to_name
             FROM governance_pulses gp
             JOIN houses h ON h.id = gp.house_id
             JOIN users u ON u.id = gp.created_by
             LEFT JOIN users au ON au.id = gp.assigned_to
             WHERE ${where}
             ORDER BY gp.entry_date DESC, gp.entry_time DESC
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );
        return result.rows;
    },

    async findById(id: string, company_id: string) {
        const result = await query(
            `SELECT gp.*, (gp.entry_date + gp.entry_time) as pulse_date, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name,
                    rb.first_name || ' ' || rb.last_name as reviewed_by_name,
                    au.first_name || ' ' || au.last_name as assigned_to_name,
                    -- Whether this concern has ACTUALLY happened before: earlier signals for the
                    -- same person on an overlapping risk domain. Lets the UI show the truth from
                    -- history, not only the reporter's manual yes/no answer.
                    (SELECT COUNT(*) FROM governance_pulses p2
                       WHERE p2.company_id = gp.company_id
                         AND p2.id <> gp.id
                         AND gp.related_person IS NOT NULL
                         AND COALESCE(p2.related_person,'') = COALESCE(gp.related_person,'')
                         AND p2.risk_domain && gp.risk_domain
                         AND COALESCE(p2.created_at, p2.entry_date::timestamptz) < COALESCE(gp.created_at, gp.entry_date::timestamptz)
                    )::int AS prior_occurrences,
                    -- The forming pattern (cluster) this signal belongs to, if any — lets the UI
                    -- show the real pattern concern rather than only the reporter's yes/no.
                    (SELECT c.signal_count FROM risk_signal_links rsl JOIN signal_clusters c ON c.id = rsl.cluster_id
                       WHERE rsl.pulse_entry_id = gp.id ORDER BY c.signal_count DESC NULLS LAST LIMIT 1)::int AS cluster_signal_count,
                    (SELECT c.cluster_label FROM risk_signal_links rsl JOIN signal_clusters c ON c.id = rsl.cluster_id
                       WHERE rsl.pulse_entry_id = gp.id ORDER BY c.signal_count DESC NULLS LAST LIMIT 1) AS cluster_label
             FROM governance_pulses gp
             JOIN houses h ON h.id = gp.house_id
             JOIN users u ON u.id = gp.created_by
             LEFT JOIN users rb ON rb.id = gp.reviewed_by
             LEFT JOIN users au ON au.id = gp.assigned_to
             WHERE gp.id = $1 AND gp.company_id = $2`,
            [id, company_id]
        );
        const pulse = result.rows[0] || null;
        if (pulse) {
            // Full version trail for the observation note (newest first), each attributed.
            const notes = await query(
                `SELECT n.id, n.note, n.created_at,
                        COALESCE(NULLIF(TRIM(u.first_name || ' ' || u.last_name), ''), 'Unknown') AS edited_by_name
                   FROM governance_pulse_notes n LEFT JOIN users u ON u.id = n.edited_by
                  WHERE n.pulse_id = $1 ORDER BY n.created_at DESC`,
                [id]
            );
            pulse.note_versions = notes.rows;
        }
        return pulse;
    },

    async updateReview(id: string, company_id: string, user_id: string, data: any) {
        const allowed = ['severity', 'escalation_required', 'review_status'];
        const updates: string[] = ['reviewed_by = $3', 'reviewed_at = NOW()'];
        const values: unknown[] = [id, company_id, user_id];
        let idx = 4;

        for (const key of allowed) {
            if (key in data) {
                updates.push(`${key} = $${idx++}`);
                values.push(data[key]);
            }
        }

        const result = await query(
            `UPDATE governance_pulses SET ${updates.join(', ')} 
             WHERE id = $1 AND company_id = $2 
             RETURNING *`,
            values
        );
        return result.rows[0];
    },

    async linkRisk(pulse_id: string, risk_id: string, user_id: string, note?: string) {
        const id = uuidv4();
        await query(
            `INSERT INTO risk_signal_links (id, risk_id, pulse_entry_id, linked_by, link_note)
             VALUES ($1, $2, $3, $4, $5)`,
            [id, risk_id, pulse_id, user_id, note || null]
        );
        // Also update pulse status to 'Linked'
        await query(
            `UPDATE governance_pulses SET review_status = 'Linked' WHERE id = $1`,
            [pulse_id]
        );
        return { id };
    }
};
