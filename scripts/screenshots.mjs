// Captures the README screenshots (docs/screenshots/*.png) from the running app.
//
//   npm run dev            (in another terminal)
//   npm run db:reset       (optional: clean demo data first)
//   npm run screenshots
//
// Uses the Chrome installed on the machine (PW_CHANNEL=msedge for Edge, PW_CHANNEL= for Playwright's Chromium).
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const BASE = process.env.BASE_URL ?? 'http://localhost:4200';
const OUT = fileURLToPath(new URL('../docs/screenshots/', import.meta.url));
const channel = process.env.PW_CHANNEL ?? 'chrome';
mkdirSync(OUT, { recursive: true });

const DESKTOP = { width: 1440, height: 900 };
const TABLET = { width: 768, height: 1024 };
const PHONE = { width: 390, height: 844 };

const browser = await chromium.launch(channel ? { channel } : {});

async function shoot(name, path, viewport, { setup, fullPage = false, login = false, wait = 1500 } = {}) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1, locale: 'fr-FR', timezoneId: 'Africa/Tunis' });
  const page = await context.newPage();
  if (login === 'demo') {
    await page.request.post(`${BASE}/api/auth/login`, { data: { email: 'demo@spotfinder.tn', password: 'SpotFinder2026' } });
  } else if (login === 'fresh') {
    // A new account, so "Je suis ici" is never blocked by the 15-minute rule.
    const email = `capture-${Date.now()}@example.tn`;
    await page.request.post(`${BASE}/api/auth/register`, { data: { name: 'Nadia', email, password: 'Motdepasse1' } });
  }
  await page.goto(`${BASE}${path}`, { waitUntil: 'load' });
  await page.locator('main h1').first().waitFor({ state: 'attached', timeout: 30_000 }); // page rendered
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(wait); // map tiles, count-up animation
  if (setup) await setup(page);
  await page.screenshot({ path: `${OUT}${name}.png`, fullPage });
  console.log(`✔ docs/screenshots/${name}.png`);
  await context.close();
}

await shoot('01-accueil', '/', DESKTOP);
await shoot('02-explorer', '/explorer?bruit=silencieux,modere&wifi=1', DESKTOP, { wait: 3500 });
await shoot('03-fiche', '/lieux/1', DESKTOP, { wait: 2500 });
await shoot('04-fiche-mobile', '/lieux/1', PHONE, { wait: 2500 });
await shoot('05-je-suis-ici-mobile', '/lieux/3', PHONE, {
  login: 'fresh',
  wait: 2000,
  setup: async (page) => {
    await page.getByRole('button', { name: 'Je suis ici' }).click();
    await page.getByRole('dialog').getByText('Saturé', { exact: true }).click();
    await page.waitForTimeout(500);
  },
});
await shoot('06-explorer-mobile-carte', '/explorer', PHONE, {
  wait: 2000,
  setup: async (page) => {
    await page.getByRole('button', { name: 'Carte' }).click();
    await page.waitForTimeout(2500);
  },
});
await shoot('07-explorer-tablette', '/explorer?ouvert=1', TABLET, { wait: 3500 });
await shoot('08-favoris', '/compte/favoris', DESKTOP, { login: 'demo' });
await shoot('09-ajouter', '/ajouter', DESKTOP, { login: 'demo', wait: 2500 });
await shoot('10-a-propos', '/a-propos', DESKTOP);

await browser.close();
