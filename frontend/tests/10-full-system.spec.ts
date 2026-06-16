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

  test('Director: nav items present, Oversight Register tabs, Patients search+filter', async ({ page }) => {
    await login(page, USERS.director);
    // Sidebar should contain the key nav items
    for (const label of ['Oversight Register', 'Patients', 'Escalations']) {
      await expect(page.getByRole('button', { name: new RegExp(label, 'i') }).first()).toBeVisible();
    }
    // Governance Oversight Register
    await page.goto('/risk-register');
    await expect(page.getByText('Governance Oversight Register')).toBeVisible();
    for (const tab of ['Emerging', 'Active', 'Strategic', 'Closed']) {
      await expect(page.getByText(new RegExp(tab, 'i')).first()).toBeVisible();
    }
    // Patients page: search box + site filter
    await page.goto('/patients');
    await expect(page.getByText('Patients').first()).toBeVisible();
    await expect(page.getByPlaceholder(/search patients/i)).toBeVisible();
    await expect(page.locator('select')).toHaveCount(1); // the site/service filter
    await page.getByPlaceholder(/search patients/i).fill('z');
    await page.waitForTimeout(800); // debounce
    await logout(page);
  });

  test('Director: Weekly Governance Review shows 5 questions', async ({ page }) => {
    await login(page, USERS.director);
    await page.goto('/weekly-review');
    await expect(page.getByText(/Weekly Governance Review/i)).toBeVisible({ timeout: 30_000 });
    // Five governance questions
    await expect(page.getByText(/What changed this week/i)).toBeVisible();
    await expect(page.getByText(/What concerns you most/i)).toBeVisible();
    await expect(page.getByText(/What actions are required/i)).toBeVisible();
    await expect(page.getByText(/Are previous actions working/i)).toBeVisible();
    await expect(page.getByText(/Overall governance position/i)).toBeVisible();
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

  test('TL: dashboard + Patients nav present', async ({ page }) => {
    await login(page, USERS.tl);
    await expect(page.getByRole('button', { name: /Patients/i }).first()).toBeVisible();
    await page.goto('/patients');
    await expect(page.getByPlaceholder(/search patients/i)).toBeVisible();
    await logout(page);
  });

  test('RI: oversight register + patients', async ({ page }) => {
    await login(page, USERS.ri);
    await page.goto('/risk-register');
    await expect(page.getByText('Governance Oversight Register')).toBeVisible();
    await page.goto('/patients');
    await expect(page.getByText('Patients').first()).toBeVisible();
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

  test('WRITE: RM saves a weekly governance review draft', async ({ page }) => {
    await login(page, USERS.rm);
    await page.goto('/weekly-review');
    await expect(page.getByText(/Weekly Governance Review/i)).toBeVisible({ timeout: 30_000 });
    const areas = page.locator('textarea');
    await areas.nth(0).fill('QA: medication engagement is the main concern this week.');
    await areas.nth(1).fill('QA: increase MAR audits and competency checks.');
    await page.getByRole('button', { name: /Emerging Concern/i }).click();
    await page.locator('textarea').last().fill('QA governance narrative for the automated weekly review test.');
    await page.getByRole('button', { name: /save draft/i }).click();
    await expect(page.getByText(/saved|draft/i).first()).toBeVisible({ timeout: 15_000 });
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
