import { verseLocatorOf } from '../../src/content/language.ts';
import type { ScriptureRedSpan } from '../../src/content/schema.ts';
import { BIBLE_DEFINITIONS } from './bibleBooks.ts';
import { BIBLE_EDITIONS, type BibleEdition, type ContentReading } from './editions.ts';
import { ContentBuildError, ContentBuildErrorCode } from './records.ts';
import { redSpansOf, type RedLetterEntry } from './redLetter.ts';

export type ScriptureRange = {
  readonly reference: string;
  readonly book: string;
  readonly chapter: number;
  readonly verseStart: number;
  readonly verseEnd: number;
  readonly sourceFile: string;
};

const BOOK_MARKER = String.raw`\h `;
const CODE_MARKER = String.raw`\id `;
export const CHAPTER_MARKER = String.raw`\c `;
export const VERSE_MARKER = String.raw`\v `;
export const FOOTNOTE_START = String.raw`\f `;
export const FOOTNOTE_END = String.raw`\f*`;
export const ITALIC_START = String.raw`\it `;
export const ITALIC_END = String.raw`\it*`;
export const NOTE_PATTERN = /\\f \+[\s\S]*?\\f\*/gu;
const ITALIC_PATTERN = /\\it .*?\\it\*/gu;

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
    range.sourceFile.includes('..') ||
    !Object.values(BIBLE_EDITIONS).some(
      (edition) =>
        range.sourceFile.startsWith(edition.directory) &&
        range.sourceFile.endsWith(edition.extension),
    )
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
  const text = removeFootnotes(value).replaceAll(ITALIC_PATTERN, '').replace(/\s+/gu, ' ').trim();

  if (text.length === 0 || text.includes('\\')) {
    throw new ContentBuildError(ContentBuildErrorCode.UnsupportedMarker);
  }

  return text;
};

export const sourceBookOf = (source: string): string | undefined =>
  source
    .split(/\r?\n/u)
    .find((line) => line.startsWith(BOOK_MARKER))
    ?.slice(BOOK_MARKER.length)
    .trim();

export const sourceCodeOf = (source: string): string | undefined =>
  source
    .split(/\r?\n/u)
    .find((line) => line.startsWith(CODE_MARKER))
    ?.slice(CODE_MARKER.length)
    .trim()
    .split(' ')[0];

export const editionFileOf = (
  edition: BibleEdition,
  code: string,
  fileNames: readonly string[],
): string => {
  const marker = edition.fileMarkerOf(code);
  const matches = fileNames.filter(
    (fileName) => fileName.includes(marker) && fileName.endsWith(edition.extension),
  );
  const fileName = matches[0];

  if (matches.length !== 1 || fileName === undefined) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, code);
  }

  return fileName;
};

export const editionFileNamesOf = async (
  edition: BibleEdition,
  repositoryRoot: URL,
): Promise<readonly string[]> =>
  Array.fromAsync(
    new Bun.Glob(`*${edition.extension}`).scan({
      cwd: new URL(edition.directory, repositoryRoot).pathname,
    }),
  );

const versesOf = ({ verseStart, verseEnd }: ScriptureRange): string =>
  verseStart === verseEnd ? String(verseStart) : `${String(verseStart)}-${String(verseEnd)}`;

export const editionRangeOf = async (
  range: ScriptureRange,
  { bookNameOf, edition, language }: ContentReading,
  repositoryRoot: URL,
): Promise<ScriptureRange> => {
  if (range.sourceFile.startsWith(edition.directory)) {
    return range;
  }

  const code = sourceCodeOf(await Bun.file(new URL(range.sourceFile, repositoryRoot)).text());
  const definition = BIBLE_DEFINITIONS.find((candidate) => candidate.code === code);

  if (code === undefined || definition === undefined) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, range.sourceFile);
  }

  const fileName = editionFileOf(edition, code, await editionFileNamesOf(edition, repositoryRoot));
  const sourceFile = `${edition.directory}${fileName}`;
  const book = sourceBookOf(await Bun.file(new URL(sourceFile, repositoryRoot)).text());

  if (book === undefined) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, sourceFile);
  }

  return {
    ...range,
    reference: `${bookNameOf(definition)} ${verseLocatorOf(language, range.chapter, versesOf(range))}`,
    book,
    sourceFile,
  };
};

const passageVersesFrom = (source: string, range: ScriptureRange): ReadonlyMap<number, string> => {
  if (sourceBookOf(source) !== sourceBookFor(range.book)) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, range.sourceFile);
  }

  let chapter = 0;
  const passage = new Map<number, string>();

  for (const line of source.replaceAll(NOTE_PATTERN, '').split(/\r?\n/u)) {
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

  return passage;
};

const quotedPassageOf = (verses: readonly string[]): string => {
  const text = verses.join(' ');

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}`;
};

export const extractPassage = (source: string, range: ScriptureRange): string =>
  quotedPassageOf([...passageVersesFrom(source, range).values()]);

export type ScripturePassageContent = {
  readonly text: string;
  readonly red: readonly ScriptureRedSpan[];
};

export const extractPassageContent = (
  source: string,
  range: ScriptureRange,
  entries: ReadonlyMap<string, RedLetterEntry> | undefined,
): ScripturePassageContent => {
  const parts: string[] = [];
  const red: ScriptureRedSpan[] = [];
  let offset = 0;

  for (const [verseNumber, verseText] of passageVersesFrom(source, range)) {
    const entry = entries?.get(`${String(range.chapter)}:${String(verseNumber)}`);

    if (entry !== undefined) {
      const context = `${range.reference} verse ${String(verseNumber)}`;

      for (const span of redSpansOf(verseText, entry, context)) {
        red.push({ start: offset + span.start, end: offset + span.end });
      }
    }

    parts.push(verseText);
    offset += verseText.length + 1;
  }

  return { text: quotedPassageOf(parts), red };
};
