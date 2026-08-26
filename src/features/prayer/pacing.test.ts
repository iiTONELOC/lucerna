import { describe, expect, test } from 'bun:test';
import { READING_SPEED_PRESETS, ReadingSpeed } from '../../state/preferences/model.ts';
import { indexAtTime, paceText, playbackHoldMs, startMsAt } from './pacing.ts';

describe('paceText', () => {
  test('normalizes whitespace while preserving each visible word', () => {
    const paced = paceText('  Hail   Mary,\nfull of grace.  ', ReadingSpeed.Steady);

    expect(paced.words.map(({ word }) => word).join(' ')).toBe('Hail Mary, full of grace.');
    expect(paced.totalMs).toBeGreaterThan(0);
  });

  test('paces unhurried prayer slower and brisk prayer faster than steady prayer', () => {
    const text = 'Glory be to the Father, and to the Son.';
    const unhurried = paceText(text, ReadingSpeed.Unhurried);
    const steady = paceText(text, ReadingSpeed.Steady);
    const brisk = paceText(text, ReadingSpeed.Brisk);

    expect(unhurried.totalMs).toBeGreaterThan(steady.totalMs);
    expect(steady.totalMs).toBeGreaterThan(brisk.totalMs);
  });

  test('lets a custom pace run faster than the fastest preset', () => {
    const text = 'Blessed art thou amongst women.';

    expect(paceText(text, 1.85).totalMs).toBeLessThan(paceText(text, ReadingSpeed.Brisk).totalMs);
  });

  test('returns an empty timeline for an intentionally silent display step', () => {
    expect(paceText('', ReadingSpeed.Steady)).toEqual({ words: [], totalMs: 0 });
  });
});

describe('indexAtTime', () => {
  const paced = paceText('Pray for us.', ReadingSpeed.Steady);

  test('has no active word before playback begins', () => {
    expect(indexAtTime(paced, -1)).toBe(-1);
  });

  test('selects the word whose start time has passed', () => {
    const second = paced.words[1];

    expect(second).toBeDefined();
    expect(indexAtTime(paced, second?.startMs ?? -1)).toBe(1);
  });

  test('keeps the final word active through the closing hold', () => {
    expect(indexAtTime(paced, paced.totalMs)).toBe(paced.words.length - 1);
  });
});

describe('startMsAt', () => {
  const text = 'Hail Mary, full of grace, the Lord is with thee.';

  test('reports the start time of the word playback is reading', () => {
    const paced = paceText(text, ReadingSpeed.Steady);

    expect(startMsAt(paced, 4)).toBe(paced.words[4]?.startMs ?? -1);
  });

  test('reports the opening of the prayer before any word is active', () => {
    expect(startMsAt(paceText(text, ReadingSpeed.Steady), -1)).toBe(0);
  });

  test('holds the reader on the same word when the reading speed changes', () => {
    const steady = paceText(text, ReadingSpeed.Steady);
    const brisk = paceText(text, ReadingSpeed.Brisk);
    const resumed = startMsAt(brisk, indexAtTime(steady, startMsAt(steady, 5)));

    expect(indexAtTime(brisk, resumed)).toBe(5);
    expect(resumed).toBeLessThan(startMsAt(steady, 5));
  });
});

describe('playbackHoldMs', () => {
  test('holds a mystery announcement longer than a prayer at every reading speed', () => {
    for (const speed of READING_SPEED_PRESETS) {
      expect(playbackHoldMs(true, speed)).toBeGreaterThan(playbackHoldMs(false, speed));
    }
  });
});
