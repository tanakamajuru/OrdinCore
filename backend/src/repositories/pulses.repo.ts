import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface PulseDto {
    house_id: string;
    entry_date: string;
    entry_time: string;
    related_person?: string;
    signal_type: string;
    risk_domain: string[];
    description: string;
    immediate_action?: string;
    severity: string;
    has_happened_before: string;
    pattern_concern: string;
    escalation_required: string;
    evidence_url?: string;
    medication_error_type?: string;
}

export const pulsesRepo = {
    async create(company_id: string, user_id: string, dto: PulseDto) {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO governance_pulses (
                id, company_id, house_id, created_by, entry_date, entry_time, related_person, 
                signal_type, risk_domain, description, immediate_action, severity, 
                has_happened_before, pattern_concern, escalation_required, evidence_url, review_status, medication_error_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'New', $17) 
            RETURNING *`,
            [
                id, company_id, dto.house_id, user_id, dto.entry_date, dto.entry_time, dto.related_person || null,
                dto.signal_type, dto.risk_domain, dto.description, dto.immediate_action || null, dto.severity,
                dto.has_happened_before, dto.pattern_concern, dto.escalation_required, dto.evidence_url || null,
                dto.medication_error_type || null
            ]
        );
        return result.rows[0];
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
        if (filters.severity) { 
            conditions.push(Array.isArray(filters.severity) ? `gp.severity = ANY($${idx++}::severity_level[])` : `gp.severity = $${idx++}`); 
            params.push(filters.severity); 
        }
        if (filters.start_date) { conditions.push(`gp.entry_date >= $${idx++}`); params.push(filters.start_date); }
        if (filters.end_date) { conditions.push(`gp.entry_date <= $${idx++}`); params.push(filters.end_date); }

        const where = conditions.join(' AND ');
        const result = await query(
            `SELECT gp.*, gp.review_status as status, gp.entry_date as created_at, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name
             FROM governance_pulses gp
             JOIN houses h ON h.id = gp.house_id
             JOIN users u ON u.id = gp.created_by
             WHERE ${where}
             ORDER BY gp.entry_date DESC, gp.entry_time DESC
             LIMIT ${limit} OFFSET ${offset}`,
            params
        );
        return result.rows;
    },

    async findById(id: string, company_id: string) {
        const result = await query(
            `SELECT gp.*, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name,
                    rb.first_name || ' ' || rb.last_name as reviewed_by_name
             FROM governance_pulses gp
             JOIN houses h ON h.id = gp.house_id
             JOIN users u ON u.id = gp.created_by
             LEFT JOIN users rb ON rb.id = gp.reviewed_by
             WHERE gp.id = $1 AND gp.company_id = $2`,
            [id, company_id]
        );
        return result.rows[0] || null;
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
