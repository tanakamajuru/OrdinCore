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

export default router;
