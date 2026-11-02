import { expect, test, type Page } from '@playwright/test';
import {
  ACTIVITY_CREDITS,
  createSupportState,
  SUPPORT_CREDIT_LIMIT,
  SUPPORT_DAY,
  SUPPORT_RETURN_HASH,
  SUPPORT_STORAGE_KEY,
  SupportActivity,
  SupportPhase,
} from '../src/features/support/model.ts';
import { DATABASE_NAME, STORE_NAME } from '../src/state/preferences/storage.ts';

const NEARLY_DUE = {
  [SupportActivity.Rosary]: SUPPORT_CREDIT_LIMIT - ACTIVITY_CREDITS[SupportActivity.Rosary],
  [SupportActivity.Artwork]: SUPPORT_CREDIT_LIMIT - ACTIVITY_CREDITS[SupportActivity.Artwork],
  [SupportActivity.Chapter]: SUPPORT_CREDIT_LIMIT - ACTIVITY_CREDITS[SupportActivity.Chapter],
};
const PAST_GRACE_DAYS = 8;

const seedSupport = async (
  page: Page,
  credits: number,
  ageDays = PAST_GRACE_DAYS,
): Promise<void> => {
  await page.goto('/');
  await expect(page.getByRole('button', { name: /^(Continue|Continuar)$/u })).toBeEnabled();
  const now = Date.now();
  const record = {
    ...createSupportState(now - ageDays * SUPPORT_DAY),
    phase: SupportPhase.Open,
    clockFloor: now,
    credits,
  };
  await page.evaluate(
    async ({ record, database, store, key }) => {
      await new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const opened = request.result;
          const transaction = opened.transaction(store, 'readwrite');
          transaction.objectStore(store).put(record, key);
          transaction.oncomplete = () => {
            opened.close();
            resolve();
          };
          transaction.onerror = () => reject(transaction.error);
        };
      });
    },
    { record, database: DATABASE_NAME, store: STORE_NAME, key: SUPPORT_STORAGE_KEY },
  );
  await page.reload();
  await page.getByRole('button', { name: /^(Continue|Continuar)$/u }).click();
};

test('asks only when leaving an eligible artwork visit and resumes the requested navigation', async ({
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await page.getByRole('button', { name: 'Gallery', exact: true }).click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('img') })
    .first()
    .click();
  await expect(page.getByRole('region', { name: 'Support Lucerna', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Back to the collection', exact: true }).click();
  const panel = page.getByRole('region', { name: 'Support Lucerna', exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByText(/maintenance, hosting, and new features/u)).toBeVisible();
  await panel.getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Gallery', exact: true })).toBeVisible();
  await expect(panel).toHaveCount(0);
});

const readSupport = (page: Page): Promise<Record<string, unknown> | null> =>
  page.evaluate(
    ({ database, store, key }) =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(database);
        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
          const opened = request.result;
          const transaction = opened.transaction(store, 'readonly');
          const read = transaction.objectStore(store).get(key);
          read.onsuccess = () => {
            const raw: unknown = read.result;
            resolve(
              typeof raw === 'object' && raw !== null
                ? Object.fromEntries(Object.entries(raw))
                : null,
            );
          };
          read.onerror = () => reject(read.error);
          transaction.oncomplete = () => opened.close();
        };
      }),
    { database: DATABASE_NAME, store: STORE_NAME, key: SUPPORT_STORAGE_KEY },
  );

const openArtwork = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /^(Gallery|Galería)$/u }).click();
  await page
    .getByRole('button')
    .filter({ has: page.getByRole('img') })
    .first()
    .click();
};

const artworkBack = (page: Page) =>
  page.getByRole('button', { name: /^(Back to the collection|Volver a la colección)$/u });

const supportPanel = (page: Page) =>
  page.getByRole('region', { name: /^(Support Lucerna|Apoya Lucerna)$/u });

