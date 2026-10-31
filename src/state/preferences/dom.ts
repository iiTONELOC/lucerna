import { DEFAULT_PREFERENCES, Theme, type Preferences, type ResolvedTheme } from './model.ts';

export const applyPreferencesToDocument = (
  preferences: Preferences,
  theme: ResolvedTheme,
  root: HTMLElement = document.documentElement,
): void => {
  if (theme === Theme.EternalLight) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = theme;
  }

  if (preferences.textScale === DEFAULT_PREFERENCES.textScale) {
    delete root.dataset.textScale;
  } else {
    root.dataset.textScale = preferences.textScale;
  }
};
