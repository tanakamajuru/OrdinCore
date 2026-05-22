try {
  const { chromium } = require('@playwright/test');
  console.log('playwright chromium found:', typeof chromium);
} catch (e) {
  console.log('playwright chromium error:', e.message);
}
