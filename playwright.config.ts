import { defineConfig, devices } from '@playwright/test';

/**
 * End-to-end tests: the 3 user journeys of the brief, keyboard navigation and an automated
 * accessibility audit, in several browsers.
 *
 *   npm run e2e                    all browsers, on the dev server (started if it is not running)
 *   npx playwright test --project=chrome
 *   E2E_BASE_URL=http://localhost:3000 npm run e2e     on the production build (npm run preview)
 *
 * Chrome and Edge use the browsers installed on the machine; Firefox and WebKit (Safari's engine)
 * are downloaded once with `npx playwright install firefox webkit`.
 */
const baseURL = process.env['E2E_BASE_URL'] ?? 'http://localhost:4200';

export default defineConfig({
  testDir: './e2e',
  // One database shared by all tests: run them one after the other.
  workers: 1,
  fullyParallel: false,
  // Generous: on the dev server each page is compiled on its first visit.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL,
    locale: 'fr-FR',
    timezoneId: 'Africa/Tunis',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'chrome', use: { ...devices['Desktop Chrome'], channel: 'chrome' } },
    { name: 'edge', use: { ...devices['Desktop Edge'], channel: 'msedge' } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'], channel: 'chrome' } },
  ],
  // With E2E_BASE_URL the server is already running (e.g. npm run preview).
  webServer: process.env['E2E_BASE_URL']
    ? undefined
    : {
        command: 'npm run dev',
        url: 'http://localhost:4200/api/health',
        reuseExistingServer: true,
        timeout: 180_000,
      },
});
