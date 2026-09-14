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
    const data = await guidedWorkService.getForUser(req.user!.company_id!, req.user!.user_id, req.user!.role, req.query.exclude as string | undefined);
    return res.json({ success:true, data:{ next:data.next, counts:data.counts }, meta:{ read_model:true, writes:false } });
  } catch (err:any) {
    return res.status(500).json({ success:false, message:err?.message || 'Failed to load next task', errors:[] });
  }
});

export default router;
