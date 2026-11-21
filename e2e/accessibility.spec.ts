import AxeBuilder from '@axe-core/playwright';
import { expect, loginAsDemo, test } from './fixtures';

/**
 * Automated WCAG 2.1 AA audit (axe-core) of every page: contrast, labels, landmarks, ARIA…
 * Automated tools catch roughly a third of accessibility problems, so this complements,
 * not replaces, the manual keyboard checks below.
 */
const PUBLIC_PAGES = [
  '/',
  '/explorer',
  '/explorer?bruit=silencieux&prises=1',
  '/lieux/1',
  '/connexion',
  '/inscription',
  '/a-propos',
  '/page-qui-n-existe-pas',
];
const MEMBER_PAGES = ['/ajouter', '/compte/profil', '/compte/favoris', '/compte/avis'];

test.describe('Accessibilité (axe-core, WCAG 2.1 AA)', () => {
  // One browser is enough for the audit: the DOM is the same everywhere.
  test.beforeEach(() => {
    test.skip(test.info().project.name !== 'chrome', 'the audit runs once, in Chrome');
  });

  for (const path of [...PUBLIC_PAGES, ...MEMBER_PAGES]) {
    test(`${path} n’a aucune violation`, async ({ page }) => {
      if (MEMBER_PAGES.includes(path)) await loginAsDemo(page.request);
      await page.goto(path);
      await expect(page.locator('main h1')).toBeAttached();
      await page.waitForLoadState('networkidle');

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        // Leaflet's own attribution control is a third-party widget (legally required credit).
        .exclude('.leaflet-control-attribution')
        .analyze();

      const summary = results.violations.map(
        (v) => `${v.id} (${v.impact}): ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
      expect(summary).toEqual([]);
    });
  }

  test('chaque page a un seul h1 et les repères header / nav / main / footer', async ({ page }) => {
    test.setTimeout(120_000); // visits 8 pages
    for (const path of PUBLIC_PAGES) {
      await page.goto(path);
      // Some pages have a visually hidden h1 (Explorer): "attached", not "visible".
      await expect(page.locator('main h1'), path).toBeAttached();
      await expect(page.locator('h1'), path).toHaveCount(1);
      for (const landmark of ['banner', 'main', 'contentinfo']) {
        await expect(page.getByRole(landmark as 'banner'), `${path} ${landmark}`).toHaveCount(1);
      }
      await expect(page.getByRole('navigation', { name: 'Navigation principale' })).toBeAttached();
    }
  });
});

test.describe('Clavier', () => {
  test.skip(({ isMobile }) => isMobile, 'keyboard tests run on desktop browsers');

  test('le lien d’évitement mène au contenu', async ({ page, browserName }) => {
    test.skip(
      browserName === 'webkit',
      'Safari does not focus links with Tab by default (OS setting)',
    );
    await page.goto('/a-propos');
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible(); // the app has rendered
    await page.keyboard.press('Tab');
    const skip = page.getByRole('link', { name: 'Aller au contenu' });
    await expect(skip).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#contenu/);
  });

  test('« / » ouvre la recherche, Espace active un filtre', async ({ page }) => {
    await page.goto('/explorer');
    await expect(page.locator('app-spot-card').first()).toBeVisible();
    await page.locator('body').press('/');
    await expect(page.getByRole('searchbox')).toBeFocused();

    const chip = page.getByRole('button', { name: 'Wi-Fi rapide' });
    await chip.focus();
    await page.keyboard.press('Space');
    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(page).toHaveURL(/wifi=1/);
  });

  test('la feuille « Je suis ici » s’ouvre et se ferme au clavier (Échap)', async ({ page }) => {
    await loginAsDemo(page.request);
    await page.goto('/lieux/6');
    const button = page.getByRole('button', { name: /Je suis ici|Signalé/ });
    await expect(button).toBeVisible();
    test.skip(await button.isDisabled(), 'the demo account reported here less than 15 minutes ago');

    await button.focus();
    await page.keyboard.press('Enter');
    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
  });
});
