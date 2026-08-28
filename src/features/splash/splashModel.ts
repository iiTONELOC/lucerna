import splashVerses from '../../generated/splash-verses.json';
import { randomIndex } from '../../shared/random.ts';

export type SplashVerse = {
  readonly reference: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceLabel: string;
};

export type SplashIndex = (length: number) => number;

const EMPTY_VERSES_ERROR = 'Splash verses must not be empty';
const OPENING_VERSES: readonly SplashVerse[] = splashVerses;

export const selectSplashVerse = (
  verses: readonly SplashVerse[],
  selectIndex: SplashIndex,
): SplashVerse => {
  if (verses.length === 0) {
    throw new RangeError(EMPTY_VERSES_ERROR);
  }

  const index = selectIndex(verses.length);
  const verse = verses[index];

  if (!Number.isInteger(index) || verse === undefined) {
    return verses[0] as SplashVerse;
  }

  return verse;
};

export const selectOpeningVerse = (): SplashVerse => selectSplashVerse(OPENING_VERSES, randomIndex);
