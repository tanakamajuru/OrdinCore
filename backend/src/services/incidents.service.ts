import { incidentsRepo } from '../repositories/incidents.repo';
import { pulsesRepo } from '../repositories/pulses.repo';
import { incidentReconstructionService } from './incidentReconstruction.service';
import { canonicalGovernanceActionService } from './canonicalGovernanceAction.service';
import { eventBus, EVENTS } from '../events/eventBus';
import { query } from '../config/database';
import logger from '../utils/logger';

// Type-aware recommended follow-up actions. Kept server-side so the capture form,
// the auto-created actions, and any report all draw on one list.
export function recommendedActionsFor(type?: string, severity?: string): string[] {
  const t = (type || '').toLowerCase();
  const out: string[] = [];
  if ((severity || '').toLowerCase() === 'critical') out.push('Assess the CQC statutory notification requirement immediately');
  if (t.includes('safeguard')) out.push('Raise a safeguarding alert to the Local Authority', 'Preserve evidence and complete a safeguarding record');
  if (t.includes('medication')) out.push('Complete a medication error report and MAR review', 'Arrange a medication competency re-check for the staff involved');
  if (t.includes('abscond')) out.push('Review the missing-person / absence protocol and risk assessment', 'Confirm police notification and record the reference');
  if (t.includes('injury') || t.includes('behav')) out.push('Arrange a physical / clinical review for the person', 'Review the positive behaviour support plan');
  if (t.includes('environ')) out.push('Complete a health & safety / environmental check', 'Log a maintenance job and re-inspect the area');
  if (t.includes('staff')) out.push('Consider an HR / disciplinary review for the staff involved');
  out.push('Complete a structured incident reconstruction', 'Capture lessons learned and share them with the team');
  return Array.from(new Set(out));
}

export class IncidentsService {
  // Pattern detection: surface prior related incidents (same service and/or the same
  // people) and recent signals for the people involved, so the recorder sees at a
  // glance whether "this has happened before".
  async detectPatterns(company_id: string, params: { house_id?: string; persons_involved?: string[]; type?: string; severity?: string }) {
    const persons = (params.persons_involved || []).map(p => String(p).trim()).filter(Boolean);
    const incRes = await query(
      `SELECT id, reference, title, severity, occurred_at, house_id, persons_involved
         FROM incidents
        WHERE company_id = $1
          AND ($2::uuid IS NULL OR house_id = $2)
          AND occurred_at >= NOW() - INTERVAL '365 days'
        ORDER BY occurred_at DESC LIMIT 25`,
      [company_id, params.house_id || null]
    );
    const lowerPeople = new Set(persons.map(p => p.toLowerCase()));
    const similar_incidents = incRes.rows.map((r: any) => {
      let ppl: string[] = [];
      try { ppl = Array.isArray(r.persons_involved) ? r.persons_involved : JSON.parse(r.persons_involved || '[]'); } catch { ppl = []; }
      return { ...r, person_match: ppl.some((n: string) => lowerPeople.has(String(n).toLowerCase())) };
    });

    let related_signals: any[] = [];
    if (persons.length) {
      const sigRes = await query(
        `SELECT id, governance_domain, signal_label, severity, entry_date, related_person
           FROM governance_pulses
          WHERE company_id = $1 AND related_person = ANY($2::text[])
            AND entry_date >= (NOW() - INTERVAL '180 days')::date
          ORDER BY entry_date DESC LIMIT 30`,
        [company_id, persons]
      );
      related_signals = sigRes.rows;
    }
    return {
      similar_incidents,
      related_signals,
      recurring: similar_incidents.some((s: any) => s.person_match) || related_signals.length >= 3,
      recommended_actions: recommendedActionsFor(params.type, params.severity),
    };
  }

  async create(company_id: string, created_by: string, data: any) {
    const severity = (data.severity || '').toString().toLowerCase();
    const isSeriousOrCritical = severity === 'serious' || severity === 'critical';

    if (isSeriousOrCritical && data.source_pulse_id) {
      const pulse = await pulsesRepo.findById(data.source_pulse_id, company_id);
      const pulseSeverity = pulse?.severity?.toString().toLowerCase();
      if (!pulse || !(pulseSeverity === 'critical' || pulse?.is_fatal || pulse?.serious_injury)) {
        throw new Error('Serious incidents can only be created from Critical severity signals or when fatality/serious injury is indicated.');
      }
    }

    if (severity === 'serious' && !data.source_pulse_id) {
      throw new Error('Serious incidents must be created from a qualifying critical signal.');
    }

    const incident = await incidentsRepo.create({ company_id, created_by, ...data });

    // Add creation event to timeline
    await incidentsRepo.addEvent(incident.id, company_id, {
      event_type: 'created',
      title: 'Incident Reported',
      description: `Incident "${incident.title}" was reported and logged`,
      metadata: { severity: incident.severity, status: incident.status, category: incident.category_id },
      created_by
    });

    // [GOVERNANCE] Serious/critical incidents create their governance tasks on the ONE canonical
    // action spine (doctrine §8.2), carrying incident lineage — so they appear in My Work, the
    // Action Tracker, effectiveness, closure and reports like any other governance action. The
    // previous separate `incident_actions` path did not (its table does not even exist in prod,
    // so those INSERTs threw). Type-aware suggestions stay RECOMMENDATIONS (surfaced via
    // recommended_actions), not auto-created tasks, per the doctrine.
    if (incident.severity === 'serious' || incident.severity === 'critical') {
      const owner = data.assigned_to || created_by;
      const fixedTasks = [
        { title: `Immediate Investigation Required: ${incident.title}`,
          description: `Formal investigation required for serious/critical incident. Source: ${data.source_pulse_id ? 'Promoted from signal' : 'Direct report'}`,
          dueDate: new Date(Date.now() + 24 * 60 * 60 * 1000) },
        { title: 'Notify Regulatory Bodies if Required',
          description: 'Assess whether notification to CQC, LA, or police is required for this serious/critical incident.',
          dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) },
        { title: 'Complete Incident Reconstruction',
          description: 'Conduct structured incident reconstruction to identify contributing factors, control weaknesses, and learning points.',
          dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) },
      ];
      for (const t of fixedTasks) {
        try {
          await canonicalGovernanceActionService.create({
            companyId: company_id, createdBy: created_by, title: t.title, description: t.description,
            assignedTo: owner, dueDate: t.dueDate, houseId: incident.house_id || null,
            incidentId: incident.id, sourcePulseId: data.source_pulse_id || null,
            reviewRequirement: 'COMPLETION_ONLY',
          });
        } catch (e: any) {
          // Best-effort: a task failure must not roll back an already-created incident record.
          logger.error(`Failed to create canonical incident action "${t.title}" for incident ${incident.id}: ${e?.message || e}`);
        }
      }

