const { chromium } = require('playwright');
const path = require('path');

async function main() {
  console.log('🚀 Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 800 });
  
  console.log('Navigating to login page...');
  await page.goto('http://localhost:5173/login');
  
  console.log('Filing login form...');
  await page.fill('input[type="email"]', 'superadmin@caresignal.com');
  await page.fill('input[type="password"]', 'admin123');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for dashboard navigation...');
  // We can support multiple redirects depending on the active test user
  await page.waitForURL(/dashboard|companies|super-admin/, { timeout: 15000 });
  await page.waitForTimeout(4000); // Allow animations & charts to load fully
  
  const screenshotPath = path.join(__dirname, '../landing-page/public/screenshot.jpg');
  await page.screenshot({ path: screenshotPath, quality: 95, type: 'jpeg' });
  console.log('✅ Screenshot captured and saved to', screenshotPath);
  
  await browser.close();
}

main().catch(err => {
  console.error('❌ Error taking screenshot:', err.message);
  process.exit(1);
});
