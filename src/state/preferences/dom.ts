import { DEFAULT_PREFERENCES, type Preferences } from './model.ts';

export const applyPreferencesToDocument = (
  preferences: Preferences,
  root: HTMLElement = document.documentElement,
): void => {
  if (preferences.theme === DEFAULT_PREFERENCES.theme) {
    delete root.dataset.theme;
  } else {
    root.dataset.theme = preferences.theme;
  }

  if (preferences.textScale === DEFAULT_PREFERENCES.textScale) {
    delete root.dataset.textScale;
  } else {
    root.dataset.textScale = preferences.textScale;
  }
};
