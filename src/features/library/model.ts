import { contentCatalog } from '../../content/catalog.ts';
import { BibleTestament, LibraryCategory, type ScripturePassage } from '../../content/schema.ts';

export const LIBRARY_CATEGORY_LABEL: Readonly<Record<LibraryCategory, string>> = {
  [LibraryCategory.Scripture]: 'Scripture',
  [LibraryCategory.Devotions]: 'Devotions',
};

export const BIBLE_TITLE = 'The Holy Bible';
export const BIBLE_EDITION = 'Douay-Rheims Version';

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

export const scriptureLocationOf = (scripture: ScripturePassage): ScriptureLocation | null => {
  const book = contentCatalog.bible.books.find(
    ({ name }) => name === scripture.book || name.startsWith(`${scripture.book} `),
  );

  return book === undefined
    ? null
    : { bookId: book.id, verse: { chapter: scripture.chapter, verse: scripture.verseStart } };
};

export const TESTAMENT_LABEL: Readonly<Record<BibleTestament, string>> = {
  [BibleTestament.Old]: 'The Old Testament',
  [BibleTestament.New]: 'The New Testament',
};
