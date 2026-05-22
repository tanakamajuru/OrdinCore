try {
  const { chromium } = require('playwright');
  console.log('playwright-chromium found:', typeof chromium);
} catch (e) {
  console.log('playwright-chromium error:', e.message);
}

try {
  const { chromium } = require('playwright-core');
  console.log('playwright-core found:', typeof chromium);
} catch (e) {
  console.log('playwright-core error:', e.message);
}
