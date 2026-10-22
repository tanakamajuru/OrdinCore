import { incidentsRepo } from '../repositories/incidents.repo';
import { pulsesRepo } from '../repositories/pulses.repo';
import { incidentReconstructionService } from './incidentReconstruction.service';
import { canonicalGovernanceActionService } from './canonicalGovernanceAction.service';
import { notificationsService } from './notifications.service';
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
    // C2 correction (21 Oct 2026): "Standardise severity: UI High currently represents Serious
    // while task logic checks serious. Validate server-side." Confirmed: the incidents.severity
    // column's CHECK constraint only ever permits Low/Moderate/High/Critical -- the literal string
    // "serious" can never be stored, so `severity === 'serious'` below was dead code that could
    // never match. The UI's "High" option is what a reviewer means by "serious", so the cross-check
    // now matches that instead of a value that structurally cannot exist.
    const severity = (data.severity || '').toString().toLowerCase();
    const isSeriousOrCritical = severity === 'high' || severity === 'critical';

    // C2 correction: "Permit direct reports without a qualifying signal/promoted risk." A High/
    // Critical incident with NO source_pulse_id is allowed -- this only cross-validates when one
    // IS supplied, so a genuinely direct report (the incident itself is the first record of the
    // concern, no prior signal existed) is never blocked.
    if (isSeriousOrCritical && data.source_pulse_id) {
      const pulse = await pulsesRepo.findById(data.source_pulse_id, company_id);
      const pulseSeverity = pulse?.severity?.toString().toLowerCase();
      if (!pulse || !(pulseSeverity === 'critical' || pulse?.is_fatal || pulse?.serious_injury)) {
        throw new Error('Serious incidents can only be linked to a Critical severity signal, or one indicating fatality/serious injury.');
      }
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

    // C2 correction: the required-tasks/reconstruction block below previously re-checked the
    // same dead 'serious' literal (never stored by the DB) instead of reusing isSeriousOrCritical
    // computed above -- so for every High-severity incident (the UI's "Serious" option) NONE of
    // the mandatory follow-up work (investigation task, regulatory-notification task,
    // reconstruction) was ever created, only for 'critical'. Extracted into a standalone,
    // retry-safe method so a failed attempt can be surfaced and retried without duplicating work.
    if (isSeriousOrCritical) {
      await this.createFollowUpWork(company_id, created_by, incident, data);

      // C3 correction: "Notifications and improvement." Confirmed against production: the
      // `notifications` table has never once held an incident-related row (type counts show
      // GOVERNANCE_ABSENCE_72H, ESCALATION_*, ACTION_* etc. in the thousands, but nothing for
      // incidents) -- INCIDENT_CREATED is emitted on the event bus but nothing has ever listened
      // for it, so oversight (RI/Director) learned of a serious incident only by noticing it in
      // a list. Best-effort, never blocks incident creation.
      try {
        const oversight = await query(
          `SELECT id FROM users WHERE company_id = $1 AND status = 'active' AND role = ANY(ARRAY['DIRECTOR','RESPONSIBLE_INDIVIDUAL']) AND id <> $2`,
          [company_id, created_by]
        );
        for (const row of oversight.rows) {
          await notificationsService.create({
            company_id, user_id: row.id, type: 'INCIDENT_REPORTED',
            title: `${incident.severity} incident reported`,
            body: `"${incident.title}" was reported and requires oversight review.`,
            link: `/incidents/${incident.id}`,
          });
        }
      } catch (e: any) {
        logger.error(`Failed to notify oversight of incident ${incident.id}: ${e?.message || e}`);
      }
    }

    await eventBus.emitEvent(EVENTS.INCIDENT_CREATED,
      { incident_id: incident.id, company_id, created_by, severity: incident.severity },
      { idempotencyKey: `incident-created:${incident.id}` });
    return incident;
  }

  // [GOVERNANCE] Serious/critical incidents create their governance tasks on the ONE canonical
  // action spine (doctrine §8.2), carrying incident lineage — so they appear in My Work, the
  // Action Tracker, effectiveness, closure and reports like any other governance action. The
  // previous separate `incident_actions` path did not (its table does not even exist in prod, so
  // those INSERTs threw). Type-aware suggestions stay RECOMMENDATIONS (surfaced via
  // recommended_actions), not auto-created tasks, per the doctrine.
  //
  // C2 correction: "Surface/retry failed required tasks or reconstruction creation without
  // duplicating the case." This is called both at creation time and from retryFollowUp(). Both
  // halves are now idempotent -- canonicalGovernanceActionService.create() dedupes on
  // (company, title, incident_id) for any still-open action, and the reconstruction INSERT below
  // first checks for an existing row for this incident -- so a retry after a partial failure can
  // never create a second task or a second reconstruction for the same incident.
  async createFollowUpWork(company_id: string, created_by: string, incident: any, data: any) {
    const owner = data.assigned_to || incident.assigned_to || created_by;
    const failures: string[] = [];
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
        // Checked up front (same still-open/title/incident_id match the shared create() uses
        // internally) so we know whether this call is inserting a fresh row or returning an
        // existing one -- only a fresh row should notify its owner, or a retry would re-notify
        // for work that was already assigned.
        const alreadyExisted = !!(await query(
          `SELECT 1 FROM risk_actions WHERE company_id=$1 AND incident_id=$2 AND LOWER(BTRIM(title))=$3
             AND completed_at IS NULL AND COALESCE(status,'') NOT IN ('Completed','Complete','Closed','Resolved','Cancelled') LIMIT 1`,
          [company_id, incident.id, t.title.trim().toLowerCase()]
        )).rows[0];
        await canonicalGovernanceActionService.create({
          companyId: company_id, createdBy: created_by, title: t.title, description: t.description,
          assignedTo: owner, dueDate: t.dueDate, houseId: incident.house_id || null,
          incidentId: incident.id, sourcePulseId: data.source_pulse_id || null,
          reviewRequirement: 'COMPLETION_ONLY',
        });
        if (!alreadyExisted) {
          // C3 correction: canonicalGovernanceActionService.create() never notifies the
          // assignee (confirmed -- no notificationsService reference in that file), so the
          // owner of a required incident task previously learned of it only by finding it
          // themselves in My Work/Action Tracker. Mirrors the pattern already used for
          // escalation-raised tasks (escalations.service.ts addTask()).
          try {
            await notificationsService.create({
              company_id, user_id: owner, type: 'task_assigned',
              title: 'Required incident task assigned to you',
              body: t.title, link: '/my-actions',
            });
          } catch { /* best-effort */ }
        }
      } catch (e: any) {
        logger.error(`Failed to create canonical incident action "${t.title}" for incident ${incident.id}: ${e?.message || e}`);
        failures.push(t.title);
      }
    }

    if (data.source_pulse_id) {
      try {
        const existingRecon = await incidentReconstructionService.findByIncident(incident.id, company_id);
        const reconstruction = existingRecon || await incidentReconstructionService.create(company_id, created_by, {
          incident_id: incident.id,
          house_id: incident.house_id,
          lead_investigator: created_by
        });
        await incidentReconstructionService.linkPulses(reconstruction.id, company_id, [data.source_pulse_id]);
      } catch (reconErr: any) {
        logger.error(`Failed to create incident reconstruction snapshot for incident ${incident.id}: ${reconErr?.message || reconErr}`);
        failures.push('Incident reconstruction');
      }
    }

    // Surface any failure on the incident's own timeline so it is visible to whoever is
    // reviewing the case (not just backend logs), with enough detail to know a retry is needed.
    if (failures.length) {
      try {
        await incidentsRepo.addEvent(incident.id, company_id, {
          event_type: 'follow_up_incomplete',
          title: 'Required follow-up work could not be created',
          description: `Failed to create: ${failures.join(', ')}. Use "Retry follow-up work" on this case to try again.`,
          metadata: { failures },
          created_by
        });
      } catch (e: any) {
        logger.error(`Failed to record follow_up_incomplete event for incident ${incident.id}: ${e?.message || e}`);
      }
    }
    return { failures };
  }

  async retryFollowUp(company_id: string, user_id: string, incident_id: string) {
    const incident = await incidentsRepo.findById(incident_id, company_id);
    if (!incident) throw new Error('Incident not found');
    const severity = (incident.severity || '').toString().toLowerCase();
    if (!(severity === 'high' || severity === 'critical')) {
      throw new Error('Follow-up work only applies to High or Critical incidents.');
    }
    const result = await this.createFollowUpWork(company_id, user_id, incident, { source_pulse_id: incident.source_pulse_id, assigned_to: incident.assigned_to });
    if (!result.failures.length) {
      await incidentsRepo.addEvent(incident.id, company_id, {
        event_type: 'follow_up_retried',
        title: 'Required follow-up work retried successfully',
        description: 'All required tasks and/or reconstruction are now in place.',
        metadata: {},
        created_by: user_id
      });
    }
    return result;
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
