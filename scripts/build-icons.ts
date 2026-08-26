/// <reference lib="dom" />

import { chromium, type Page } from '@playwright/test';

enum IconPurpose {
  Any = 'any',
  Maskable = 'maskable',
}

type IconDefinition = {
  readonly name: string;
  readonly purpose: IconPurpose;
  readonly size: number;
};

const ICONS: readonly IconDefinition[] = [
  { name: 'lucerna-180.png', purpose: IconPurpose.Any, size: 180 },
  { name: 'lucerna-192.png', purpose: IconPurpose.Any, size: 192 },
  { name: 'lucerna-512.png', purpose: IconPurpose.Any, size: 512 },
  { name: 'lucerna-maskable-512.png', purpose: IconPurpose.Maskable, size: 512 },
];

const BRAND_BACKGROUND = '#0a0806';
const MASKABLE_INSET = 51.2;
const MASKABLE_SIZE = 409.6;
const repositoryRoot = new URL('../', import.meta.url);
const sourceUrl = new URL('src/assets/brand/lucerna-mark.svg', repositoryRoot);
const outputDirectory = new URL('public/icons/', repositoryRoot);

const iconSvgFrom = (source: string, purpose: IconPurpose, size: number): string => {
  const positionedSource =
    purpose === IconPurpose.Maskable
      ? source.replace(
          '<svg ',
          `<svg x="${MASKABLE_INSET}" y="${MASKABLE_INSET}" width="${MASKABLE_SIZE}" height="${MASKABLE_SIZE}" `,
        )
      : source;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 512 512"><rect width="512" height="512" fill="${BRAND_BACKGROUND}"/>${positionedSource}</svg>`;
};

const pngFrom = async (page: Page, svg: string, size: number): Promise<Uint8Array> => {
  const bytes = await page.evaluate(
    async ({ source, width }) => {
      const objectUrl = URL.createObjectURL(new Blob([source], { type: 'image/svg+xml' }));

      try {
        const image = new Image();
        image.decoding = 'sync';
        image.src = objectUrl;
        await image.decode();

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = width;
        const context = canvas.getContext('2d');

        if (context === null) {
          throw new Error('Lucerna icon canvas is unavailable');
        }

        context.drawImage(image, 0, 0, width, width);
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((value) => {
            if (value === null) {
              reject(new Error('Lucerna icon encoding failed'));
              return;
            }

            resolve(value);
          }, 'image/png');
        });

        return [...new Uint8Array(await blob.arrayBuffer())];
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    },
    { source: svg, width: size },
  );

  return Uint8Array.from(bytes);
};

const buildIcons = async (): Promise<void> => {
  const source = await Bun.file(sourceUrl).text();
  const browser = await chromium.launch({ headless: true });

  try {
    const page = await browser.newPage();
    await page.emulateMedia({ reducedMotion: 'reduce' });

    for (const icon of ICONS) {
      await Bun.write(
        new URL(icon.name, outputDirectory),
        await pngFrom(page, iconSvgFrom(source, icon.purpose, icon.size), icon.size),
      );
    }
  } finally {
    await browser.close();
  }
};

if (import.meta.main) {
  await buildIcons();
}
