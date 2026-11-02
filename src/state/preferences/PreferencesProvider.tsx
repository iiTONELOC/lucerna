import { prepareLoadedContent } from '../../content/loaders.ts';
import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type Dispatch,
  type PropsWithChildren,
} from 'react';
import {
  BIBLE_CHOICES,
  deviceLanguageTags,
  editionOf,
  LANGUAGE_CHOICES,
  languageOf,
  type BibleEditionId,
  type Language,
} from '../../content/language.ts';
import {
  INITIAL_READING,
  loadReading,
  ReadingContext,
  type ReadingSnapshot,
} from '../../content/reading.ts';
import { cacheEdition } from '../../features/pwa/registration.ts';
import { PreferencesContext, type PreferencesContextValue } from './context.ts';
import { applyPreferencesToDocument } from './dom.ts';
import {
  DEFAULT_PREFERENCES,
  PreferencesActionType,
  preferencesReducer,
  resolvedThemeOf,
  type Preferences,
  type PreferencesAction,
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

type Reading = {
  readonly language: Language;
  readonly edition: BibleEditionId;
};

const readingOf = (preferences: Preferences): Reading => {
  const language = languageOf(preferences.language, deviceLanguageTags());

  return { language, edition: editionOf(language, preferences.bibleChoice) };
};

const sameReading = (left: Reading, right: Reading): boolean =>
  left.language === right.language && left.edition === right.edition;

const restoreReading = (reading: ReadingSnapshot, dispatch: PreferencesDispatch): void => {
  const language = LANGUAGE_CHOICES.find(
    (choice) => languageOf(choice, deviceLanguageTags()) === reading.language,
  );
  const bibleChoice = BIBLE_CHOICES.find(
    (choice) => editionOf(reading.language, choice) === reading.edition,
  );
  if (language !== undefined) {
    dispatch({ type: PreferencesActionType.Set, key: 'language', value: language });
  }
  if (bibleChoice !== undefined) {
    dispatch({ type: PreferencesActionType.Set, key: 'bibleChoice', value: bibleChoice });
  }
};

const useActiveReading = (
  preferences: Preferences,
  dispatch: PreferencesDispatch,
  hydrated: boolean,
): ReadingSnapshot => {
  const [reading, setReading] = useState(INITIAL_READING);
  const snapshots = useRef(new Map<string, ReadingSnapshot>());
  useEffect(() => {
    const wanted = readingOf(preferences);
    if (!hydrated || sameReading(wanted, reading)) return;
    let active = true;
    const key = wanted.language + '/' + wanted.edition;
    const prepare = async (): Promise<void> => {
      try {
        const next =
          snapshots.current.get(key) ?? (await loadReading(wanted.language, wanted.edition));
        if (!(await cacheEdition(wanted.language, wanted.edition))) {
          if (active) restoreReading(reading, dispatch);
          return;
        }
        if (!(await prepareLoadedContent(reading, next, cacheEdition))) {
          if (active) restoreReading(reading, dispatch);
          return;
        }
        snapshots.current.set(key, next);
        if (active) setReading(next);
      } catch {
        if (active) restoreReading(reading, dispatch);
      }
    };
    void prepare();
    return () => {
      active = false;
    };
  }, [dispatch, hydrated, preferences, reading]);
  useLayoutEffect(() => {
    document.documentElement.lang = reading.language;
  }, [reading.language]);
  return reading;
};

const usePersistedPreferences = (
  preferences: Preferences,
  theme: ResolvedTheme,
  hydrated: boolean,
): void => {
  useLayoutEffect(() => applyPreferencesToDocument(preferences, theme), [preferences, theme]);
  useEffect(() => {
    if (hydrated) void savePreferences(preferences);
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
  const reading = useActiveReading(preferences, dispatch, hydrated);
  const value = useMemo(
    () => contextValueFrom(preferences, resolvedTheme, dispatch),
    [dispatch, preferences, resolvedTheme],
  );

  if (!hydrated) {
    return null;
  }

  return (
    <ReadingContext value={reading}>
      <PreferencesContext value={value}>{children}</PreferencesContext>
    </ReadingContext>
  );
}
