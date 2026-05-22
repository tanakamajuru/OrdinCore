import { defineConfig, devices } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';
import { fileURLToPath } from 'url';

// ESM-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Delete cached test suffix to ensure fresh suffix on new test runs
if (process.env.TEST_WORKER_INDEX === undefined) {
  const suffixFile = path.resolve(__dirname, 'tests', 'test-suffix.tmp');
  if (fs.existsSync(suffixFile)) {
    try {
      fs.unlinkSync(suffixFile);
    } catch (e) {
      // ignore
    }
  }
}

// Manually load .env.test (no dotenv dependency required)
function loadEnvFile(filePath: string) {
  if (!fs.existsSync(filePath)) return;
  const lines = fs.readFileSync(filePath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const val = trimmed.slice(eqIdx + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key && !(key in process.env)) process.env[key] = val;
  }
}
loadEnvFile(path.resolve(__dirname, '.env.test'));
loadEnvFile(path.resolve(__dirname, '.env'));

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: false,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: 0,
  /* Single worker for ordered E2E governance loop */
  workers: 1,
  /* Global timeout per test – generous for slow remote server */
  timeout: 300_000,
  /* Global expect timeout */
  expect: { timeout: 30_000 },
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: [['html', { open: 'never' }], ['list']],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL — comes from .env.test BASE_URL or falls back to localhost */
    baseURL: process.env.BASE_URL || 'http://localhost:5173',

    /* Always collect trace for easier debugging */
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    actionTimeout: 30_000,
    navigationTimeout: 90_000,
  },

  /* Use Chromium only for E2E governance loop tests — faster and more stable */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  /* Run local dev server only when not pointed at a live URL */
  webServer: process.env.BASE_URL && !process.env.BASE_URL.includes('localhost')
    ? undefined
    : {
        command: 'pnpm dev',
        url: 'http://localhost:5173',
        reuseExistingServer: true,
      },
});