const closingPrayer = async (page: Page): Promise<void> => {
  await page.getByRole('button', { name: /^(Begin|Comenzar)$/u }).click();
  for (let step = 0; step < 120; step += 1) {
    if ((await page.getByRole('button', { name: /^(Finish|Terminar)$/u }).count()) > 0) return;
    await page.keyboard.press('Enter');
  }
  await expect(page.getByRole('button', { name: /^(Finish|Terminar)$/u })).toBeVisible();
};

test('waits until Finish and replaces the completed prayer with the support panel', async ({
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Rosary]);
  await closingPrayer(page);
  await expect(supportPanel(page)).toHaveCount(0);
  await expect(page.getByText(/If you wish, you can/u)).toHaveCount(0);
  await page.getByRole('button', { name: /^(Finish|Terminar)$/u }).click();
  await expect(supportPanel(page)).toBeVisible();
  await expect(page.getByRole('heading', { level: 1, name: 'Support Lucerna' })).toBeVisible();
  await supportPanel(page).getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(page.getByRole('button', { name: /^(Begin|Comenzar)$/u })).toBeVisible();
  await expect
    .poll(() => readSupport(page))
    .toMatchObject({ credits: 0, notNowCount: 1, phase: SupportPhase.Waiting });
});

test('does not award an unfinished Rosary or ask during the initial grace period', async ({
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Rosary]);
  await page.getByRole('button', { name: /^(Begin|Comenzar)$/u }).click();
  await page.getByRole('button', { name: 'Exit', exact: true }).click();
  await expect(page.getByRole('button', { name: /^(Begin|Comenzar)$/u })).toBeVisible();
  await expect
    .poll(() => readSupport(page))
    .toMatchObject({ credits: NEARLY_DUE[SupportActivity.Rosary] });
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork], 0);
  await openArtwork(page);
  await artworkBack(page).click();
  await expect(page.getByRole('button', { name: 'Gallery', exact: true })).toBeVisible();
  await expect(supportPanel(page)).toHaveCount(0);
  await expect
    .poll(() => readSupport(page))
    .toMatchObject({ credits: SUPPORT_CREDIT_LIMIT, phase: SupportPhase.Grace });
});

test('offers support at a chapter end before the book ends and survives a live language change', async ({
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Rosary]);
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page
    .getByRole('button', { name: 'The Holy Bible Douay-Rheims Version', exact: true })
    .click();
  await page.getByRole('button', { name: 'Genesis 50 chapters', exact: true }).click();
  await expect(supportPanel(page)).toHaveCount(0);
  await page.getByRole('heading', { name: 'Genesis 2', exact: true }).scrollIntoViewIfNeeded();
  await expect(supportPanel(page)).toBeVisible();
  await supportPanel(page).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar los ajustes', exact: true }).click();
  await expect(supportPanel(page)).toBeVisible();
  await expect(
    supportPanel(page).getByText(/mantenimiento, el alojamiento y nuevas funciones/u),
  ).toBeVisible();
  await supportPanel(page).getByRole('button', { name: 'Ahora no', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Génesis 2', exact: true })).toBeAttached();
});

test('continues next-artwork navigation after declining and keeps the pause across reloads', async ({
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await openArtwork(page);
  const next = page.getByRole('button', { name: /^Next artwork:/u });
  const target = (await next.getAttribute('aria-label'))?.replace('Next artwork: ', '') ?? '';
  expect(target).not.toBe('');
  await next.click();
  await expect(supportPanel(page)).toBeVisible();
  await supportPanel(page).getByRole('button', { name: 'Not now', exact: true }).click();
  await expect(page.getByRole('heading', { name: target, exact: true })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openArtwork(page);
  await artworkBack(page).click();
  await expect(page.getByRole('button', { name: 'Gallery', exact: true })).toBeVisible();
  await expect(supportPanel(page)).toHaveCount(0);
  await expect
    .poll(() => readSupport(page))
    .toMatchObject({ notNowCount: 1, phase: SupportPhase.Waiting });
});

test('claims only one ask across tabs and keeps its response valid after another tab opens', async ({
  context,
  page,
}) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await openArtwork(page);
  const other = await context.newPage();
  await other.goto('/');
  await other.getByRole('button', { name: 'Continue', exact: true }).click();
  await openArtwork(other);
  await Promise.all([artworkBack(page).click(), artworkBack(other).click()]);
  await expect
    .poll(async () => (await supportPanel(page).count()) + (await supportPanel(other).count()))
    .toBe(1);
  const winner = (await supportPanel(page).count()) === 1 ? page : other;
  const loser = winner === page ? other : page;
  await loser.reload();
  await expect(loser.getByRole('button', { name: 'Continue', exact: true })).toBeVisible();
  await supportPanel(winner).getByRole('button', { name: 'Not now', exact: true }).click();
  await expect
    .poll(() => readSupport(winner))
    .toMatchObject({ notNowCount: 1, credits: 0, phase: SupportPhase.Waiting });
  await other.close();
});

test('keeps automatic support optional when storage is unavailable', async ({ page }) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'indexedDB', {
      get: () => {
        throw new DOMException();
      },
    });
  });
  await page.reload();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await openArtwork(page);
  await artworkBack(page).click();
  await expect(page.getByRole('button', { name: 'Gallery', exact: true })).toBeVisible();
  await expect(supportPanel(page)).toHaveCount(0);
});

