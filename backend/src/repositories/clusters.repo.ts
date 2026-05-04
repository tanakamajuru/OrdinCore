import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export const clustersRepo = {
    async findActiveCluster(company_id: string, house_id: string, risk_domain: string, linked_person?: string) {
        const result = await query(
            `SELECT * FROM signal_clusters 
             WHERE company_id = $1 AND house_id = $2 AND risk_domain = $3 
             AND (linked_person = $4 OR (linked_person IS NULL AND $4 IS NULL))
             AND cluster_status IN ('Emerging', 'Confirmed', 'Escalated') 
             ORDER BY last_signal_date DESC LIMIT 1`,
            [company_id, house_id, risk_domain, linked_person || null]
        );
        return result.rows[0];
    },

    async createCluster(data: any) {
        const id = uuidv4();
        const result = await query(
            `INSERT INTO signal_clusters (
                id, company_id, house_id, risk_domain, linked_person, cluster_label, 
                cluster_status, signal_count, first_signal_date, last_signal_date, trajectory
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11) RETURNING *`,
            [
                id, data.company_id, data.house_id, data.risk_domain, data.linked_person || null, data.cluster_label,
                data.cluster_status || 'Emerging', data.signal_count || 1, 
                data.first_signal_date || new Date(), data.last_signal_date || new Date(), data.trajectory || 'Stable'
            ]
        );
        return result.rows[0];
    },

    async updateCluster(id: string, data: any) {
        const allowed = ['cluster_label', 'cluster_status', 'signal_count', 'last_signal_date', 'trajectory', 'linked_risk_id', 'dismissed_by', 'dismiss_reason'];
        const updates: string[] = ['updated_at = NOW()'];
        const values: unknown[] = [id];
        let idx = 2;

        for (const key of allowed) {
            if (key in data) {
                updates.push(`${key} = $${idx++}`);
                values.push(data[key]);
            }
        }

        const result = await query(
            `UPDATE signal_clusters SET ${updates.join(', ')} WHERE id = $1 RETURNING *`,
            values
        );
        return result.rows[0];
    },

    async logThresholdEvent(data: any) {
        const id = uuidv4();
        await query(
            `INSERT INTO threshold_events (
                id, house_id, rule_number, rule_name, cluster_id, output_type
            ) VALUES ($1, $2, $3, $4, $5, $6)`,
            [id, data.house_id, data.rule_number, data.rule_name, data.cluster_id || null, data.output_type]
        );
    },

    async findSignalsForCluster(house_id: string, risk_domain: string, days: number) {
        const result = await query(
            `SELECT * FROM governance_pulses 
             WHERE house_id = $1 AND $2 = ANY(risk_domain) 
             AND entry_date >= CURRENT_DATE - INTERVAL '${days} days'
             ORDER BY entry_date DESC, entry_time DESC`,
            [house_id, risk_domain]
        );
        return result.rows;
    },
    async findAll(company_id: string, filters: { status?: string; house_id?: string }) {
        let sql = `SELECT c.*, h.name as house_name 
                  FROM signal_clusters c
                  JOIN houses h ON h.id = c.house_id
                  WHERE c.company_id = $1`;
        const params: any[] = [company_id];
        let idx = 2;
        
        if (filters.status) {
            sql += ` AND c.cluster_status = $${idx++}`;
            params.push(filters.status);
        }
        
        if (filters.house_id) {
            sql += ` AND c.house_id = $${idx++}`;
            params.push(filters.house_id);
        }
        
        sql += ` ORDER BY c.last_signal_date DESC`;
        
        const result = await query(sql, params);
        return result.rows;
    }
};