      if (data.source_pulse_id) {
        try {
          const reconstruction = await incidentReconstructionService.create(company_id, created_by, {
            incident_id: incident.id,
            house_id: incident.house_id,
            lead_investigator: created_by
          });
          await incidentReconstructionService.linkPulses(reconstruction.id, company_id, [data.source_pulse_id]);
        } catch (reconErr) {
          console.error('Failed to create incident reconstruction snapshot:', reconErr);
        }
      }
    }

    await eventBus.emitEvent(EVENTS.INCIDENT_CREATED,
      { incident_id: incident.id, company_id, created_by, severity: incident.severity },
      { idempotencyKey: `incident-created:${incident.id}` });
    return incident;
  }

  async findAll(company_id: string, filters: Record<string, unknown> = {}, page = 1, limit = 50) {
    const offset = (page - 1) * limit;
    const [incidents, total] = await Promise.all([
      incidentsRepo.findByCompany(company_id, filters, limit, offset),
      incidentsRepo.countByCompany(company_id, filters),
    ]);
    return { incidents, total, page, limit, pages: Math.ceil(total / limit) };
  }

  async findById(id: string, company_id: string) {
    const incident = await incidentsRepo.findById(id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incident;
  }

  async update(id: string, company_id: string, data: Record<string, unknown>) {
    const incident = await incidentsRepo.findById(id, company_id);
    if (!incident) throw new Error('Incident not found');

    // [GOVERNANCE] Locked Means Locked
    if (incident.status === 'resolved' || incident.status === 'closed') {
      throw new Error('This incident is resolved/closed and cannot be modified (Governance Integrity Rule Section 7.2)');
    }

    const updated = await incidentsRepo.update(id, company_id, data);

    // Add update event to timeline
    await incidentsRepo.addEvent(id, company_id, {
      event_type: 'updated',
      title: 'Incident Updated',
      description: 'Incident details were updated',
      metadata: { updated_fields: Object.keys(data) },
      created_by: data.updated_by as string || incident.created_by
    });

    return updated;
  }

  async delete(id: string, company_id: string) {
    // [GOVERNANCE] No Deletion Implementation
    throw new Error('Hard deletion is prohibited for governance records (Governance Integrity Rule Section 7.1). Please resolve or close the incident instead.');
  }

  async getTimeline(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getTimeline(incident_id, company_id);
  }

  async getGovernanceTimeline(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getGovernanceTimeline(incident_id, company_id);
  }

  async getCategories(company_id: string) {
    return incidentsRepo.getCategories(company_id);
  }

  async createCategory(company_id: string, user_id: string, data: { name: string; description?: string; severity_level?: string }) {
    return incidentsRepo.createCategory(company_id, { ...data, created_by: user_id });
  }

  async getAttachments(incident_id: string, company_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    return incidentsRepo.getAttachments(incident_id, company_id);
  }

  async addAttachment(incident_id: string, company_id: string, user_id: string, data: { file_name: string; file_url: string; file_type?: string; file_size?: number }) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const attachment = await incidentsRepo.addAttachment(incident_id, company_id, { ...data, uploaded_by: user_id });
    return attachment;
  }

  async removeAttachment(incident_id: string, company_id: string, user_id: string, attachment_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    await incidentsRepo.removeAttachment(attachment_id, incident_id, company_id);
  }

  async assignIncident(incident_id: string, company_id: string, user_id: string, assigned_to: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const updated = await incidentsRepo.assignIncident(incident_id, company_id, assigned_to);
    return updated;
  }

  async resolveIncident(incident_id: string, company_id: string, user_id: string, resolution_notes: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');

    // [GOVERNANCE] Locked Means Locked
    if (incident.status === 'resolved' || incident.status === 'closed') {
      throw new Error('This incident is already resolved/closed (Governance Integrity Rule Section 7.2)');
    }

    const updated = await incidentsRepo.resolveIncident(incident_id, company_id, resolution_notes);

    // Add resolution event to timeline
    await incidentsRepo.addEvent(incident_id, company_id, {
      event_type: 'resolved',
      title: 'Incident Resolved',
      description: resolution_notes || 'Incident was resolved',
      metadata: { resolved_by: user_id, resolved_at: new Date() },
      created_by: user_id
    });

    await eventBus.emitEvent(EVENTS.INCIDENT_RESOLVED,
      { incident_id, company_id, resolved_by: user_id },
      { idempotencyKey: `incident-resolved:${incident_id}` });
    return updated;
  }
}

export const incidentsService = new IncidentsService();
