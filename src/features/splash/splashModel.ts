import splashVerses from '../../generated/splash-verses.json';

export type SplashVerse = {
  readonly reference: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceLabel: string;
};

export type SplashIndex = (length: number) => number;

const EMPTY_VERSES_ERROR = 'Splash verses must not be empty';
const OPENING_VERSES: readonly SplashVerse[] = splashVerses;
const UINT32_RANGE = 2 ** 32;

export const randomSplashIndex: SplashIndex = (length) => {
  const [randomValue = 0] = crypto.getRandomValues(new Uint32Array(1));

  return Math.floor((randomValue / UINT32_RANGE) * length);
};

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

export const selectOpeningVerse = (): SplashVerse =>
  selectSplashVerse(OPENING_VERSES, randomSplashIndex);
