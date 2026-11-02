import { expect, test, type Page } from '@playwright/test';

enum PlaywrightBrowserEngine {
  Chromium = 'chromium',
}

enum PlaywrightServerOrigin {
  Local = 'http://127.0.0.1:4173',
}

const FIRST_ERROR_STATUS = 400;
const WEBKIT_OFFLINE_LIMITATION =
  'Playwright WebKit aborts service-worker navigation while its context emulates offline mode.';

const waitForServiceWorker = async (page: Page): Promise<void> => {
  await expect
    .poll(() =>
      page.evaluate(
        () => 'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
      ),
    )
    .toBe(true);
};

const beginPrayer = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('button', { exact: true, name: 'Begin' })).toBeVisible();
  await page.getByRole('button', { exact: true, name: 'Begin' }).click();
  await expect(page.getByRole('region', { name: 'Rosary prayer' })).toBeVisible();
};

test('installs the release and starts a prayer', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
  await waitForServiceWorker(page);
  await beginPrayer(page);
});

test('continues a prayer after an offline reload', async ({ browserName, context, page }) => {
  test.skip(browserName !== PlaywrightBrowserEngine.Chromium, WEBKIT_OFFLINE_LIMITATION);

  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
  await waitForServiceWorker(page);

  const unavailableResources: string[] = [];
  page.on('response', (response) => {
    if (
      response.status() >= FIRST_ERROR_STATUS &&
      new URL(response.url()).origin === PlaywrightServerOrigin.Local
    ) {
      unavailableResources.push(response.url());
    }
  });

  await context.setOffline(true);

  try {
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
    await beginPrayer(page);
    expect(unavailableResources).toEqual([]);
  } finally {
    await context.setOffline(false);
  }
});

const PRIVACY_TITLE = 'praylucerna.com Privacy Policy';

const openPrivacy = (page: Page): Promise<void> =>
  page.getByRole('button', { name: 'Privacy Policy' }).click();

const leavePrivacy = (page: Page): Promise<void> =>
  page.getByRole('button', { name: 'Back' }).click();

test('opens the privacy policy from the splash and returns', async ({ page }) => {
  await page.goto('/');
  await waitForServiceWorker(page);
  await openPrivacy(page);
  await expect(page.getByRole('heading', { level: 1, name: PRIVACY_TITLE })).toBeVisible();
  await expect(
    page.getByRole('link', { name: 'privacy.lucerna@wedefendit.com' }).first(),
  ).toBeVisible();
  await leavePrivacy(page);
  await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
});

test('opens the privacy policy from About and returns', async ({ page }) => {
  await page.goto('/');
  await waitForServiceWorker(page);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByRole('button', { name: 'Settings' }).locator('visible=true').first().click();
  await page.getByRole('tab', { name: 'About' }).click();
  await openPrivacy(page);
  await expect(page.getByRole('heading', { level: 1, name: PRIVACY_TITLE })).toBeVisible();
  await leavePrivacy(page);
  await expect(page.getByRole('button', { exact: true, name: 'Begin' })).toBeVisible();
  await expect(page.getByRole('dialog')).toHaveCount(0);
});

test('opens the privacy policy at its address', async ({ page }) => {
  await page.goto('/#privacy');
  await waitForServiceWorker(page);
  await expect(page.getByRole('heading', { level: 1, name: PRIVACY_TITLE })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cookie Policy' })).toBeVisible();
  await leavePrivacy(page);
  await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
  expect(new URL(page.url()).hash).toBe('');
});

test.describe('in a Spanish browser', () => {
  test.use({ locale: 'es-ES' });

  test('prays the Rosary in Spanish', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Lucerna' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Apoya Lucerna' })).toBeVisible();
    await page.getByRole('button', { name: 'Política de privacidad' }).click();
    await expect(
      page.getByRole('heading', { level: 1, name: 'Política de privacidad de praylucerna.com' }),
    ).toBeVisible();
    await expect(page.getByText('rige la versión en inglés')).toBeVisible();
    await page.getByRole('button', { name: 'Atrás' }).click();
    await page.getByRole('button', { name: 'Continuar' }).click();
    await page.getByRole('button', { exact: true, name: 'Comenzar' }).click();

    const prayer = page.getByRole('region', { name: 'Rezo del Rosario' });

    await expect(prayer).toBeVisible();
    await expect(prayer.getByRole('heading', { name: 'Señal de la Cruz' })).toBeVisible();
    await expect(prayer.getByText('Espíritu Santo. Amén.')).toBeVisible();
    await prayer.getByRole('button', { name: 'Salir' }).click();
    await expect(page.getByRole('button', { exact: true, name: 'Biblioteca' })).toBeVisible();
    await expect(page.getByRole('button', { exact: true, name: 'Galería' })).toBeVisible();
    await page.getByRole('button', { exact: true, name: 'Biblioteca' }).click();
    await page.getByRole('button', { name: /El secreto admirable del Santísimo Rosario/u }).click();
    await expect(page.getByRole('heading', { name: 'Rosa blanca' })).toBeVisible();
    await page.getByRole('button', { name: 'Traducción con IA' }).click();
    await expect(
      page.getByText('Estas traducciones son una ayuda de Lucerna').first(),
    ).toBeVisible();
  });
});
