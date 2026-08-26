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

const IPHONE_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in Safari.' },
  {
    instruction: 'Tap the More button at the bottom right.',
    image: 'iphone-1-more.avif',
    alt: 'Safari on iPhone with the More button marked at the bottom right',
  },
  {
    instruction: 'Tap Share.',
    image: 'iphone-2-share.avif',
    alt: 'The Safari menu on iPhone with Share marked',
  },
  {
    instruction: 'Tap More at the end of the row of actions.',
    image: 'iphone-3-more.avif',
    alt: 'The iPhone share panel with the More button marked in the row of actions',
  },
  {
    instruction: 'Tap Add to Home Screen.',
    image: 'iphone-4-add.avif',
    alt: 'The expanded iPhone share panel with Add to Home Screen marked',
  },
  {
    instruction: 'Keep Open as Web App switched on, then tap Add.',
    image: 'iphone-5-confirm.avif',
    alt: 'The Add to Home Screen panel on iPhone with the Add button marked',
  },
];

const IPAD_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in Safari.' },
  {
    instruction: 'Tap the Share button at the top right.',
    image: 'ipad-1-share.avif',
    alt: 'Safari on iPad with the Share button marked at the top right',
  },
  {
    instruction: 'Tap More at the end of the row of actions.',
    image: 'ipad-2-more.avif',
    alt: 'The iPad share panel with the More button marked in the row of actions',
  },
  {
    instruction: 'Tap Add to Home Screen.',
    image: 'ipad-3-add.avif',
    alt: 'The expanded iPad share panel with Add to Home Screen marked',
  },
  {
    instruction: 'Keep Open as Web App switched on, then tap Add.',
    image: 'ipad-4-confirm.avif',
    alt: 'The Add to Home Screen panel on iPad with the Add button marked',
  },
];

const MAC_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in Safari.' },
  {
    instruction: 'Click the Share button, then click Add to Dock.',
    image: 'mac-1-add-to-dock.avif',
    alt: 'The Safari share menu on a Mac with Add to Dock marked',
  },
  {
    instruction: 'Type a name, then click Add.',
    image: 'mac-2-confirm.avif',
    alt: 'The Add to Dock panel on a Mac with the Add button marked',
  },
];

const ANDROID_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in Chrome.' },
  {
    instruction: 'Tap the menu button at the top right.',
    image: 'android-1-menu.avif',
    alt: 'Chrome on Android with the menu button marked at the top right',
  },
  {
    instruction: 'Tap Add to Home screen.',
    image: 'android-2-add.avif',
    alt: 'The Chrome menu on Android with Add to Home screen marked',
  },
  {
    instruction: 'Tap Install.',
    image: 'android-3-install.avif',
    alt: 'The Add to home screen panel on Android with Install marked',
  },
  {
    instruction: 'Tap Install again to confirm.',
    image: 'android-4-confirm.avif',
    alt: 'The Install app panel on Android with the Install button marked',
  },
];

const DESKTOP_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in the browser.' },
  { instruction: 'Click the install icon at the right of the address bar.' },
  { instruction: 'Click Install.' },
];

const FIREFOX_STEPS: readonly InstallStep[] = [
  { instruction: 'Open Lucerna in Firefox on an Android phone or tablet.' },
  { instruction: 'Tap the menu button.' },
  { instruction: 'Tap Install.' },
];

export const INSTALL_SECTIONS: readonly InstallSection[] = [
  {
    id: InstallPlatform.Iphone,
    heading: 'iPhone',
    browsers: 'Safari',
    steps: IPHONE_STEPS,
  },
  {
    id: InstallPlatform.Ipad,
    heading: 'iPad',
    browsers: 'Safari',
    steps: IPAD_STEPS,
  },
  {
    id: InstallPlatform.Mac,
    heading: 'Mac',
    browsers: 'Safari',
    steps: MAC_STEPS,
    note: 'You can also choose File, then Add to Dock. This needs macOS Sonoma or later.',
  },
  {
    id: InstallPlatform.Android,
    heading: 'Android',
    browsers: 'Chrome, Brave, Edge, Opera, Samsung Internet',
    steps: ANDROID_STEPS,
    note: 'Choose Install, not Create shortcut. A shortcut opens in the browser instead.',
  },
  {
    id: InstallPlatform.DesktopChromium,
    heading: 'Windows and Linux',
    browsers: 'Chrome, Brave, Edge, Opera',
    steps: DESKTOP_STEPS,
    note: 'Chrome, Brave, Edge, and Opera work the same way on a Mac.',
  },
  {
    id: InstallPlatform.Firefox,
    heading: 'Firefox',
    browsers: 'Firefox',
    steps: FIREFOX_STEPS,
    note: 'Firefox on the desktop cannot install web applications. Use Chrome, Brave, Edge, Opera, or Safari.',
  },
];
