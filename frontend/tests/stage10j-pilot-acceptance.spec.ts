import { test, expect } from '@playwright/test';
import path from 'path';

const enabled = process.env.STAGE10J === '1';
const rmEmail = process.env.STAGE10J_RM_EMAIL;
const rmPassword = process.env.STAGE10J_RM_PASSWORD;

test.describe('Stage 10J pilot acceptance gate', () => {
  test.skip(!enabled, 'Run only through scripts/stage10j/run-acceptance.sh');
  test.beforeEach(async ({ page }) => {
    expect(rmEmail).toBeTruthy(); expect(rmPassword).toBeTruthy();
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(rmEmail!);
    await page.getByLabel(/password/i).fill(rmPassword!);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).not.toHaveURL(/\/login/);
  });

  test('canonical governance screens are reachable', async ({ page }) => {
    const evidenceDir = process.env.STAGE10J_EVIDENCE_DIR!;
    for (const route of ['/governance-dashboard','/risk-register','/interventions','/escalation-log','/systemic-patterns','/effectiveness']) {
      const response = await page.goto(route);
      expect(response?.status()).toBeLessThan(400);
      await expect(page.locator('body')).not.toContainText(/application error|something went wrong|column .* does not exist/i);
      await page.screenshot({ path: path.join(evidenceDir, `stage10j-${route.slice(1)}.png`), fullPage: true });
    }
  });

  test('cross-tenant override is rejected for an authenticated RM', async ({ page }) => {
    const response = await page.request.get(`/api/v1/risks?company_id=${process.env.MIGRATED_TENANT_ID}`);
    expect(response.status()).toBe(403);
  });
});
