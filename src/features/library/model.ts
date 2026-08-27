import { BibleTestament, LibraryCategory } from '../../content/schema.ts';

export const LIBRARY_CATEGORY_LABEL: Readonly<Record<LibraryCategory, string>> = {
  [LibraryCategory.Scripture]: 'Scripture',
  [LibraryCategory.Devotions]: 'Devotions',
};

export const BIBLE_TITLE = 'The Holy Bible';
export const BIBLE_EDITION = 'Douay-Rheims Version';

export type BibleVerseLocation = {
  readonly chapter: number;
  readonly verse: number;
};

export const TESTAMENT_LABEL: Readonly<Record<BibleTestament, string>> = {
  [BibleTestament.Old]: 'The Old Testament',
  [BibleTestament.New]: 'The New Testament',
};
