import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { canonicalEvidenceService } from '../services/canonicalEvidence.service';

const router=Router();

router.get('/counts/:countType',requireAuth,requireTenant,async(req,res)=>{
  try {
    const data=await canonicalEvidenceService.materialCount(req.user!.company_id!,String(req.params.countType||'').toUpperCase(),req.query.house_id as string|undefined);
    return res.json({success:true,data});
  } catch(e:any) { return res.status(500).json({success:false,message:e?.message||'Failed to load canonical evidence count'}); }
});

router.get('/risks/:riskId',requireAuth,requireTenant,async(req,res)=>{
  try {
    const data=await canonicalEvidenceService.riskEvidence(req.user!.company_id!,req.params.riskId);
    if(!data) return res.status(404).json({success:false,message:'Risk not found'});
    return res.json({success:true,data});
  } catch(e:any) { return res.status(500).json({success:false,message:e?.message||'Failed to load canonical risk evidence'}); }
});

export default router;
