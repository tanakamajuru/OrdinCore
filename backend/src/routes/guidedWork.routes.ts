import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { guidedWorkService } from '../services/guidedWork.service';

const router = Router();

router.get('/', requireAuth, requireTenant, async (req, res) => {
  try {
    const data = await guidedWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role, req.query.exclude as string | undefined);
    return res.json({ success:true, data, meta:{ read_model:true, writes:false } });
  } catch (err:any) {
    return res.status(500).json({ success:false, message:err?.message || 'Failed to load guided work', errors:[] });
  }
});

router.get('/next', requireAuth, requireTenant, async (req, res) => {
  try {
    // Re-project from canonical state first. Do not make a task disappear merely because
    // the client supplied its id as `exclude`; canonical completion must remove it.
    const currentId = String(req.query.current || req.query.exclude || '');
    const data = await guidedWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role);
    const currentStillNeedsWork = currentId ? data.needsYou.some((item:any) => item.id === currentId) : false;
    if (currentStillNeedsWork) {
      return res.status(409).json({ success:false, message:'Current governance task still requires completion.', data:{ next:null, counts:data.counts, currentStillNeedsWork:true }, meta:{ read_model:true, writes:false, canonical_reprojection:true } });
    }
    return res.json({ success:true, data:{ next:data.next, counts:data.counts, currentStillNeedsWork:false }, meta:{ read_model:true, writes:false, canonical_reprojection:true } });
  } catch (err:any) {
    return res.status(500).json({ success:false, message:err?.message || 'Failed to load next task', errors:[] });
  }
});

export default router;
