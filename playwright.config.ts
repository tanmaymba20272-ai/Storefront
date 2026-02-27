import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for e2e tests.
 *
 * Run all tests:     npx playwright test
 * Run with UI:       npx playwright test --ui
 * Debug single test: npx playwright test tests/e2e/checkout.spec.ts --debug
 *
 * Before first run:  npm init playwright@latest  (or npx playwright install)
 */

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,

  // Report: HTML report + GitHub Actions annotation in CI.
  reporter: process.env.CI
    ? [['github'], ['html', { outputFolder: 'playwright-report', open: 'never' }]]
    : [['html', { outputFolder: 'playwright-report', open: 'on-failure' }]],

  use: {
    // Base URL so tests can use relative paths: await page.goto('/').
    baseURL: process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000',

    // Collect traces on first retry for debugging failures.
    trace: 'on-first-retry',

    // Screenshot on failure.
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-safari',
      use: { ...devices['iPhone 14'] },
    },
  ],

  // Start the Next.js dev server before running tests.
  // Remove this block if you prefer to start the server separately.
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
})
