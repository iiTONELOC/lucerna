import { ContentBuildError, ContentBuildErrorCode } from './records.ts';

export const SCRIPTURE_SOURCE_DIRECTORY = 'data/library/bibles/douray-rheims/';

export type ScriptureRange = {
  readonly reference: string;
  readonly book: string;
  readonly chapter: number;
  readonly verseStart: number;
  readonly verseEnd: number;
  readonly sourceFile: string;
};

const BOOK_MARKER = String.raw`\h `;
const CHAPTER_MARKER = String.raw`\c `;
const VERSE_MARKER = String.raw`\v `;
const FOOTNOTE_START = String.raw`\f `;
const FOOTNOTE_END = String.raw`\f*`;

const sourceBookFor = (referenceBook: string): string => {
  switch (referenceBook) {
    case 'Micheas':
      return 'Micah';
    case 'Isaias':
      return 'Isaiah';
    default:
      return referenceBook;
  }
};

export const scriptureBookFromReference = (reference: string): string => {
  const locatorStart = reference.lastIndexOf(' ');

  if (locatorStart < 1) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, reference);
  }

  return reference.slice(0, locatorStart);
};

export const validateScriptureRange = (range: ScriptureRange): void => {
  if (
    range.verseEnd < range.verseStart ||
    !range.sourceFile.startsWith(SCRIPTURE_SOURCE_DIRECTORY) ||
    range.sourceFile.includes('..') ||
    !range.sourceFile.endsWith('.sfm')
  ) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceRange);
  }
};

const removeFootnotes = (value: string): string => {
  let source = value;
  let text = '';

  while (source.length > 0) {
    const start = source.indexOf(FOOTNOTE_START);

    if (start < 0) {
      return text + source;
    }

    const end = source.indexOf(FOOTNOTE_END, start + FOOTNOTE_START.length);

    if (end < 0) {
      throw new ContentBuildError(ContentBuildErrorCode.UnterminatedFootnote);
    }

    text += source.slice(0, start);
    source = source.slice(end + FOOTNOTE_END.length);
  }

  return text;
};

const cleanVerseText = (value: string): string => {
  const text = removeFootnotes(value).replace(/\s+/gu, ' ').trim();

  if (text.length === 0 || text.includes('\\')) {
    throw new ContentBuildError(ContentBuildErrorCode.UnsupportedMarker);
  }

  return text;
};

export const extractPassage = (source: string, range: ScriptureRange): string => {
  const sourceBook = source
    .split(/\r?\n/u)
    .find((line) => line.startsWith(BOOK_MARKER))
    ?.slice(BOOK_MARKER.length)
    .trim();

  const expectedSourceBook = sourceBookFor(range.book);

  if (sourceBook !== expectedSourceBook) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, range.sourceFile);
  }

  let chapter = 0;
  const passage = new Map<number, string>();

  for (const line of source.split(/\r?\n/u)) {
    if (line.startsWith(CHAPTER_MARKER)) {
      chapter = Number(line.slice(CHAPTER_MARKER.length).trim());
      continue;
    }

    if (chapter !== range.chapter || !line.startsWith(VERSE_MARKER)) {
      continue;
    }

    const textStart = line.indexOf(' ', VERSE_MARKER.length);

    if (textStart < 0) {
      throw new ContentBuildError(ContentBuildErrorCode.InvalidVerse, range.sourceFile);
    }

    const verseNumber = Number(line.slice(VERSE_MARKER.length, textStart));

    if (verseNumber >= range.verseStart && verseNumber <= range.verseEnd) {
      passage.set(verseNumber, cleanVerseText(line.slice(textStart + 1)));
    }
  }

  const expectedCount = range.verseEnd - range.verseStart + 1;

  if (passage.size !== expectedCount) {
    throw new ContentBuildError(ContentBuildErrorCode.MissingScripture, range.reference);
  }

  return [...passage.values()].join(' ');
};
