import type { BibleEditionId } from '../../content/language.ts';
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

const lastBibleBookKeyOf = (edition: BibleEditionId): string => `${LAST_BIBLE_BOOK_KEY}-${edition}`;

const bookIdFrom = (stored: unknown): string | null =>
  typeof stored === 'string' && stored.length > 0 ? stored : null;

export const loadLastBibleBook = async (edition: BibleEditionId): Promise<string | null> =>
  bookIdFrom(await readStoredValue(lastBibleBookKeyOf(edition))) ??
  bookIdFrom(await readStoredValue(LAST_BIBLE_BOOK_KEY));

export const saveLastBibleBook = async (edition: BibleEditionId, bookId: string): Promise<void> => {
  await writeStoredValue(lastBibleBookKeyOf(edition), bookId);
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
