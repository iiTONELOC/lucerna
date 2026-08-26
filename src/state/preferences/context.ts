import { createContext } from 'react';
import type {
  BeadMaterial,
  OpeningDuration,
  Preferences,
  TextScale,
  Theme,
  UpdateChecks,
} from './model.ts';

export type PreferencesContextValue = {
  readonly preferences: Preferences;
  readonly setTheme: (theme: Theme) => void;
  readonly setTextScale: (textScale: TextScale) => void;
  readonly setOpeningDuration: (openingDuration: OpeningDuration) => void;
  readonly setReadingSpeed: (readingSpeed: number) => void;
  readonly setBeadMaterial: (beadMaterial: BeadMaterial) => void;
  readonly setShowGuidance: (showGuidance: boolean) => void;
  readonly setShowDropCaps: (showDropCaps: boolean) => void;
  readonly setShowMysteryFruits: (showMysteryFruits: boolean) => void;
  readonly setShowScriptureReadings: (showScriptureReadings: boolean) => void;
  readonly setIncludeFatimaPrayer: (includeFatimaPrayer: boolean) => void;
  readonly setConfirmExternalLinks: (confirmExternalLinks: boolean) => void;
  readonly setUpdateChecks: (updateChecks: UpdateChecks) => void;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
