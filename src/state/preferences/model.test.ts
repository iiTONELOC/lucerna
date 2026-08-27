import { describe, expect, test } from 'bun:test';
import {
  BeadMaterial,
  DEFAULT_PREFERENCES,
  OpeningDuration,
  PreferencesActionType,
  ReaderFace,
  ReaderGround,
  ReadingSpeed,
  TextScale,
  Theme,
  UpdateChecks,
  parsePreferences,
  preferencesReducer,
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
      showGuidance: false,
      showDecadeOfferings: false,
      showDropCaps: false,
      showMysteryFruits: false,
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
    expect(parsed.showDecadeOfferings).toBe(true);
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
        type: PreferencesActionType.SetOpeningDuration,
        openingDuration: OpeningDuration.Manual,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, openingDuration: OpeningDuration.Manual });
  });

  test('changes the guided reading speed without changing the other preferences', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetReadingSpeed,
        readingSpeed: ReadingSpeed.Unhurried,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, readingSpeed: ReadingSpeed.Unhurried });
  });

  test('turns the Fatima prayer off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetIncludeFatimaPrayer,
        includeFatimaPrayer: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, includeFatimaPrayer: false });
  });

  test('turns drop caps off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetShowDropCaps,
        showDropCaps: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showDropCaps: false });
  });

  test('turns external link confirmation off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetConfirmExternalLinks,
        confirmExternalLinks: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, confirmExternalLinks: false });
  });
});

describe('preferencesReducer display controls', () => {
  test('turns mystery fruits off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetShowMysteryFruits,
        showMysteryFruits: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showMysteryFruits: false });
  });

  test('turns scripture readings off without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetShowScriptureReadings,
        showScriptureReadings: false,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, showScriptureReadings: false });
  });

  test('changes the bead material without disturbing the rest', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetBeadMaterial,
        beadMaterial: BeadMaterial.Obsidian,
      }),
    ).toEqual({ ...DEFAULT_PREFERENCES, beadMaterial: BeadMaterial.Obsidian });
  });
});

describe('preferencesReducer theme defaults', () => {
  test('selects obsidian by default when Parchment is selected', () => {
    expect(
      preferencesReducer(DEFAULT_PREFERENCES, {
        type: PreferencesActionType.SetTheme,
        theme: Theme.Parchment,
      }),
    ).toEqual({
      ...DEFAULT_PREFERENCES,
      theme: Theme.Parchment,
      beadMaterial: BeadMaterial.Obsidian,
    });
  });

  test('allows the Parchment bead material to be changed after theme selection', () => {
    const parchment = preferencesReducer(DEFAULT_PREFERENCES, {
      type: PreferencesActionType.SetTheme,
      theme: Theme.Parchment,
    });

    expect(
      preferencesReducer(parchment, {
        type: PreferencesActionType.SetBeadMaterial,
        beadMaterial: BeadMaterial.Rose,
      }),
    ).toEqual({ ...parchment, beadMaterial: BeadMaterial.Rose });
  });
});
