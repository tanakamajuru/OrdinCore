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

export const pulsesRepo = {
    async create(company_id: string, user_id: string, dto: PulseDto) {
        const id = uuidv4();

        // Normalise the simplified signal payload (spec module 1) into the
        // underlying governance_pulses shape. Legacy fields are now nullable.
        const houseId = dto.house_id || dto.service_id;
        const occurred = dto.occurred_at ? new Date(dto.occurred_at) : null;
        const entryDate = dto.entry_date || (occurred ? occurred.toISOString().split('T')[0] : new Date().toISOString().split('T')[0]);
        const entryTime = dto.entry_time || (occurred ? occurred.toTimeString().slice(0, 8) : new Date().toTimeString().slice(0, 8));
        const riskDomain = (dto.risk_domain && dto.risk_domain.length > 0)
            ? dto.risk_domain
            : (dto.category ? [dto.category] : []);
        // signal_type is a constrained enum; the free-text category lives in
        // risk_domain. Never put the category into signal_type.
        const signalType = dto.signal_type || 'Concern';
        const relatedPerson = dto.related_person || dto.client_id || null;

        const result = await query(
            `INSERT INTO governance_pulses (
                id, company_id, house_id, created_by, entry_date, entry_time, related_person,
                signal_type, risk_domain, description, immediate_action, severity,
                has_happened_before, pattern_concern, escalation_required, evidence_url, review_status, medication_error_type
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'New', $17)
            RETURNING *`,
            [
                id, company_id, houseId, user_id, entryDate, entryTime, relatedPerson,
                signalType, riskDomain, dto.description, dto.immediate_action || null, dto.severity,
                dto.has_happened_before || null, dto.pattern_concern || null, dto.escalation_required || null, dto.evidence_url || null,
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

        const where = conditions.join(' AND ');
        const result = await query(
            `SELECT gp.*, gp.review_status as status, (gp.entry_date + gp.entry_time) as pulse_date, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name
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
            `SELECT gp.*, (gp.entry_date + gp.entry_time) as pulse_date, h.name as house_name, u.first_name || ' ' || u.last_name as created_by_name,
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
