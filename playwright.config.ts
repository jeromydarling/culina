import { defineConfig, devices } from '@playwright/test';

/**
 * Culina end-to-end tests.
 *
 * These run against the DEPLOYED site (Cloudflare Worker serving the SPA + API),
 * NOT a local dev server. Default to production; override with BASE_URL.
 *
 *   BASE_URL=https://culina.life npx playwright test
 *
 * Note: this repo's sandbox can't run a browser (egress blocked). Validate specs
 * locally with `npx playwright test --list`; the real run happens in CI (GitHub
 * Actions has Chromium). See tests/README.md.
 */
const BASE_URL = process.env.BASE_URL || 'https://culina.life';

export default defineConfig({
  testDir: './tests/e2e',
  // The journey is intentionally serial (one shared account); don't parallelize
  // files against each other in CI either, to keep the deployed DB calm.
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI
    ? [['github'], ['html', { open: 'never' }]]
    : [['list'], ['html', { open: 'never' }]],
  timeout: 75_000,
  expect: { timeout: 20_000 },
  use: {
    baseURL: BASE_URL,
    // Collapse framer-motion / CSS animations to instant. Animating elements stay
    // "unstable" and make .click() time out — this kills a whole class of flake.
    reducedMotion: 'reduce',
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
});
