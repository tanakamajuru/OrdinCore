import { test, expect } from '@playwright/test';

test.describe('RM weekly governance workspace', () => {
  test('replaces the visible 13-step wizard and preserves finalisation controls', async ({ page }) => {
    await page.goto('/weekly-review');
    await expect(page.getByTestId('rm-weekly-governance-workspace')).toBeVisible();
    await expect(page.getByText('Collective Daily Team Briefing')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Finalise for validation' })).toBeVisible();
    await expect(page.getByText(/13 sequential steps/i)).toHaveCount(0);
  });
});
