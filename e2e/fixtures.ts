import { expect, test as base, type APIRequestContext, type Page } from '@playwright/test';

/** 1×1 transparent PNG, served instead of real map tiles (faster, and polite to OpenStreetMap). */
const BLANK_TILE = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
  'base64',
);

export const DEMO = { email: 'demo@spotfinder.tn', password: 'SpotFinder2026' };

/**
 * Every test gets a page where:
 * - map tiles are answered locally,
 * - any console error or uncaught exception makes the test fail ("no console errors" in the brief).
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(`console: ${message.text()}`);
    });
    await page.route(/tile\.openstreetmap\.org/, (route) =>
      route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_TILE }),
    );

    await use(page);

    expect(errors, 'no console errors').toEqual([]);
  },
});

export { expect };

/** A brand-new account, logged in through the API (the session cookie is shared with the page). */
export async function registerFreshUser(
  request: APIRequestContext,
  name = 'Testeur E2E',
): Promise<void> {
  const email = `e2e-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.tn`;
  const response = await request.post('/api/auth/register', {
    data: { name, email, password: 'Motdepasse1' },
  });
  expect(response.status()).toBe(201);
}

export async function loginAsDemo(request: APIRequestContext): Promise<void> {
  const response = await request.post('/api/auth/login', { data: DEMO });
  expect(response.status()).toBe(200);
}

export const isMobile = (page: Page) => (page.viewportSize()?.width ?? 1280) < 768;
