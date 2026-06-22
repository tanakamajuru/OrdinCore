import { Router } from 'express';
import { governanceConfigController as c } from '../controllers/governanceConfig.controller';
import { requireAuth } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';
import { requireRole } from '../middleware/role.middleware';

// Admin Governance Configuration. These config tables are global per sector, so reads
// are open to ADMIN+SUPER_ADMIN but writes are SUPER_ADMIN-only.
const router = Router();
const view = [requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN')];
const edit = [requireAuth, requireTenant, requireRole('SUPER_ADMIN')];

// Risk Domains
router.get('/domains', ...view, c.listDomains);
router.post('/domains', ...edit, c.createDomain);
router.patch('/domains/:id', ...edit, c.updateDomain);

// Signal Library
router.get('/signals', ...view, c.listSignals);
router.post('/signals', ...edit, c.createSignal);
router.patch('/signals/:id', ...edit, c.updateSignal);

// Pattern Thresholds (drives the clustering engine)
router.get('/thresholds', ...view, c.listThresholds);
router.patch('/thresholds/:id', ...edit, c.updateThreshold);

// Escalation SLAs
router.get('/slas', ...view, c.listSLAs);
router.patch('/slas/:trigger', ...edit, c.updateSLA);

// Audit Log (read-only, tenant-scoped)
router.get('/audit', ...view, c.listAudit);

// Action Templates + Review Cycles are tenant-owned, so ADMIN may write them too.
const tenantEdit = [requireAuth, requireTenant, requireRole('ADMIN', 'SUPER_ADMIN')];
// RMs read action templates when creating an action, so this GET is broader.
const tenantRead = [requireAuth, requireTenant, requireRole('REGISTERED_MANAGER', 'DIRECTOR', 'RESPONSIBLE_INDIVIDUAL', 'ADMIN', 'SUPER_ADMIN')];
router.get('/action-templates', ...tenantRead, c.listActionTemplates);
router.post('/action-templates', ...tenantEdit, c.createActionTemplate);
router.patch('/action-templates/:id', ...tenantEdit, c.updateActionTemplate);
router.delete('/action-templates/:id', ...tenantEdit, c.deleteActionTemplate);

router.get('/review-cycles', ...view, c.listReviewCycles);
router.post('/review-cycles', ...tenantEdit, c.createReviewCycle);
router.patch('/review-cycles/:id', ...tenantEdit, c.updateReviewCycle);
router.delete('/review-cycles/:id', ...tenantEdit, c.deleteReviewCycle);

export default router;
