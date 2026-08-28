import type { BibleRedLetter, ScriptureRedSpan } from '../../src/content/schema.ts';
import { recordFrom } from '../../src/content/shape.ts';
import { buildFailure, ContentBuildErrorCode } from './records.ts';

export const RED_LETTER_DATABASE = 'data/db/red-letter.json';
export const BIBLE_SOURCE_ID = 'douay-rheims-challoner';

export type RedLetterEntry = 'all' | readonly string[];

export const bibleBookIdentifierFrom = (name: string): string =>
  name.toLowerCase().replaceAll(' ', '-');

export const redLetterError = buildFailure(ContentBuildErrorCode.InvalidRedLetter);

const redLetterEntryFrom = (value: unknown, context: string): RedLetterEntry => {
  if (value === 'all') {
    return value;
  }

  const items = Array.isArray(value) ? value : redLetterError(context);
  const fragments: string[] = [];

  for (const item of items) {
    if (typeof item !== 'string' || item.trim().length === 0) {
      return redLetterError(context);
    }

    fragments.push(item);
  }

  if (fragments.length === 0) {
    return redLetterError(context);
  }

  return fragments;
};

export type RedLetterBooks = ReadonlyMap<string, ReadonlyMap<string, RedLetterEntry>>;

const sourceIdsFrom = (value: unknown, context: string): readonly string[] => {
  const items = Array.isArray(value) ? value : redLetterError(context);
  const sourceIds: string[] = [];

  for (const item of items) {
    if (typeof item !== 'string' || item.length === 0) {
      return redLetterError(context);
    }

    sourceIds.push(item);
  }

  if (sourceIds.length === 0) {
    return redLetterError(context);
  }

  return sourceIds;
};

const noticeFrom = (value: unknown): string => {
  if (typeof value !== 'string' || value.trim().length === 0) {
    return redLetterError('notice');
  }

  return value;
};

export const redLetterMarkingFrom = (value: unknown): BibleRedLetter => {
  const database = recordFrom(value, RED_LETTER_DATABASE);

  return {
    notice: noticeFrom(database['notice']),
    witnessSourceIds: sourceIdsFrom(database['witnessSourceIds'], 'witnessSourceIds'),
    toolSourceIds: sourceIdsFrom(database['toolSourceIds'], 'toolSourceIds'),
  };
};

export const redLetterBooksFrom = (value: unknown): RedLetterBooks => {
  const database = recordFrom(value, RED_LETTER_DATABASE);

  if (database['sourceId'] !== BIBLE_SOURCE_ID) {
    return redLetterError('sourceId');
  }

  const books = new Map<string, ReadonlyMap<string, RedLetterEntry>>();
  const bookRecords = recordFrom(database['books'], `${RED_LETTER_DATABASE}.books`);

  for (const [bookId, entries] of Object.entries(bookRecords)) {
    const entryRecords = recordFrom(entries, `${RED_LETTER_DATABASE}.books.${bookId}`);
    const bookEntries = new Map<string, RedLetterEntry>();

    for (const [reference, entry] of Object.entries(entryRecords)) {
      bookEntries.set(reference, redLetterEntryFrom(entry, `${bookId} ${reference}`));
    }

    books.set(bookId, bookEntries);
  }

  return books;
};

export const redSpansOf = (
  text: string,
  entry: RedLetterEntry,
  context: string,
): readonly ScriptureRedSpan[] => {
  if (entry === 'all') {
    return [{ start: 0, end: text.length }];
  }

  const spans = entry
    .map((fragment) => {
      const start = text.indexOf(fragment);

      if (start < 0 || text.includes(fragment, start + 1)) {
        return redLetterError(context);
      }

      return { start, end: start + fragment.length };
    })
    .toSorted((first, second) => first.start - second.start);

  if (spans.some((span, index) => index > 0 && span.start < (spans[index - 1]?.end ?? 0))) {
    return redLetterError(context);
  }

  return spans;
};
