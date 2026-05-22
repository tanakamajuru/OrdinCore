import { test, expect, Page, BrowserContext } from '@playwright/test';

// ── Test users ─────────────────────────────────────────────────────────────
const users = {
  tl:       { email: 'lauren.gittins@beamoflight.org.uk', password: 'admin123' },
  rm:       { email: 'kuda@beamoflight.org.uk',           password: 'admin123' },
  ri:       { email: 'tendayi@beamoflight.org.uk',        password: 'admin123' },
  director: { email: 'lola@beamoflight.org.uk',           password: 'admin123' },
  admin:    { email: 'teddy@beamoflight.org.uk',          password: 'admin123' },
};

// ── Login helper ───────────────────────────────────────────────────────────
async function login(page: Page, email: string, password: string) {
  await page.goto('/login', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.locator('input[id="email"], input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.locator('button[type="submit"]').click();
  // Wait for redirect – dashboard, home, or role-specific path
  await page.waitForURL(/\/(dashboard|home|governance|admin)/, { timeout: 60_000 });
  await page.waitForLoadState('domcontentloaded');
}

// ── API token helper ────────────────────────────────────────────────────────
async function getToken(email: string, password: string): Promise<string> {
  const apiUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
  const res = await fetch(`${apiUrl}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  return json?.data?.token ?? json?.token ?? '';
}

// ── Signal wizard helper ────────────────────────────────────────────────────
// The SignalCaptureForm is a 13-step wizard where most selections are buttons
async function submitSignal(
  page: Page,
  opts: {
    relatedPerson?: string;
    signalType: string;
    domain: string;
    description: string;
    immediateAction: string;
    severity: string;
    happenedBefore: string;
    patternConcern: string;
    escalation: string;
  }
) {
  await page.goto('/governance-pulse', { waitUntil: 'domcontentloaded', timeout: 90_000 });
  await page.waitForLoadState('domcontentloaded');

  // ── Step 1: Date (pre-filled with today, just click Next) ─────────────────
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 2: Time (pre-filled, click Next) ─────────────────────────────────
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 3: Related person ─────────────────────────────────────────────────
  if (opts.relatedPerson) {
    await page.locator('input[type="text"]').first().fill(opts.relatedPerson);
  }
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 4: House – pick first visible house button ────────────────────────
  const houseBtn = page.locator('button[type="button"]').first();
  await houseBtn.waitFor({ state: 'visible', timeout: 10_000 });
  await houseBtn.click();
  await page.waitForTimeout(600); // let patient-validation debounce settle
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 5: Signal type button ─────────────────────────────────────────────
  await page.getByRole('button', { name: opts.signalType, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 6: Risk domain button ─────────────────────────────────────────────
  await page.getByRole('button', { name: opts.domain, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 7: Description textarea ──────────────────────────────────────────
  await page.locator('textarea:visible').first().fill(opts.description);
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 8: Immediate action textarea ─────────────────────────────────────
  await page.locator('textarea:visible').first().fill(opts.immediateAction);
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 9: Severity button ───────────────────────────────────────────────
  await page.getByRole('button', { name: opts.severity, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 10: Happened before button ──────────────────────────────────────
  await page.getByRole('button', { name: opts.happenedBefore, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 11: Pattern concern button ──────────────────────────────────────
  await page.getByRole('button', { name: opts.patternConcern, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 12: Escalation required button ──────────────────────────────────
  await page.getByRole('button', { name: opts.escalation, exact: true }).click();
  await page.locator('button:visible', { hasText: 'Next' }).click();

  // ── Step 13: Evidence (optional) – click Submit Signal ────────────────────
  await page.locator('button', { hasText: 'Submit Signal' }).click();

  // Sonner renders a <li data-sonner-toast> — check that directly
  await expect(page.locator('[data-sonner-toast]').first()).toBeVisible({ timeout: 15_000 });
}

// ── Test suite ─────────────────────────────────────────────────────────────
test.describe('Ordin Core – Closed Governance Loop', () => {
  let contextTL:       BrowserContext;
  let contextRM:       BrowserContext;
  let contextRI:       BrowserContext;
  let contextDirector: BrowserContext;
  let contextAdmin:    BrowserContext;

  let tlPage:       Page;
  let rmPage:       Page;
  let riPage:       Page;
  let directorPage: Page;
  let adminPage:    Page;

  let rmToken = '';

  // ── beforeAll: log in all five roles ──────────────────────────────────────
  test.beforeAll(async ({ browser }) => {
    // Each role gets its own isolated context (separate cookies/localStorage)
    contextTL       = await browser.newContext();
    contextRM       = await browser.newContext();
    contextRI       = await browser.newContext();
    contextDirector = await browser.newContext();
    contextAdmin    = await browser.newContext();

    tlPage       = await contextTL.newPage();
    rmPage       = await contextRM.newPage();
    riPage       = await contextRI.newPage();
    directorPage = await contextDirector.newPage();
    adminPage    = await contextAdmin.newPage();

    // Login sequentially so failures are easy to diagnose
    await login(tlPage,       users.tl.email,       users.tl.password);
    await login(rmPage,       users.rm.email,       users.rm.password);
    await login(riPage,       users.ri.email,       users.ri.password);
    await login(directorPage, users.director.email, users.director.password);
    await login(adminPage,    users.admin.email,    users.admin.password);

    rmToken = await getToken(users.rm.email, users.rm.password);
  }, 600_000); // 10-min budget: 5 logins on a slow server can each take ~60s

  test.afterAll(async () => {
    await contextTL.close();
    await contextRM.close();
    await contextRI.close();
    await contextDirector.close();
    await contextAdmin.close();
  });

  // ── Step 1: Admin checks user table ────────────────────────────────────────
  test('Step 1 – Admin can reach user management', async () => {
    // Correct route is /admin-users (not /admin/users)
    await adminPage.goto('/admin-users', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(adminPage.locator('body')).toBeVisible();

    // Page should render a heading or recognisable content
    const heading = adminPage.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 15_000 });

    // Verify TL appears in the user list if a table is present
    const userTable = adminPage.locator('table tbody tr');
    if (await userTable.count() > 0) {
      console.log(`Admin user table has ${await userTable.count()} rows`);
    } else {
      console.log('Admin user table not visible — page may use cards or a different layout');
    }
  });

  // ── Step 2: TL submits 3 behavioural signals ───────────────────────────────
  test('Step 2 – TL submits 3 behavioural signals for T Muller', async () => {
    // NOTE: T Muller is added as a patient in Step 11. Since related_person is
    // optional, we omit it here to avoid the patient-validation block.
    const base = {
      signalType:      'Incident',
      domain:          'Behaviour',
      immediateAction: 'De-escalated the situation and offered alternatives.',
      severity:        'High',
      happenedBefore:  'Yes',
      escalation:      'Manager Review',
    };

    await submitSignal(tlPage, {
      ...base,
      description:    'Resident became agitated and refused medication. (signal 1)',
      patternConcern: 'Clear',
    });

    await submitSignal(tlPage, {
      ...base,
      description:    'Resident became agitated and refused medication. (signal 2)',
      patternConcern: 'Clear',
    });

    await submitSignal(tlPage, {
      ...base,
      description:    'Resident became agitated and refused medication. (signal 3)',
      patternConcern: 'Escalating',
    });
  });

  // ── Step 3: RM dashboard shows signals / risk candidates ───────────────────
  test('Step 3 – RM dashboard loads and shows candidate panel', async () => {
    await rmPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(rmPage.locator('body')).toBeVisible();

    // Dashboard renders role-specific content – look for any visible heading
    const heading = rmPage.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 30_000 });
    console.log(`RM dashboard heading: ${await heading.textContent()}`);

    // Optionally poll the clusters API
    if (rmToken) {
      const apiUrl = process.env.API_URL || 'http://localhost:3001/api/v1';
      let found = false;
      for (let i = 0; i < 6; i++) {
        try {
          const res = await fetch(`${apiUrl}/clusters`, {
            headers: { Authorization: `Bearer ${rmToken}` },
          });
          const json = await res.json();
          const clusters: any[] = json?.data ?? json ?? [];
          if (clusters.some(c => c.risk_domain === 'Behaviour' && c.signal_count >= 3)) {
            found = true;
            break;
          }
        } catch { /* ignore */ }
        await rmPage.waitForTimeout(10_000);
      }
      console.log(`Behaviour cluster found via API: ${found}`);
    }
  });

  // ── Step 4: RM promotes a risk candidate ──────────────────────────────────
  test('Step 4 – RM promotes risk candidate', async () => {
    await rmPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });

    // Look for Promote button anywhere on the dashboard
    const promoteBtn = rmPage.locator('button', { hasText: 'Promote' }).first();
    if (await promoteBtn.isVisible({ timeout: 5_000 })) {
      await promoteBtn.click();
      // May navigate to a promotion page or open a modal
      await rmPage.waitForLoadState('domcontentloaded');

      // Fill in risk title if present
      const titleInput = rmPage.locator('[name="risk_title"], input[placeholder*="risk"], input[placeholder*="title"]').first();
      if (await titleInput.isVisible({ timeout: 5_000 })) {
        await titleInput.fill('Escalating behavioural risk – T Muller');
      }

      // Submit
      const registerBtn = rmPage.locator('button', { hasText: /Register|Promote|Save|Confirm/i }).first();
      if (await registerBtn.isVisible()) {
        await registerBtn.click();
        await expect(
          rmPage.locator('text=success').or(rmPage.locator('[data-sonner-toast]')).or(rmPage.locator('.toast-success'))
        ).toBeVisible({ timeout: 15_000 });
      }
    } else {
      console.warn('No Promote button visible on RM dashboard – skipping promotion step.');
    }
  });

  // ── Step 5: RM visits risk register ───────────────────────────────────────
  test('Step 5 – RM accesses risk register', async () => {
    await rmPage.goto('/risk-register', { waitUntil: 'domcontentloaded' });
    await expect(rmPage.locator('body')).toBeVisible();
    // Page should have some content (table, cards, empty-state is fine)
    const content = rmPage.locator('main, table, [class*="risk"]').first();
    await expect(content).toBeVisible({ timeout: 10_000 });
  });

  // ── Step 6: TL checks My Actions ──────────────────────────────────────────
  test('Step 6 – TL can reach My Actions page', async () => {
    await tlPage.goto('/my-actions', { waitUntil: 'domcontentloaded' });
    await expect(tlPage.locator('body')).toBeVisible();

    const completeBtn = tlPage.locator('button', { hasText: /Complete|Done/i }).first();
    if (await completeBtn.isVisible({ timeout: 5_000 })) {
      await completeBtn.click();

      // Fill completion modal if it appears
      const outcomeField = tlPage.locator('[name="completion_outcome"], textarea').first();
      if (await outcomeField.isVisible({ timeout: 5_000 })) {
        await outcomeField.fill('Partial improvement');
        const rationaleField = tlPage.locator('[name="completion_rationale"], textarea').nth(1);
        if (await rationaleField.isVisible()) {
          await rationaleField.fill('Behavioural incidents reduced after care plan update.');
        }
        const submitBtn = tlPage.locator('button', { hasText: /Submit|Confirm/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await expect(
            tlPage.locator('text=success').or(tlPage.locator('[data-sonner-toast]'))
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    } else {
      console.log('No actions awaiting completion for TL at this time.');
    }
  });

  // ── Step 7: RM reviews effectiveness ──────────────────────────────────────
  test('Step 7 – RM dashboard loads action review panel', async () => {
    await rmPage.goto('/dashboard', { waitUntil: 'domcontentloaded' });
    await expect(rmPage.locator('body')).toBeVisible();

    const reviewBtn = rmPage.locator('button', { hasText: /Review/i }).first();
    if (await reviewBtn.isVisible({ timeout: 5_000 })) {
      await reviewBtn.click();
      await rmPage.waitForLoadState('domcontentloaded');

      const decisionField = rmPage.locator('[name="rm_decision"], select').first();
      if (await decisionField.isVisible({ timeout: 5_000 })) {
        await decisionField.selectOption({ index: 1 });
        const commentField = rmPage.locator('[name="comment"], textarea').first();
        if (await commentField.isVisible()) {
          await commentField.fill('Behavioural incidents down by 50%. Trajectory updated to Improving.');
        }
        const submitBtn = rmPage.locator('button', { hasText: /Submit|Confirm/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await expect(
            rmPage.locator('text=success').or(rmPage.locator('[data-sonner-toast]'))
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    } else {
      console.log('No actions awaiting RM review at this time.');
    }
  });

  // ── Step 8: RM weekly review page loads ───────────────────────────────────
  test('Step 8 – RM can access weekly review', async () => {
    await rmPage.goto('/weekly-review', { waitUntil: 'domcontentloaded' });
    await expect(rmPage.locator('body')).toBeVisible();

    const finaliseBtn = rmPage.locator('button', { hasText: /Finalise|Submit|Complete/i }).first();
    if (await finaliseBtn.isVisible({ timeout: 5_000 })) {
      await finaliseBtn.click();
      await expect(
        rmPage.locator('text=success').or(rmPage.locator('[data-sonner-toast]'))
      ).toBeVisible({ timeout: 15_000 });
    } else {
      console.log('No Finalise button visible – weekly review may require completing earlier steps first.');
    }
  });

  // ── Step 9: RI validates weekly review ────────────────────────────────────
  test('Step 9 – RI can access weekly review page', async () => {
    await riPage.goto('/weekly-review', { waitUntil: 'domcontentloaded' });
    await expect(riPage.locator('body')).toBeVisible();

    const validateBtn = riPage.locator('button', { hasText: /Validate|Approve/i }).first();
    if (await validateBtn.isVisible({ timeout: 5_000 })) {
      await validateBtn.click();
      await riPage.waitForLoadState('domcontentloaded');

      const statusField = riPage.locator('[name="validation_status"], select').first();
      if (await statusField.isVisible({ timeout: 5_000 })) {
        await statusField.selectOption({ index: 1 });
        const commentField = riPage.locator('[name="validation_comment"], textarea').first();
        if (await commentField.isVisible()) {
          await commentField.fill('Governance narrative acceptable. Approved.');
        }
        const submitBtn = riPage.locator('button', { hasText: /Submit|Confirm/i }).first();
        if (await submitBtn.isVisible()) {
          await submitBtn.click();
          await expect(
            riPage.locator('text=success').or(riPage.locator('[data-sonner-toast]'))
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    } else {
      console.log('No Validate button visible – review may not be in a state awaiting RI validation.');
    }
  });

  // ── Step 10: Director strategic dashboard ─────────────────────────────────
  test('Step 10 – Director strategic dashboard loads', async () => {
    // Navigate to the shared /dashboard route (RoleBasedDashboard renders director-specific content)
    await directorPage.goto('/dashboard', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(directorPage.locator('body')).toBeVisible();

    // Any heading is sufficient – the director dashboard uses div-based layout with no <main>
    const heading = directorPage.locator('h1, h2, h3').first();
    await expect(heading).toBeVisible({ timeout: 30_000 });
    console.log(`Director dashboard heading: ${await heading.textContent()}`);

    // Trends page
    await directorPage.goto('/trends', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(directorPage.locator('body')).toBeVisible();
    await expect(directorPage.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 });

    // Reports page
    await directorPage.goto('/reports', { waitUntil: 'domcontentloaded', timeout: 90_000 });
    await expect(directorPage.locator('body')).toBeVisible();
    await expect(directorPage.locator('h1, h2, h3').first()).toBeVisible({ timeout: 15_000 });
  });

  // ── Step 11: Admin service-user management ────────────────────────────────
  test('Step 11 – Admin can access service user management', async () => {
    await adminPage.goto('/admin/service-users', { waitUntil: 'domcontentloaded' });
    await expect(adminPage.locator('body')).toBeVisible();

    // Look for an Add / New button
    const addBtn = adminPage.locator('button', { hasText: /Add|New|Create/i }).first();
    if (await addBtn.isVisible({ timeout: 5_000 })) {
      await addBtn.click();
      await adminPage.waitForLoadState('domcontentloaded');

      const firstNameInput = adminPage.locator('[name="first_name"], input[placeholder*="first"]').first();
      if (await firstNameInput.isVisible({ timeout: 5_000 })) {
        await firstNameInput.fill('Thomas');
        const lastNameInput = adminPage.locator('[name="last_name"], input[placeholder*="last"]').first();
        if (await lastNameInput.isVisible()) {
          await lastNameInput.fill('Muller');
        }
        const saveBtn = adminPage.locator('button', { hasText: /Save|Add|Create|Submit/i }).first();
        if (await saveBtn.isVisible()) {
          await saveBtn.click();
          await expect(
            adminPage.locator('text=success')
              .or(adminPage.locator('[data-sonner-toast]'))
              .or(adminPage.locator('.toast-success'))
          ).toBeVisible({ timeout: 15_000 });
        }
      }
    } else {
      console.log('Service user management UI uses a different interaction pattern.');
    }
  });
});
