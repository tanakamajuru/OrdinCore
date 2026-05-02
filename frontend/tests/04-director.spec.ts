import { test, expect } from '@playwright/test';
import { TestUsers, UITestUsers } from './auth.setup';
import { TEST_SERVICES } from './fixtures/testData';

test.describe('Director – Strategic Oversight & Control Failures', () => {
  test.beforeEach(async ({ page }) => {
    // Login as Director
    await UITestUsers.director(page);
  });

  test('should access Director dashboard and see strategic oversight sections', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/dashboard`);
    
    // Verify Director dashboard loads
    await expect(page.locator('[data-testid="director-dashboard"], .director-dashboard')).toBeVisible();
    
    // Check for key oversight sections
    await expect(page.locator('[data-testid="strategic-oversight"], .strategic-oversight')).toBeVisible();
    await expect(page.locator('[data-testid="control-failures"], .control-failures')).toBeVisible();
    await expect(page.locator('[data-testid="company-metrics"], .company-metrics')).toBeVisible();
  });

  test('should identify and review control failures', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/control-failures`);
    
    // Wait for control failures section to load
    await expect(page.locator('[data-testid="control-failures"], .control-failures-container')).toBeVisible();
    
    // Look for active control failures
    const failureItems = page.locator('[data-testid="control-failure"], .failure-card');
    const failureCount = await failureItems.count();
    
    if (failureCount > 0) {
      await expect(failureItems.first()).toBeVisible();
      
      // Click on first control failure to review
      await failureItems.first().click();
      
      // Control failure detail should open
      await expect(page.locator('[data-testid="failure-detail"], .failure-detail-modal')).toBeVisible();
      
      // Verify failure information
      await expect(page.locator('[data-testid="failure-type"], .failure-type')).toBeVisible();
      await expect(page.locator('[data-testid="failure-severity"], .failure-severity')).toBeVisible();
      await expect(page.locator('[data-testid="failure-impact"], .failure-impact')).toBeVisible();
      
      // Check for affected services
      await expect(page.locator('[data-testid="affected-services"], .affected-services')).toBeVisible();
      
      // Look for root cause analysis
      const rootCauseSection = page.locator('[data-testid="root-cause"], .root-cause-analysis');
      if (await rootCauseSection.isVisible()) {
        await expect(rootCauseSection).toBeVisible();
      }
    }
  });

  test('should create interventions for control failures', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/control-failures`);
    
    // Find a control failure requiring intervention
    const failureItems = page.locator('[data-testid="control-failure"], .failure-card');
    
    if (await failureItems.first().isVisible()) {
      await failureItems.first().click();
      
      // Control failure detail should show intervention options
      await expect(page.locator('[data-testid="failure-detail"], .failure-detail-modal')).toBeVisible();
      
      // Create intervention
      await page.click('[data-testid="create-intervention"], button:has-text("Create Intervention")');
      
      // Select intervention type
      await page.selectOption('[data-testid="intervention-type"], select[name="intervention_type"]', 'alert_rm');
      
      // Select service
      await page.selectOption('[data-testid="service-select"], select[name="service_id"]', {
        label: TEST_SERVICES.ROSE_HOUSE.name
      });
      
      // Add intervention message
      await page.fill('[data-testid="intervention-message"], textarea[name="message"]', 'Please review medication protocol retraining urgently. Multiple control failures identified in medication management.');
      
      // Set priority
      await page.selectOption('[data-testid="intervention-priority"], select[name="priority"]', 'High');
      
      // Create intervention
      await page.click('[data-testid="submit-intervention"], button[type="submit"]');
    
      // Verify intervention creation
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("intervention created")')).toBeVisible();
      
      // Check intervention appears in interventions list
      await page.goto(`${process.env.BASE_URL}/director/interventions`);
      await page.reload();
      
      const newIntervention = page.locator('[data-testid="intervention-item"]:has-text("medication protocol")');
      await expect(newIntervention).toBeVisible();
    }
  });

  test('should monitor company-wide performance metrics', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/metrics`);
    
    // Check metrics dashboard
    await expect(page.locator('[data-testid="metrics-dashboard"], .metrics-container')).toBeVisible();
    
    // Look for key performance indicators
    await expect(page.locator('[data-testid="company-kpis"], .company-kpis')).toBeVisible();
    await expect(page.locator('[data-testid="service-comparison"], .service-comparison')).toBeVisible();
    await expect(page.locator('[data-testid="trend-analysis"], .trend-analysis')).toBeVisible();
    
    // Test service filtering
    const serviceFilter = page.locator('[data-testid="service-filter"], .service-selector');
    if (await serviceFilter.isVisible()) {
      await serviceFilter.click();
      
      // Select specific service
      await page.click(`[data-testid="service-${TEST_SERVICES.ROSE_HOUSE.id}"], button:has-text("${TEST_SERVICES.ROSE_HOUSE.name}")`);
      
      // Apply filter
      await page.click('[data-testid="apply-filter"], button:has-text("Apply")');
      
      // Wait for data to refresh
      await page.waitForTimeout(2000);
    }
    
    // Check for performance alerts
    const performanceAlerts = page.locator('[data-testid="performance-alert"], .performance-warning');
    if (await performanceAlerts.first().isVisible()) {
      await expect(performanceAlerts.first()).toBeVisible();
    }
  });

  test('should review and approve strategic initiatives', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/initiatives`);
    
    // Look for strategic initiatives section
    await expect(page.locator('[data-testid="strategic-initiatives"], .initiatives-container')).toBeVisible();
    
    // Check for initiatives awaiting director approval
    const pendingInitiatives = page.locator('[data-testid="initiative-pending"], .initiative-status-pending');
    const initiativeCount = await pendingInitiatives.count();
    
    if (initiativeCount > 0) {
      await pendingInitiatives.first().click();
      
      // Initiative detail should open
      await expect(page.locator('[data-testid="initiative-detail"], .initiative-detail-modal')).toBeVisible();
      
      // Review initiative components
      await expect(page.locator('[data-testid="initiative-objectives"], .initiative-objectives')).toBeVisible();
      await expect(page.locator('[data-testid="initiative-timeline"], .initiative-timeline')).toBeVisible();
      await expect(page.locator('[data-testid="initiative-budget"], .initiative-budget')).toBeVisible();
      
      // Approve initiative
      await page.click('[data-testid="approve-initiative"], button:has-text("Approve")');
      
      // Add approval comments
      await page.fill('[data-testid="approval-comments"], textarea[name="comments"]', 'Strategic initiative approved. Aligned with company objectives and regulatory requirements.');
      
      // Submit approval
      await page.click('[data-testid="submit-approval"], button[type="submit"]');
      
      // Verify approval
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("approved")')).toBeVisible();
    }
  });

  test('should manage regulatory body relationships', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/regulatory`);
    
    // Look for regulatory management section
    await expect(page.locator('[data-testid="regulatory-management"], .regulatory-container')).toBeVisible();
    
    // Check for regulatory body interactions
    const regulatoryItems = page.locator('[data-testid="regulatory-item"], .regulatory-card');
    const regulatoryCount = await regulatoryItems.count();
    
    if (regulatoryCount > 0) {
      await expect(regulatoryItems.first()).toBeVisible();
      
      // Click on regulatory interaction to review
      await regulatoryItems.first().click();
      
      // Regulatory detail should open
      await expect(page.locator('[data-testid="regulatory-detail"], .regulatory-detail-modal')).toBeVisible();
      
      // Check for compliance status
      await expect(page.locator('[data-testid="compliance-status"], .compliance-status')).toBeVisible();
      
      // Look for required actions
      const requiredActions = page.locator('[data-testid="required-actions"], .regulatory-actions"]');
      if (await requiredActions.isVisible()) {
        await expect(requiredActions).toBeVisible();
        
        // Add director response
        await page.click('[data-testid="add-director-response"], button:has-text("Add Response")');
        
        await page.fill('[data-testid="response-text"], textarea[name="response_text"]', 'Director review completed. Compliance plan implemented. Will monitor progress closely.');
        
        // Submit response
        await page.click('[data-testid="submit-response"], button[type="submit"]');
        
        // Verify response
        await expect(page.locator('[data-testid="success-toast"], .toast:has-text("response submitted")')).toBeVisible();
      }
    }
  });

  test('should conduct board-level reporting', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/board-reports`);
    
    // Look for board reports section
    await expect(page.locator('[data-testid="board-reports"], .board-reports-container')).toBeVisible();
    
    // Generate new board report
    await page.click('[data-testid="generate-board-report"], button:has-text("Generate Board Report")');
    
    // Select report period
    await page.selectOption('[data-testid="report-period"], select[name="period"]', 'Quarterly');
    
    // Select reporting quarter
    await page.fill('[data-testid="quarter"], input[name="quarter"]', '2026-Q2');
    
    // Include executive summary
    await page.check('[data-testid="include-executive-summary"], input[name="include_executive_summary"]');
    
    // Generate report
    await page.click('[data-testid="generate"], button:has-text("Generate")');
    
    // Wait for report generation
    await page.waitForTimeout(3000);
    
    // Verify report is available
    await expect(page.locator('[data-testid="report-ready"], .report-download')).toBeVisible();
    
    // Download report
    await page.click('[data-testid="download-report"], .download-button');
    
    // Verify download started
    const downloadConfirm = page.locator('[data-testid="download-started"], .download-confirmation');
    if (await downloadConfirm.isVisible()) {
      await expect(downloadConfirm).toBeVisible();
    }
  });

  test('should oversee risk governance across all services', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/risk-governance`);
    
    // Check risk governance dashboard
    await expect(page.locator('[data-testid="risk-governance"], .risk-governance-container')).toBeVisible();
    
    // Look for company-wide risk overview
    await expect(page.locator('[data-testid="risk-overview"], .risk-overview')).toBeVisible();
    await expect(page.locator('[data-testid="risk-matrix"], .risk-matrix')).toBeVisible();
    await expect(page.locator('[data-testid="risk-trends"], .risk-trends')).toBeVisible();
    
    // Check for high-priority risks requiring director attention
    const highPriorityRisks = page.locator('[data-testid="high-priority-risk"], .risk-high-priority"]');
    const riskCount = await highPriorityRisks.count();
    
    if (riskCount > 0) {
      await expect(highPriorityRisks.first()).toBeVisible();
      
      // Click on high-priority risk to review
      await highPriorityRisks.first().click();
      
      // Risk detail should open
      await expect(page.locator('[data-testid="risk-detail"], .risk-detail-modal')).toBeVisible();
      
      // Check for mitigation strategies
      await expect(page.locator('[data-testid="mitigation-strategies"], .mitigation-strategies')).toBeVisible();
      
      // Add director oversight notes
      await page.click('[data-testid="add-director-notes"], button:has-text("Add Director Notes")');
      
      await page.fill('[data-testid="director-notes"], textarea[name="director_notes"]', 'Director review: Risk requires immediate attention at board level. Mitigation strategies to be reviewed in next board meeting.');
      
      // Submit notes
      await page.click('[data-testid="submit-notes"], button[type="submit"]');
      
      // Verify notes added
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("notes added")')).toBeVisible();
    }
  });

  test('should manage emergency response protocols', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/emergency-response`);
    
    // Look for emergency response section
    await expect(page.locator('[data-testid="emergency-response"], .emergency-container')).toBeVisible();
    
    // Check for active emergency situations
    const activeEmergencies = page.locator('[data-testid="active-emergency"], .emergency-status-active');
    const emergencyCount = await activeEmergencies.count();
    
    if (emergencyCount > 0) {
      await activeEmergencies.first().click();
      
      // Emergency detail should open
      await expect(page.locator('[data-testid="emergency-detail"], .emergency-detail-modal')).toBeVisible();
      
      // Check crisis response status
      await expect(page.locator('[data-testid="crisis-status"], .crisis-status')).toBeVisible();
      
      // Add director-level intervention
      await page.click('[data-testid="director-intervention"], button:has-text("Director Intervention")');
      
      await page.fill('[data-testid="intervention-text"], textarea[name="intervention_text"]', 'Director-level emergency protocol activated. Crisis team mobilized. Regulatory bodies notified.');
      
      // Submit intervention
      await page.click('[data-testid="submit-intervention"], button[type="submit"]');
      
      // Verify intervention
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("intervention activated")')).toBeVisible();
    }
    
    // Review emergency protocols
    const protocolItems = page.locator('[data-testid="emergency-protocol"], .protocol-card');
    const protocolCount = await protocolItems.count();
    
    if (protocolCount > 0) {
      await protocolItems.first().click();
      
      // Protocol detail should show last review
      await expect(page.locator('[data-testid="protocol-detail"], .protocol-detail-modal')).toBeVisible();
      await expect(page.locator('[data-testid="last-director-review"], .last-review-date')).toBeVisible();
      
      // Update protocol if needed
      const updateBtn = page.locator('[data-testid="update-protocol"], button:has-text("Update")');
      if (await updateBtn.isVisible()) {
        await updateBtn.click();
        
        await page.fill('[data-testid="protocol-notes"], textarea[name="notes"]', 'Director review completed. Protocol updated with latest regulatory requirements and best practices.');
        
        await page.click('[data-testid="save-protocol"], button:has-text("Save")');
        
        await expect(page.locator('[data-testid="success-toast"], .toast:has-text("updated")')).toBeVisible();
      }
    }
  });

  test('should oversee financial governance and budget allocation', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/financial-governance`);
    
    // Check financial governance dashboard
    await expect(page.locator('[data-testid="financial-governance"], .financial-container')).toBeVisible();
    
    // Look for budget overview
    await expect(page.locator('[data-testid="budget-overview"], .budget-overview')).toBeVisible();
    await expect(page.locator('[data-testid="expenditure-analysis"], .expenditure-analysis')).toBeVisible();
    await expect(page.locator('[data-testid="financial-risks"], .financial-risks')).toBeVisible();
    
    // Check for budget items requiring approval
    const pendingBudgets = page.locator('[data-testid="budget-pending"], .budget-status-pending');
    const budgetCount = await pendingBudgets.count();
    
    if (budgetCount > 0) {
      await pendingBudgets.first().click();
      
      // Budget detail should open
      await expect(page.locator('[data-testid="budget-detail"], .budget-detail-modal')).toBeVisible();
      
      // Review budget allocation
      await expect(page.locator('[data-testid="budget-allocation"], .budget-allocation')).toBeVisible();
      
      // Approve or reject budget
      await page.click('[data-testid="approve-budget"], button:has-text("Approve")');
      
      // Add approval comments
      await page.fill('[data-testid="budget-comments"], textarea[name="comments"]', 'Budget allocation approved. Aligned with strategic priorities and compliance requirements.');
      
      // Submit approval
      await page.click('[data-testid="submit-budget-approval"], button[type="submit"]');
      
      // Verify approval
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("budget approved")')).toBeVisible();
    }
  });

  test('should conduct strategic planning and policy development', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/strategic-planning`);
    
    // Look for strategic planning section
    await expect(page.locator('[data-testid="strategic-planning"], .planning-container')).toBeVisible();
    
    // Check for strategic objectives
    await expect(page.locator('[data-testid="strategic-objectives"], .objectives-container')).toBeVisible();
    
    // Review existing policies
    const policyItems = page.locator('[data-testid="policy-item"], .policy-card');
    const policyCount = await policyItems.count();
    
    if (policyCount > 0) {
      await policyItems.first().click();
      
      // Policy detail should open
      await expect(page.locator('[data-testid="policy-detail"], .policy-detail-modal')).toBeVisible();
      
      // Check policy effectiveness
      await expect(page.locator('[data-testid="policy-effectiveness"], .policy-effectiveness')).toBeVisible();
      
      // Update policy if needed
      const updateBtn = page.locator('[data-testid="update-policy"], button:has-text("Update")');
      if (await updateBtn.isVisible()) {
        await updateBtn.click();
        
        await page.fill('[data-testid="policy-updates"], textarea[name="updates"]', 'Policy updated to reflect latest regulatory requirements and industry best practices.');
        
        await page.click('[data-testid="save-policy"], button:has-text("Save")');
        
        await expect(page.locator('[data-testid="success-toast"], .toast:has-text("policy updated")')).toBeVisible();
      }
    }
    
    // Create new strategic objective if needed
    const createObjectiveBtn = page.locator('[data-testid="create-objective"], button:has-text("Create Objective")');
    if (await createObjectiveBtn.isVisible()) {
      await createObjectiveBtn.click();
      
      await page.fill('[data-testid="objective-title"], input[name="title"]', 'Enhance digital governance capabilities');
      await page.fill('[data-testid="objective-description"], textarea[name="description"]', 'Implement advanced digital governance tools to improve oversight and compliance monitoring.');
      await page.fill('[data-testid="objective-target"], input[name="target"]', 'Achieve 90% digital governance adoption within 12 months');
      
      await page.click('[data-testid="save-objective"], button[type="submit"]');
      
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("objective created")')).toBeVisible();
    }
  });

  test('should monitor stakeholder communications and relationships', async ({ page }) => {
    await page.goto(`${process.env.BASE_URL}/director/stakeholder-relations`);
    
    // Look for stakeholder relations section
    await expect(page.locator('[data-testid="stakeholder-relations"], .stakeholder-container')).toBeVisible();
    
    // Check for stakeholder interactions
    const stakeholderItems = page.locator('[data-testid="stakeholder-item"], .stakeholder-card');
    const stakeholderCount = await stakeholderItems.count();
    
    if (stakeholderCount > 0) {
      await expect(stakeholderItems.first()).toBeVisible();
      
      // Click on stakeholder to review interactions
      await stakeholderItems.first().click();
      
      // Stakeholder detail should open
      await expect(page.locator('[data-testid="stakeholder-detail"], .stakeholder-detail-modal')).toBeVisible();
      
      // Check for recent communications
      await expect(page.locator('[data-testid="recent-communications"], .communications-list')).toBeVisible();
      
      // Add director communication
      await page.click('[data-testid="add-communication"], button:has-text("Add Communication")');
      
      await page.fill('[data-testid="communication-text"], textarea[name="communication_text"]', 'Director update: Progress on governance improvements and compliance initiatives. Positive feedback from regulatory bodies.');
      
      // Submit communication
      await page.click('[data-testid="submit-communication"], button[type="submit"]');
      
      // Verify communication added
      await expect(page.locator('[data-testid="success-toast"], .toast:has-text("communication added")')).toBeVisible();
    }
  });
});
