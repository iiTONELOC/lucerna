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
  type BeadMaterial,
  DEFAULT_PREFERENCES,
  type OpeningDuration,
  type Preferences,
  type PreferencesAction,
  PreferencesActionType,
  preferencesReducer,
  type ReaderFace,
  type ReaderGround,
  type TextScale,
  type Theme,
  type UpdateChecks,
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
  setTheme: (theme: Theme) => dispatch({ type: PreferencesActionType.SetTheme, theme }),
  setTextScale: (textScale: TextScale) =>
    dispatch({ type: PreferencesActionType.SetTextScale, textScale }),
  setReaderFace: (readerFace: ReaderFace) =>
    dispatch({ type: PreferencesActionType.SetReaderFace, readerFace }),
  setReaderTextScale: (readerTextScale: TextScale) =>
    dispatch({ type: PreferencesActionType.SetReaderTextScale, readerTextScale }),
  setReaderGround: (readerGround: ReaderGround) =>
    dispatch({ type: PreferencesActionType.SetReaderGround, readerGround }),
  setShowRedLetter: (showRedLetter: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowRedLetter, showRedLetter }),
  setOpeningDuration: (openingDuration: OpeningDuration) =>
    dispatch({ type: PreferencesActionType.SetOpeningDuration, openingDuration }),
  setReadingSpeed: (readingSpeed: number) =>
    dispatch({ type: PreferencesActionType.SetReadingSpeed, readingSpeed }),
  setBeadMaterial: (beadMaterial: BeadMaterial) =>
    dispatch({ type: PreferencesActionType.SetBeadMaterial, beadMaterial }),
  setShowGuidance: (showGuidance: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowGuidance, showGuidance }),
  setReadGuidance: (readGuidance: boolean) =>
    dispatch({ type: PreferencesActionType.SetReadGuidance, readGuidance }),
  setShowDecadeOfferings: (showDecadeOfferings: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowDecadeOfferings, showDecadeOfferings }),
  setReadDecadeOfferings: (readDecadeOfferings: boolean) =>
    dispatch({ type: PreferencesActionType.SetReadDecadeOfferings, readDecadeOfferings }),
  setShowDropCaps: (showDropCaps: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowDropCaps, showDropCaps }),
  setShowMysteryFruits: (showMysteryFruits: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowMysteryFruits, showMysteryFruits }),
  setReadMysteryFruits: (readMysteryFruits: boolean) =>
    dispatch({ type: PreferencesActionType.SetReadMysteryFruits, readMysteryFruits }),
  setShowScriptureReadings: (showScriptureReadings: boolean) =>
    dispatch({ type: PreferencesActionType.SetShowScriptureReadings, showScriptureReadings }),
  setIncludeFatimaPrayer: (includeFatimaPrayer: boolean) =>
    dispatch({ type: PreferencesActionType.SetIncludeFatimaPrayer, includeFatimaPrayer }),
  setConfirmExternalLinks: (confirmExternalLinks: boolean) =>
    dispatch({ type: PreferencesActionType.SetConfirmExternalLinks, confirmExternalLinks }),
  setUpdateChecks: (updateChecks: UpdateChecks) =>
    dispatch({ type: PreferencesActionType.SetUpdateChecks, updateChecks }),
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
