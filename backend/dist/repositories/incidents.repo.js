"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.incidentsRepo = void 0;
const database_1 = require("../config/database");
const uuid_1 = require("uuid");
exports.incidentsRepo = {
    async findById(id, company_id) {
        const params = [id];
        let sql = `SELECT i.*, ic.name AS category_name, h.name AS house_name,
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS assigned_to_name
      FROM incidents i
      LEFT JOIN incident_categories ic ON ic.id = i.category_id
      LEFT JOIN houses h ON h.id = i.house_id
      LEFT JOIN users u1 ON u1.id = i.created_by
      LEFT JOIN users u2 ON u2.id = i.assigned_to
      WHERE i.id = $1`;
        if (company_id) {
            sql += ' AND i.company_id = $2';
            params.push(company_id);
        }
        const result = await (0, database_1.query)(sql, params);
        return result.rows[0] || null;
    },
    async findByCompany(company_id, filters = {}, limit = 50, offset = 0) {
        const conditions = ['i.company_id = $1'];
        const params = [company_id];
        let idx = 2;
        if (filters.status) {
            conditions.push(`i.status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.severity) {
            conditions.push(`i.severity = $${idx++}`);
            params.push(filters.severity);
        }
        if (filters.house_id) {
            conditions.push(`i.house_id = $${idx++}`);
            params.push(filters.house_id);
        }
        const where = conditions.join(' AND ');
        const result = await (0, database_1.query)(`SELECT i.*, ic.name AS category_name, h.name AS house_name
       FROM incidents i
       LEFT JOIN incident_categories ic ON ic.id = i.category_id
       LEFT JOIN houses h ON h.id = i.house_id
       WHERE ${where}
       ORDER BY i.occurred_at DESC
       LIMIT ${limit} OFFSET ${offset}`, params);
        return result.rows;
    },
    async countByCompany(company_id, filters = {}) {
        const conditions = ['company_id = $1'];
        const params = [company_id];
        let idx = 2;
        if (filters.status) {
            conditions.push(`status = $${idx++}`);
            params.push(filters.status);
        }
        if (filters.severity) {
            conditions.push(`severity = $${idx++}`);
            params.push(filters.severity);
        }
        const result = await (0, database_1.query)(`SELECT COUNT(*) FROM incidents WHERE ${conditions.join(' AND ')}`, params);
        return parseInt(result.rows[0].count);
    },
    async create(dto) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO incidents (id, company_id, house_id, category_id, title, description, severity, status, occurred_at, location, immediate_action, created_by, assigned_to, persons_involved, follow_up_required)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`, [id, dto.company_id, dto.house_id, dto.category_id || null, dto.title, dto.description,
            dto.severity || 'Medium', dto.status || 'Open', dto.occurred_at, dto.location || null,
            dto.immediate_action || null, dto.created_by, dto.assigned_to || null,
            JSON.stringify(dto.persons_involved || []), dto.follow_up_required || false]);
        return result.rows[0];
    },
    async update(id, company_id, data) {
        const allowed = ['title', 'description', 'severity', 'status', 'occurred_at', 'location', 'immediate_action', 'assigned_to', 'resolved_at', 'follow_up_required'];
        const filteredData = {};
        for (const key of allowed) {
            if (key in data)
                filteredData[key] = data[key];
        }
        const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
        const values = Object.values(filteredData);
        const result = await (0, database_1.query)(`UPDATE incidents SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`, [id, company_id, ...values]);
        return result.rows[0];
    },
    async getTimeline(incident_id, company_id) {
        const result = await (0, database_1.query)(`SELECT ie.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM incident_events ie
       JOIN users u ON u.id = ie.created_by
       WHERE ie.incident_id = $1 AND ie.company_id = $2
       ORDER BY ie.created_at ASC`, [incident_id, company_id]);
        return result.rows;
    },
    async getCategories(company_id) {
        const result = await (0, database_1.query)(`SELECT * FROM incident_categories WHERE company_id = $1 ORDER BY name`, [company_id]);
        return result.rows;
    },
    async createCategory(company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO incident_categories (id, company_id, name, description, severity_level, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`, [id, company_id, data.name, data.description || null, data.severity_level || 'moderate', data.created_by]);
        return result.rows[0];
    },
    async getAttachments(incident_id, company_id) {
        const result = await (0, database_1.query)(`SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM incident_attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.incident_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`, [incident_id, company_id]);
        return result.rows;
    },
    async addAttachment(incident_id, company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO incident_attachments (id, incident_id, company_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, incident_id, company_id, data.file_name, data.file_url, data.file_type || null, data.file_size || 0, data.uploaded_by]);
        return result.rows[0];
    },
    async removeAttachment(attachment_id, incident_id, company_id) {
        await (0, database_1.query)(`DELETE FROM incident_attachments WHERE id = $1 AND incident_id = $2 AND company_id = $3`, [attachment_id, incident_id, company_id]);
    },
    async assignIncident(incident_id, company_id, assigned_to) {
        const result = await (0, database_1.query)(`UPDATE incidents SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`, [assigned_to, incident_id, company_id]);
        return result.rows[0];
    },
    async resolveIncident(incident_id, company_id, resolution_notes) {
        const result = await (0, database_1.query)(`UPDATE incidents SET status = 'resolved', resolved_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND company_id = $2 RETURNING *`, [incident_id, company_id]);
        return result.rows[0];
    },
    async delete(id, company_id) {
        await (0, database_1.query)("UPDATE incidents SET status = 'closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
    },
    async addEvent(incident_id, company_id, data) {
        const id = (0, uuid_1.v4)();
        const result = await (0, database_1.query)(`INSERT INTO incident_events (id, incident_id, company_id, event_type, title, description, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`, [id, incident_id, company_id, data.event_type, data.title, data.description || null, JSON.stringify(data.metadata || {}), data.created_by]);
        return result.rows[0];
    },
    async getGovernanceTimeline(incident_id, company_id) {
        // Get incident details first
        const incident = await this.findById(incident_id, company_id);
        if (!incident)
            return { timeline: [], metrics: {}, patterns: [], findings: [], recommendations: [] };
        const timelineEvents = [];
        // 1. Get related risk events
        try {
            const riskResult = await (0, database_1.query)(`SELECT 
          'risk' as source_type,
          r.id as source_id,
          'Risk Signal' as label,
          r.title as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = r.created_by) as actor,
          'Risk Manager' as actor_role,
          r.created_at as timestamp,
          false as gap_flag
        FROM risks r
        WHERE r.company_id = $1 
          AND r.house_id = $2
          AND r.created_at >= $3::timestamp - INTERVAL '30 days'
          AND r.created_at <= $3::timestamp
        ORDER BY r.created_at ASC`, [company_id, incident.house_id, incident.occurred_at]);
            timelineEvents.push(...riskResult.rows);
        }
        catch (err) {
            console.log('Risks table query failed:', err);
        }
        // 2. Get related escalation events
        try {
            const escalationResult = await (0, database_1.query)(`SELECT 
          'escalation' as source_type,
          e.id as source_id,
          'Escalation' as label,
          e.reason as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = e.created_by) as actor,
          'Manager' as actor_role,
          e.created_at as timestamp,
          false as gap_flag
        FROM escalations e
        WHERE e.company_id = $1 
          AND e.house_id = $2
          AND e.created_at >= $3::timestamp - INTERVAL '30 days'
          AND e.created_at <= $3::timestamp
        ORDER BY e.created_at ASC`, [company_id, incident.house_id, incident.occurred_at]);
            timelineEvents.push(...escalationResult.rows);
        }
        catch (err) {
            console.log('Escalations table query failed:', err);
        }
        // 3. Get related governance pulse events
        try {
            const pulseResult = await (0, database_1.query)(`SELECT 
          'pulse' as source_type,
          p.id as source_id,
          'Governance Pulse' as label,
          'Regular governance review' as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = p.created_by) as actor,
          'Registered Manager' as actor_role,
          p.created_at as timestamp,
          false as gap_flag
        FROM governance_pulses p
        WHERE p.company_id = $1 
          AND p.house_id = $2
          AND p.created_at >= $3::timestamp - INTERVAL '30 days'
          AND p.created_at <= $3::timestamp
        ORDER BY p.created_at ASC`, [company_id, incident.house_id, incident.occurred_at]);
            timelineEvents.push(...pulseResult.rows);
        }
        catch (err) {
            console.log('Governance pulses table query failed:', err);
        }
        // Sort events by timestamp
        timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        // 4. Calculate Metrics
        const riskSignals = timelineEvents.filter(e => e.source_type === 'risk');
        const escalations = timelineEvents.filter(e => e.source_type === 'escalation');
        const pulses = timelineEvents.filter(e => e.source_type === 'pulse');
        const lastPulse = pulses.length > 0 ? pulses[pulses.length - 1] : null;
        const lastOversightReviewDays = lastPulse
            ? Math.floor((new Date(incident.occurred_at).getTime() - new Date(lastPulse.timestamp).getTime()) / (1000 * 60 * 60 * 24))
            : 30;
        const firstRisk = riskSignals.length > 0 ? riskSignals[0] : null;
        const firstSignalToIncidentDays = firstRisk
            ? Math.floor((new Date(incident.occurred_at).getTime() - new Date(firstRisk.timestamp).getTime()) / (1000 * 60 * 60 * 24))
            : 0;
        const firstEscalation = escalations.length > 0 ? escalations[0] : null;
        const escalationResponseHours = firstEscalation
            ? Math.floor((new Date(incident.occurred_at).getTime() - new Date(firstEscalation.timestamp).getTime()) / (1000 * 60 * 60))
            : 0;
        const metrics = {
            riskSignalsLogged: riskSignals.length,
            escalationsTriggered: escalations.length,
            leadershipReviews: pulses.length,
            lastOversightReviewDays: Math.max(0, lastOversightReviewDays),
            firstSignalToIncidentDays: Math.max(0, firstSignalToIncidentDays),
            escalationResponseHours: Math.max(0, escalationResponseHours)
        };
        // 5. Cross-House Patterns
        let patterns = [];
        try {
            const patternResult = await (0, database_1.query)(`SELECT DISTINCT h.name as house, r.title as signal, r.created_at as detected
         FROM risks r
         JOIN houses h ON h.id = r.house_id
         WHERE r.company_id = $1 
           AND r.house_id != $2
           AND r.created_at >= $3::timestamp - INTERVAL '14 days'
           AND r.created_at <= $3::timestamp
           AND (LOWER(r.title) LIKE '%medication%' OR LOWER(r.title) LIKE '%behavior%' OR LOWER(r.title) LIKE '%staffing%')
         LIMIT 3`, [company_id, incident.house_id, incident.occurred_at]);
            patterns = patternResult.rows.map(r => ({
                house: r.house,
                signal: r.signal,
                detected: new Date(r.detected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
            }));
        }
        catch (err) {
            console.log('Pattern detection failed:', err);
        }
        // 6. Generate Findings & Recommendations
        const findings = [
            `Leadership was aware of risks ${metrics.firstSignalToIncidentDays} days before the incident`,
            `Escalation response time was ${metrics.escalationResponseHours} hours`,
            `Governance oversight activities were documented and regular`,
            patterns.length > 0 ? `Cross-house patterns detected in ${patterns[0].signal.toLowerCase()}` : "No clear cross-house patterns detected"
        ];
        const recommendations = [
            "Review protocols related to the incident category",
            "Enhance staff training on identified risk factors",
            "Discuss this reconstruction at the next provider oversight meeting"
        ];
        if (patterns.length > 0) {
            recommendations.push(`Collaborate with ${patterns[0].house} to share learnings on ${patterns[0].signal}`);
        }
        // 7. Format Timeline
        const formattedEvents = timelineEvents.map((row, index) => ({
            id: `gov-${index}`,
            timestamp: row.timestamp,
            sourceType: row.source_type,
            sourceId: row.source_id,
            label: row.label,
            detail: row.detail,
            actor: row.actor || 'Unknown',
            actorRole: row.actor_role || 'Unknown',
            gapFlag: row.gap_flag
        }));
        // Add the incident as the final event
        formattedEvents.push({
            id: 'incident-final',
            timestamp: incident.occurred_at,
            sourceType: 'incident',
            sourceId: incident.id,
            label: 'Serious Incident Occurred',
            detail: incident.title,
            actor: incident.created_by_name || 'Unknown',
            actorRole: 'Reporter',
            gapFlag: true
        });
        return {
            timeline: formattedEvents,
            metrics,
            patterns,
            findings,
            recommendations
        };
    }
};
//# sourceMappingURL=incidents.repo.js.map