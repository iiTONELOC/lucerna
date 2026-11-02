import { type ReadingSnapshot } from '../../content/reading.ts';
import type { InstallText } from '../../content/wording/english.ts';
export enum InstallPlatform {
  Iphone = 'iphone',
  Ipad = 'ipad',
  Mac = 'mac',
  Android = 'android',
  DesktopChromium = 'desktop-chromium',
  Firefox = 'firefox',
}

export type InstallStep = {
  readonly instruction: string;
  readonly image?: string;
  readonly alt?: string;
};

export type InstallSection = {
  readonly id: InstallPlatform;
  readonly heading: string;
  readonly browsers: string;
  readonly steps: readonly InstallStep[];
  readonly note?: string;
};

const stepsOf = (
  text: InstallText,
  images: readonly (string | undefined)[],
): readonly InstallStep[] =>
  text.steps.map(({ alt, instruction }, index) => {
    const image = images[index];

    return {
      instruction,
      ...(image === undefined ? {} : { image }),
      ...(alt === undefined ? {} : { alt }),
    };
  });

const sectionOf = (
  id: InstallPlatform,
  browsers: string,
  text: InstallText,
  images: readonly (string | undefined)[],
): InstallSection => ({
  id,
  heading: text.heading,
  browsers,
  steps: stepsOf(text, images),
  ...(text.note === undefined ? {} : { note: text.note }),
});

export const INSTALL_SECTIONS = (reading: ReadingSnapshot): readonly InstallSection[] => [
  sectionOf(InstallPlatform.Iphone, 'Safari', reading.wording.install.iphone, [
    undefined,
    'iphone-1-more.avif',
    'iphone-2-share.avif',
    'iphone-3-more.avif',
    'iphone-4-add.avif',
    'iphone-5-confirm.avif',
  ]),
  sectionOf(InstallPlatform.Ipad, 'Safari', reading.wording.install.ipad, [
    undefined,
    'ipad-1-share.avif',
    'ipad-2-more.avif',
    'ipad-3-add.avif',
    'ipad-4-confirm.avif',
  ]),
  sectionOf(InstallPlatform.Mac, 'Safari', reading.wording.install.mac, [
    undefined,
    'mac-1-add-to-dock.avif',
    'mac-2-confirm.avif',
  ]),
  sectionOf(
    InstallPlatform.Android,
    'Chrome, Brave, Edge, Opera, Samsung Internet',
    reading.wording.install.android,
    [
      undefined,
      'android-1-menu.avif',
      'android-2-add.avif',
      'android-3-install.avif',
      'android-4-confirm.avif',
    ],
  ),
  sectionOf(
    InstallPlatform.DesktopChromium,
    'Chrome, Brave, Edge, Opera',
    reading.wording.install.desktop,
    [],
  ),
  sectionOf(InstallPlatform.Firefox, 'Firefox', reading.wording.install.firefox, []),
];
