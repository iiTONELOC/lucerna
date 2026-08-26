import { isRecord } from '../../shared/guards.ts';

export enum Theme {
  EternalLight = 'dark',
  Parchment = 'light',
}

export enum TextScale {
  Small = '88',
  Standard = '100',
  Comfortable = '113',
  Large = '125',
  ExtraLarge = '138',
  Maximum = '150',
}

export enum OpeningDuration {
  FiveSeconds = '5',
  TenSeconds = '10',
  FifteenSeconds = '15',
  Manual = 'manual',
}

export enum ReadingSpeed {
  Unhurried = 0.75,
  Steady = 1,
  Brisk = 1.3,
}

export const READING_SPEED_PRESETS: readonly ReadingSpeed[] = [
  ReadingSpeed.Unhurried,
  ReadingSpeed.Steady,
  ReadingSpeed.Brisk,
];

export const READING_SPEED_MINIMUM = 0.5;
export const READING_SPEED_MAXIMUM = 2;
export const READING_SPEED_STEP = 0.05;

export enum UpdateChecks {
  OnLoad = 'on-load',
  WhileOpen = 'while-open',
}

export enum BeadMaterial {
  Wood = 'wood',
  Pearl = 'pearl',
  Obsidian = 'obsidian',
  Rose = 'rose',
}

export type Preferences = {
  readonly theme: Theme;
  readonly textScale: TextScale;
  readonly openingDuration: OpeningDuration;
  readonly readingSpeed: number;
  readonly beadMaterial: BeadMaterial;
  readonly showGuidance: boolean;
  readonly showDropCaps: boolean;
  readonly showMysteryFruits: boolean;
  readonly showScriptureReadings: boolean;
  readonly includeFatimaPrayer: boolean;
  readonly confirmExternalLinks: boolean;
  readonly updateChecks: UpdateChecks;
};

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({
  theme: Theme.EternalLight,
  textScale: TextScale.Standard,
  openingDuration: OpeningDuration.Manual,
  readingSpeed: ReadingSpeed.Steady,
  beadMaterial: BeadMaterial.Wood,
  showGuidance: true,
  showDropCaps: true,
  showMysteryFruits: true,
  showScriptureReadings: true,
  includeFatimaPrayer: true,
  confirmExternalLinks: true,
  updateChecks: UpdateChecks.OnLoad,
});

const defaultBeadMaterialFor = (theme: Theme): BeadMaterial =>
  theme === Theme.Parchment ? BeadMaterial.Obsidian : BeadMaterial.Wood;

export enum PreferencesActionType {
  Hydrate = 'hydrate',
  SetTheme = 'set-theme',
  SetTextScale = 'set-text-scale',
  SetOpeningDuration = 'set-opening-duration',
  SetReadingSpeed = 'set-reading-speed',
  SetBeadMaterial = 'set-bead-material',
  SetShowGuidance = 'set-show-guidance',
  SetShowDropCaps = 'set-show-drop-caps',
  SetShowMysteryFruits = 'set-show-mystery-fruits',
  SetShowScriptureReadings = 'set-show-scripture-readings',
  SetIncludeFatimaPrayer = 'set-include-fatima-prayer',
  SetConfirmExternalLinks = 'set-confirm-external-links',
  SetUpdateChecks = 'set-update-checks',
}

export type PreferencesAction =
  | { readonly type: PreferencesActionType.Hydrate; readonly preferences: unknown }
  | { readonly type: PreferencesActionType.SetTheme; readonly theme: Theme }
  | { readonly type: PreferencesActionType.SetTextScale; readonly textScale: TextScale }
  | {
      readonly type: PreferencesActionType.SetOpeningDuration;
      readonly openingDuration: OpeningDuration;
    }
  | { readonly type: PreferencesActionType.SetReadingSpeed; readonly readingSpeed: number }
  | { readonly type: PreferencesActionType.SetBeadMaterial; readonly beadMaterial: BeadMaterial }
  | { readonly type: PreferencesActionType.SetShowGuidance; readonly showGuidance: boolean }
  | { readonly type: PreferencesActionType.SetShowDropCaps; readonly showDropCaps: boolean }
  | {
      readonly type: PreferencesActionType.SetShowMysteryFruits;
      readonly showMysteryFruits: boolean;
    }
  | {
      readonly type: PreferencesActionType.SetShowScriptureReadings;
      readonly showScriptureReadings: boolean;
    }
  | {
      readonly type: PreferencesActionType.SetIncludeFatimaPrayer;
      readonly includeFatimaPrayer: boolean;
    }
  | {
      readonly type: PreferencesActionType.SetConfirmExternalLinks;
      readonly confirmExternalLinks: boolean;
    }
  | { readonly type: PreferencesActionType.SetUpdateChecks; readonly updateChecks: UpdateChecks };

const memberFrom = <Member extends string>(
  members: readonly Member[],
  value: unknown,
): Member | null => {
  for (const member of members) {
    if (value === member) {
      return member;
    }
  }

  return null;
};

const booleanFrom = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);

const LEGACY_READING_SPEEDS: Readonly<Record<string, number>> = Object.freeze({
  unhurried: ReadingSpeed.Unhurried,
  steady: ReadingSpeed.Steady,
  brisk: ReadingSpeed.Brisk,
});

const readingSpeedFrom = (value: unknown): number | null => {
  const legacy = typeof value === 'string' ? LEGACY_READING_SPEEDS[value] : value;

  if (
    typeof legacy !== 'number' ||
    !Number.isFinite(legacy) ||
    legacy < READING_SPEED_MINIMUM ||
    legacy > READING_SPEED_MAXIMUM
  ) {
    return null;
  }

  return Number((Math.round(legacy / READING_SPEED_STEP) * READING_SPEED_STEP).toFixed(2));
};

