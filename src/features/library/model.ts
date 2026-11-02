import { createContext, useContext } from 'react';
import { type ResolvedBible } from '../../content/catalog.ts';
import { INITIAL_READING, type ReadingSnapshot } from '../../content/reading.ts';
import { BibleTestament, LibraryCategory, type ScripturePassage } from '../../content/schema.ts';

export const LIBRARY_CATEGORY_LABEL = (
  reading: ReadingSnapshot,
): Readonly<Record<LibraryCategory, string>> => ({
  [LibraryCategory.Scripture]: reading.wording.library.scripture,
  [LibraryCategory.Devotions]: reading.wording.library.devotions,
});

export const BIBLE_TITLE = (reading: ReadingSnapshot) => reading.wording.library.bibleTitle;
export const BIBLE_EDITION_LABEL = (reading: ReadingSnapshot) =>
  reading.wording.library.bibleEditions;

export const OpenBibleContext = createContext<ResolvedBible>(INITIAL_READING.catalog.bible);

export const useOpenBible = (): ResolvedBible => useContext(OpenBibleContext);

export type ReaderJump = {
  readonly blockIndex: number;
  readonly label: string;
  readonly part?: boolean;
};

export const currentJumpOf = (
  jumps: readonly ReaderJump[],
  blockIndex: number,
): ReaderJump | undefined =>
  jumps.reduce<ReaderJump | undefined>(
    (current, jump) => (jump.blockIndex <= blockIndex ? jump : current),
    undefined,
  );

export type BibleVerseLocation = {
  readonly chapter: number;
  readonly verse: number;
};

export type ScriptureLocation = {
  readonly bookId: string;
  readonly verse: BibleVerseLocation;
};

export const scriptureLocationOf = (
  reading: ReadingSnapshot,
  scripture: ScripturePassage,
): ScriptureLocation | null => {
  const book = reading.catalog.bible.books.find(({ id }) => id === scripture.bookId);

  return book === undefined
    ? null
    : { bookId: book.id, verse: { chapter: scripture.chapter, verse: scripture.verseStart } };
};

export const TESTAMENT_LABEL = (
  reading: ReadingSnapshot,
): Readonly<Record<BibleTestament, string>> => ({
  [BibleTestament.Old]: reading.wording.library.oldTestament,
  [BibleTestament.New]: reading.wording.library.newTestament,
});
