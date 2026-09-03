import { Request, Response } from 'express';
import { risksService } from '../services/risks.service';
import { notificationsService } from '../services/notifications.service';
import { query } from '../config/database';
import logger from '../utils/logger';

export class ActionsController {
  async complete(req: Request, res: Response) {
    const { id } = req.params;
    const { completion_note, completion_outcome, completion_rationale } = req.body;
    const { company_id, user_id } = (req as any).user;

    try {
      // 1. Validation
      if (!completion_outcome || !completion_rationale) {
        return res.status(400).json({ success: false, message: 'Outcome and Rationale are mandatory for action completion.' });
      }

      if (completion_rationale.length < 10) {
        return res.status(400).json({ success: false, message: 'Completion rationale must be at least 10 characters.' });
      }

      const allowedOutcomes = ['No change', 'Partial improvement', 'Risk reduced', 'Risk escalated'];
      if (!allowedOutcomes.includes(completion_outcome)) {
        return res.status(400).json({ success: false, message: 'Invalid completion outcome.' });
      }

      // 2. Check action status
      const action = await query('SELECT * FROM risk_actions WHERE id = $1 AND company_id = $2', [id, company_id]);
      if (action.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Action not found.' });
      }

      // Support Workers may complete ONLY work explicitly assigned to them. Team Leader /
      // Registered Manager behaviour is unchanged.
      const activeRole = String((req as any).user?.role || '').toUpperCase().replace(/-/g, '_');
      if (activeRole === 'SUPPORT_WORKER' && action.rows[0].assigned_to !== user_id) {
        return res.status(403).json({ success: false, message: 'You can only complete actions assigned to you.' });
      }

      if (action.rows[0].status === 'Completed') {
        return res.status(400).json({ success: false, message: 'Action is already completed.' });
      }

      // 3. Persist the completion directly — this works whether or not the action is linked
      // to a risk. Governance-decision actions (Create Action from a signal/pattern) carry NO
      // risk_id, so the risk trajectory/event side-effects below must be skipped for them,
      // otherwise addEvent(null,…) violates risk_events.risk_id and the whole completion fails.
      const riskId = action.rows[0].risk_id || null;
      const completedRes = await query(
        `UPDATE risk_actions
         SET status = 'Completed', completion_note = $1, completion_outcome = $2, completion_rationale = $3, completed_at = NOW(), completed_by = $6
         WHERE id = $4 AND company_id = $5 RETURNING *`,
        [completion_note || null, completion_outcome, completion_rationale, id, company_id, user_id]
      );
      let completedAction = completedRes.rows[0];

      // Risk-linked actions also update the risk trajectory + write a lineage event.
      if (riskId) {
        try {
          const updated = await risksService.updateActionStatus(id, riskId, company_id, user_id, 'Completed');
          completedAction = completedAction || updated;
        } catch (e) { logger.warn('Risk side-effects on action completion failed (non-fatal):', e); }
      }

      // 4. Notification to RM (the one who assigned it)
      const manager_id = action.rows[0].created_by; // The assigner (usually RM)

      if (manager_id) {
        await notificationsService.create({
          company_id,
          user_id: manager_id,
          type: 'action_completed',
          title: 'Action completed — review & rate effectiveness',
          body: `"${action.rows[0].title || action.rows[0].description}" was completed (${completion_outcome}). Open the risk to rate its effectiveness and impact, then close it.`,
          // Open the risk record (correct route is /risk-register/:id) where effectiveness + impact
          // are rated and the risk is closed. Risk-less actions go to the Action Effectiveness page.
          link: riskId ? `/risk-register/${riskId}` : '/effectiveness',
          metadata: { action_id: id, risk_id: riskId }
        });
      }

      res.json({ success: true, data: completedAction });
    } catch (err: any) {
      logger.error('Error completing action', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async rmReview(req: Request, res: Response) {
    const { id } = req.params;
    const { rm_decision, rm_comment } = req.body;
    const { company_id, user_id } = (req as any).user;

    // Doctrine: this is a COMPLETION review, not an effectiveness judgement. The RM either accepts
    // the completed work or returns it for rework. It must NOT set effectiveness or move trajectory —
    // effectiveness is a separate, later, human-reviewed stage. Where effectiveness is warranted the
    // RM schedules it (effectiveness_due_at); the effectiveness verdict is recorded elsewhere.
    const { effectiveness_due_at } = req.body;
    try {
      const allowedDecisions = ['Accept Completion', 'Return for Rework'];
      if (!allowedDecisions.includes(rm_decision)) {
        return res.status(400).json({ success: false, message: 'Choose Accept Completion or Return for Rework.' });
      }

      const actionRes = await query('SELECT * FROM risk_actions WHERE id = $1 AND company_id = $2', [id, company_id]);
      if (actionRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Action not found.' });
      }

      const action = actionRes.rows[0];
      if (action.status !== 'Completed') {
        return res.status(400).json({ success: false, message: 'Action must be completed before it can be reviewed.' });
      }

      const link = action.risk_id ? `/risk-register/${action.risk_id}` : '/my-actions';

      if (rm_decision === 'Return for Rework') {
        // Send it back: reopen the action and clear the completion so the assignee re-does and
        // re-records it. Nothing about effectiveness or trajectory is touched.
        await query(
          `UPDATE risk_actions
              SET status = 'In Progress', completed_at = NULL, completion_outcome = NULL,
                  completion_rationale = NULL, rm_decision = $1, rm_decision_comment = $2, rm_decision_at = NOW()
            WHERE id = $3 AND company_id = $4`,
          [rm_decision, rm_comment || null, id, company_id]
        );
        if (action.assigned_to) {
          await notificationsService.create({
            company_id, user_id: action.assigned_to, type: 'action_returned',
            title: 'Action returned for rework',
            body: `Your completed action "${action.title || action.description}" was returned by the RM${rm_comment ? `: ${rm_comment}` : '.'} Please action and re-submit it.`,
            link: '/my-actions', metadata: { action_id: id, risk_id: action.risk_id, decision: rm_decision },
          });
        }
        return res.json({ success: true, message: 'Action returned for rework.', data: { status: 'In Progress' } });
      }

      // Accept Completion — record acceptance only. Optionally schedule an effectiveness review
      // (a future date) where the action was intended to change/control a concern.
      const schedule = effectiveness_due_at ? new Date(effectiveness_due_at) : null;
      await query(
        `UPDATE risk_actions
            SET rm_decision = $1, rm_decision_comment = $2, rm_decision_at = NOW(),
                effectiveness_due_at = COALESCE($3, effectiveness_due_at)
          WHERE id = $4 AND company_id = $5`,
        [rm_decision, rm_comment || null, schedule, id, company_id]
      );

      if (action.assigned_to) {
        await notificationsService.create({
          company_id, user_id: action.assigned_to, type: 'action_accepted',
          title: 'Action completion accepted',
          body: `The RM accepted your completed action "${action.title || action.description}".${schedule ? ` An effectiveness review is scheduled for ${schedule.toLocaleDateString('en-GB')}.` : ''}`,
          link, metadata: { action_id: id, risk_id: action.risk_id, decision: rm_decision },
        });
      }

      return res.json({ success: true, message: schedule ? 'Completion accepted; effectiveness review scheduled.' : 'Completion accepted.', data: { effectiveness_due_at: schedule } });
    } catch (err: any) {
      logger.error('Error in RM action review', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
  // Remind the person an action is assigned to — creates a notification for them (RM chases work
  // from the Daily Oversight board). Does not change the action; it is a nudge only.
  async remind(req: Request, res: Response) {
    const { company_id, user_id } = (req as any).user;
    const { id } = req.params;
    try {
      const r = await query(
        `SELECT ra.id, ra.title, ra.description, ra.assigned_to, ra.due_date, r.title AS risk_title
           FROM risk_actions ra LEFT JOIN risks r ON r.id = ra.risk_id
          WHERE ra.id = $1 AND ra.company_id = $2`,
        [id, company_id]
      );
      const action = r.rows[0];
      if (!action) return res.status(404).json({ success: false, message: 'Action not found', errors: [] });
      if (!action.assigned_to) return res.status(400).json({ success: false, message: 'This action has no assignee to remind.', errors: [] });
      await notificationsService.create({
        company_id,
        user_id: action.assigned_to,
        type: 'action_reminder',
        title: 'Reminder: action needs attention',
        body: `${action.title || action.description || 'An action'}${action.due_date ? ` · due ${new Date(action.due_date).toLocaleDateString('en-GB')}` : ''}`,
        link: '/my-actions',
        metadata: { action_id: id, reminded_by: user_id },
      });
      return res.json({ success: true, message: 'Reminder sent.' });
    } catch (err: any) {
      logger.error('Error reminding action assignee', err);
      return res.status(500).json({ success: false, message: err.message });
    }
  }

  async getMyActions(req: Request, res: Response) {
    const { company_id, user_id } = (req as any).user;
    try {
      const actions = await query(
        `SELECT ra.*, r.title as risk_title, u.first_name || ' ' || u.last_name as assigned_by_name,
                -- The originating signal (for Daily Governance actions that carry no risk) so the
                -- assignee can open what the action relates to.
                p.description AS signal_label, p.related_person AS signal_person
         FROM risk_actions ra
         LEFT JOIN risks r ON ra.risk_id = r.id
         LEFT JOIN users u ON ra.created_by = u.id
         LEFT JOIN governance_pulses p ON p.id = ra.source_pulse_id
         WHERE ra.company_id = $1 AND ra.assigned_to = $2
         ORDER BY ra.due_date ASC`,
        [company_id, user_id]
      );
      res.json({ success: true, data: actions.rows });
    } catch (err: any) {
      logger.error('Error fetching my actions', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  // Service-scoped oversight: ALL open actions across the RM/Director's house(s),
  // regardless of assignee — so the RM dashboard's "Actions Due" agrees with the risk
  // register (which counts open actions per risk, not per person). This is the correct
  // lens for the oversight role; /actions/my stays as the Team Leader's personal queue.
  async getOversightActions(req: Request, res: Response) {
    const u = (req as any).user;
    try {
      const role = String(u.role || '').toUpperCase();
      const scoped = ['REGISTERED_MANAGER', 'TEAM_LEADER'].includes(role);
      const params: any[] = [u.company_id];
      let houseClause = '';
      if (scoped) {
        const houseIds = (u.assigned_house_ids || []);
        params.push(houseIds.length ? houseIds : ['00000000-0000-0000-0000-000000000000']);
        houseClause = ` AND r.house_id = ANY($${params.length}::uuid[])`;
      }
      const actions = await query(
        `SELECT ra.*, r.title AS risk_title, r.house_id,
                au.first_name || ' ' || au.last_name AS assigned_to_name,
                cb.first_name || ' ' || cb.last_name AS assigned_by_name,
                h.name AS house_name
           FROM risk_actions ra
           JOIN risks r ON r.id = ra.risk_id
           LEFT JOIN users au ON au.id = ra.assigned_to
           LEFT JOIN users cb ON cb.id = ra.created_by
           LEFT JOIN houses h ON h.id = r.house_id
          WHERE ra.company_id = $1
            AND ra.status NOT IN ('Complete', 'Completed', 'Cancelled')${houseClause}
          ORDER BY ra.due_date ASC NULLS LAST`,
        params
      );
      res.json({ success: true, data: actions.rows });
    } catch (err: any) {
      logger.error('Error fetching oversight actions', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
}

export const actionsController = new ActionsController();
