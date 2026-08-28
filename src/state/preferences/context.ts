import { createContext } from 'react';
import type { PreferenceKey, Preferences } from './model.ts';

export type SetPreference = <Key extends PreferenceKey>(key: Key, value: Preferences[Key]) => void;

export type PreferencesContextValue = {
  readonly preferences: Preferences;
  readonly setPreference: SetPreference;
};

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
