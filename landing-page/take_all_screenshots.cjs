const { chromium } = require('@playwright/test');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5174';
const API_URL = 'http://localhost:3001/api/v1';
const ASSETS_DIR = path.join(__dirname, '..', 'landing-page', 'src', 'assets');

// Users for each role (from .env.test and seedRealisticData.ts)
const ROLE_USERS = [
  { role: 'team_leader', label: 'Team Leader', email: 'lauren.gittins@beamoflight.org.uk', password: 'admin123' },
  { role: 'registered_manager', label: 'Registered Manager', email: 'kuda@beamoflight.org.uk', password: 'admin123' },
  { role: 'responsible_individual', label: 'Responsible Individual', email: 'tendayi@beamoflight.org.uk', password: 'admin123' },
  { role: 'director', label: 'Director', email: 'lola@beamoflight.org.uk', password: 'admin123' },
];

// Output pages to capture
const OUTPUT_PAGES = [
  { name: 'output_pulse_review', path: '/governance-pulse', label: 'Governance Pulse Review' },
  { name: 'output_risk_trajectory', path: '/risk-register', label: 'Risk Trajectory' },
  { name: 'output_escalation_tracking', path: '/escalation-log', label: 'Escalation Tracking' },
  { name: 'output_rhythm_completion', path: '/weekly-review', label: 'Governance Rhythm' },
  { name: 'output_oversight_narrative', path: '/monthly-report', label: 'Oversight Narrative' },
];

async function loginAndScreenshot(browser, user, screenshotName, navigateTo) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();

  try {
    console.log(`  Navigating to login...`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);

    console.log(`  Filling credentials for ${user.email}...`);
    // Fill email
    const emailInput = page.locator('input[type="email"], input[name="email"]').first();
    await emailInput.waitFor({ state: 'visible', timeout: 10000 });
    await emailInput.fill(user.email);

    // Fill password
    const passwordInput = page.locator('input[type="password"], input[name="password"]').first();
    await passwordInput.waitFor({ state: 'visible', timeout: 10000 });
    await passwordInput.fill(user.password);

    // Click submit
    const submitBtn = page.locator('button[type="submit"]').first();
    await submitBtn.click();

    console.log(`  Waiting for dashboard redirect...`);
    await page.waitForURL(/dashboard|companies|super-admin|oversight/, { timeout: 20000 });
    await page.waitForTimeout(3000); // Let animations and charts load

    // Navigate to specific page if requested
    if (navigateTo && navigateTo !== '/dashboard') {
      console.log(`  Navigating to ${navigateTo}...`);
      await page.goto(`${BASE_URL}${navigateTo}`, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForTimeout(3000);
    }

    const screenshotPath = path.join(ASSETS_DIR, `${screenshotName}.png`);
    await page.screenshot({ path: screenshotPath, type: 'png' });
    console.log(`  ✅ Saved: ${screenshotPath}`);
  } catch (err) {
    console.error(`  ❌ Error for ${screenshotName}: ${err.message}`);
  } finally {
    await context.close();
  }
}

async function main() {
  console.log('🚀 Starting Playwright screenshot capture for Ordin Core landing page...\n');

  if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });

  // 1. Role-based dashboard screenshots
  console.log('📸 Capturing role-based dashboard screenshots...\n');
  for (const user of ROLE_USERS) {
    console.log(`🔄 ${user.label} (${user.email})`);
    await loginAndScreenshot(browser, user, `role_${user.role}`, '/dashboard');
  }

  // 2. Output-specific screenshots (using registered_manager for rich data views)
  console.log('\n📸 Capturing governance output screenshots...\n');
  const rmUser = ROLE_USERS[1]; // Registered Manager has broadest access
  for (const output of OUTPUT_PAGES) {
    console.log(`🔄 ${output.label} (${output.path})`);
    await loginAndScreenshot(browser, rmUser, output.name, output.path);
  }

  await browser.close();
  console.log('\n🎉 All screenshots captured successfully!');
}

main().catch(err => {
  console.error('❌ Fatal error:', err.message);
  process.exit(1);
});
