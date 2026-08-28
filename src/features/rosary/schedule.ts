import type { ResolvedRosary } from '../../content/catalog.ts';
import { LiturgicalSeason } from '../../content/schema.ts';

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

const startOfDay = (date: Date): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate());

const addDays = (date: Date, days: number): Date =>
  new Date(date.getFullYear(), date.getMonth(), date.getDate() + days);

export const easterSundayOf = (year: number): Date => {
  const goldenNumber = year % 19;
  const century = Math.floor(year / 100);
  const centuryRemainder = year % 100;
  const centuryLeapCycles = Math.floor(century / 4);
  const centuryLeapRemainder = century % 4;
  const gregorianCorrection = Math.floor((century + 8) / 25);
  const lunarCorrection = Math.floor((century - gregorianCorrection + 1) / 3);
  const epact = (19 * goldenNumber + century - centuryLeapCycles - lunarCorrection + 15) % 30;
  const leapCycles = Math.floor(centuryRemainder / 4);
  const leapRemainder = centuryRemainder % 4;
  const weekdayOffset =
    (32 + 2 * centuryLeapRemainder + 2 * leapCycles - epact - leapRemainder) % 7;
  const paschalAdjustment = Math.floor((goldenNumber + 11 * epact + 22 * weekdayOffset) / 451);
  const paschalIndex = epact + weekdayOffset - 7 * paschalAdjustment + 114;

  return new Date(year, Math.floor(paschalIndex / 31) - 1, (paschalIndex % 31) + 1);
};

const adventStartOf = (year: number): Date => {
  const christmas = new Date(year, 11, 25);
  const sundayOffset = christmas.getDay() === 0 ? 7 : christmas.getDay();

  return addDays(christmas, -sundayOffset - 21);
};

const baptismOfTheLordOf = (year: number): Date => {
  const epiphany = new Date(year, 0, 6);

  return addDays(epiphany, 7 - epiphany.getDay());
};

export const liturgicalSeasonOf = (date: Date): LiturgicalSeason | undefined => {
  const day = startOfDay(date);
  const year = day.getFullYear();
  const easter = easterSundayOf(year);
  const christmas = new Date(year, 11, 25);

  if (day >= addDays(easter, -46) && day < easter) {
    return LiturgicalSeason.Lent;
  }

  if (day >= adventStartOf(year) && day < christmas) {
    return LiturgicalSeason.Advent;
  }

  if (day >= christmas || day <= baptismOfTheLordOf(year)) {
    return LiturgicalSeason.Christmas;
  }

  return undefined;
};

export const scheduledMysterySetId = (date: Date, schedule: ResolvedRosary['schedule']): string => {
  const weekday = weekdayFrom(date);
  const season = weekday === Weekday.Sunday ? liturgicalSeasonOf(date) : undefined;
  const seasonalRule = schedule.seasonalSundays.find((rule) => rule.season === season);

  return seasonalRule?.mysterySetId ?? schedule[weekday];
};

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
    hash = (hash * 31 + (character.codePointAt(0) ?? 0)) >>> 0;
  }

  return hash % poolSize;
};
