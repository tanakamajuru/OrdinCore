import { test, expect } from '@playwright/test';
import { TestUsers, UITestUsers } from './auth.setup';
import { SAMPLE_INCIDENTS, TEST_SERVICES } from './fixtures/testData';

test.describe('Responsible Individual – Statutory Oversight & Compliance', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Responsible Individual
    await UITestUsers.responsibleIndividual(page);
  });

  test('should access RI dashboard and see statutory oversight sections', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/dashboard`);
    
    // Verify RI dashboard loads
    await expect(page.locator('[data-testid="ri-dashboard"], .ri-dashboard')).toBeVisible();
    
    // Check for key oversight sections
    await expect(page.locator('[data-testid="statutory-oversight"], .statutory-oversight')).toBeVisible();
    await expect(page.locator('[data-testid="incident-review"], .incident-review')).toBeVisible();
    await expect(page.locator('[data-testid="compliance-monitoring"], .compliance-monitoring')).toBeVisible();
  });

  test('should review and acknowledge critical incidents', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/incidents`);
    
    // Wait for incidents list to load
    await expect(page.locator('[data-testid="incidents-list"], .incidents-container')).toBeVisible();
    
    // Look for incidents awaiting RI acknowledgment
    const pendingIncidents = page.locator('[data-testid="incident-pending-ri"], .incident-status-pending');
    
    if (await pendingIncidents.first().isVisible()) {
      await pendingIncidents.first().click();
      
      // Incident detail should open
      await expect(page.locator('[data-testid="incident-detail"], .incident-detail-modal')).toBeVisible();
      
      // Verify incident details
      await expect(page.locator('[data-testid="incident-title"], .incident-title')).toBeVisible();
      await expect(page.locator('[data-testid="incident-severity"], .incident-severity')).toBeVisible();
      await expect(page.locator('[data-testid="incident-description"], .incident-description')).toBeVisible();
      
      // Check for safeguarding concerns
      const safeguardingAlert = page.locator('[data-testid="safeguarding-alert"], .safeguarding-warning');
      if (await safeguardingAlert.isVisible()) {
        await expect(safeguardingAlert).toBeVisible();
      }
      
      // Acknowledge incident
      await page.click('[data-testid="acknowledge-incident"], button:has-text("Acknowledge")');
      
      // Fill acknowledgment details
      await page.fill('[data-testid="acknowledgment-text"], textarea[name="acknowledgment_text"]', 'Incident reviewed. Safeguarding referral submitted. RI satisfied with initial response.');
      
      // Add statutory reference
      await page.fill('[data-testid="statutory-reference"], input[name="statutory_body_reference"]', 'CQC-2026-123');
      
      // Submit acknowledgment
      await page.click('[data-testid="submit-acknowledgment"], button[type="submit"]');
      
      // Verify acknowledgment
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("acknowledged")')).toBeVisible();
      
      // Check incident moves out of pending queue
      await page.goBack();
      await page.reload();
      
      const remainingPending = page.locator('[data-testid="incident-pending-ri"], .incident-status-pending');
      const remainingCount = await remainingPending.count();
      expect(remainingCount).toBeLessThan(await pendingIncidents.count());
    }
  });

  test('should review safeguarding referrals', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/safeguarding`);
    
    // Look for safeguarding referrals section
    await expect(page.locator('[data-testid="safeguarding-referrals"], .safeguarding-container')).toBeVisible();
    
    // Check for referrals awaiting review
    const referralItems = page.locator('[data-testid="referral-item"], .referral-card');
    const referralCount = await referralItems.count();
    
    if (referralCount > 0) {
      await expect(referralItems.first()).toBeVisible();
      
      // Click on referral to review
      await referralItems.first().click();
      
      // Referral detail should open
      await expect(page.locator('[data-testid="referral-detail"], .referral-detail-modal')).toBeVisible();
      
      // Check referral information
      await expect(page.locator('[data-testid="referral-type"], .referral-type')).toBeVisible();
      await expect(page.locator('[data-testid="referral-date"], .referral-date')).toBeVisible();
      await expect(page.locator('[data-testid="referral-status"], .referral-status')).toBeVisible();
      
      // Add RI response
      await page.click('[data-testid="add-response"], button:has-text("Add Response")');
      
      await page.fill('[data-testid="response-text"], textarea[name="response_text"]', 'Referral reviewed. Appropriate actions taken. Will monitor for follow-up requirements.');
      
      // Submit response
      await page.click('[data-testid="submit-response"], button[type="submit"]');
      
      // Verify response added
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("response added")')).toBeVisible();
    }
  });

  test('should monitor compliance metrics and KPIs', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/compliance`);
    
    // Check compliance dashboard
    await expect(page.locator('[data-testid="compliance-dashboard"], .compliance-container')).toBeVisible();
    
    // Look for key compliance metrics
    await expect(page.locator('[data-testid="incident-response-times"], .response-times')).toBeVisible();
    await expect(page.locator('[data-testid="regulatory-compliance"], .regulatory-compliance')).toBeVisible();
    await expect(page.locator('[data-testid="audit-trail"], .audit-trail')).toBeVisible();
    
    // Check for compliance alerts
    const complianceAlerts = page.locator('[data-testid="compliance-alert"], .compliance-warning');
    const alertCount = await complianceAlerts.count();
    
    if (alertCount > 0) {
      await expect(complianceAlerts.first()).toBeVisible();
      
      // Click on alert to view details
      await complianceAlerts.first().click();
      
      // Alert detail should show remediation requirements
      await expect(page.locator('[data-testid="alert-detail"], .alert-detail-modal')).toBeVisible();
      await expect(page.locator('[data-testid="remediation-actions"], .remediation-actions')).toBeVisible();
    }
  });

  test('should review and approve risk assessments', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/risk-assessments`);
    
    // Look for risk assessments awaiting RI approval
    await expect(page.locator('[data-testid="risk-assessments"], .risk-assessments-container')).toBeVisible();
    
    const pendingAssessments = page.locator('[data-testid="assessment-pending"], .assessment-status-pending');
    const assessmentCount = await pendingAssessments.count();
    
    if (assessmentCount > 0) {
      await pendingAssessments.first().click();
      
      // Risk assessment detail should open
      await expect(page.locator('[data-testid="assessment-detail"], .assessment-detail-modal')).toBeVisible();
      
      // Review assessment components
      await expect(page.locator('[data-testid="risk-analysis"], .risk-analysis')).toBeVisible();
      await expect(page.locator('[data-testid="mitigation-strategies"], .mitigation-strategies')).toBeVisible();
      await expect(page.locator('[data-testid="impact-assessment"], .impact-assessment')).toBeVisible();
      
      // Approve or request changes
      await page.click('[data-testid="approve-assessment"], button:has-text("Approve")');
      
      // Add approval comments
      await page.fill('[data-testid="approval-comments"], textarea[name="comments"]', 'Risk assessment reviewed and approved. Mitigation strategies are appropriate.');
      
      // Submit approval
      await page.click('[data-testid="submit-approval"], button[type="submit"]');
      
      // Verify approval
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("approved")')).toBeVisible();
    }
  });

  test('should conduct statutory audits', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/audits`);
    
    // Look for audit section
    await expect(page.locator('[data-testid="audit-section"], .audit-container')).toBeVisible();
    
    // Start new audit if available
    const startAuditBtn = page.locator('[data-testid="start-audit"], button:has-text("Start Audit")');
    if (await startAuditBtn.isVisible()) {
      await startAuditBtn.click();
      
      // Select audit type
      await page.selectOption('[data-testid="audit-type"], select[name="audit_type"]', 'Quarterly Compliance');
      
      // Select service to audit
      await page.selectOption('[data-testid="service-select"], select[name="service_id"]', {
        label: TEST_SERVICES.ROSE_HOUSE.name
      });
      
      // Start audit
      await page.click('[data-testid="begin-audit"], button:has-text("Begin")');
      
      // Audit checklist should appear
      await expect(page.locator('[data-testid="audit-checklist"], .audit-checklist')).toBeVisible();
      
      // Complete audit items
      const auditItems = page.locator('[data-testid="audit-item"], .checklist-item');
      const itemCount = await auditItems.count();
      
      for (let i = 0; i < Math.min(itemCount, 3); i++) {
        const item = auditItems.nth(i);
        await item.click();
        
        // Select compliance status
        await page.selectOption('[data-testid="compliance-status"], select[name="status"]', 'Compliant');
        
        // Add notes
        await page.fill('[data-testid="audit-notes"], textarea[name="notes"]', `Audit item ${i + 1} reviewed - compliant`);
        
        // Save item
        await page.click('[data-testid="save-item"], button:has-text("Save")');
        
        await page.waitForTimeout(1000);
      }
      
      // Submit audit
      await page.click('[data-testid="submit-audit"], button:has-text("Submit Audit")');
      
      // Verify audit submission
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("submitted")')).toBeVisible();
    }
  });

  test('should review director alerts and interventions', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/director-alerts`);
    
    // Look for director alerts section
    await expect(page.locator('[data-testid="director-alerts"], .director-alerts-container')).toBeVisible();
    
    // Check for active alerts
    const alertItems = page.locator('[data-testid="director-alert-item"], .director-alert-card');
    const alertCount = await alertItems.count();
    
    if (alertCount > 0) {
      await expect(alertItems.first()).toBeVisible();
      
      // Click on alert to review
      await alertItems.first().click();
      
      // Alert detail should show intervention requirements
      await expect(page.locator('[data-testid="alert-detail"], .alert-detail-modal')).toBeVisible();
      await expect(page.locator('[data-testid="intervention-required"], .intervention-required')).toBeVisible();
      
      // Add RI response to director alert
      await page.click('[data-testid="respond-to-alert"], button:has-text("Respond")');
      
      await page.fill('[data-testid="response-text"], textarea[name="response_text"]', 'Director alert reviewed. Immediate action being taken. Will provide follow-up report within 48 hours.');
      
      // Submit response
      await page.click('[data-testid="submit-response"], button[type="submit"]');
      
      // Verify response
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("response submitted")')).toBeVisible();
    }
  });

  test('should generate statutory reports', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/reports`);
    
    // Look for reports section
    await expect(page.locator('[data-testid="reports-section"], .reports-container')).toBeVisible();
    
    // Generate statutory report
    await page.click('[data-testid="generate-statutory-report"], button:has-text("Generate Statutory Report")');
    
    // Select report type
    await page.selectOption('[data-testid="report-type"], select[name="report_type"]', 'CQC Quarterly Return');
    
    // Select reporting period
    await page.fill('[data-testid="report-period"], input[name="period"]', '2026-Q2');
    
    // Generate report
    await page.click('[data-testid="generate"], button:has-text("Generate")');
    
    // Wait for report generation
    await page.waitForTimeout(3000);
    
    // Verify report is available for download
    await expect(page.locator('[data-testid="report-download"], .download-button')).toBeVisible();
    
    // Download report
    await page.click('[data-testid="report-download"], .download-button');
    
    // Verify download started (check for download confirmation)
    const downloadConfirm = page.locator('[data-testid="download-started"], .download-confirmation');
    if (await downloadConfirm.isVisible()) {
      await expect(downloadConfirm).toBeVisible();
    }
  });

  test('should monitor regulatory body communications', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/regulatory-comms`);
    
    // Look for regulatory communications section
    await expect(page.locator('[data-testid="regulatory-communications"], .regulatory-comms-container')).toBeVisible();
    
    // Check for communications from regulatory bodies
    const communicationItems = page.locator('[data-testid="communication-item"], .communication-card');
    const commCount = await communicationItems.count();
    
    if (commCount > 0) {
      await expect(communicationItems.first()).toBeVisible();
      
      // Click on communication to review
      await communicationItems.first().click();
      
      // Communication detail should open
      await expect(page.locator('[data-testid="communication-detail"], .communication-detail-modal')).toBeVisible();
      
      // Check for required actions
      const requiredActions = page.locator('[data-testid="required-actions"], .communication-actions');
      if (await requiredActions.isVisible()) {
        await expect(requiredActions).toBeVisible();
        
        // Mark as reviewed
        await page.click('[data-testid="mark-reviewed"], button:has-text("Mark Reviewed")');
        
        // Verify review
        await expect(page.locator('[data-testid="success-toast"], .toast:has-text("reviewed")')).toBeVisible();
      }
    }
  });

  test('should review service-wide performance metrics', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/performance`);
    
    // Check performance dashboard
    await expect(page.locator('[data-testid="performance-dashboard"], .performance-container')).toBeVisible();
    
    // Look for key performance indicators
    await expect(page.locator('[data-testid="kpi-metrics"], .kpi-metrics')).toBeVisible();
    await expect(page.locator('[data-testid="trend-analysis"], .trend-analysis')).toBeVisible();
    await expect(page.locator('[data-testid="benchmarking"], .benchmarking')).toBeVisible();
    
    // Test period filtering
    const periodFilter = page.locator('[data-testid="period-filter"], .period-selector');
    if (await periodFilter.isVisible()) {
      await periodFilter.click();
      
      // Select quarterly view
      await page.click('[data-testid="quarterly-view"], button:has-text("Quarterly")');
      
      // Apply filter
      await page.click('[data-testid="apply-period"], button:has-text("Apply")');
      
      // Wait for data to refresh
      await page.waitForTimeout(2000);
    }
    
    // Check for performance alerts
    const performanceAlerts = page.locator('[data-testid="performance-alert"], .performance-warning');
    if (await performanceAlerts.first().isVisible()) {
      await expect(performanceAlerts.first()).toBeVisible();
    }
  });

  test('should manage emergency protocols and crisis response', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/ri/emergency-protocols`);
    
    // Look for emergency protocols section
    await expect(page.locator('[data-testid="emergency-protocols"], .emergency-container')).toBeVisible();
    
    // Check for active emergency situations
    const activeEmergencies = page.locator('[data-testid="active-emergency"], .emergency-status-active');
    const emergencyCount = await activeEmergencies.count();
    
    if (emergencyCount > 0) {
      await activeEmergencies.first().click();
      
      // Emergency detail should open
      await expect(page.locator('[data-testid="emergency-detail"], .emergency-detail-modal')).toBeVisible();
      
      // Check crisis response requirements
      await expect(page.locator('[data-testid="crisis-response"], .crisis-response')).toBeVisible();
      
      // Add RI intervention
      await page.click('[data-testid="add-intervention"], button:has-text("Add Intervention")');
      
      await page.fill('[data-testid="intervention-text"], textarea[name="intervention_text"]', 'Emergency situation reviewed. Immediate RI intervention implemented. Crisis team activated.');
      
      // Submit intervention
      await page.click('[data-testid="submit-intervention"], button[type="submit"]');
      
      // Verify intervention
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("intervention added")')).toBeVisible();
    }
    
    // Review emergency protocols
    const protocolItems = page.locator('[data-testid="protocol-item"], .protocol-card');
    const protocolCount = await protocolItems.count();
    
    if (protocolCount > 0) {
      await protocolItems.first().click();
      
      // Protocol detail should show last review date
      await expect(page.locator('[data-testid="protocol-detail"], .protocol-detail-modal')).toBeVisible();
      await expect(page.locator('[data-testid="last-review"], .last-review-date')).toBeVisible();
      
      // Update protocol if needed
      const updateBtn = page.locator('[data-testid="update-protocol"], button:has-text("Update")');
      if (await updateBtn.isVisible()) {
        await updateBtn.click();
        
        await page.fill('[data-testid="protocol-notes"], textarea[name="notes"]', 'Protocol reviewed and updated with latest regulatory requirements.');
        
        await page.click('[data-testid="save-protocol"], button:has-text("Save")');
        
        await expect(page.locator('[data-testid="success-toast"], .toast:has-text("updated")')).toBeVisible();
      }
    }
  });
});
