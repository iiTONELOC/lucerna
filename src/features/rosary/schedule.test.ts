import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import { LiturgicalSeason } from '../../content/schema.ts';
import {
  dailyMysteryIndex,
  easterSundayOf,
  liturgicalSeasonOf,
  scheduledMysterySetId,
} from './schedule.ts';

describe('scheduledMysterySetId', () => {
  test('resolves every weekday through the canonical schedule', () => {
    const expected = [
      'glorious',
      'joyful',
      'sorrowful',
      'glorious',
      'luminous',
      'sorrowful',
      'joyful',
    ];

    expected.forEach((mysterySetId, dayOffset) => {
      const date = new Date(2026, 7, 16 + dayOffset, 12);
      expect(scheduledMysterySetId(date, contentCatalog.rosary.schedule)).toBe(mysterySetId);
    });
  });

  test('overrides Sundays by liturgical season and leaves weekdays alone', () => {
    const schedule = contentCatalog.rosary.schedule;

    expect(scheduledMysterySetId(new Date(2025, 11, 7, 12), schedule)).toBe('joyful');
    expect(scheduledMysterySetId(new Date(2025, 11, 28, 12), schedule)).toBe('joyful');
    expect(scheduledMysterySetId(new Date(2025, 2, 9, 12), schedule)).toBe('sorrowful');
    expect(scheduledMysterySetId(new Date(2025, 3, 20, 12), schedule)).toBe('glorious');
    expect(scheduledMysterySetId(new Date(2025, 11, 9, 12), schedule)).toBe('sorrowful');
  });

  test('rejects an invalid date', () => {
    expect(() =>
      scheduledMysterySetId(new Date(Number.NaN), contentCatalog.rosary.schedule),
    ).toThrow('Date must be valid');
  });
});

describe('easterSundayOf', () => {
  test('computes known Easter dates', () => {
    expect(easterSundayOf(2024)).toEqual(new Date(2024, 2, 31));
    expect(easterSundayOf(2025)).toEqual(new Date(2025, 3, 20));
    expect(easterSundayOf(2026)).toEqual(new Date(2026, 3, 5));
    expect(easterSundayOf(2038)).toEqual(new Date(2038, 3, 25));
  });
});

describe('liturgicalSeasonOf', () => {
  test('bounds Advent by the fourth Sunday before Christmas', () => {
    expect(liturgicalSeasonOf(new Date(2025, 10, 23, 12))).toBeUndefined();
    expect(liturgicalSeasonOf(new Date(2025, 10, 30, 12))).toBe(LiturgicalSeason.Advent);
    expect(liturgicalSeasonOf(new Date(2025, 11, 24, 12))).toBe(LiturgicalSeason.Advent);
  });

  test('runs Christmas from the Nativity through the Baptism of the Lord', () => {
    expect(liturgicalSeasonOf(new Date(2025, 11, 25, 12))).toBe(LiturgicalSeason.Christmas);
    expect(liturgicalSeasonOf(new Date(2026, 0, 11, 12))).toBe(LiturgicalSeason.Christmas);
    expect(liturgicalSeasonOf(new Date(2026, 0, 12, 12))).toBeUndefined();
  });

  test('bounds Lent from Ash Wednesday to Easter exclusive', () => {
    expect(liturgicalSeasonOf(new Date(2025, 2, 4, 12))).toBeUndefined();
    expect(liturgicalSeasonOf(new Date(2025, 2, 5, 12))).toBe(LiturgicalSeason.Lent);
    expect(liturgicalSeasonOf(new Date(2025, 3, 13, 12))).toBe(LiturgicalSeason.Lent);
    expect(liturgicalSeasonOf(new Date(2025, 3, 20, 12))).toBeUndefined();
  });
});

describe('dailyMysteryIndex', () => {
  test('selects a stable artwork for a date and mystery set', () => {
    const date = new Date(2026, 7, 22, 12);
    const index = dailyMysteryIndex(date, 'glorious', 5);

    expect(dailyMysteryIndex(date, 'glorious', 5)).toBe(index);
    expect(index).toBeGreaterThanOrEqual(0);
    expect(index).toBeLessThan(5);
  });

  test('uses the date and mystery set when selecting from the pool', () => {
    expect(dailyMysteryIndex(new Date(2026, 7, 22, 12), 'glorious', 997)).not.toBe(
      dailyMysteryIndex(new Date(2026, 7, 23, 12), 'joyful', 997),
    );
  });

  test('rejects invalid input', () => {
    expect(() => dailyMysteryIndex(new Date(Number.NaN), 'glorious', 5)).toThrow(
      'Date must be valid',
    );
    expect(() => dailyMysteryIndex(new Date(), 'glorious', 0)).toThrow(
      'Pool size must be a positive integer',
    );
  });
});
