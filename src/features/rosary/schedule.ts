import type { ResolvedRosary } from '../../content/catalog.ts';

export enum Weekday {
  Sunday = 'sunday',
  Monday = 'monday',
  Tuesday = 'tuesday',
  Wednesday = 'wednesday',
  Thursday = 'thursday',
  Friday = 'friday',
  Saturday = 'saturday',
}

const weekdayFrom = (date: Date): Weekday => {
  switch (date.getDay()) {
    case 0:
      return Weekday.Sunday;
    case 1:
      return Weekday.Monday;
    case 2:
      return Weekday.Tuesday;
    case 3:
      return Weekday.Wednesday;
    case 4:
      return Weekday.Thursday;
    case 5:
      return Weekday.Friday;
    case 6:
      return Weekday.Saturday;
    default:
      throw new RangeError('Date must be valid');
  }
};

export const scheduledMysterySetId = (date: Date, schedule: ResolvedRosary['schedule']): string =>
  schedule[weekdayFrom(date)];

export const dailyMysteryIndex = (date: Date, mysterySetId: string, poolSize: number): number => {
  if (Number.isNaN(date.getTime())) {
    throw new RangeError('Date must be valid');
  }

  if (!Number.isInteger(poolSize) || poolSize < 1) {
    throw new RangeError('Pool size must be a positive integer');
  }

  const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${mysterySetId}`;
  let hash = 0;

  for (const character of key) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0;
  }

  return hash % poolSize;
};
