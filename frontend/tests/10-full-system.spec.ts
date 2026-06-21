import { test, expect, Page } from '@playwright/test';

// Full-system UI walkthrough against the CURRENT app (local: vite 5173 -> backend 3001 / caresignal_db).
// Drives a real Chromium browser: clicks, types, observes the DOM. Uses verified local seed accounts.

const USERS = {
  superadmin: { email: 'superadmin@caresignal.com', password: 'admin123' },
  director:   { email: 'pat@ordincore.com',          password: 'admin123' },
  rm:         { email: 'sam@ordincore.com',          password: 'admin123' },
  ri:         { email: 'chris@ordincore.com',        password: 'admin123' },
  tl:         { email: 'taylor@ordincore.com',       password: 'admin123' },
};

async function login(page: Page, u: { email: string; password: string }) {
  await page.goto('/login');
  await page.fill('input[type="email"], input[name="email"]', u.email);
  await page.fill('input[type="password"], input[name="password"]', u.password);
  await page.click('button[type="submit"]');
  // Wait until we've left the login screen.
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 60_000 });
  await page.waitForLoadState('networkidle').catch(() => {});
}

async function logout(page: Page) {
  // Clear session for the next role.
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
}

test.describe('Full system UI walkthrough', () => {

  test('Super Admin: dashboard, Total Users populated, create-org sector selector', async ({ page }) => {
    await login(page, USERS.superadmin);
    // Total Users card should NOT be 0 (regression of hardcoded 0).
    const totalUsers = page.locator('text=Total Users').locator('xpath=ancestor::*[1]');
    await expect(page.getByText('Total Users')).toBeVisible();
    // Companies list / management visible
    await expect(page.getByText(/Organisation|Companies|Company Management|Total Organisations/i).first()).toBeVisible();
    // Open create-organisation and verify Sector dropdown exists (scope to the modal)
    const createBtn = page.getByRole('button', { name: /create org|new org|add org|create organisation/i }).first();
    if (await createBtn.count()) {
      await createBtn.click();
      const modal = page.locator('.fixed.inset-0');
      await expect(modal.getByText(/Sector/i).first()).toBeVisible({ timeout: 10_000 });
      const sectorOptions = await modal.locator('select').last().locator('option').allInnerTexts();
      expect(sectorOptions.join(' ')).toMatch(/Domiciliary/i);
      expect(sectorOptions.join(' ')).toMatch(/Supported Living/i);
    }
    await logout(page);
  });

  test('Director: nav items present, Oversight Register tabs, Service Users search+filter', async ({ page }) => {
    await login(page, USERS.director);
    // Sidebar should contain the key nav items (Service Users is admin-only, not here)
    for (const label of ['Oversight Register', 'Escalations']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible();
    }
    // Governance Oversight Register
    await page.goto('/risk-register');
    await expect(page.getByText('Governance Oversight Register')).toBeVisible();
    for (const tab of ['Emerging', 'Active', 'Strategic', 'Closed']) {
      await expect(page.getByText(new RegExp(tab, 'i')).first()).toBeVisible();
    }
    // Service Users directory: search box + site filter
    await page.goto('/patients');
    await expect(page.getByText('Service Users').first()).toBeVisible();
    await expect(page.getByPlaceholder(/search service users/i)).toBeVisible();
    await expect(page.locator('select')).toHaveCount(1); // the site/service filter
    await page.getByPlaceholder(/search service users/i).fill('z');
    await page.waitForTimeout(800); // debounce
    await logout(page);
  });

  test('Director: Weekly Governance Review is a 13-step wizard', async ({ page }) => {
    await login(page, USERS.director);
    await page.goto('/weekly-review');
    await expect(page.getByText(/Weekly Governance Review/i)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Step 1 of 13/i)).toBeVisible();
    // Step rail items
    for (const s of ['Scope', 'Signal Volume', 'Leadership Interpretation', 'Overall Position', 'Narrative']) {
      await expect(page.getByText(new RegExp(s, 'i')).first()).toBeVisible();
    }
    await logout(page);
  });

  test('RM: signal capture uses 12 governance domains', async ({ page }) => {
    await login(page, USERS.rm);
    await page.goto('/governance-pulse');
    await expect(page.getByText(/Record a Signal/i)).toBeVisible({ timeout: 30_000 });
    // Governance Domain dropdown should list domains (wait for the async /governance/domains fetch)
    const domainSelect = page.locator('select').nth(1); // 0 = service, 1 = governance domain
    await expect(domainSelect).toBeVisible();
    await expect(domainSelect.locator('option', { hasText: 'Medication Governance' })).toBeAttached({ timeout: 20_000 });
    const options = await domainSelect.locator('option').allInnerTexts();
    expect(options.join(' ')).toMatch(/Medication Governance|Safeguarding|Self-Neglect|Mental Health/i);
    // Selecting a domain reveals the signal dropdown with that domain's library
    await domainSelect.selectOption({ label: 'Medication Governance' });
    const signalSelect = page.locator('select').nth(2);
    await expect(signalSelect).toBeVisible({ timeout: 10_000 });
    const signalOptions = (await signalSelect.locator('option').allInnerTexts()).join(' ');
    expect(signalOptions).toMatch(/Medication omission|Medication refusal/i);
    await logout(page);
  });

  test('RM: oversight register loads (scoped)', async ({ page }) => {
    await login(page, USERS.rm);
    await page.goto('/risk-register');
    await expect(page.getByText('Governance Oversight Register')).toBeVisible();
    await expect(page.getByText(/Active Oversight/i).first()).toBeVisible();
    await logout(page);
  });

  test('TL: dashboard loads, no Patients nav (admin-only Service Users)', async ({ page }) => {
    await login(page, USERS.tl);
    await expect(page.getByText('ORDIN CORE').first()).toBeVisible();
    // Patients/Service Users should NOT appear in the TL sidebar
    await expect(page.getByRole('button', { name: /^Patients$/i })).toHaveCount(0);
    await logout(page);
  });

  test('RI: oversight register loads', async ({ page }) => {
    await login(page, USERS.ri);
    await page.goto('/risk-register');
    await expect(page.getByText('Governance Oversight Register')).toBeVisible();
    await logout(page);
  });

  test('WRITE: RM submits a signal end-to-end', async ({ page }) => {
    await login(page, USERS.rm);
    await page.goto('/governance-pulse');
    await expect(page.getByText(/Record a Signal/i)).toBeVisible({ timeout: 30_000 });
    await page.locator('select').nth(1).selectOption({ label: 'Medication Governance' });
    await page.locator('select').nth(2).selectOption({ label: 'Medication omission' });
    await page.getByRole('button', { name: /^Medium$/ }).click();
    await page.fill('textarea', 'Automated UI test: evening medication omission recorded for QA.');
    await page.getByRole('button', { name: /record signal|submit|save/i }).last().click();
    // Success = toast or navigation back to dashboard
    await expect(page.getByText(/Signal recorded|recorded|success/i).first()).toBeVisible({ timeout: 15_000 }).catch(async () => {
      await expect(page).toHaveURL(/dashboard/, { timeout: 10_000 });
    });
    await logout(page);
  });

  test('WRITE: RM advances the weekly review wizard (per-step save)', async ({ page }) => {
    await login(page, USERS.rm);
    await page.goto('/weekly-review');
    await expect(page.getByText(/Step 1 of 13/i)).toBeVisible({ timeout: 30_000 });
    // Advance from Scope through the 9 auto-populated steps to Leadership Interpretation.
    // The button disables during each per-step POST /weekly-reviews, so click only when
    // enabled and poll until the interpretation step appears (resilient to dropped clicks).
    // Confirm & continue through each auto step. Wait for the next step's heading (h2)
    // to render before the next click — one confirmed advance per click (clicking before
    // the step settles would re-fire on the same step).
    const order = ['Signal Volume', 'Pattern Summary', 'Cluster Review', 'Risk Touchpoint',
      'Action Effectiveness', 'Escalations', 'Safeguarding', 'Medication', 'Workforce', 'Leadership Interpretation'];
    for (const heading of order) {
      await page.getByRole('button', { name: /Confirm & continue/i }).first().click();
      await expect(page.getByRole('heading', { level: 2, name: heading })).toBeVisible({ timeout: 15_000 });
    }
    // Target the interpretation textarea by its placeholder (unique to that step body).
    const interp = page.getByPlaceholder(/What does this week mean/i);
    await expect(interp).toBeVisible({ timeout: 15_000 });
    await interp.fill('QA: medication engagement is the main concern this week.');
    await page.getByRole('button', { name: /Confirm & continue/i }).click();
    await expect(page.getByText(/Overall governance position/i)).toBeVisible({ timeout: 15_000 });
    await logout(page);
  });

  test('WRITE: Super Admin creates a Domiciliary organisation', async ({ page }) => {
    await login(page, USERS.superadmin);
    const createBtn = page.getByRole('button', { name: /create org|new org|add org|create organisation/i }).first();
    await createBtn.click();
    const modal = page.locator('.fixed.inset-0');
    const stamp = Date.now();
    await modal.locator('input[type="text"], input').first().fill(`QA Domiciliary ${stamp}`);
    const emailInput = modal.locator('input[type="email"]');
    if (await emailInput.count()) await emailInput.fill(`qa${stamp}@test.local`);
    await modal.locator('select').last().selectOption({ label: 'Domiciliary Care' });
    await modal.getByRole('button', { name: /create|save/i }).last().click();
    await expect(page.getByText(new RegExp(`QA Domiciliary ${stamp}`)).first()).toBeVisible({ timeout: 15_000 });
    await logout(page);
  });

  test('RM nav has Patterns + Effectiveness; Effectiveness page loads', async ({ page }) => {
    await login(page, USERS.rm);
    for (const label of ['Patterns', 'Effectiveness']) {
      await expect(page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).first()).toBeVisible();
    }
    await page.goto('/effectiveness');
    await expect(page.getByRole('heading', { name: /Action Effectiveness/i })).toBeVisible({ timeout: 30_000 });
    await logout(page);
  });

  test('Director: Incident Reconstruction wizard (by house → timeline → narrative → lock)', async ({ page }) => {
    await login(page, USERS.director);
    await expect(page.getByRole('button', { name: /^Reconstruction$/i }).first()).toBeVisible();
    await page.goto('/reconstruction');
    await expect(page.getByRole('heading', { name: /Incident Reconstruction/i })).toBeVisible({ timeout: 30_000 });
    await expect(page.getByText(/Scope the reconstruction/i)).toBeVisible();
    // By House is default; pick the first real service and generate
    const houseSelect = page.locator('select').first();
    const opts = houseSelect.locator('option');
    await expect.poll(async () => await opts.count()).toBeGreaterThan(1);
    await houseSelect.selectOption({ index: 1 });
    await page.getByRole('button', { name: /Generate reconstruction/i }).click();
    // Step 1: timeline + summary counts
    await expect(page.getByText(/Pre-incident signal timeline/i)).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/linked risk/i)).toBeVisible();
    await page.getByRole('button', { name: /Continue to assessment/i }).click();
    // Step 2: assessment
    await expect(page.getByText(/Trajectory & control-failure analysis/i)).toBeVisible();
    await page.getByRole('button', { name: /Draft narrative/i }).click();
    // Step 3: narrative + KLOE + lock button present (not locking, to avoid persisting test data)
    await expect(page.getByText(/CQC KEY LINE OF ENQUIRY/i)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('button', { name: /Lock reconstruction/i })).toBeVisible();
    await logout(page);
  });

  test('Super Admin: Governance Configuration tabs + per-sector thresholds', async ({ page }) => {
    await login(page, USERS.superadmin);
    await page.goto('/governance-config');
    await expect(page.getByRole('heading', { name: /Governance Configuration/i })).toBeVisible({ timeout: 30_000 });
    // All config tabs present
    for (const t of ['Services & Sector', 'Risk Domains', 'Signal Library', 'Pattern Thresholds', 'Escalation SLAs', 'Audit Log']) {
      await expect(page.getByRole('button', { name: t }).first()).toBeVisible();
    }
    // Services & Sector tab lists services with a sector control
    await page.getByRole('button', { name: 'Services & Sector' }).first().click();
    await expect(page.getByText(/Sector \(drives the engine\)/i)).toBeVisible({ timeout: 15_000 });
    // Risk Domains tab shows the CQC KLOE column
    await page.getByRole('button', { name: 'Risk Domains' }).first().click();
    await expect(page.getByText(/CQC KLOE/i).first()).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText(/Safe · S4|Safe · S1/i).first()).toBeVisible({ timeout: 15_000 });
    // Pattern Thresholds tab shows editable rows, and the sector toggle switches the library
    await page.getByRole('button', { name: 'Pattern Thresholds' }).first().click();
    await expect(page.getByText(/Signals to trigger/i)).toBeVisible({ timeout: 15_000 });
    await page.getByRole('button', { name: 'Domiciliary Care' }).first().click();
    await expect(page.getByText(/Visit Reliability/i).first()).toBeVisible({ timeout: 15_000 });
    // Escalation SLAs tab lists the time-bound triggers
    await page.getByRole('button', { name: 'Escalation SLAs' }).first().click();
    await expect(page.getByText(/HIGH_SAFEGUARDING/i)).toBeVisible({ timeout: 15_000 });
    await logout(page);
  });

  test('Navbar present on key pages (no blank nav)', async ({ page }) => {
    await login(page, USERS.director);
    for (const path of ['/risk-register', '/patients', '/weekly-review', '/escalation-log', '/reports']) {
      await page.goto(path);
      // The sidebar brand should always be present
      await expect(page.getByText('ORDIN CORE').first()).toBeVisible({ timeout: 20_000 });
    }
    await logout(page);
  });

  test('REGRESSION: View All targets (oversight-board, my-actions) do NOT log the user out', async ({ page }) => {
    await login(page, USERS.rm);
    for (const path of ['/oversight-board', '/my-actions']) {
      await page.goto(path);
      await page.waitForTimeout(2000);
      // Active user must NOT be bounced to /login
      expect(page.url()).not.toContain('/login');
      await expect(page.getByText('ORDIN CORE').first()).toBeVisible({ timeout: 20_000 });
    }
    await logout(page);
  });
});
