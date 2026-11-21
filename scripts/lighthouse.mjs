// Lighthouse audit of the main pages, on mobile (Lighthouse default: slow 4G + mid-range phone) and desktop.
//
//   npm run preview        (in another terminal: production build served on http://localhost:3000)
//   npm run lighthouse
//
// Writes one HTML report per page and form factor to docs/lighthouse/, plus summary.json.
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as chromeLauncher from 'chrome-launcher';
import lighthouse from 'lighthouse';
import desktopConfig from 'lighthouse/core/config/desktop-config.js';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = fileURLToPath(new URL('../docs/lighthouse/', import.meta.url));
mkdirSync(OUT, { recursive: true });

const PAGES = [
  { name: 'accueil', path: '/' },
  { name: 'explorer', path: '/explorer' },
  { name: 'fiche', path: '/lieux/1' },
  { name: 'connexion', path: '/connexion' },
];
const FORM_FACTORS = [
  { name: 'mobile', config: undefined },
  { name: 'desktop', config: desktopConfig },
];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const RUNS_PER_PAGE = Number(process.env.RUNS ?? 3);

/** One audit; null when Lighthouse failed to record the page load (NO_NAVSTART happens now and then). */
async function auditOnce(page, formFactor, config) {
  const result = await lighthouse(
    `${BASE}${page.path}`,
    { port: chrome.port, output: 'html', logLevel: 'error', onlyCategories: CATEGORIES },
    config,
  );
  if (!result.lhr.runtimeError) return result;
  console.log(`        (${page.path} ${formFactor}: ${result.lhr.runtimeError.code}, retrying)`);
  return null;
}

const chrome = await chromeLauncher.launch({ chromeFlags: ['--headless=new', '--no-first-run'] });
const summary = [];

try {
  // Warm-up run, not recorded: the first audit after Chrome starts sometimes fails to record its
  // trace (NO_NAVSTART), whatever the page.
  await lighthouse(`${BASE}/`, { port: chrome.port, logLevel: 'error', onlyCategories: ['seo'] });

  for (const { name: formFactor, config } of FORM_FACTORS) {
    for (const page of PAGES) {
      // Performance scores vary from one run to the next (CPU load, network): as Lighthouse
      // recommends, run each page several times and keep the median run.
      const runs = [];
      while (runs.length < RUNS_PER_PAGE) {
        const run = await auditOnce(page, formFactor, config);
        if (run) runs.push(run);
      }
      runs.sort((a, b) => a.lhr.categories.performance.score - b.lhr.categories.performance.score);
      const result = runs[Math.floor(runs.length / 2)];
      writeFileSync(`${OUT}${page.name}-${formFactor}.html`, result.report);
      const scores = Object.fromEntries(
        CATEGORIES.map((id) => [id, Math.round((result.lhr.categories[id]?.score ?? 0) * 100)]),
      );
      const metrics = {
        fcp: result.lhr.audits['first-contentful-paint']?.displayValue,
        lcp: result.lhr.audits['largest-contentful-paint']?.displayValue,
        tbt: result.lhr.audits['total-blocking-time']?.displayValue,
        cls: result.lhr.audits['cumulative-layout-shift']?.displayValue,
      };
      // Audits that lost points, to know what to fix.
      const failing = Object.values(result.lhr.audits)
        .filter(
          (audit) =>
            audit.score !== null && audit.score < 0.9 && audit.scoreDisplayMode !== 'informative',
        )
        .map((audit) => `${audit.id} (${Math.round(audit.score * 100)})`);
      summary.push({ page: page.path, formFactor, scores, metrics, failing });
      console.log(
        `${formFactor.padEnd(7)} ${page.path.padEnd(10)} perf ${scores.performance} · a11y ${scores.accessibility}` +
          ` · best ${scores['best-practices']} · seo ${scores.seo}   LCP ${metrics.lcp} TBT ${metrics.tbt} CLS ${metrics.cls}`,
      );
      if (failing.length) console.log(`        to improve: ${failing.join(', ')}`);
    }
  }
} finally {
  await chrome.kill();
}

writeFileSync(
  `${OUT}summary.json`,
  JSON.stringify({ date: new Date().toISOString(), base: BASE, results: summary }, null, 2),
);
console.log(`\nReports written to docs/lighthouse/`);
