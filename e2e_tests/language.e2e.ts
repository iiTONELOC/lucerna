import { expect, test, type Page } from '@playwright/test';

const ARTWORK_SELECTION_DAY = new Date('2026-11-01T12:00:00');

const openLanguageSettings = async (page: Page): Promise<void> => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Begin', exact: true }).click();
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page
    .getByRole('button', { name: 'Settings', exact: true })
    .locator('visible=true')
    .first()
    .click();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
};

test('changes language in the same document and preserves the open prayer', async ({ page }) => {
  await openLanguageSettings(page);
  const navigations: string[] = [];
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url());
  });
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(
    page.getByRole('heading', { name: "The Apostles' Creed", exact: true }),
  ).toBeVisible();
  expect(navigations).toEqual([]);
});

for (const edition of ['Douay-Rheims Version', 'Clementine Vulgate, in Latin']) {
  test('keeps the same Bible chapter in ' + edition, async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Continue', exact: true }).click();
    await page.getByRole('button', { name: 'Library', exact: true }).click();
    await page.getByRole('button', { name: 'The Holy Bible ' + edition, exact: true }).click();
    await page.getByRole('button', { name: 'Genesis 50 chapters', exact: true }).click();
    await page.getByRole('button', { name: 'Chapter 3', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Genesis 3/u })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'General', exact: true }).click();
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar los ajustes', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Génesis 3(?:\D|$)/u })).toBeVisible();
    await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('tab', { name: 'General', exact: true }).click();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByText('Language', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Genesis 3(?:\D|$)/u })).toBeVisible();
    await page.getByRole('button', { name: 'Chapter 10', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Genesis 10(?:\D|$)/u })).toBeVisible();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page.getByRole('tab', { name: 'General', exact: true }).click();
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cerrar los ajustes', exact: true }).click();
    await expect(page.getByRole('button', { name: /^Génesis 10(?:\D|$)/u })).toBeVisible();
  });
}

test('switches cached languages offline without leaving the prayer', async ({ context, page }) => {
  await openLanguageSettings(page);
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await context.setOffline(true);
  try {
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'English', exact: true }).click();
    await expect(page.getByText('Language', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: "The Apostles' Creed", exact: true }),
    ).toBeVisible();
  } finally {
    await context.setOffline(false);
  }
});

const uncachedTest = test.extend({ serviceWorkers: 'block' });

uncachedTest(
  'retains the current language and prayer after a failed translation request',
  async ({ page }) => {
    await openLanguageSettings(page);
    await page.route('**/assets/es-scio-*.js', (route) => route.abort());
    const failed = page.waitForEvent('requestfailed', {
      predicate: (request) => request.url().includes('/es-scio-'),
    });
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await failed;
    await expect(page.getByRole('button', { name: 'Español', exact: true })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
    await expect(page.getByText('Language', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: "The Apostles' Creed", exact: true }),
    ).toBeVisible();
  },
);

uncachedTest(
  'discards a pending translation after choosing the current language again',
  async ({ page }) => {
    await openLanguageSettings(page);
    let release: () => void = () => {};
    const held = new Promise<void>((resolve) => {
      release = resolve;
    });
    let requested: () => void = () => {};
    const pending = new Promise<void>((resolve) => {
      requested = resolve;
    });
    await page.route('**/assets/es-scio-*.js', async (route) => {
      requested();
      await held;
      await route.continue();
    });
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await pending;
    await page.getByRole('button', { name: 'English', exact: true }).click();
    release();
    await page.unrouteAll({ behavior: 'wait' });
    await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    await expect(page.getByText('Language', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Español', exact: true }).click();
    await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  },
);

test('keeps the selected home artwork while translating its labels', async ({ page }) => {
  await page.clock.setFixedTime(ARTWORK_SELECTION_DAY);
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  const artwork = page
    .getByRole('region', { name: 'Mystery artwork', exact: true })
    .getByRole('img');
  const source = await artwork.getAttribute('src');
  await page
    .getByRole('button', { name: 'Settings', exact: true })
    .locator('visible=true')
    .first()
    .click();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar los ajustes', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Obra del misterio', exact: true }).getByRole('img'),
  ).toHaveAttribute('src', source ?? '');
});

test('preserves the devotional reader location while translating the book', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Continue', exact: true }).click();
  await page.getByRole('button', { name: 'Library', exact: true }).click();
  await page.getByRole('button', { name: /The Secret of the Rosary/u }).click();
  await page.getByRole('heading', { name: 'Twentieth Rose', exact: true }).scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /^Rose [0-9]+$/u }).click();
  await page.getByRole('button', { name: 'Rose 20', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Rose 20', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.getByRole('button', { name: 'Español', exact: true }).click();
  await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Cerrar los ajustes', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rose 20', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Ajustes', exact: true }).click();
  await page.getByRole('tab', { name: 'General', exact: true }).click();
  await page.getByRole('button', { name: 'English', exact: true }).click();
  await expect(page.getByText('Language', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close settings', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Rose 20', exact: true })).toBeVisible();
});

for (const appearance of ['Dark', 'Parchment']) {
  test('switches languages in both orientations with ' + appearance, async ({ page }, testInfo) => {
    await openLanguageSettings(page);
    await page
      .getByRole('group', { name: 'App appearance', exact: true })
      .getByRole('button', { name: appearance, exact: true })
      .click();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();
    if (viewport === null) return;
    for (const size of [viewport, { width: viewport.height, height: viewport.width }]) {
      await page.setViewportSize(size);
      await page.getByRole('button', { name: 'Español', exact: true }).click();
      await expect(page.getByText('Idioma', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Español', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await expect(page.getByRole('dialog')).toBeInViewport();
      await page.screenshot({
        path: testInfo.outputPath(appearance + '-' + String(size.width) + '-es.png'),
      });
      await page.getByRole('button', { name: 'English', exact: true }).click();
      await expect(page.getByText('Language', { exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'English', exact: true })).toHaveAttribute(
        'aria-pressed',
        'true',
      );
      await page.screenshot({
        path: testInfo.outputPath(appearance + '-' + String(size.width) + '-en.png'),
      });
    }
    await page.getByRole('button', { name: 'Close settings', exact: true }).click();
    await expect(
      page.getByRole('heading', { name: "The Apostles' Creed", exact: true }),
    ).toBeVisible();
  });
}