const storedOr = <Value>(
  stored: unknown,
  fallback: Value,
  parse: (value: unknown) => Value | null,
): Value | null => (stored === undefined ? fallback : parse(stored));

type ParsedPreferences = {
  readonly [Key in keyof Preferences]: Preferences[Key] | null;
};

const optionalBooleanFrom = (
  raw: Record<string, unknown>,
  key: keyof Preferences,
  fallback: boolean,
): boolean | null => storedOr(raw[key], fallback, booleanFrom);

const parsedPreferencesFrom = (raw: Record<string, unknown>): ParsedPreferences => ({
  theme: memberFrom(Object.values(Theme), raw['theme']),
  textScale: memberFrom(Object.values(TextScale), raw['textScale']),
  openingDuration: storedOr(raw['openingDuration'], DEFAULT_PREFERENCES.openingDuration, (value) =>
    memberFrom(Object.values(OpeningDuration), value),
  ),
  readingSpeed: storedOr(raw['readingSpeed'], DEFAULT_PREFERENCES.readingSpeed, readingSpeedFrom),
  beadMaterial: storedOr(raw['beadMaterial'], DEFAULT_PREFERENCES.beadMaterial, (value) =>
    memberFrom(Object.values(BeadMaterial), value),
  ),
  showGuidance: optionalBooleanFrom(raw, 'showGuidance', DEFAULT_PREFERENCES.showGuidance),
  showDropCaps: optionalBooleanFrom(raw, 'showDropCaps', DEFAULT_PREFERENCES.showDropCaps),
  showMysteryFruits: optionalBooleanFrom(
    raw,
    'showMysteryFruits',
    DEFAULT_PREFERENCES.showMysteryFruits,
  ),
  showScriptureReadings: optionalBooleanFrom(
    raw,
    'showScriptureReadings',
    DEFAULT_PREFERENCES.showScriptureReadings,
  ),
  includeFatimaPrayer: optionalBooleanFrom(
    raw,
    'includeFatimaPrayer',
    DEFAULT_PREFERENCES.includeFatimaPrayer,
  ),
  confirmExternalLinks: optionalBooleanFrom(
    raw,
    'confirmExternalLinks',
    DEFAULT_PREFERENCES.confirmExternalLinks,
  ),
  updateChecks: storedOr(raw['updateChecks'], DEFAULT_PREFERENCES.updateChecks, (value) =>
    memberFrom(Object.values(UpdateChecks), value),
  ),
});

const isCompletePreferences = (preferences: ParsedPreferences): preferences is Preferences =>
  Object.values(preferences).every((value) => value !== null);

export const parsePreferences = (raw: unknown): Preferences => {
  if (!isRecord(raw)) {
    return DEFAULT_PREFERENCES;
  }

  const preferences = parsedPreferencesFrom(raw);
  return isCompletePreferences(preferences) ? preferences : DEFAULT_PREFERENCES;
};

type DirectPreferencesAction = Exclude<
  PreferencesAction,
  {
    readonly type:
      | PreferencesActionType.Hydrate
      | PreferencesActionType.SetConfirmExternalLinks
      | PreferencesActionType.SetTheme;
  }
>;

type ReadingPreferencesAction = Extract<
  DirectPreferencesAction,
  {
    readonly type:
      | PreferencesActionType.SetShowGuidance
      | PreferencesActionType.SetShowDropCaps
      | PreferencesActionType.SetShowMysteryFruits
      | PreferencesActionType.SetShowScriptureReadings
      | PreferencesActionType.SetIncludeFatimaPrayer;
  }
>;

const reduceReadingPreference = (
  state: Preferences,
  action: ReadingPreferencesAction,
): Preferences => {
  switch (action.type) {
    case PreferencesActionType.SetShowGuidance:
      return { ...state, showGuidance: action.showGuidance };
    case PreferencesActionType.SetShowDropCaps:
      return { ...state, showDropCaps: action.showDropCaps };
    case PreferencesActionType.SetShowMysteryFruits:
      return { ...state, showMysteryFruits: action.showMysteryFruits };
    case PreferencesActionType.SetShowScriptureReadings:
      return { ...state, showScriptureReadings: action.showScriptureReadings };
    case PreferencesActionType.SetIncludeFatimaPrayer:
      return { ...state, includeFatimaPrayer: action.includeFatimaPrayer };
  }
};

const reduceDirectPreference = (
  state: Preferences,
  action: DirectPreferencesAction,
): Preferences => {
  switch (action.type) {
    case PreferencesActionType.SetTextScale:
      return { ...state, textScale: action.textScale };
    case PreferencesActionType.SetOpeningDuration:
      return { ...state, openingDuration: action.openingDuration };
    case PreferencesActionType.SetReadingSpeed:
      return { ...state, readingSpeed: action.readingSpeed };
    case PreferencesActionType.SetBeadMaterial:
      return { ...state, beadMaterial: action.beadMaterial };
    case PreferencesActionType.SetUpdateChecks:
      return { ...state, updateChecks: action.updateChecks };
    default:
      return reduceReadingPreference(state, action);
  }
};

export const preferencesReducer = (state: Preferences, action: PreferencesAction): Preferences => {
  if (action.type === PreferencesActionType.Hydrate) {
    return parsePreferences(action.preferences);
  }

  if (action.type === PreferencesActionType.SetTheme) {
    return {
      ...state,
      theme: action.theme,
      beadMaterial: defaultBeadMaterialFor(action.theme),
    };
  }

  if (action.type === PreferencesActionType.SetConfirmExternalLinks) {
    return { ...state, confirmExternalLinks: action.confirmExternalLinks };
  }

  return reduceDirectPreference(state, action);
};
