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

      if (action.rows[0].status === 'Completed') {
        return res.status(400).json({ success: false, message: 'Action is already completed.' });
      }

      // 3. Update action
      const updated = await risksService.updateActionStatus(id, action.rows[0].risk_id, company_id, user_id, 'Completed');
      
      await query(
        `UPDATE risk_actions 
         SET completion_note = $1, completion_outcome = $2, completion_rationale = $3, completed_at = NOW()
         WHERE id = $4 AND company_id = $5`,
        [completion_note || null, completion_outcome, completion_rationale, id, company_id]
      );

      // 4. Notification to RM (the one who assigned it)
      const manager_id = action.rows[0].created_by; // The assigner (usually RM)

      if (manager_id) {
        await notificationsService.create({
          company_id,
          user_id: manager_id,
          type: 'action_completed',
          title: 'Action Completed',
          body: `Action "${action.rows[0].title || action.rows[0].description}" completed by TL. Please review outcome.`,
          link: `/risks/${action.rows[0].risk_id}`,
          metadata: { action_id: id, risk_id: action.rows[0].risk_id }
        });
      }

      res.json({ success: true, data: updated });
    } catch (err: any) {
      logger.error('Error completing action', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }

  async rmReview(req: Request, res: Response) {
    const { id } = req.params;
    const { rm_decision, rm_comment } = req.body;
    const { company_id, user_id } = (req as any).user;

    try {
      // 1. Validation
      const allowedDecisions = ['Confirm improvement', 'No impact', 'Negative impact'];
      if (!allowedDecisions.includes(rm_decision)) {
        return res.status(400).json({ success: false, message: 'Invalid RM decision.' });
      }

      const actionRes = await query('SELECT * FROM risk_actions WHERE id = $1 AND company_id = $2', [id, company_id]);
      if (actionRes.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Action not found.' });
      }

      const action = actionRes.rows[0];
      if (action.status !== 'Completed') {
        return res.status(400).json({ success: false, message: 'Action must be completed before RM review.' });
      }

      if (action.rm_decision) {
        return res.status(400).json({ success: false, message: 'Action already reviewed by RM.' });
      }

      // 2. Update action with RM decision
      let effectiveness = 'Neutral';
      if (rm_decision === 'Confirm improvement') {
        effectiveness = 'Effective';
      } else if (rm_decision === 'Negative impact') {
        effectiveness = 'Ineffective';
      }

      await query(
        `UPDATE risk_actions 
         SET rm_decision = $1, rm_decision_comment = $2, rm_decision_at = NOW(), 
             effectiveness = $3, calculated_outcome = $3
         WHERE id = $4 AND company_id = $5`,
        [rm_decision, rm_comment || null, effectiveness, id, company_id]
      );

      // 3. Update Risk Trajectory
      const riskRes = await query('SELECT trajectory FROM risks WHERE id = $1', [action.risk_id]);
      const currentTrajectory = riskRes.rows[0].trajectory;
      let newTrajectory = currentTrajectory;

      if (rm_decision === 'Confirm improvement') {
        newTrajectory = 'Improving';
      } else if (rm_decision === 'Negative impact') {
        newTrajectory = (currentTrajectory === 'Deteriorating' || currentTrajectory === 'Critical') ? 'Critical' : 'Deteriorating';
      }

      if (newTrajectory !== currentTrajectory) {
        await risksService.update(action.risk_id, company_id, user_id, { trajectory: newTrajectory });
        await risksService.addEvent(action.risk_id, company_id, user_id, {
          event_type: 'trajectory_update',
          description: `Trajectory updated to ${newTrajectory} based on RM review of action "${action.title || action.description}"`
        });
      }

      // 4. Notification to TL (the one who was assigned and completed it)
      await notificationsService.create({
        company_id,
        user_id: action.assigned_to, 
        type: 'action_rm_reviewed',
        title: 'Action Reviewed',
        body: `RM reviewed your action: ${rm_decision}. Risk trajectory: ${newTrajectory}.`,
        link: `/risks/${action.risk_id}`,
        metadata: { action_id: id, risk_id: action.risk_id, decision: rm_decision }
      });

      res.json({ success: true, message: 'RM review recorded and trajectory updated.' });
    } catch (err: any) {
      logger.error('Error in RM action review', err);
      res.status(500).json({ success: false, message: err.message });
    }
  }
  async getMyActions(req: Request, res: Response) {
    const { company_id, user_id } = (req as any).user;
    try {
      const actions = await query(
        `SELECT ra.*, r.title as risk_title, u.first_name || ' ' || u.last_name as assigned_by_name
         FROM risk_actions ra
         LEFT JOIN risks r ON ra.risk_id = r.id
         LEFT JOIN users u ON ra.created_by = u.id
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
}

export const actionsController = new ActionsController();
