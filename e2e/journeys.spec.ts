import { expect, isMobile, loginAsDemo, registerFreshUser, test } from './fixtures';

/** The three key journeys of the brief (section 4), in every browser of playwright.config.ts. */

test('Parcours 1 · trouver un lieu calme en 2 clics (Accueil → Rechercher → Explorer)', async ({ page }) => {
  await page.goto('/');
  // Click 1: "Silencieux" is pre-selected, so a single click on "Rechercher" is enough here.
  await expect(page.getByRole('button', { name: 'Silencieux' })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'Rechercher' }).click();

  await expect(page).toHaveURL(/\/explorer\?bruit=silencieux/);
  await expect(page.getByRole('heading', { name: /lieux? trouvés?/ })).toBeVisible();
  await expect(page.locator('app-spot-card').first()).toBeVisible();

  // The filtered search survives a refresh (filters live in the URL).
  await page.reload();
  await expect(page.getByRole('button', { name: 'Silencieux' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('app-spot-card').first()).toBeVisible();

  // Filters update the list without reloading the page.
  await page.getByRole('button', { name: 'Prises' }).click();
  await expect(page).toHaveURL(/prises=1/);
});

test('Parcours 2 · signaler l’affluence en 3 clics (Accueil → Explorer → Fiche → Je suis ici)', async ({ page }) => {
  await registerFreshUser(page.request); // new account: never blocked by the 15-minute rule
  await page.goto('/');

  // Click 1: Explorer
  if (isMobile(page)) await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Explorer' }).click();
  else await page.getByRole('navigation', { name: 'Navigation principale' }).getByRole('link', { name: 'Explorer' }).click();
  await expect(page.locator('app-spot-card').first()).toBeVisible();

  // Click 2: the first place
  await page.locator('app-spot-card h3 a').first().click();
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

  // Click 3: "Je suis ici", then choose a level and send
  await page.getByRole('button', { name: 'Je suis ici' }).click();
  const sheet = page.getByRole('dialog', { name: 'Il y a du monde ici ?' });
  await expect(sheet).toBeVisible();
  await sheet.getByText('Saturé', { exact: true }).click();
  await sheet.getByRole('button', { name: 'Envoyer' }).click();

  await expect(page.getByText('Merci ! Affluence mise à jour.')).toBeVisible();
  await expect(page.locator('.meter__source')).toContainText('à l’instant');
  await expect(page.locator('.meter__value')).toContainText(/Modéré|Saturé/);
  // The 15-minute rule is explained, not hidden.
  await expect(page.getByRole('button', { name: /Signalé · à nouveau dans 1[45] min/ })).toBeDisabled();
});

test('Parcours 3 · retrouver ses favoris en 2 clics (en-tête → Espace membre → Favoris)', async ({ page }) => {
  await loginAsDemo(page.request);
  await page.goto('/');

  if (isMobile(page)) {
    // Phones: the bottom tab bar has a direct "Favoris" tab (1 click).
    await page.getByRole('navigation', { name: 'Navigation mobile' }).getByRole('link', { name: 'Favoris' }).click();
  } else {
    await page.getByRole('link', { name: 'Mon espace' }).click(); // click 1
    await page.getByRole('navigation', { name: 'Espace membre' }).getByRole('link', { name: 'Favoris' }).click(); // click 2
  }

  await expect(page).toHaveURL(/\/compte\/favoris/);
  await expect(page.getByRole('heading', { name: 'Mes favoris' })).toBeVisible();
  await expect(page.locator('app-spot-card')).not.toHaveCount(0);
});

test('Espace membre protégé : redirection vers la connexion puis retour', async ({ page }) => {
  await page.goto('/compte/avis');
  await expect(page).toHaveURL(/\/connexion\?redirect=%2Fcompte%2Favis/);

  await page.getByRole('button', { name: 'Remplir avec le compte démo' }).click();
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page).toHaveURL(/\/compte\/avis/);
  await expect(page.getByRole('heading', { name: 'Mes avis' })).toBeVisible();
});
