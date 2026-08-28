import { BibleTestament } from '../../content/schema.ts';
import { isRecord } from '../../shared/guards.ts';
import { readStoredValue, writeStoredValue } from '../preferences/storage.ts';

const READING_POSITIONS_KEY = 'reading-positions';
const LAST_BIBLE_BOOK_KEY = 'bible-last-book';
const OPEN_TESTAMENTS_KEY = 'bible-open-testaments';

export type OpenTestaments = Readonly<Record<BibleTestament, boolean>>;

const openTestamentsFrom = (isOpen: (testament: BibleTestament) => boolean): OpenTestaments => ({
  [BibleTestament.Old]: isOpen(BibleTestament.Old),
  [BibleTestament.New]: isOpen(BibleTestament.New),
});

type ReadingPositions = Readonly<Record<string, number>>;

const parseReadingPositions = (raw: unknown): ReadingPositions => {
  if (!isRecord(raw)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(raw).filter(
      (entry): entry is [string, number] =>
        typeof entry[1] === 'number' && Number.isInteger(entry[1]) && entry[1] >= 0,
    ),
  );
};

export const loadReadingPosition = async (workId: string): Promise<number | null> => {
  const positions = parseReadingPositions(await readStoredValue(READING_POSITIONS_KEY));

  return positions[workId] ?? null;
};

export const saveReadingPosition = async (workId: string, blockIndex: number): Promise<void> => {
  const positions = parseReadingPositions(await readStoredValue(READING_POSITIONS_KEY));

  if (positions[workId] === blockIndex) {
    return;
  }

  await writeStoredValue(READING_POSITIONS_KEY, { ...positions, [workId]: blockIndex });
};

export const loadLastBibleBook = async (): Promise<string | null> => {
  const stored = await readStoredValue(LAST_BIBLE_BOOK_KEY);

  return typeof stored === 'string' && stored.length > 0 ? stored : null;
};

export const saveLastBibleBook = async (bookId: string): Promise<void> => {
  await writeStoredValue(LAST_BIBLE_BOOK_KEY, bookId);
};

export const loadOpenTestaments = async (): Promise<OpenTestaments> => {
  const stored = await readStoredValue(OPEN_TESTAMENTS_KEY);

  return openTestamentsFrom((testament) =>
    isRecord(stored) && typeof stored[testament] === 'boolean' ? stored[testament] : true,
  );
};

export const saveOpenTestaments = async (openTestaments: OpenTestaments): Promise<void> => {
  await writeStoredValue(OPEN_TESTAMENTS_KEY, openTestaments);
};
