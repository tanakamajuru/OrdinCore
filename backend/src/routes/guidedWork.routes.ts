import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { guidedWorkService } from '../services/guidedWork.service';

const router = Router();

router.get('/', requireAuth, requireTenant, async (req, res) => {
  try {
    const data = await guidedWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role);
    return res.json({ success:true, data, meta:{ read_model:true, writes:false } });
  } catch (err:any) {
    return res.status(500).json({ success:false, message:err?.message || 'Failed to load guided work', errors:[] });
  }
});

router.get('/next', requireAuth, requireTenant, async (req, res) => {
  try {
    // Re-project from canonical state first. Do not make a task disappear merely because
    // the client supplied its id as `exclude`; canonical completion must remove it.
    const currentId = String(req.query.current || '');
    const data = await guidedWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role);
    const currentTask = currentId ? data.needsYou.find((item:any) => item.id === currentId) : null;
    const currentStillNeedsWork = !!currentTask;
    if (currentStillNeedsWork) {
      return res.status(409).json({
        success:false,
        message:`${currentTask.requiredAction || currentTask.taskType || 'Governance work'} still requires completion.`,
        data:{
          next:null, counts:data.counts, currentStillNeedsWork:true,
          current:{
            workItemId:currentTask.id, obligationId:currentTask.obligationId || null,
            subjectType:currentTask.canonicalEntityType, subjectId:currentTask.canonicalEntityId,
            requiredAction:currentTask.requiredAction || currentTask.taskType,
            completionCondition:currentTask.completionCondition || null,
            reason:currentTask.whyAmISeeingThis || currentTask.reason,
            exactRoute:currentTask.route
          }
        },
        meta:{ read_model:true, writes:false, canonical_reprojection:true }
      });
    }
    return res.json({ success:true, data:{ next:data.next, counts:data.counts, currentStillNeedsWork:false }, meta:{ read_model:true, writes:false, canonical_reprojection:true } });
  } catch (err:any) {
    return res.status(500).json({ success:false, message:err?.message || 'Failed to load next task', errors:[] });
  }
});

export default router;