test('can show and dismiss the eligible artwork prompt offline', async ({ context, page }) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await openArtwork(page);
  await context.setOffline(true);
  try {
    await artworkBack(page).click();
    await expect(supportPanel(page)).toBeVisible();
    await supportPanel(page).getByRole('button', { name: 'Not now', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gallery', exact: true })).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

test('stores Giving before checkout and accepts one return with the exact Stripe referrer', async ({
  context,
  page,
}) => {
  await context.route('https://buy.stripe.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<html><head><title>Checkout fixture</title></head><body>Checkout fixture</body></html>',
    }),
  );
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  const origin = new URL(page.url()).origin;
  await openArtwork(page);
  await artworkBack(page).click();
  await supportPanel(page).getByRole('link', { name: 'Give', exact: true }).click();
  const popupReady = page.waitForEvent('popup');
  await page
    .getByRole('dialog')
    .getByRole('link', { name: /Continue/u })
    .click();
  const popup = await popupReady;
  await expect(popup).toHaveURL(/^https:\/\/buy\.stripe\.com\//u);
  await expect.poll(() => readSupport(page)).toMatchObject({ phase: SupportPhase.Giving });
  await popup.goto(origin + '/' + SUPPORT_RETURN_HASH, {
    referer: 'https://buy.stripe.com/checkout',
  });
  await expect(
    popup.getByRole('heading', { name: 'Thank you for supporting Lucerna.', exact: true }),
  ).toBeVisible();
  await expect
    .poll(() => readSupport(popup))
    .toMatchObject({ phase: SupportPhase.Waiting, giftUntil: expect.any(Number) });
  const deadline = (await readSupport(popup))?.giftUntil;
  await popup.reload();
  await expect.poll(async () => (await readSupport(popup))?.giftUntil).toBe(deadline);
  await popup.close();
});

test('a direct thank-you navigation cannot grant a gift pause', async ({ page }) => {
  await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
  await page.goto('/' + SUPPORT_RETURN_HASH);
  await expect(
    page.getByRole('heading', { name: 'Thank you for supporting Lucerna.', exact: true }),
  ).toBeVisible();
  await expect.poll(() => readSupport(page)).toMatchObject({ giftUntil: null });
});

test.describe('Spanish support', () => {
  test.use({ locale: 'es-ES' });
  test('uses the same artwork completion flow and replacement copy', async ({ page }) => {
    await seedSupport(page, NEARLY_DUE[SupportActivity.Artwork]);
    await openArtwork(page);
    await artworkBack(page).click();
    await expect(supportPanel(page)).toBeVisible();
    await expect(
      supportPanel(page).getByText(/Lucerna es gratis para todos y funciona sin conexión/u),
    ).toBeVisible();
    await expect(
      supportPanel(page).getByRole('link', { name: 'Apoyar', exact: true }),
    ).toBeVisible();
    await supportPanel(page).getByRole('button', { name: 'Ahora no', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Galería', exact: true })).toBeVisible();
  });
});
