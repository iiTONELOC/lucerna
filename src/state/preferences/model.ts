import { isRecord, type UnknownRecord } from '../../shared/guards.ts';

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

export enum ReaderFace {
  Garamond = 'garamond',
  Sans = 'sans',
}

export enum ReaderGround {
  Dark = 'dark',
  Parchment = 'parchment',
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
  readonly readerFace: ReaderFace;
  readonly readerTextScale: TextScale;
  readonly readerGround: ReaderGround;
  readonly showRedLetter: boolean;
  readonly openingDuration: OpeningDuration;
  readonly readingSpeed: number;
  readonly beadMaterial: BeadMaterial;
  readonly showGuidance: boolean;
  readonly readGuidance: boolean;
  readonly showDecadeOfferings: boolean;
  readonly readDecadeOfferings: boolean;
  readonly showDropCaps: boolean;
  readonly showMysteryFruits: boolean;
  readonly readMysteryFruits: boolean;
  readonly showScriptureReadings: boolean;
  readonly includeFatimaPrayer: boolean;
  readonly confirmExternalLinks: boolean;
  readonly updateChecks: UpdateChecks;
};

export type PreferenceKey = keyof Preferences;

export const DEFAULT_PREFERENCES: Preferences = Object.freeze({
  theme: Theme.EternalLight,
  textScale: TextScale.Standard,
  readerFace: ReaderFace.Garamond,
  readerTextScale: TextScale.Standard,
  readerGround: ReaderGround.Dark,
  showRedLetter: false,
  openingDuration: OpeningDuration.Manual,
  readingSpeed: ReadingSpeed.Steady,
  beadMaterial: BeadMaterial.Wood,
  showGuidance: true,
  readGuidance: true,
  showDecadeOfferings: true,
  readDecadeOfferings: true,
  showDropCaps: true,
  showMysteryFruits: true,
  readMysteryFruits: true,
  showScriptureReadings: true,
  includeFatimaPrayer: true,
  confirmExternalLinks: true,
  updateChecks: UpdateChecks.OnLoad,
});

const defaultBeadMaterialFor = (theme: Theme): BeadMaterial =>
  theme === Theme.Parchment ? BeadMaterial.Obsidian : BeadMaterial.Wood;

export enum PreferencesActionType {
  Hydrate = 'hydrate',
  Set = 'set',
}

export type SetPreferenceAction<Key extends PreferenceKey = PreferenceKey> = {
  readonly type: PreferencesActionType.Set;
  readonly key: Key;
  readonly value: Preferences[Key];
};

export type PreferencesAction =
  | { readonly type: PreferencesActionType.Hydrate; readonly preferences: unknown }
  | SetPreferenceAction;

type PreferenceParser<Value> = (value: unknown) => Value | null;

const memberOf =
  <Member extends string>(members: readonly Member[]): PreferenceParser<Member> =>
  (value) =>
    members.find((member) => member === value) ?? null;

const booleanFrom: PreferenceParser<boolean> = (value) =>
  typeof value === 'boolean' ? value : null;

const LEGACY_READING_SPEEDS: Readonly<Record<string, number>> = Object.freeze({
  unhurried: ReadingSpeed.Unhurried,
  steady: ReadingSpeed.Steady,
  brisk: ReadingSpeed.Brisk,
});

const readingSpeedFrom: PreferenceParser<number> = (value) => {
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

const optional =
  <Key extends PreferenceKey>(
    key: Key,
    parse: PreferenceParser<Preferences[Key]>,
  ): PreferenceParser<Preferences[Key]> =>
  (value) =>
    value === undefined ? DEFAULT_PREFERENCES[key] : parse(value);

type ParsedPreferences = {
  readonly [Key in PreferenceKey]: Preferences[Key] | null;
};

const textScaleFrom = memberOf(Object.values(TextScale));

const parsedPreferencesFrom = (raw: UnknownRecord): ParsedPreferences => ({
  theme: memberOf(Object.values(Theme))(raw['theme']),
  textScale: textScaleFrom(raw['textScale']),
  readerFace: optional('readerFace', memberOf(Object.values(ReaderFace)))(raw['readerFace']),
  readerTextScale: optional('readerTextScale', textScaleFrom)(raw['readerTextScale']),
  readerGround: optional(
    'readerGround',
    memberOf(Object.values(ReaderGround)),
  )(raw['readerGround']),
  showRedLetter: optional('showRedLetter', booleanFrom)(raw['showRedLetter']),
  openingDuration: optional(
    'openingDuration',
    memberOf(Object.values(OpeningDuration)),
  )(raw['openingDuration']),
  readingSpeed: optional('readingSpeed', readingSpeedFrom)(raw['readingSpeed']),
  beadMaterial: optional(
    'beadMaterial',
    memberOf(Object.values(BeadMaterial)),
  )(raw['beadMaterial']),
  showGuidance: optional('showGuidance', booleanFrom)(raw['showGuidance']),
  readGuidance: optional('readGuidance', booleanFrom)(raw['readGuidance']),
  showDecadeOfferings: optional('showDecadeOfferings', booleanFrom)(raw['showDecadeOfferings']),
  readDecadeOfferings: optional('readDecadeOfferings', booleanFrom)(raw['readDecadeOfferings']),
  showDropCaps: optional('showDropCaps', booleanFrom)(raw['showDropCaps']),
  showMysteryFruits: optional('showMysteryFruits', booleanFrom)(raw['showMysteryFruits']),
  readMysteryFruits: optional('readMysteryFruits', booleanFrom)(raw['readMysteryFruits']),
  showScriptureReadings: optional(
    'showScriptureReadings',
    booleanFrom,
  )(raw['showScriptureReadings']),
  includeFatimaPrayer: optional('includeFatimaPrayer', booleanFrom)(raw['includeFatimaPrayer']),
  confirmExternalLinks: optional('confirmExternalLinks', booleanFrom)(raw['confirmExternalLinks']),
  updateChecks: optional(
    'updateChecks',
    memberOf(Object.values(UpdateChecks)),
  )(raw['updateChecks']),
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

export const preferencesReducer = (state: Preferences, action: PreferencesAction): Preferences => {
  if (action.type === PreferencesActionType.Hydrate) {
    return parsePreferences(action.preferences);
  }

  const next: Preferences = { ...state, [action.key]: action.value };

  return action.key === 'theme'
    ? { ...next, beadMaterial: defaultBeadMaterialFor(next.theme) }
    : next;
};
