import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import { dailyMysteryIndex, scheduledMysterySetId } from './schedule.ts';

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

  test('rejects an invalid date', () => {
    expect(() =>
      scheduledMysterySetId(new Date(Number.NaN), contentCatalog.rosary.schedule),
    ).toThrow('Date must be valid');
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
