import { describe, expect, test } from 'bun:test';
import {
  BeadMaterial,
  DEFAULT_PREFERENCES,
  OpeningDuration,
  PreferencesActionType,
  ReaderFace,
  ReaderGround,
  ReadingSpeed,
  RosaryDisplay,
  TextScale,
  Theme,
  UpdateChecks,
  effectiveBeadMaterial,
  parsePreferences,
  preferencesReducer,
  resolvedThemeOf,
  type Preferences,
} from './model.ts';

describe('update check preferences', () => {
  test('defaults update checks to on load for a record that omits them', () => {
    expect(parsePreferences({ theme: Theme.EternalLight }).updateChecks).toBe(UpdateChecks.OnLoad);
  });

  test('rejects an unknown update check policy', () => {
    expect(parsePreferences({ updateChecks: 'hourly' })).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('parsePreferences', () => {
  test('accepts the complete stored preference record', () => {
    const stored = {
      theme: Theme.Parchment,
      textScale: TextScale.Large,
      readerFace: ReaderFace.Sans,
      readerTextScale: TextScale.ExtraLarge,
      readerGround: ReaderGround.Parchment,
      showRedLetter: true,
      openingDuration: OpeningDuration.FifteenSeconds,
      readingSpeed: ReadingSpeed.Brisk,
      beadMaterial: BeadMaterial.Pearl,
      beadMaterialChosen: true,
      rosaryDisplay: RosaryDisplay.CurrentDecade,
      showGuidance: false,
      readGuidance: false,
      showDecadeOfferings: false,
      readDecadeOfferings: false,
      showDropCaps: false,
      showMysteryFruits: false,
      readMysteryFruits: false,
      showScriptureReadings: false,
      includeFatimaPrayer: false,
      confirmExternalLinks: false,
      updateChecks: UpdateChecks.WhileOpen,
    };

    expect(parsePreferences(stored)).toEqual(stored);
  });

  test('adds the default opening duration to a legacy stored record', () => {
    expect(
      parsePreferences({
        theme: Theme.Parchment,
        textScale: TextScale.Large,
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: Theme.Parchment,
      textScale: TextScale.Large,
    });
  });
});

describe('parsePreferences legacy records', () => {
  test('adds the devotional defaults to a record stored before they existed', () => {
    const parsed = parsePreferences({
      theme: Theme.Parchment,
      textScale: TextScale.Large,
      openingDuration: OpeningDuration.FifteenSeconds,
    });

    expect(parsed.beadMaterial).toBe(DEFAULT_PREFERENCES.beadMaterial);
    expect(parsed.readingSpeed).toBe(ReadingSpeed.Steady);
    expect(parsed.readerFace).toBe(ReaderFace.Garamond);
    expect(parsed.readerTextScale).toBe(TextScale.Standard);
    expect(parsed.readerGround).toBe(ReaderGround.Dark);
    expect(parsed.showRedLetter).toBe(false);
    expect(parsed.showGuidance).toBe(true);
    expect(parsed.readGuidance).toBe(true);
    expect(parsed.showDecadeOfferings).toBe(true);
    expect(parsed.readDecadeOfferings).toBe(true);
    expect(parsed.readMysteryFruits).toBe(true);
    expect(parsed.showDropCaps).toBe(true);
    expect(parsed.showMysteryFruits).toBe(true);
    expect(parsed.showScriptureReadings).toBe(true);
    expect(parsed.includeFatimaPrayer).toBe(true);
    expect(parsed.confirmExternalLinks).toBe(true);
  });
});

describe('parsePreferences reading speed', () => {
  test('accepts a custom guided reading speed inside the safe range', () => {
    const parsed = parsePreferences({
      theme: Theme.EternalLight,
      textScale: TextScale.Standard,
      readingSpeed: 1.85,
    });

    expect(parsed.readingSpeed).toBe(1.85);
  });

  test('migrates the named reading-speed values stored by the earlier control', () => {
    const parsed = parsePreferences({
      theme: Theme.EternalLight,
      textScale: TextScale.Standard,
      readingSpeed: 'brisk',
    });

    expect(parsed.readingSpeed).toBe(ReadingSpeed.Brisk);
  });
});

describe('parsePreferences validation', () => {
  test('returns safe defaults for malformed input', () => {
    expect(parsePreferences({ theme: 'unknown', textScale: TextScale.Standard })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  test('rejects the retired high contrast preference', () => {
    expect(parsePreferences({ theme: 'hc', textScale: TextScale.Standard })).toEqual(
      DEFAULT_PREFERENCES,
    );
  });

  test('rejects a stored bead material that is not a real material', () => {
    expect(
      parsePreferences({
        theme: Theme.Parchment,
        textScale: TextScale.Standard,
        beadMaterial: 'plastic',
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });

  test('rejects a non boolean stored toggle rather than coercing it', () => {
    expect(
      parsePreferences({
        theme: Theme.Parchment,
        textScale: TextScale.Standard,
        showGuidance: 'yes',
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('parsePreferences reading speed validation', () => {
  test('rejects a stored reading speed outside the owned values', () => {
    expect(
      parsePreferences({
        theme: Theme.Parchment,
        textScale: TextScale.Standard,
        readingSpeed: 'rushed',
      }),
    ).toEqual(DEFAULT_PREFERENCES);

    expect(
      parsePreferences({
        theme: Theme.Parchment,
        textScale: TextScale.Standard,
        readingSpeed: 2.5,
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });
});

describe('preferencesReducer', () => {
  test('changes one preference without changing the others', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'openingDuration',
        value: OpeningDuration.Manual,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, openingDuration: OpeningDuration.Manual });
  });

  test('changes the guided reading speed without changing the other preferences', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'readingSpeed',
        value: ReadingSpeed.Unhurried,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, readingSpeed: ReadingSpeed.Unhurried });
  });

  test('turns the Fatima prayer off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'includeFatimaPrayer',
        value: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, includeFatimaPrayer: false });
  });

  test('turns drop caps off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'showDropCaps',
        value: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showDropCaps: false });
  });
});

describe('preferencesReducer general controls', () => {
  test('turns external link confirmation off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'confirmExternalLinks',
        value: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, confirmExternalLinks: false });
  });
});

describe('preferencesReducer display controls', () => {
  test('turns mystery fruits off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'showMysteryFruits',
        value: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showMysteryFruits: false });
  });

  test('turns scripture readings off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'showScriptureReadings',
        value: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showScriptureReadings: false });
  });

  test('changes the bead material without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.Set,
        key: 'beadMaterial',
        value: BeadMaterial.Obsidian,
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      beadMaterial: BeadMaterial.Obsidian,
      beadMaterialChosen: true,
    });
  });

  test('sets the reading text size with the app text size', () => {
    const next = preferencesReducer(DEFAULT_PREFERENCES, {
      type: PreferencesActionType.Set,
      key: 'textScale',
      value: TextScale.Large,
    });

    expect(next.readerTextScale).toBe(TextScale.Large);
  });
});

