import { test, expect } from '@playwright/test';
import { TestUsers } from './auth.setup';
import { SAMPLE_SIGNALS, TEST_SERVICES } from './fixtures/testData';

test.describe('Signal to Serious Incident Promotion Flow', () => {
  let tlToken: string;
  let signalId: string;

  test.beforeAll(async ({ request }) => {
    const auth = await TestUsers.teamLeader(request);
    tlToken = auth.token;

    // Create a signal to promote
    const response = await request.post(`${process.env.API_URL}/pulses`, {
      headers: { Authorization: `Bearer ${tlToken}` },
      data: SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT
    });
    const signal = await response.json();
    signalId = signal.data.id;
    console.log('Created signal for UI test:', signalId, signal.data.review_status);
  });

  test('Verify "Promote to Serious Incident" button and pre-fill logic', async ({ page }) => {
    // 1. Login as RM
    await page.goto('/');
    await page.fill('input[type="email"]', process.env.TEST_USER_RM_EMAIL!);
    await page.fill('input[type="password"]', process.env.TEST_USER_RM_PASSWORD!);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/.*dashboard/);

    // 2. Navigate to Signal Detail
    await page.goto(`/signals/${signalId}`);
    
    // 3. Verify "Promote to Serious Incident" button exists
    const promoteBtn = page.getByRole('button', { name: /Promote to Serious Incident/i });
    await expect(promoteBtn).toBeVisible();

    // 4. Click Promote button
    await promoteBtn.click();

    // 5. Verify navigation to Incident Hub
    await expect(page).toHaveURL(/.*incidents/);

    // 6. Verify Incident Creation Modal is open and pre-filled
    const modalTitle = page.getByText(/Report Serious Incident/i);
    await expect(modalTitle).toBeVisible();

    // 7. Verify pre-filled fields
    const titleInput = page.getByPlaceholder(/Brief title/i);
    // The title in SignalDetail is `Serious Incident: ${signal.signal_type} - ${signal.related_person}`
    // Since related_person might be empty in the mock, it will be "Serious Incident: Incident - "
    await expect(titleInput).toHaveValue(/Serious Incident: Incident/i);

    const typeSelect = page.getByLabel(/Incident Type/i);
    await expect(typeSelect).toHaveValue('other');

    const severitySelect = page.getByLabel(/Severity Level/i);
    await expect(severitySelect).toHaveValue('Moderate');

    const descriptionTextarea = page.getByLabel(/Incident Description/i);
    await expect(descriptionTextarea).toHaveValue(SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT.description);

    const immediateActionTextarea = page.getByLabel(/Immediate Actions Taken/i);
    await expect(immediateActionTextarea).toHaveValue(SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT.immediate_action);

    test.setTimeout(60000);

    // 8. Submit the incident
    await page.getByRole('button', { name: /Submit Serious Incident/i }).click();

    // 9. Verify success and modal closure
    await expect(modalTitle).not.toBeVisible({ timeout: 10000 });
    
    // 10. Verify incident appears in list
    const incidentRow = page.getByText(SAMPLE_SIGNALS.BEHAVIOUR_INCIDENT.description).first();
    await expect(incidentRow).toBeVisible();
  });
});
