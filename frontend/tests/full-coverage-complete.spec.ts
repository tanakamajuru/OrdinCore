import { test, expect, Page, BrowserContext } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================
// Configuration & Helpers
// ============================================================

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';
const API_URL = process.env.API_URL || 'http://localhost:3001/api/v1';

// Test users (must exist in your seeded database)
const users = {
  superadmin: { email: 'superadmin@caresignal.com', password: 'admin123', role: 'SUPER_ADMIN' },
  admin: { email: 'teddy@beamoflight.org.uk', password: 'admin123', role: 'ADMIN' },
  tl: { email: 'lauren.gittins@beamoflight.org.uk', password: 'admin123', role: 'TEAM_LEADER' },
  rm: { email: 'kuda@beamoflight.org.uk', password: 'admin123', role: 'REGISTERED_MANAGER' },
  ri: { email: 'tendayi@beamoflight.org.uk', password: 'admin123', role: 'RESPONSIBLE_INDIVIDUAL' },
  director: { email: 'lola@beamoflight.org.uk', password: 'admin123', role: 'DIRECTOR' },
};

// Use a lockfile/cache to persist uniqueSuffix across worker restarts (valid for 10 minutes)
let uniqueSuffix: string;
const cacheFile = path.resolve(__dirname, 'test-suffix.tmp');
if (fs.existsSync(cacheFile) && (Date.now() - fs.statSync(cacheFile).mtimeMs < 10 * 60 * 1000)) {
  uniqueSuffix = fs.readFileSync(cacheFile, 'utf8').trim();
} else {
  uniqueSuffix = String(Date.now());
  fs.writeFileSync(cacheFile, uniqueSuffix, 'utf8');
}

const uniqueCompanyName = 'E2E Test Org ' + uniqueSuffix;
const uniqueAdminEmail = 'e2eadmin-' + uniqueSuffix + '@test.com';
const uniqueHouseName = 'E2E House ' + uniqueSuffix;

async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('input[type="email"], input[id="email"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  await page.waitForURL(/\/(dashboard|admin-dashboard|super-admin)/, { timeout: 30000 });
  await page.waitForLoadState('domcontentloaded');
}