const choose = <Key extends keyof Preferences>(
  preferences: Preferences,
  key: Key,
  value: Preferences[Key],
): Preferences => preferencesReducer(preferences, { type: PreferencesActionType.Set, key, value });

describe('app appearance', () => {
  test('follows the device appearance when set to follow system', () => {
    expect(resolvedThemeOf(Theme.System, true)).toBe(Theme.Parchment);
    expect(resolvedThemeOf(Theme.System, false)).toBe(Theme.EternalLight);
    expect(resolvedThemeOf(Theme.Parchment, false)).toBe(Theme.Parchment);
  });

  test('uses pearl beads on Parchment and wood on dark until a material is chosen', () => {
    const parchment = choose(DEFAULT_PREFERENCES, 'theme', Theme.Parchment);

    expect(effectiveBeadMaterial(parchment, Theme.Parchment)).toBe(BeadMaterial.Pearl);
    expect(effectiveBeadMaterial(DEFAULT_PREFERENCES, Theme.EternalLight)).toBe(BeadMaterial.Wood);
  });

  test('keeps a chosen bead material until the appearance changes', () => {
    const rose = choose(DEFAULT_PREFERENCES, 'beadMaterial', BeadMaterial.Rose);

    expect(effectiveBeadMaterial(rose, Theme.Parchment)).toBe(BeadMaterial.Rose);
    expect(effectiveBeadMaterial(choose(rose, 'theme', Theme.Parchment), Theme.Parchment)).toBe(
      BeadMaterial.Pearl,
    );
  });

  test('keeps a material chosen before the choice was recorded', () => {
    const legacy = parsePreferences({
      theme: Theme.Parchment,
      textScale: TextScale.Standard,
      beadMaterial: BeadMaterial.Rose,
    });
    const formerDefault = parsePreferences({
      theme: Theme.Parchment,
      textScale: TextScale.Standard,
      beadMaterial: BeadMaterial.Obsidian,
    });

    expect(effectiveBeadMaterial(legacy, Theme.Parchment)).toBe(BeadMaterial.Rose);
    expect(effectiveBeadMaterial(formerDefault, Theme.Parchment)).toBe(BeadMaterial.Pearl);
  });
});

describe('rosary display', () => {
  test('shows the full rosary unless the current decade is chosen', () => {
    expect(DEFAULT_PREFERENCES.rosaryDisplay).toBe(RosaryDisplay.FullRosary);
    expect(
      parsePreferences({
        theme: Theme.EternalLight,
        textScale: TextScale.Standard,
        rosaryDisplay: RosaryDisplay.CurrentDecade,
      }).rosaryDisplay,
    ).toBe(RosaryDisplay.CurrentDecade);
  });

  test('rejects an unknown rosary display', () => {
    expect(
      parsePreferences({
        theme: Theme.EternalLight,
        textScale: TextScale.Standard,
        rosaryDisplay: 'ring',
      }),
    ).toEqual(DEFAULT_PREFERENCES);
  });
});
