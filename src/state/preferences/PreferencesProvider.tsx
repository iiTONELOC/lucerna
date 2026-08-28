import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useState,
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
} from './model.ts';
import { loadPreferences, savePreferences } from './storage.ts';

type PreferencesDispatch = Dispatch<PreferencesAction>;

const useHydratedPreferences = (): [Preferences, PreferencesDispatch, boolean] => {
  const [preferences, dispatch] = useReducer(preferencesReducer, DEFAULT_PREFERENCES);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let active = true;

    void loadPreferences().then((storedPreferences) => {
      if (!active) {
        return;
      }

      applyPreferencesToDocument(storedPreferences);
      dispatch({ type: PreferencesActionType.Hydrate, preferences: storedPreferences });
      setHydrated(true);
    });

    return () => {
      active = false;
    };
  }, []);

  return [preferences, dispatch, hydrated];
};

const usePersistedPreferences = (preferences: Preferences, hydrated: boolean): void => {
  useLayoutEffect(() => applyPreferencesToDocument(preferences), [preferences]);
  useEffect(() => {
    if (hydrated) {
      void savePreferences(preferences);
    }
  }, [hydrated, preferences]);
};

const contextValueFrom = (
  preferences: Preferences,
  dispatch: PreferencesDispatch,
): PreferencesContextValue => ({
  preferences,
  setPreference: (key, value) => dispatch({ type: PreferencesActionType.Set, key, value }),
});

export function PreferencesProvider({ children }: Readonly<PropsWithChildren>) {
  const [preferences, dispatch, hydrated] = useHydratedPreferences();
  usePersistedPreferences(preferences, hydrated);
  const value = useMemo(() => contextValueFrom(preferences, dispatch), [dispatch, preferences]);

  if (!hydrated) {
    return null;
  }

  return <PreferencesContext value={value}>{children}</PreferencesContext>;
}
