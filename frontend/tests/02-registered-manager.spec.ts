import { test, expect } from '@playwright/test';
import { TestUsers, UITestUsers } from './auth.setup';
import { SAMPLE_ACTIONS, SAMPLE_RISKS, TEST_SERVICES } from './fixtures/testData';

test.describe('Registered Manager – Daily Oversight & Risk Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Registered Manager
    await UITestUsers.registeredManager(page);
  });

  test('should access RM dashboard and see oversight sections', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/dashboard`);
    
    // Verify RM dashboard loads
    await expect(page.locator('[data-testid="rm-dashboard"], .rm-dashboard')).toBeVisible();
    
    // Check for key oversight sections
    await expect(page.locator('[data-testid="daily-oversight"], .daily-oversight')).toBeVisible();
    await expect(page.locator('[data-testid="risk-register"], .risk-register')).toBeVisible();
    await expect(page.locator('[data-testid="actions-overview"], .actions-overview')).toBeVisible();
  });

  test('should triage high priority signals in daily oversight board', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/daily-oversight`);
    
    // Wait for oversight board to load
    await page.waitForSelector('[data-testid="oversight-board"], .oversight-container');
    
    // Look for high priority section
    const highPrioritySection = page.locator('[data-testid="section-high-priority"], .high-priority-section');
    
    if (await highPrioritySection.isVisible()) {
      // Should have unacknowledged signals
      const signalRows = page.locator('[data-testid="signal-row"], .signal-card');
      const signalCount = await signalRows.count();
      
      if (signalCount > 0) {
        await expect(signalRows.first()).toBeVisible();
        
        // Click first signal to review
        await signalRows.first().click();
        
        // Signal detail view should open
        await expect(page.locator('[data-testid="signal-detail"], .signal-detail-modal')).toBeVisible();
        
        // Confirm severity
        await page.click('[data-testid="confirm-severity"], button:has-text("Confirm")');
        
        // Assign action
        await page.click('[data-testid="assign-action"], button:has-text("Assign Action")');
        
        // Fill action details
        await page.fill('[data-testid="action-title"], input[name="title"]', SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.title);
        await page.fill('[data-testid="action-description"], textarea[name="description"]', SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.description);
        await page.fill('[data-testid="action-due-date"], input[name="due_date"]', SAMPLE_ACTIONS.BEHAVIOUR_PLAN_REVIEW.due_date);
        
        // Assign to Team Leader
        await page.selectOption('[data-testid="assign-to"], select[name="assigned_to"]', {
          label: 'Taylor Rose' // Team Leader
        });
        
        // Save action
        await page.click('[data-testid="save-action"], button:has-text("Save")');
        
        // Mark signal as reviewed
        await page.click('[data-testid="mark-reviewed"], button:has-text("Mark Reviewed")');
        
        // Verify signal moves out of queue
        await page.goBack(); // Go back to oversight board
        await page.reload(); // Refresh to see updated state
        
        const remainingSignals = page.locator('[data-testid="signal-row"], .signal-card');
        const remainingCount = await remainingSignals.count();
        expect(remainingCount).toBeLessThan(signalCount);
      }
    }
  });

  test('should view and manage risk register', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/risk-register`);
    
    // Wait for risk register to load
    await expect(page.locator('[data-testid="risk-register"], .risk-register-container')).toBeVisible();
    
    // Check for existing risks
    const riskItems = page.locator('[data-testid="risk-item"], .risk-card');
    const riskCount = await riskItems.count();
    
    if (riskCount > 0) {
      // Verify risk information is displayed
      await expect(riskItems.first()).toBeVisible();
      await expect(page.locator('[data-testid="risk-title"], .risk-title')).toBeVisible();
      await expect(page.locator('[data-testid="risk-severity"], .risk-severity')).toBeVisible();
      await expect(page.locator('[data-testid="risk-domain"], .risk-domain')).toBeVisible();
      
      // Click on first risk to view details
      await riskItems.first().click();
      
      // Risk detail view should open
      await expect(page.locator('[data-testid="risk-detail"], .risk-detail-modal')).toBeVisible();
      
      // Check for linked signals and actions
      const linkedSignals = page.locator('[data-testid="linked-signals"], .linked-signals');
      const linkedActions = page.locator('[data-testid="linked-actions"], .linked-actions');
      
      if (await linkedSignals.isVisible()) {
        await expect(linkedSignals).toBeVisible();
      }
      
      if (await linkedActions.isVisible()) {
        await expect(linkedActions).toBeVisible();
      }
    }
  });

  test('should create new risk from emerging pattern', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/patterns`);
    
    // Look for emerging patterns
    const emergingPatterns = page.locator('[data-testid="pattern-emerging"], .pattern-status-emerging');
    
    if (await emergingPatterns.first().isVisible()) {
      await emergingPatterns.first().click();
      
      // Pattern detail should show option to promote to risk
      await expect(page.locator('[data-testid="pattern-detail"], .pattern-detail-modal')).toBeVisible();
      
      await page.click('[data-testid="promote-to-risk"], button:has-text("Promote to Risk")');
      
      // Fill risk details
      await page.fill('[data-testid="risk-title"], input[name="title"]', SAMPLE_RISKS.ESCALATING_BEHAVIOUR.title);
      await page.fill('[data-testid="risk-description"], textarea[name="description"]', SAMPLE_RISKS.ESCALATING_BEHAVIOUR.description);
      await page.selectOption('[data-testid="risk-severity"], select[name="severity"]', SAMPLE_RISKS.ESCALATING_BEHAVIOUR.severity);
      
      // Save risk
      await page.click('[data-testid="create-risk"], button:has-text("Create Risk")');
      
      // Verify success
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("created")')).toBeVisible();
      
      // Check risk register for new risk
      await page.goto(`${process.env.BASE_URL}/rm/risk-register`);
      await page.reload();
      
      const newRisk = page.locator(`[data-testid="risk-item"]:has-text("${SAMPLE_RISKS.ESCALATING_BEHAVIOUR.title}")`);
      await expect(newRisk).toBeVisible();
    }
  });

  test('should assign and track actions', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/actions`);
    
    // Look for actions management section
    await expect(page.locator('[data-testid="actions-management"], .actions-container')).toBeVisible();
    
    // Create new action
    await page.click('[data-testid="create-action"], button:has-text("Create Action")');
    
    // Fill action form
    await page.fill('[data-testid="action-title"], input[name="title"]', SAMPLE_ACTIONS.MEDICATION_PROTOCOL_UPDATE.title);
    await page.fill('[data-testid="action-description"], textarea[name="description"]', SAMPLE_ACTIONS.MEDICATION_PROTOCOL_UPDATE.description);
    await page.fill('[data-testid="action-due-date"], input[name="due_date"]', SAMPLE_ACTIONS.MEDICATION_PROTOCOL_UPDATE.due_date);
    await page.selectOption('[data-testid="action-priority"], select[name="priority"]', SAMPLE_ACTIONS.MEDICATION_PROTOCOL_UPDATE.priority);
    
    // Assign to appropriate staff
    await page.selectOption('[data-testid="assign-to"], select[name="assigned_to"]', {
      label: 'Taylor Rose' // Team Leader
    });
    
    // Link to risk if applicable
    const riskSelect = page.locator('[data-testid="link-risk"], select[name="linked_risk_id"]');
    if (await riskSelect.isVisible()) {
      await riskSelect.selectOption({ index: 0 }); // Select first available risk
    }
    
    // Save action
    await page.click('[data-testid="save-action"], button:has-text("Save")');
    
    // Verify success
    await expect(page.locator('[data-testid="success-toast"], .toast:has-text("created")')).toBeVisible();
    
    // Check action appears in list
    await page.reload();
    const newAction = page.locator(`[data-testid="action-item"]:has-text("${SAMPLE_ACTIONS.MEDICATION_PROTOCOL_UPDATE.title}")`);
    await expect(newAction).toBeVisible();
  });

  test('should review and rate action effectiveness', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/actions`);
    
    // Look for completed actions awaiting effectiveness rating
    const completedActions = page.locator('[data-testid="action-completed"], [data-status="completed"]');
    
    if (await completedActions.first().isVisible()) {
      await completedActions.first().click();
      
      // Action detail should show effectiveness rating option
      await expect(page.locator('[data-testid="action-detail"], .action-detail-modal')).toBeVisible();
      
      await page.click('[data-testid="rate-effectiveness"], button:has-text("Rate Effectiveness")');
      
      // Select effectiveness rating
      await page.selectOption('[data-testid="effectiveness-rating"], select[name="effectiveness"]', 'Effective');
      
      // Add effectiveness notes
      await page.fill('[data-testid="effectiveness-notes"], textarea[name="effectiveness_notes"]', 'Action successfully resolved the issue');
      
      // Save rating
      await page.click('[data-testid="save-effectiveness"], button:has-text("Save")');
      
      // Verify success
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("rated")')).toBeVisible();
    }
  });

  test('should view service-wide analytics and reports', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/analytics`);
    
    // Check for analytics dashboard
    await expect(page.locator('[data-testid="analytics-dashboard"], .analytics-container')).toBeVisible();
    
    // Look for key metrics
    await expect(page.locator('[data-testid="signal-trends"], .signal-trends')).toBeVisible();
    await expect(page.locator('[data-testid="risk-metrics"], .risk-metrics')).toBeVisible();
    await expect(page.locator('[data-testid="action-completion"], .action-completion')).toBeVisible();
    
    // Test date range filter
    const dateRangeFilter = page.locator('[data-testid="date-range"], .date-filter');
    if (await dateRangeFilter.isVisible()) {
      await dateRangeFilter.click();
      
      // Select last 30 days
      await page.click('[data-testid="last-30-days"], button:has-text("Last 30 Days")');
      
      // Apply filter
      await page.click('[data-testid="apply-filter"], button:has-text("Apply")');
      
      // Wait for data to refresh
      await page.waitForTimeout(2000);
    }
  });

  test('should manage incidents and escalate to RI', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/incidents`);
    
    // Look for incidents list
    await expect(page.locator('[data-testid="incidents-list"], .incidents-container')).toBeVisible();
    
    // Create new incident if needed
    const createIncidentBtn = page.locator('[data-testid="create-incident"], button:has-text("Report Incident")');
    if (await createIncidentBtn.isVisible()) {
      await createIncidentBtn.click();
      
      // Fill incident form
      await page.fill('[data-testid="incident-title"], input[name="title"]', 'Critical behavioural incident');
      await page.selectOption('[data-testid="incident-severity"], select[name="severity"]', 'Critical');
      await page.selectOption('[data-testid="incident-type"], select[name="incident_type"]', 'Behaviour');
      await page.fill('[data-testid="incident-description"], textarea[name="description"]', 'Resident displayed aggressive behaviour requiring intervention');
      await page.fill('[data-testid="occurred-at"], input[name="occurred_at"]', '2026-04-30T10:00:00');
      
      // Save incident
      await page.click('[data-testid="save-incident"], button:has-text("Save")');
      
      // Verify success
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("created")')).toBeVisible();
    }
    
    // Look for critical incidents requiring escalation
    const criticalIncidents = page.locator('[data-testid="incident-critical"], .incident-severity-critical');
    
    if (await criticalIncidents.first().isVisible()) {
      await criticalIncidents.first().click();
      
      // Incident detail should show escalation option
      await expect(page.locator('[data-testid="incident-detail"], .incident-detail-modal')).toBeVisible();
      
      await page.click('[data-testid="escalate-to-ri"], button:has-text("Escalate to RI")');
      
      // Add escalation notes
      await page.fill('[data-testid="escalation-notes"], textarea[name="escalation_notes"]', 'Immediate RI attention required for safeguarding review');
      
      // Submit escalation
      await page.click('[data-testid="submit-escalation"], button:has-text("Escalate")');
      
      // Verify escalation
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("escalated")')).toBeVisible();
    }
  });

  test('should conduct staff oversight and performance review', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/staff`);
    
    // Look for staff oversight section
    await expect(page.locator('[data-testid="staff-oversight"], .staff-container')).toBeVisible();
    
    // Check staff performance metrics
    const staffMembers = page.locator('[data-testid="staff-member"], .staff-card');
    const staffCount = await staffMembers.count();
    
    if (staffCount > 0) {
      await expect(staffMembers.first()).toBeVisible();
      
      // Click on staff member to view details
      await staffMembers.first().click();
      
      // Staff detail should show performance metrics
      await expect(page.locator('[data-testid="staff-detail"], .staff-detail-modal')).toBeVisible();
      
      // Check for signal submission stats
      await expect(page.locator('[data-testid="signal-stats"], .signal-statistics')).toBeVisible();
      
      // Check for action completion stats
      await expect(page.locator('[data-testid="action-stats"], .action-statistics')).toBeVisible();
    }
  });

  test('should export reports for compliance', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/reports`);
    
    // Look for reports section
    await expect(page.locator('[data-testid="reports-section"], .reports-container')).toBeVisible();
    
    // Generate monthly report
    await page.click('[data-testid="generate-report"], button:has-text("Generate Report")');
    
    // Select report type
    await page.selectOption('[data-testid="report-type"], select[name="report_type"]', 'Monthly Compliance');
    
    // Select date range
    await page.fill('[data-testid="report-period"], input[name="period"]', '2026-04');
    
    // Generate report
    await page.click('[data-testid="submit-report"], button:has-text("Generate")');
    
    // Wait for report generation
    await page.waitForTimeout(3000);
    
    // Verify report is available
    await expect(page.locator('[data-testid="report-ready"], .report-download')).toBeVisible();
  });

  test('should handle control failures and director alerts', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/rm/control-failures`);
    
    // Look for control failures section
    await expect(page.locator('[data-testid="control-failures"], .control-failures-container')).toBeVisible();
    
    // Check for any control failures
    const failureItems = page.locator('[data-testid="failure-item"], .failure-card');
    const failureCount = await failureItems.count();
    
    if (failureCount > 0) {
      await expect(failureItems.first()).toBeVisible();
      
      // Click on failure to view details
      await failureItems.first().click();
      
      // Failure detail should show remediation options
      await expect(page.locator('[data-testid="failure-detail"], .failure-detail-modal')).toBeVisible();
      
      // Look for director alert if present
      const directorAlert = page.locator('[data-testid="director-alert"], .director-alert');
      if (await directorAlert.isVisible()) {
        await expect(directorAlert).toBeVisible();
        
        // Check for required actions
        await expect(page.locator('[data-testid="required-actions"], .required-actions')).toBeVisible();
      }
    }
  });
});
