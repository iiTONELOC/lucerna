import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type PropsWithChildren,
} from 'react';
import { PreferencesContext, type PreferencesContextValue } from './context.ts';
import { applyPreferencesToDocument } from './dom.ts';
import {
  DEFAULT_PREFERENCES,
  type Preferences,
  type PreferencesAction,
  PreferencesActionType,
  preferencesReducer,
  resolvedThemeOf,
  type ResolvedTheme,
} from './model.ts';
import { loadPreferences, savePreferences } from './storage.ts';

type PreferencesDispatch = Dispatch<PreferencesAction>;

const LIGHT_QUERY = '(prefers-color-scheme: light)';

const prefersLight = (): boolean => window.matchMedia(LIGHT_QUERY).matches;

const subscribeToLight = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(LIGHT_QUERY);
  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const useHydratedPreferences = (): [Preferences, PreferencesDispatch, boolean] => {
  const [preferences, dispatch] = useReducer(preferencesReducer, DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    void loadPreferences().then((storedPreferences) => {
      if (!active) {
        return;
      }

      applyPreferencesToDocument(
        storedPreferences,
        resolvedThemeOf(storedPreferences.theme, prefersLight()),
      );
      dispatch({ type: PreferencesActionType.Hydrate, preferences: storedPreferences });
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return [preferences, dispatch, hydrated];
};

const usePersistedPreferences = (
  preferences: Preferences,
  theme: ResolvedTheme,
  hydrated: boolean,
): void => {
  useLayoutEffect(() => applyPreferencesToDocument(preferences, theme), [preferences, theme]);
  useEffect(() => {
    if (hydrated) {
      void savePreferences(preferences);
    }
  }, [hydrated, preferences]);
};

const contextValueFrom = (
  preferences: Preferences,
  resolvedTheme: ResolvedTheme,
  dispatch: PreferencesDispatch,
): PreferencesContextValue => ({
  preferences,
  resolvedTheme,
  setPreference: (key, value) => dispatch({ type: PreferencesActionType.Set, key, value }),
});

export function PreferencesProvider({ children }: Readonly<PropsWithChildren>) {
  const [preferences, dispatch, hydrated] = useHydratedPreferences();
  const light = useSyncExternalStore(subscribeToLight, prefersLight, () => false);
  const resolvedTheme = resolvedThemeOf(preferences.theme, light);
  usePersistedPreferences(preferences, resolvedTheme, hydrated);
  const value = useMemo(
    () => contextValueFrom(preferences, resolvedTheme, dispatch),
    [dispatch, preferences, resolvedTheme],
  );

  if (!hydrated) {
    return null;
  }

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}
