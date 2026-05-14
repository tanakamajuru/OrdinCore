import { query } from '../config/database';
import { v4 as uuidv4 } from 'uuid';

export interface CreateIncidentDto {
  company_id: string;
  house_id: string;
  category_id?: string;
  title: string;
  description: string;
  severity?: string;
  status?: string;
  occurred_at: Date;
  location?: string;
  immediate_action?: string;
  created_by: string;
  assigned_to?: string;
  la_referral?: string;
  cqc_notification?: string;
  police_reference?: string;
  other_references?: string;
  is_foreseeable?: string;
  risk_factors?: string;
  preventive_measures?: string;
  leadership_commentary?: string;
  linked_risks?: string[];
  linked_escalations?: string[];
}

export const incidentsRepo = {
  async findById(id: string, company_id?: string) {
    const params: unknown[] = [id];
    let sql = `SELECT i.*, ic.name AS category_name, h.name AS house_name,
        u1.first_name || ' ' || u1.last_name AS created_by_name,
        u2.first_name || ' ' || u2.last_name AS assigned_to_name,
        (ra.id IS NOT NULL) AS ri_acknowledged
      FROM incidents i
      LEFT JOIN incident_categories ic ON ic.id = i.category_id
      LEFT JOIN houses h ON h.id = i.house_id
      LEFT JOIN users u1 ON u1.id = i.created_by
      LEFT JOIN users u2 ON u2.id = i.assigned_to
      LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
      WHERE i.id = $1`;
    if (company_id) { sql += ' AND i.company_id = $2'; params.push(company_id); }
    const result = await query(sql, params);
    const incident = result.rows[0] || null;

    if (incident) {
      // Fetch linked risks
      const risksResult = await query(
        `SELECT r.id, r.title, r.severity, r.status, r.risk_domain 
         FROM risks r 
         JOIN incident_risks ir ON ir.risk_id = r.id 
         WHERE ir.incident_id = $1`,
        [id]
      );
      incident.linked_risks = risksResult.rows;

      // Fetch linked escalations
      const escResult = await query(
        `SELECT e.id, e.reason, e.status, e.priority 
         FROM escalations e 
         JOIN incident_escalations ie ON ie.escalation_id = e.id 
         WHERE ie.incident_id = $1`,
        [id]
      );
      incident.linked_escalations = escResult.rows;
    }

    return incident;
  },

  async findByCompany(company_id: string, filters: Record<string, unknown> = {}, limit = 50, offset = 0) {
    const conditions: string[] = ['i.company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;

    if (filters.status) { 
      if (Array.isArray(filters.status)) {
        conditions.push(`i.status = ANY($${idx++})`);
        params.push(filters.status);
      } else {
        conditions.push(`i.status = $${idx++}`);
        params.push(filters.status);
      }
    }
    if (filters.severity) { conditions.push(`i.severity = $${idx++}`); params.push(filters.severity); }
    if (filters.house_id) { conditions.push(`i.house_id = $${idx++}`); params.push(filters.house_id); }

    const where = conditions.join(' AND ');
    const result = await query(
      `SELECT i.*, ic.name AS category_name, h.name AS house_name,
              u.first_name || ' ' || u.last_name AS created_by_name,
              (ra.id IS NOT NULL) AS ri_acknowledged
       FROM incidents i
       LEFT JOIN incident_categories ic ON ic.id = i.category_id
       LEFT JOIN houses h ON h.id = i.house_id
       LEFT JOIN users u ON u.id = i.created_by
       LEFT JOIN ri_acknowledgements ra ON ra.incident_id = i.id
       WHERE ${where}
       ORDER BY i.occurred_at DESC
       LIMIT ${limit} OFFSET ${offset}`,
      params
    );
    return result.rows;
  },

  async countByCompany(company_id: string, filters: Record<string, unknown> = {}) {
    const conditions = ['company_id = $1'];
    const params: unknown[] = [company_id];
    let idx = 2;
    if (filters.status) { 
      if (Array.isArray(filters.status)) {
        conditions.push(`status = ANY($${idx++})`);
        params.push(filters.status);
      } else {
        conditions.push(`status = $${idx++}`);
        params.push(filters.status);
      }
    }
    if (filters.severity) { conditions.push(`severity = $${idx++}`); params.push(filters.severity); }
    const result = await query(`SELECT COUNT(*) FROM incidents WHERE ${conditions.join(' AND ')}`, params);
    return parseInt(result.rows[0].count);
  },

  async create(dto: CreateIncidentDto & { 
    persons_involved?: string[]; 
    follow_up_required?: boolean;
    linked_risks?: string[];
    linked_escalations?: string[];
  }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incidents (
        id, company_id, house_id, category_id, title, description, severity, status, occurred_at, location, 
        immediate_action, created_by, assigned_to, persons_involved, follow_up_required,
        la_referral, cqc_notification, police_reference, other_references, is_foreseeable,
        risk_factors, preventive_measures, leadership_commentary
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23) RETURNING *`,
      [
        id, dto.company_id, dto.house_id, dto.category_id || null, dto.title, dto.description,
        dto.severity || 'Moderate', dto.status || 'Open', dto.occurred_at, dto.location || null,
        dto.immediate_action || null, dto.created_by, dto.assigned_to || null,
        JSON.stringify(dto.persons_involved || []), dto.follow_up_required || false,
        dto.la_referral || null, dto.cqc_notification || null, dto.police_reference || null, dto.other_references || null,
        dto.is_foreseeable || null, dto.risk_factors || null, dto.preventive_measures || null, dto.leadership_commentary || null
      ]
    );

    const incident = result.rows[0];

    // Handle linked risks
    if (dto.linked_risks && dto.linked_risks.length > 0) {
      for (const riskId of dto.linked_risks) {
        await query(
          `INSERT INTO incident_risks (incident_id, risk_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, riskId]
        );
      }
    }

    // Handle linked escalations
    if (dto.linked_escalations && dto.linked_escalations.length > 0) {
      for (const escId of dto.linked_escalations) {
        await query(
          `INSERT INTO incident_escalations (incident_id, escalation_id) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [id, escId]
        );
      }
    }

    return incident;
  },

  async update(id: string, company_id: string, data: Partial<CreateIncidentDto> & { status?: string; resolved_at?: Date }) {
    const allowed = [
      'title', 'description', 'severity', 'status', 'occurred_at', 'location', 'immediate_action', 
      'assigned_to', 'resolved_at', 'follow_up_required',
      'la_referral', 'cqc_notification', 'police_reference', 'other_references',
      'is_foreseeable', 'risk_factors', 'preventive_measures', 'leadership_commentary'
    ];
    const filteredData: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in data) filteredData[key] = (data as Record<string, unknown>)[key];
    }
    const fields = Object.keys(filteredData).map((k, i) => `${k} = $${i + 3}`).join(', ');
    const values = Object.values(filteredData);
    const result = await query(
      `UPDATE incidents SET ${fields}, updated_at = NOW() WHERE id = $1 AND company_id = $2 RETURNING *`,
      [id, company_id, ...values]
    );
    return result.rows[0];
  },

  async getTimeline(incident_id: string, company_id: string) {
    const result = await query(
      `SELECT ie.*, u.first_name || ' ' || u.last_name AS created_by_name
       FROM incident_events ie
       JOIN users u ON u.id = ie.created_by
       WHERE ie.incident_id = $1 AND ie.company_id = $2
       ORDER BY ie.created_at ASC`,
      [incident_id, company_id]
    );
    return result.rows;
  },

  async getCategories(company_id: string) {
    const result = await query(
      `SELECT * FROM incident_categories WHERE company_id = $1 ORDER BY name`,
      [company_id]
    );
    return result.rows;
  },

  async createCategory(company_id: string, data: { name: string; description?: string; severity_level?: string; created_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_categories (id, company_id, name, description, severity_level, created_by)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING *`,
      [id, company_id, data.name, data.description || null, data.severity_level || 'moderate', data.created_by]
    );
    return result.rows[0];
  },

  async getAttachments(incident_id: string, company_id: string) {
    const result = await query(
      `SELECT a.*, u.first_name || ' ' || u.last_name AS uploaded_by_name
       FROM incident_attachments a
       JOIN users u ON u.id = a.uploaded_by
       WHERE a.incident_id = $1 AND a.company_id = $2
       ORDER BY a.created_at DESC`,
      [incident_id, company_id]
    );
    return result.rows;
  },

  async addAttachment(incident_id: string, company_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number; uploaded_by: string }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_attachments (id, incident_id, company_id, file_name, file_url, file_type, file_size, uploaded_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, incident_id, company_id, data.file_name, data.file_url, data.file_type || null, data.file_size || 0, data.uploaded_by]
    );
    return result.rows[0];
  },

  async removeAttachment(attachment_id: string, incident_id: string, company_id: string) {
    await query(
      `DELETE FROM incident_attachments WHERE id = $1 AND incident_id = $2 AND company_id = $3`,
      [attachment_id, incident_id, company_id]
    );
  },

  async assignIncident(incident_id: string, company_id: string, assigned_to: string) {
    const result = await query(
      `UPDATE incidents SET assigned_to = $1, updated_at = NOW() WHERE id = $2 AND company_id = $3 RETURNING *`,
      [assigned_to, incident_id, company_id]
    );
    return result.rows[0];
  },

  async resolveIncident(incident_id: string, company_id: string, resolution_notes: string) {
    const result = await query(
      `UPDATE incidents SET status = 'Resolved', resolved_at = NOW(), updated_at = NOW() 
       WHERE id = $1 AND company_id = $2 RETURNING *`,
      [incident_id, company_id]
    );
    return result.rows[0];
  },

  async delete(id: string, company_id: string) {
    await query("UPDATE incidents SET status = 'Closed', updated_at = NOW() WHERE id = $1 AND company_id = $2", [id, company_id]);
  },

  async addEvent(incident_id: string, company_id: string, data: {
    event_type: string;
    title: string;
    description?: string;
    metadata?: Record<string, unknown>;
    created_by: string;
  }) {
    const id = uuidv4();
    const result = await query(
      `INSERT INTO incident_events (id, incident_id, company_id, event_type, title, description, metadata, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [id, incident_id, company_id, data.event_type, data.title, data.description || null, JSON.stringify(data.metadata || {}), data.created_by]
    );
    return result.rows[0];
  },

  async getGovernanceTimeline(incident_id: string, company_id: string) {
    // Get incident details first
    const incident = await this.findById(incident_id, company_id);
    if (!incident) return { timeline: [], metrics: {}, patterns: [], findings: [], recommendations: [] };

    const timelineEvents: any[] = [];

    // 1. Get related risk events
    try {
      const linkedRiskIds = incident.linked_risks?.map((r: any) => r.id) || [];
      const riskIdsFilter = linkedRiskIds.length > 0 ? `OR r.id = ANY($4::uuid[])` : '';
      const params: any[] = [company_id, incident.house_id, incident.occurred_at];
      if (linkedRiskIds.length > 0) params.push(linkedRiskIds);

      const riskResult = await query(
        `SELECT 
          'risk' as source_type,
          r.id as source_id,
          'Risk Logged' as label,
          r.title as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = r.created_by) as actor,
          'Risk Manager' as actor_role,
          r.created_at as timestamp,
          false as gap_flag
        FROM risks r
        WHERE (r.company_id = $1 
          AND r.house_id = $2
          AND r.created_at >= $3::timestamp - INTERVAL '30 days'
          AND r.created_at <= $3::timestamp)
          ${riskIdsFilter}
        ORDER BY r.created_at ASC`,
        params
      );
      timelineEvents.push(...riskResult.rows);
    } catch (err) {
      console.log('Risks table query failed:', err);
    }

    // 2. Get related escalation events
    try {
      const linkedEscIds = incident.linked_escalations?.map((e: any) => e.id) || [];
      const escIdsFilter = linkedEscIds.length > 0 ? `OR e.id = ANY($4::uuid[])` : '';
      const params: any[] = [company_id, incident.house_id, incident.occurred_at];
      if (linkedEscIds.length > 0) params.push(linkedEscIds);

      const escalationResult = await query(
        `SELECT 
          'escalation' as source_type,
          e.id as source_id,
          'Escalation Raised' as label,
          e.reason as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = e.escalated_by) as actor,
          'Manager' as actor_role,
          e.created_at as timestamp,
          false as gap_flag
        FROM escalations e
        WHERE (e.company_id = $1 
          AND e.house_id = $2
          AND e.created_at >= $3::timestamp - INTERVAL '30 days'
          AND e.created_at <= $3::timestamp)
          ${escIdsFilter}
        ORDER BY e.created_at ASC`,
        params
      );
      timelineEvents.push(...escalationResult.rows);
    } catch (err) {
      console.log('Escalations table query failed:', err);
    }

    // 3. Get related governance pulse events (Signals)
    try {
      const domains = incident.linked_risks?.map((r: any) => r.risk_domain).filter(Boolean) || [];
      const domainFilter = domains.length > 0 ? `AND p.risk_domain && $4` : '';
      const params: any[] = [company_id, incident.house_id, incident.occurred_at];
      if (domains.length > 0) params.push(domains);
      
      const pulseResult = await query(
        `SELECT 
          'pulse' as source_type,
          p.id as source_id,
          'Signal Captured' as label,
          p.description || ' (' || array_to_string(p.risk_domain, ', ') || ')' as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = p.created_by) as actor,
          'Staff' as actor_role,
          p.entry_date as timestamp,
          false as gap_flag
        FROM governance_pulses p
        WHERE p.company_id = $1 
          AND p.house_id = $2
          AND p.entry_date >= $3::date - INTERVAL '30 days'
          AND p.entry_date <= $3::date
          ${domainFilter}
        ORDER BY p.entry_date ASC`,
        params
      );
      timelineEvents.push(...pulseResult.rows);
    } catch (err) {
      console.log('Governance pulses table query failed:', err);
    }

    // 3.5. Get related weekly reviews
    try {
      const reviewResult = await query(
        `SELECT 
          'weekly-review' as source_type,
          wr.id as source_id,
          'Weekly Governance Review' as label,
          'Status: ' || wr.overall_position as detail,
          (SELECT first_name || ' ' || last_name FROM users WHERE id = wr.created_by) as actor,
          'Registered Manager' as actor_role,
          wr.week_ending as timestamp,
          false as gap_flag
        FROM weekly_reviews wr
        WHERE wr.company_id = $1 
          AND wr.house_id = $2
          AND wr.week_ending >= $3::date - INTERVAL '30 days'
          AND wr.week_ending <= $3::date
        ORDER BY wr.week_ending ASC`,
        [company_id, incident.house_id, incident.occurred_at]
      );
      timelineEvents.push(...reviewResult.rows);
    } catch (err) {
      console.log('Weekly reviews query failed:', err);
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
    let patterns: { house: string; signal: string; detected: string }[] = [];
    try {
      const patternResult = await query(
        `SELECT DISTINCT h.name as house, r.title as signal, r.created_at as detected
         FROM risks r
         JOIN houses h ON h.id = r.house_id
         WHERE r.company_id = $1 
           AND r.house_id != $2
           AND r.created_at >= $3::timestamp - INTERVAL '30 days'
           AND r.created_at <= $3::timestamp
           AND (LOWER(r.title) LIKE '%medication%' OR LOWER(r.title) LIKE '%behavior%' OR LOWER(r.title) LIKE '%staffing%')
         LIMIT 3`,
        [company_id, incident.house_id, incident.occurred_at]
      );
      patterns = patternResult.rows.map(r => ({
        house: r.house,
        signal: r.signal,
        detected: new Date(r.detected).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      }));
    } catch (err) {
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
    const formattedEvents = timelineEvents.map((row: any, index: number) => ({
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
