import { expect, test, type Page } from '@playwright/test';

enum PlaywrightBrowserEngine {
  Chromium = 'chromium',
}

enum PlaywrightServerOrigin {
  Local = 'http://127.0.0.1:4173',
}

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
      response.status() >= 400 &&
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