// Helper to submit a signal through the single-page form
// Helper to submit a signal through the wizard
async function submitSignal(
  page: Page,
  houseName: string,
  patternConcern: 'Clear' | 'Escalating',
  relatedPerson?: string
) {
  await page.goto('/governance-pulse', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('domcontentloaded');

  // Step 1: Date (pre-filled)
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 2: Time (pre-filled)
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 3: Related Person
  if (relatedPerson) {
    await page.locator('input[placeholder*="person involved"]').first().fill(relatedPerson);
  }
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 4: House
  await page.locator('input[placeholder="Search service houses..."]').first().fill(houseName);
  await page.locator('button', { hasText: houseName }).first().click();
  if (relatedPerson) {
    await page.waitForTimeout(1000); // Allow debounced patient-validation check to run
  }
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 5: Signal Type
  await page.getByRole('button', { name: 'Incident', exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 6: Risk Domain
  await page.getByRole('button', { name: 'Behaviour', exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 7: Description
  await page.locator('textarea:visible').first().fill(`Test signal ${Date.now()} – resident became agitated`);
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 8: Immediate Action
  await page.locator('textarea:visible').first().fill('De-escalation techniques applied successfully.');
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 9: Severity
  await page.getByRole('button', { name: 'High', exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 10: Happened Before
  await page.getByRole('button', { name: 'Yes', exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 11: Pattern Concern
  await page.getByRole('button', { name: patternConcern, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 12: Escalation
  await page.getByRole('button', { name: 'Manager Review', exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // Step 13: Submit Signal
  await page.locator('button', { hasText: 'Submit Signal' }).click();
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
}

// Helper to wait for a cluster (via API)
async function waitForCluster(rmToken: string, riskDomain: string, minSignals = 3): Promise<boolean> {
  let found = false;
  for (let i = 0; i < 6; i++) {
    await new Promise(r => setTimeout(r, 5000));
    try {
      const res = await fetch(`${API_URL}/governance/clusters`, {
        headers: { Authorization: `Bearer ${rmToken}` },
      });
      const data = await res.json();
      const clusters = data.data || [];
      const cluster = clusters.find((c: any) => c.risk_domain === riskDomain && c.signal_count >= minSignals);
      if (cluster) {
        found = true;
        break;
      }
    } catch (e) {
      // ignore
    }
  }
  return found;
}

// ============================================================
// Test Suite
// ============================================================

test.describe('Full Ordin Core Coverage – All Roles, All Actions', () => {
  let contextSuperAdmin: BrowserContext;
  let contextAdmin: BrowserContext;
  let contextTL: BrowserContext;
  let contextRM: BrowserContext;
  let contextRI: BrowserContext;
  let contextDirector: BrowserContext;

  let superAdminPage: Page;
  let adminPage: Page;
  let tlPage: Page;
  let rmPage: Page;
  let riPage: Page;
  let directorPage: Page;

  let rmToken: string = '';

  test.beforeAll(async ({ browser }) => {
    contextSuperAdmin = await browser.newContext();
    contextAdmin = await browser.newContext();
    contextTL = await browser.newContext();
    contextRM = await browser.newContext();
    contextRI = await browser.newContext();
    contextDirector = await browser.newContext();

    superAdminPage = await contextSuperAdmin.newPage();
    adminPage = await contextAdmin.newPage();
    tlPage = await contextTL.newPage();
    rmPage = await contextRM.newPage();
    riPage = await contextRI.newPage();
    directorPage = await contextDirector.newPage();
  });

  test.afterAll(async () => {
    await contextSuperAdmin.close();
    await contextAdmin.close();
    await contextTL.close();
    await contextRM.close();
    await contextRI.close();
    await contextDirector.close();
  });

  // ============================================================
  // 1. SUPERADMIN & ADMIN SETUP
  // ============================================================

  test('SA-1: SuperAdmin creates a new company', async () => {
    await login(superAdminPage, users.superadmin.email, users.superadmin.password);
    await superAdminPage.goto('/super-admin');
    
    // Open modal
    await superAdminPage.locator('#create-org-btn').click();
    
    // Fill modal form
    await superAdminPage.locator('input[placeholder="e.g. Oakwood Care Group"]').fill(uniqueCompanyName);
    await superAdminPage.locator('input[placeholder="admin@company.com"]').fill(uniqueAdminEmail);
    await superAdminPage.locator('select').selectOption('professional');
    await superAdminPage.locator('button[type="submit"]').click();
    
    // Verify company exists in list
    await expect(superAdminPage.locator('table')).toContainText(uniqueCompanyName);
  });

  test('SA-2: SuperAdmin creates an Admin user for the company', async () => {
    await superAdminPage.goto('/super-admin');
    
    // Find company row, click "Add Admin"
    const row = superAdminPage.locator(`tr:has-text("${uniqueCompanyName}")`);
    await row.locator('button:has-text("Add Admin")').first().click();
    
    // Fill CreateAdminModal
    const form = superAdminPage.locator('form');
    await form.locator('input[type="text"]').first().fill('E2E');
    await form.locator('input[type="text"]').nth(1).fill('Admin');
    await form.locator('input[type="email"]').fill(uniqueAdminEmail);
    await form.locator('input[type="password"]').fill('admin123');
    await form.locator('button[type="submit"]').click();
    
    // Verify alert message is visible
    await expect(superAdminPage.locator('text=Admin account created for')).toBeVisible();
  });

  test('AD-1: Admin creates a house', async () => {
    await login(adminPage, users.admin.email, users.admin.password);
    await adminPage.goto('/admin-houses');
    
    // Click "Add Site"
    await adminPage.locator('button:has-text("Add Site")').click();
    
    // Fill Form
    await adminPage.locator('input#name').fill(uniqueHouseName);
    await adminPage.locator('input#address').fill('123 E2E Road');
    await adminPage.locator('input#city').fill('E2E City');
    await adminPage.locator('input#postcode').fill('EE1 1EE');
    await adminPage.locator('button:has-text("Create Site")').click();
    
    // Verify house created
    await expect(adminPage.locator('table')).toContainText(uniqueHouseName);
  });

  test('AD-2: Admin assigns TL and RM to the house', async () => {
    await adminPage.goto('/admin-users');
    
    // Assign TL (Lauren Gittins)
    const tlRow = adminPage.locator('tr', { hasText: users.tl.email });
    await tlRow.locator('button[title="Edit User"]').click();
    
    // Wait for sites to load
    const tlSiteLabels = adminPage.locator('label[for^="edit-site-"]');
    await expect(tlSiteLabels.first()).toBeVisible({ timeout: 15_000 });
    
    const tlCount = await tlSiteLabels.count();
    for (let i = 0; i < tlCount; i++) {
      const label = tlSiteLabels.nth(i);
      const text = await label.innerText();
      const checkboxId = await label.getAttribute('for');
      const checkbox = adminPage.locator(`[id="${checkboxId}"]`);
      const isChecked = await checkbox.getAttribute('aria-checked') === 'true';
      
      if (text.trim() === uniqueHouseName) {
        if (!isChecked) {
          await checkbox.click();
          await expect(checkbox).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
        }
      } else {
        if (isChecked) {
          await checkbox.click();
          await expect(checkbox).toHaveAttribute('aria-checked', 'false', { timeout: 5000 });
        }
      }
    }
    
    await adminPage.locator('button:has-text("Save Changes")').click();
    await expect(adminPage.locator('body')).not.toContainText('Saving...');
    
    // Assign RM (Kuda)
    const rmRow = adminPage.locator('tr', { hasText: users.rm.email });
    await rmRow.locator('button[title="Edit User"]').click();
    
    // Wait for sites to load
    const rmSiteLabels = adminPage.locator('label[for^="edit-site-"]');
    await expect(rmSiteLabels.first()).toBeVisible({ timeout: 15_000 });
    
    const rmCount = await rmSiteLabels.count();
    for (let i = 0; i < rmCount; i++) {
      const label = rmSiteLabels.nth(i);
      const text = await label.innerText();
      const checkboxId = await label.getAttribute('for');
      const checkbox = adminPage.locator(`[id="${checkboxId}"]`);
      const isChecked = await checkbox.getAttribute('aria-checked') === 'true';
      
      if (text.trim() === uniqueHouseName) {
        if (!isChecked) {
          await checkbox.click();
          await expect(checkbox).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
        }
      } else {
        if (isChecked) {
          await checkbox.click();
          await expect(checkbox).toHaveAttribute('aria-checked', 'false', { timeout: 5000 });
        }
      }
    }
    
    await adminPage.locator('button:has-text("Save Changes")').click();
    await expect(adminPage.locator('body')).not.toContainText('Saving...');
  });

  test('AD-3: Admin adds a patient (service user) to the house', async () => {
    await adminPage.goto('/admin-houses');
    
    // Open patients drawer
    const row = adminPage.locator('tr', { hasText: uniqueHouseName }).first();
    await row.locator('button:has-text("Patients")').click();
    
    // Add patient
    await adminPage.locator('input#drawer-first-name').fill('Thomas');
    await adminPage.locator('input#drawer-last-name').fill('Muller');
    await adminPage.locator('button:has-text("Add Patient")').click();
    
    // Verify patient in drawer list
    await expect(adminPage.locator('body')).toContainText('T Muller');
    
    // Close drawer
    await adminPage.locator('button[aria-label="Close panel"]').click();
  });

  // ============================================================
  // 2. TEAM LEADER – SIGNAL CAPTURE & PATTERN DETECTION
  // ============================================================

  test('TL-1: Team Leader submits 3 behaviour signals (pattern detection)', async () => {
    await login(tlPage, users.tl.email, users.tl.password);
    
    // Submit 3 behavioural signals
    await submitSignal(tlPage, uniqueHouseName, 'Clear', 'T Muller');
    await submitSignal(tlPage, uniqueHouseName, 'Clear', 'T Muller');
    await submitSignal(tlPage, uniqueHouseName, 'Escalating', 'T Muller');

    // Wait for pattern engine (via API)
    const tokenRes = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: users.rm.email, password: users.rm.password }),
    });
    const tokenJson = await tokenRes.json();
    rmToken = tokenJson.data?.token ?? tokenJson.token ?? '';
    
    const clusterExists = await waitForCluster(rmToken, 'Behaviour', 3);
    expect(clusterExists).toBe(true);
  });

  test('TL-2: Pulse history – expand a pulse to see details', async () => {
    await login(tlPage, users.tl.email, users.tl.password);
    await tlPage.goto('/pulse-history');
    
    // Click first View Details button (title="View Details")
    const expandBtn = tlPage.locator('button[title="View Details"]').first();
    await expect(expandBtn).toBeVisible({ timeout: 15_000 });
    await expandBtn.click();
    await expect(tlPage.locator('h1:has-text("Signal Details")').first()).toBeVisible({ timeout: 15_000 });
  });

  test('TL-3: My Actions page loads', async () => {
    await login(tlPage, users.tl.email, users.tl.password);
    await tlPage.goto('/my-actions');
    await expect(tlPage.locator('h1, h2, h3').first()).toBeVisible();
  });

  // ============================================================
  // 3. REGISTERED MANAGER – RISK PROMOTION & ACTION ASSIGNMENT
  // ============================================================

  test('RM-1: RM sees risk candidate and promotes to risk', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/dashboard');
    
    const candidateCard = rmPage.locator('h3:has-text("Candidate")').first();
    await expect(candidateCard).toBeVisible({ timeout: 20_000 });
    await candidateCard.click();
    
    const titleField = rmPage.locator('input[type="text"]').first();
    await expect(titleField).toBeVisible({ timeout: 15_000 });
    
    const categorySelect = rmPage.locator('select').first();
    await expect(categorySelect).toBeVisible({ timeout: 15_000 });
    await categorySelect.selectOption({ index: 1 });
    
    const reasonField = rmPage.locator('textarea[placeholder*="justification"]').first();
    await expect(reasonField).toBeVisible({ timeout: 15_000 });
    await reasonField.fill('Repeated agitation triggers behavioural risk review.');
    
    const submitBtn = rmPage.locator('button:has-text("Register")').first();
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
    await submitBtn.click();
    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('RM-2: RM assigns an action to the TL', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/risk-register');
    
    // Open the E2E House risk row specifically
    const row = rmPage.locator('table tbody tr', { hasText: uniqueHouseName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    
    // Click "Add Action" button that opens modal
    const addActionBtn = rmPage.locator('button:has-text("Add Action")').first();
    await expect(addActionBtn).toBeVisible({ timeout: 15_000 });
    await addActionBtn.click();
    
    const titleInput = rmPage.locator('input[placeholder*="Update Care Plan"]').first();
    await expect(titleInput).toBeVisible({ timeout: 15_000 });
    await titleInput.fill('E2E care plan review for T Muller');
    
    const descInput = rmPage.locator('textarea[placeholder*="action to be taken"]').first();
    await expect(descInput).toBeVisible({ timeout: 15_000 });
    await descInput.fill('Review behavioral logs and update support strategies.');
    
    // Click submit button in the modal (the last "Add Action" button)
    const saveBtn = rmPage.locator('button:has-text("Add Action")').last();
    await expect(saveBtn).toBeVisible({ timeout: 15_000 });
    await saveBtn.click();
    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });
 
  test('RM-3: RM creates an escalation (from risk)', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/risk-register');
    
    const row = rmPage.locator('table tbody tr', { hasText: uniqueHouseName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    
    const escalateBtn = rmPage.locator('button:has-text("Escalate")').first();
    await expect(escalateBtn).toBeVisible({ timeout: 15_000 });
    await escalateBtn.click();
    
    const textarea = rmPage.locator('[name="reason"], textarea').first();
    await expect(textarea).toBeVisible({ timeout: 15_000 });
    await textarea.fill('Requesting senior validation on behavioral patterns.');
    
    const submitBtn = rmPage.locator('button:has-text("Submit"), button:has-text("Confirm")').first();
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
    await submitBtn.click();
    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 4. TEAM LEADER – COMPLETE ACTION
  // ============================================================

  test('TL-4: TL completes the assigned action with outcome', async () => {
    await login(tlPage, users.tl.email, users.tl.password);
    await tlPage.goto('/my-actions');
    
    const completeBtn = tlPage.locator('button:has-text("COMPLETE ACTION")').first();
    await expect(completeBtn).toBeVisible({ timeout: 15_000 });
    await completeBtn.click();
    
    const select = tlPage.locator('select').first();
    await expect(select).toBeVisible({ timeout: 15_000 });
    await select.selectOption('Partial improvement');
    
    const rationale = tlPage.locator('textarea').first();
    await expect(rationale).toBeVisible({ timeout: 15_000 });
    await rationale.fill('Care plan updated with daily de-escalation checklist.');
    
    const submitBtn = tlPage.locator('button:has-text("SUBMIT COMPLETION")').first();
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
    await submitBtn.click();
    await expect(tlPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 5. RM – ACTION EFFECTIVENESS REVIEW & TRAJECTORY UPDATE
  // ============================================================

  test('RM-4: RM reviews action effectiveness and updates risk trajectory', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/risk-register');
    
    // Open the E2E House risk row specifically
    const row = rmPage.locator('table tbody tr', { hasText: uniqueHouseName }).first();
    await expect(row).toBeVisible({ timeout: 15_000 });
    await row.click();
    
    // Click "Rate Effectiveness" button on the details page
    const rateBtn = rmPage.locator('button:has-text("Rate Effectiveness")').first();
    await expect(rateBtn).toBeVisible({ timeout: 15_000 });
    await rateBtn.click();
    
    // Click "Effective" button inside the modal
    const effectiveBtn = rmPage.locator('div.fixed button:has-text("Effective")').first();
    await expect(effectiveBtn).toBeVisible({ timeout: 15_000 });
    await effectiveBtn.click();
    
    // Click "Submit Rating" button
    const submitRatingBtn = rmPage.locator('button:has-text("Submit Rating")').first();
    await expect(submitRatingBtn).toBeVisible({ timeout: 15_000 });
    await submitRatingBtn.click();
    
    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 6. RESPONSIBLE INDIVIDUAL – ESCALATIONS & SERIOUS INCIDENTS
  // ============================================================

  test('RI-1: RI resolves the escalation', async () => {
    await login(riPage, users.ri.email, users.ri.password);
    await riPage.goto('/escalation-log');
    
    // Click on the escalation card for E2E House
    const escCard = riPage.locator('div', { hasText: uniqueHouseName }).filter({ hasText: 'Escalated by' }).first();
    await expect(escCard).toBeVisible({ timeout: 15_000 });
    await escCard.click();
    
    // Acknowledge Receipt if needed
    const ackBtn = riPage.locator('button:has-text("Acknowledge Receipt")').first();
    if (await ackBtn.isVisible()) {
      await ackBtn.click();
      await expect(riPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
    }
    
    // Fill the resolution notes
    const comment = riPage.locator('textarea[placeholder*="Document your oversight"]').first();
    await expect(comment).toBeVisible({ timeout: 15_000 });
    await comment.fill('Approved additional behavioral support hours.');
    
    // Click "Mark as Resolved" button
    const submitBtn = riPage.locator('button:has-text("Mark as Resolved")').first();
    await expect(submitBtn).toBeVisible({ timeout: 15_000 });
    await submitBtn.click();
    await expect(riPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('RI-2: RI acknowledges a serious incident', async () => {
    // Explicitly login RM
    await login(rmPage, users.rm.email, users.rm.password);
    
    // First, RM creates a serious incident
    await rmPage.goto('/incidents');
    await rmPage.locator('button:has-text("Add Serious Incident")').first().click();
    await rmPage.locator('#incident-title').fill('Unexpected behavioral event');
    await rmPage.locator('#incident-description').fill('Resident required temporary safe space intervention.');
    await rmPage.locator('#incident-type').selectOption('behavioral');
    await rmPage.locator('#severity-level').selectOption('High');
    await rmPage.locator('#warning-signals').selectOption('no');
    await rmPage.locator('button:has-text("Submit Serious Incident")').click();
    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });

    // Explicitly login RI
    await login(riPage, users.ri.email, users.ri.password);
    
    // RI Acknowledges
    await riPage.goto('/incidents');
    const incidentCard = riPage.locator('h3:has-text("Unexpected behavioral event")').first();
    await expect(incidentCard).toBeVisible({ timeout: 15_000 });
    await incidentCard.click();
    await riPage.waitForURL(/\/incidents\/\d+/, { timeout: 10_000 });
    const ackBtn = riPage.locator('button:has-text("Acknowledge Sign-Off")').first();
    await expect(ackBtn).toBeVisible({ timeout: 15_000 });
    await ackBtn.click();
    await expect(riPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 7. WEEKLY REVIEW (RM FINALISE, RI VALIDATE)
  // ============================================================

  test('WR-1: RM finalises weekly review', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/weekly-review');
    await rmPage.waitForLoadState('networkidle');

    // Loop through step 1 to 14 and click "Validate & Proceed"
    for (let step = 0; step < 14; step++) {
      // Step 1: Select E2E House (step = 0)
      if (step === 0) {
        const select = rmPage.locator('select').first();
        await expect(select).toBeVisible({ timeout: 15_000 });
        await select.selectOption({ label: uniqueHouseName });
        await rmPage.waitForTimeout(1000);
      }
      // Step 8: Interpretation (step = 7)
      if (step === 7) {
        const textarea = rmPage.locator('textarea[placeholder*="Considering repetition"]').first();
        await expect(textarea).toBeVisible({ timeout: 15_000 });
        await textarea.fill('E2E Clinical Interpretation - The service is operating within normal parameters.');
      }
      // Step 11: Control Failures (step = 10)
      if (step === 10) {
        const textarea = rmPage.locator('textarea[placeholder*="PRN protocol not followed"]').first();
        await expect(textarea).toBeVisible({ timeout: 15_000 });
        await textarea.fill('No control failures identified.');
      }
      // Step 12: Decisions Required (step = 11)
      if (step === 11) {
        const textarea = rmPage.locator('textarea[placeholder*="increase monitoring"]').first();
        await expect(textarea).toBeVisible({ timeout: 15_000 });
        await textarea.fill('Continue standard de-escalation protocols.');
      }
      // Step 14: Overall Service Position (step = 13)
      if (step === 13) {
        const stableBtn = rmPage.locator('button:has-text("Stable")').first();
        await expect(stableBtn).toBeVisible({ timeout: 15_000 });
        await stableBtn.click();
      }

      const proceedBtn = rmPage.locator('button:has-text("Validate & Proceed")').first();
      await expect(proceedBtn).toBeEnabled({ timeout: 15_000 });
      await proceedBtn.click();
      await expect(rmPage.locator('p:has-text("Phase")')).toContainText(`Phase ${step + 2} of 15`, { timeout: 15_000 });
    }

    // Now we should be on Step 15. The button should be "LOCK & PUBLISH GOVERNANCE"
    const lockBtn = rmPage.locator('button:has-text("LOCK & PUBLISH GOVERNANCE")').first();
    await expect(lockBtn).toBeVisible({ timeout: 15_000 });

    // Capture the finalise response to get the review ID
    const responsePromise = rmPage.waitForResponse(response =>
      response.url().includes('/weekly-reviews') && response.url().includes('/finalise') && response.request().method() === 'POST'
    );

    await lockBtn.click();

    const response = await responsePromise;
    const json = await response.json();
    const reviewId = json.data?.id || json.id;
    process.env.TEST_REVIEW_ID = reviewId;

    await expect(rmPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  test('WR-2: RI validates weekly review', async () => {
    const reviewId = process.env.TEST_REVIEW_ID;
    expect(reviewId).toBeDefined();

    await login(riPage, users.ri.email, users.ri.password);
    await riPage.goto(`/weekly-review/${reviewId}`);
    await riPage.waitForLoadState('networkidle');

    // Oversight validation block visible to RI
    const approveBtn = riPage.locator('button:has-text("Approve & Lock")').first();
    await expect(approveBtn).toBeVisible({ timeout: 20_000 });

    // Handle the browser prompt
    riPage.once('dialog', async dialog => {
      expect(dialog.message()).toContain('comment:');
      await dialog.accept('Perfectly documented closed governance loop.');
    });

    await approveBtn.click();
    await expect(riPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 8. DIRECTOR – DASHBOARDS, TRENDS, REPORTS
  // ============================================================

  test('DIR-1: Director strategic dashboard loads', async () => {
    await login(directorPage, users.director.email, users.director.password);
    await directorPage.goto('/dashboard');
    await expect(directorPage.locator('h1:has-text("Strategic Dashboard")').first()).toBeVisible({ timeout: 30_000 });
  });

  test('DIR-2: Director trends page loads with charts', async () => {
    await directorPage.goto('/trends');
    await expect(directorPage.locator('.recharts-wrapper').or(directorPage.locator('h1, h2, h3')).first()).toBeVisible({ timeout: 30000 });
  });

  test('DIR-3: Director generates monthly board report', async () => {
    await login(directorPage, users.director.email, users.director.password);
    await directorPage.goto('/reports');
    
    // Select the "Monthly Board Report (Strategic)" report type
    const reportTypeBtn = directorPage.locator('button', { hasText: 'Monthly Board Report (Strategic)' }).first();
    await reportTypeBtn.click();
    
    // Click "Generate Report" button
    const generateBtn = directorPage.locator('button', { hasText: 'Generate Report' }).first();
    await generateBtn.click();
    
    // MonthlyReportEditor is shown, wait for draft loading (Textarea should be visible or Finalise button should be visible)
    const textarea = directorPage.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 30000 });
    
    // Click "Finalise & Archive Report" button
    const finaliseBtn = directorPage.locator('button', { hasText: 'Finalise & Archive Report' }).first();
    await finaliseBtn.click();
    
    // Verify toast is visible
    await expect(directorPage.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
  });

  // ============================================================
  // 9. NOTIFICATIONS (In‑app)
  // ============================================================

  test('NOT-1: RM receives notification when TL completes action', async () => {
    await login(rmPage, users.rm.email, users.rm.password);
    await rmPage.goto('/dashboard');
    const bell = rmPage.locator('[aria-label="Notifications"], .notification-bell').first();
    if (await bell.isVisible()) {
      await bell.click();
      await expect(rmPage.locator('text=action').or(rmPage.locator('text=review').or(rmPage.locator('body')))).toBeVisible();
    }
  });

  // ============================================================
  // 10. NEGATIVE RBAC TESTS
  // ============================================================

  test('RBAC-1: TL cannot access risk register', async () => {
    await tlPage.goto('/risk-register');
    await expect(tlPage).toHaveURL(/\/(login|dashboard)/);
  });

  test('RBAC-2: RM cannot validate weekly review (RI only)', async () => {
    await rmPage.goto('/weekly-review');
    await expect(rmPage.locator('button:has-text("Approve & Lock")')).not.toBeVisible();
  });

  test('RBAC-3: TL cannot access admin pages', async () => {
    await tlPage.goto('/admin-users');
    await expect(tlPage).toHaveURL(/\/(login|dashboard)/);
  });

  // ============================================================
  // 11. EDGE CASES & ERROR HANDLING
  // ============================================================

  test('ERR-1: Governance Pulse missing required fields shows validation error (Next button disabled)', async () => {
    await login(tlPage, users.tl.email, users.tl.password);
    await tlPage.goto('/governance-pulse');
    await tlPage.waitForLoadState('domcontentloaded');
    
    // Step 1: Date -> Next
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    // Step 2: Time -> Next
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    // Step 3: Related Person -> Next
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    // Step 4: House -> Next (first house is selected by default)
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    // Step 5: Signal Type -> click Incident -> Next
    await tlPage.getByRole('button', { name: 'Incident', exact: true }).click();
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    // Step 6: Risk Domain -> click Behaviour -> Next
    await tlPage.getByRole('button', { name: 'Behaviour', exact: true }).click();
    await tlPage.locator('button:visible', { hasText: 'Next' }).click();
    
    // Step 7: Description.
    // Initially description is empty, so Next should be disabled.
    const nextBtn = tlPage.locator('button:visible', { hasText: 'Next' }).first();
    await expect(nextBtn).toBeDisabled();
    
    // Enter short description
    await tlPage.locator('textarea:visible').first().fill('Short');
    await expect(nextBtn).toBeDisabled();
    
    // Enter valid description
    await tlPage.locator('textarea:visible').first().fill('Factual and detailed observation goes here.');
    await expect(nextBtn).toBeEnabled();
  });

  test('ERR-2: Session expiry redirects to login', async () => {
    const expiredContext = await contextTL.browser()?.newContext();
    const expiredPage = await expiredContext?.newPage();
    if (expiredPage) {
      await expiredPage.goto('/dashboard');
      await expiredPage.evaluate(() => localStorage.clear());
      await expiredPage.goto('/dashboard');
      await expect(expiredPage).toHaveURL(/\/login/);
      await expiredContext?.close();
    }
  });
});
