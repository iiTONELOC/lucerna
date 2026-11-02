import {
  BIBLE_SCHEMA_VERSION,
  BibleBlockKind,
  BibleRunKind,
  bibleBookFrom,
  bibleIndexFrom,
  type BibleBlock,
  type BibleBook,
  type BibleChapter,
  type BibleIndex,
  type BibleRun,
  type BibleVerse,
  type ScriptureRedSpan,
} from '../../src/content/schema.ts';
import { recordFrom } from '../../src/content/shape.ts';
import { isRecord, type UnknownRecord } from '../../src/shared/guards.ts';
import { SOURCE_DATABASE } from './devotional.ts';
import { buildFailure, ContentBuildError, ContentBuildErrorCode, readJsonFile } from './records.ts';
import {
  bibleBookIdentifierFrom,
  redLetterBooksFrom,
  redLetterError,
  redLetterMarkingFrom,
  redSpansOf,
  type RedLetterEntry,
} from './redLetter.ts';
import { BIBLE_DEFINITIONS, type TestamentDefinition } from './bibleBooks.ts';
import type { ContentReading } from './editions.ts';
import {
  CHAPTER_MARKER,
  FOOTNOTE_END,
  FOOTNOTE_START,
  editionFileNamesOf,
  editionFileOf,
  ITALIC_END,
  ITALIC_START,
  NOTE_PATTERN,
  VERSE_MARKER,
} from './scripture.ts';

const PREFACE_CHAPTER_MARKER = String.raw`\c0`;
const CHAPTER_LABEL_MARKER = String.raw`\cl `;
const CHAPTER_SUMMARY_MARKER = String.raw`\cd `;
const PARAGRAPH_MARKER = String.raw`\p`;
const POETRY_MARKER = String.raw`\q1`;
const SECTION_MARKERS: readonly string[] = [String.raw`\s1 `, String.raw`\s `];
const PSALM_TITLE_MARKER = String.raw`\d`;
const ACROSTIC_MARKER = String.raw`\qa `;
const TITLE_MARKER = String.raw`\mt1 `;
const FALLBACK_TITLE_MARKER = String.raw`\toc1 `;
const INTRODUCTION_MARKER = String.raw`\im `;
const SKIPPED_MARKERS: readonly string[] = [
  String.raw`\id `,
  String.raw`\ide `,
  String.raw`\h `,
  String.raw`\toc`,
  String.raw`\mte9 `,
  String.raw`\mt2 `,
];
const REFERENCE_START = String.raw`\rq `;
const REFERENCE_END = String.raw`\rq*`;
const NOTE_QUOTATION_ENDS: readonly string[] = [String.raw`\fqa*`, String.raw`\fq*`];
const VERSE_LABEL_START = String.raw`\vp `;
const VERSE_LABEL_END = String.raw`\vp*`;

const structureError = buildFailure(ContentBuildErrorCode.InvalidBibleStructure);

const normalizeSpace = (value: string): string => value.replace(/\s+/gu, ' ');

const appendText = (runs: BibleRun[], value: string): void => {
  const text = normalizeSpace(value);

  if (text.trim().length > 0) {
    runs.push({ kind: BibleRunKind.Text, text });
  }
};

const noteQuotationStripped = (segment: string): string =>
  NOTE_QUOTATION_ENDS.reduce((cleaned, ending) => cleaned.replaceAll(ending, ''), segment);

const notePartsFrom = (parts: readonly string[]): { keyword: string; text: string } => {
  let keyword = '';
  let text = '';

  for (let position = 1; position < parts.length; position += 2) {
    const marker = parts[position];
    const segment = parts[position + 1] ?? '';

    if (marker === 'fk') {
      keyword = normalizeSpace(segment).trim();
    }

    if (marker === 'ft' || marker === 'fqa' || marker === 'fq') {
      text += noteQuotationStripped(segment);
    }
  }

  return { keyword, text };
};

const noteRunFrom = (content: string, context: string): BibleRun => {
  const parts = content.split(/\\(fr|fk|ft|fqa|fq) /u);

  if (parts[0]?.trim() !== '+') {
    return structureError(context);
  }

  const { keyword, text } = notePartsFrom(parts);
  const noteText = normalizeSpace(text).trim();

  if (noteText.length === 0 || noteText.includes('\\')) {
    return structureError(context);
  }

  return keyword.length === 0
    ? { kind: BibleRunKind.Note, text: noteText }
    : { kind: BibleRunKind.Note, text: noteText, keyword };
};

const consumeMarker = (runs: BibleRun[], marker: string, context: string): string => {
  if (marker.startsWith(ITALIC_START) || marker.startsWith(ITALIC_END)) {
    return marker.slice(ITALIC_START.length);
  }

  if (marker.startsWith(FOOTNOTE_START)) {
    const end = marker.indexOf(FOOTNOTE_END);

    if (end < 0) {
      throw new ContentBuildError(ContentBuildErrorCode.UnterminatedFootnote, context);
    }

    runs.push(noteRunFrom(marker.slice(FOOTNOTE_START.length, end), context));
    return marker.slice(end + FOOTNOTE_END.length);
  }

  if (marker.startsWith(REFERENCE_START)) {
    const end = marker.indexOf(REFERENCE_END);

    if (end < 0) {
      return structureError(context);
    }

    const text = normalizeSpace(marker.slice(REFERENCE_START.length, end)).trim();
    runs.push({ kind: BibleRunKind.Reference, text });
    return marker.slice(end + REFERENCE_END.length);
  }

  return structureError(context);
};

const runsFrom = (value: string, context: string): readonly BibleRun[] => {
  const runs: BibleRun[] = [];
  let rest = value.trim();

  while (rest.length > 0) {
    const markerStart = rest.indexOf('\\');

    if (markerStart < 0) {
      appendText(runs, rest);
      break;
    }

    appendText(runs, rest.slice(0, markerStart));
    rest = consumeMarker(runs, rest.slice(markerStart), context);
  }

  if (runs.length === 0) {
    return structureError(context);
  }

  return runs;
};

const verseFrom = (value: string, context: string): BibleVerse => {
  const numberEnd = value.indexOf(' ');
  const number = numberEnd < 1 ? Number.NaN : Number(value.slice(0, numberEnd));

  if (!Number.isInteger(number) || number < 1) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidVerse, context);
  }

  let rest = value.slice(numberEnd + 1).trim();
  let label = '';

  if (rest.startsWith(VERSE_LABEL_START)) {
    const end = rest.indexOf(VERSE_LABEL_END);

    if (end < 0) {
      throw new ContentBuildError(ContentBuildErrorCode.InvalidVerse, context);
    }

    label = rest.slice(VERSE_LABEL_START.length, end).trim();
    rest = rest.slice(end + VERSE_LABEL_END.length);
  }

  return {
    runs: runsFrom(rest, context),
    number,
    ...(label.length === 0 ? {} : { label }),
  };
};

type ChapterBuilder = {
  readonly number: number;
  label: string | null;
  summary: readonly BibleRun[] | null;
  readonly blocks: BibleBlock[];
  paragraph: BibleVerse[] | null;
};

type BookBuilder = {
  readonly name: string;
  readonly versePerParagraph: boolean;
  title: string | null;
  fallbackTitle: string | null;
  introduction: readonly BibleRun[] | null;
  readonly chapters: BibleChapter[];
  chapter: ChapterBuilder | null;
};

const closeParagraph = (chapter: ChapterBuilder): void => {
  if (chapter.paragraph !== null && chapter.paragraph.length > 0) {
    chapter.blocks.push({ kind: BibleBlockKind.Paragraph, verses: chapter.paragraph });
  }

  chapter.paragraph = null;
};

const closeChapter = (book: BookBuilder, context: string): void => {
  const chapter = book.chapter;

  if (chapter === null) {
    return;
  }

  closeParagraph(chapter);

  if (chapter.blocks.length === 0) {
    return structureError(context);
  }

  book.chapters.push({
    number: chapter.number,
    label: chapter.label ?? `${book.name} ${String(chapter.number)}`,
    blocks: chapter.blocks,
    ...(chapter.summary === null ? {} : { summary: chapter.summary }),
  });
  book.chapter = null;
};

const openChapter = (book: BookBuilder, number: number, context: string): void => {
  closeChapter(book, context);
  const previous = book.chapters.at(-1);
  const expected =
    previous === undefined ? number === 0 || number === 1 : previous.number + 1 === number;

  if (!expected) {
    return structureError(context);
  }

  book.chapter = { number, label: null, summary: null, blocks: [], paragraph: null };
};

const requireChapter = (book: BookBuilder, context: string): ChapterBuilder =>
  book.chapter ?? structureError(context);

const handleHeaderLine = (book: BookBuilder, line: string, context: string): boolean => {
  if (line.startsWith(TITLE_MARKER)) {
    book.title = line.slice(TITLE_MARKER.length).trim();
    return true;
  }

  if (line.startsWith(FALLBACK_TITLE_MARKER)) {
    book.fallbackTitle = line.slice(FALLBACK_TITLE_MARKER.length).trim();
    return true;
  }

  if (line.startsWith(INTRODUCTION_MARKER)) {
    book.introduction = runsFrom(line.slice(INTRODUCTION_MARKER.length), context);
    return true;
  }

  return SKIPPED_MARKERS.some((marker) => line.startsWith(marker));
};

const handleChapterLine = (book: BookBuilder, line: string, context: string): boolean => {
  if (line === PREFACE_CHAPTER_MARKER) {
    openChapter(book, 0, context);
    return true;
  }

  if (line.startsWith(CHAPTER_MARKER)) {
    const number = Number(line.slice(CHAPTER_MARKER.length).trim());

    if (!Number.isInteger(number) || number < 0) {
      return structureError(context);
    }

    openChapter(book, number, context);
    return true;
  }

  if (line.startsWith(CHAPTER_LABEL_MARKER)) {
    requireChapter(book, context).label = line.slice(CHAPTER_LABEL_MARKER.length).trim();
    return true;
  }

  if (line === CHAPTER_SUMMARY_MARKER.trim()) {
    requireChapter(book, context);
    return true;
  }

  if (line.startsWith(CHAPTER_SUMMARY_MARKER)) {
    requireChapter(book, context).summary = runsFrom(
      line.slice(CHAPTER_SUMMARY_MARKER.length),
      context,
    );
    return true;
  }

  return false;
};

const lineBlockKindFor = (line: string): BibleLineBlockStart | null => {
  const section = SECTION_MARKERS.find((marker) => line.startsWith(marker));

  if (section !== undefined) {
    return { kind: BibleBlockKind.SectionHeading, text: line.slice(section.length) };
  }

  if (line.startsWith(`${PSALM_TITLE_MARKER} `)) {
    return { kind: BibleBlockKind.PsalmTitle, text: line.slice(PSALM_TITLE_MARKER.length + 1) };
  }

  if (line.startsWith(ACROSTIC_MARKER)) {
    return { kind: BibleBlockKind.Acrostic, text: line.slice(ACROSTIC_MARKER.length) };
  }

  return null;
};

type BibleLineBlockStart = {
  readonly kind:
    BibleBlockKind.SectionHeading | BibleBlockKind.PsalmTitle | BibleBlockKind.Acrostic;
  readonly text: string;
};

const handleContentLine = (book: BookBuilder, line: string, context: string): void => {
  const chapter = requireChapter(book, context);

  if (line === PARAGRAPH_MARKER || line === POETRY_MARKER || line === PSALM_TITLE_MARKER) {
    closeParagraph(chapter);
    chapter.paragraph = line === PSALM_TITLE_MARKER ? null : [];
    return;
  }

  if (line.startsWith(VERSE_MARKER)) {
    if (book.versePerParagraph) {
      closeParagraph(chapter);
    }

    chapter.paragraph ??= [];
    chapter.paragraph.push(verseFrom(line.slice(VERSE_MARKER.length), context));
    return;
  }

  if (line.startsWith(`${PARAGRAPH_MARKER} `)) {
    closeParagraph(chapter);
    chapter.paragraph = [{ runs: runsFrom(line.slice(PARAGRAPH_MARKER.length + 1), context) }];
    return;
  }

  const lineBlock = lineBlockKindFor(line);

  if (lineBlock === null) {
    return structureError(context);
  }

  closeParagraph(chapter);
  chapter.blocks.push({ kind: lineBlock.kind, runs: runsFrom(lineBlock.text, context) });
};

const handleLine = (book: BookBuilder, line: string, context: string): void => {
  if (handleHeaderLine(book, line, context) || handleChapterLine(book, line, context)) {
    return;
  }

  handleContentLine(book, line, context);
};

const verseTextOf = (verse: BibleVerse): string =>
  verse.runs
    .filter((run) => run.kind === BibleRunKind.Text)
    .map((run) => run.text)
    .join('');

const appendRedSlices = (
  runs: BibleRun[],
  text: string,
  offset: number,
  spans: readonly ScriptureRedSpan[],
): void => {
  let cursor = 0;

  for (const span of spans) {
    const start = Math.max(span.start - offset, cursor);
    const end = Math.min(span.end - offset, text.length);

    if (end <= start) {
      continue;
    }

    if (start > cursor) {
      runs.push({ kind: BibleRunKind.Text, text: text.slice(cursor, start) });
    }

    runs.push({ kind: BibleRunKind.Christ, text: text.slice(start, end) });
    cursor = end;
  }

  if (cursor < text.length) {
    runs.push({ kind: BibleRunKind.Text, text: text.slice(cursor) });
  }
};

const redRunsFrom = (
  runs: readonly BibleRun[],
  spans: readonly ScriptureRedSpan[],
): readonly BibleRun[] => {
  const out: BibleRun[] = [];
  let offset = 0;

  for (const run of runs) {
    if (run.kind !== BibleRunKind.Text) {
      out.push(run);
      continue;
    }

    appendRedSlices(out, run.text, offset, spans);
    offset += run.text.length;
  }

  return out;
};

type RedLetterApplication = {
  readonly bookId: string;
  readonly entries: ReadonlyMap<string, RedLetterEntry>;
  readonly consumed: Set<string>;
};

const redVerseFrom = (
  verse: BibleVerse,
  chapterNumber: number,
  application: RedLetterApplication,
): BibleVerse => {
  const label = verse.label ?? (verse.number === undefined ? null : String(verse.number));
  const reference = label === null ? null : `${String(chapterNumber)}:${label}`;
  const entry = reference === null ? undefined : application.entries.get(reference);

  if (reference === null || entry === undefined) {
    return verse;
  }

  application.consumed.add(reference);
  const context = `${application.bookId} ${reference}`;

  return {
    ...verse,
    runs: redRunsFrom(verse.runs, redSpansOf(verseTextOf(verse), entry, context)),
  };
};

const redBlockFrom = (
  block: BibleBlock,
  chapterNumber: number,
  application: RedLetterApplication,
): BibleBlock => {
  if (block.kind !== BibleBlockKind.Paragraph) {
    return block;
  }

  return {
    ...block,
    verses: block.verses.map((verse) => redVerseFrom(verse, chapterNumber, application)),
  };
};

const redBookFrom = (book: BibleBook, entries: ReadonlyMap<string, RedLetterEntry>): BibleBook => {
  const application: RedLetterApplication = { bookId: book.id, entries, consumed: new Set() };
  const chapters = book.chapters.map((chapter) => ({
    ...chapter,
    blocks: chapter.blocks.map((block) => redBlockFrom(block, chapter.number, application)),
  }));

  if (application.consumed.size !== entries.size) {
    return redLetterError(`${book.id} unmatched references`);
  }

  return { ...book, chapters };
};

const applyRedLetter = (
  books: readonly BibleBook[],
  database: unknown,
  sourceId: string,
): readonly BibleBook[] => {
  const redLetter = redLetterBooksFrom(database, sourceId);

  for (const bookId of redLetter.keys()) {
    if (!books.some((book) => book.id === bookId)) {
      redLetterError(bookId);
    }
  }

  return books.map((book) => {
    const entries = redLetter.get(book.id);

    return entries === undefined ? book : redBookFrom(book, entries);
  });
};

const ROMAN_NUMERAL = /^[IVX]+$/u;
const TITLE_LINKING_WORDS: ReadonlySet<string> = new Set(['AD', 'EST', 'ET', 'ID', 'SECUNDUM']);

const titleWordOf = (word: string, index: number): string => {
  if (ROMAN_NUMERAL.test(word)) {
    return word;
  }

  const lower = word.toLowerCase();

  return index > 0 && TITLE_LINKING_WORDS.has(word)
    ? lower
    : `${lower.charAt(0).toUpperCase()}${lower.slice(1)}`;
};

const displayTitleOf = (title: string): string =>
  title === title.toUpperCase() ? title.split(' ').map(titleWordOf).join(' ') : title;

const parseBibleBook = (
  definition: TestamentDefinition,
  { bookNameOf, edition }: ContentReading,
  source: string,
  fileName: string,
): BibleBook => {
  const name = bookNameOf(definition);
  const book: BookBuilder = {
    name,
    versePerParagraph: edition.versePerParagraph,
    title: null,
    fallbackTitle: null,
    introduction: null,
    chapters: [],
    chapter: null,
  };

  source.split(/\r?\n/u).forEach((rawLine, index) => {
    const line = rawLine.trim();

    if (line.length > 0) {
      handleLine(book, line, `${fileName}:${String(index + 1)}`);
    }
  });

  closeChapter(book, fileName);
  const title = book.title ?? book.fallbackTitle;

  if (title === null || book.chapters.length === 0) {
    return structureError(fileName);
  }

  return bibleBookFrom({
    schemaVersion: BIBLE_SCHEMA_VERSION,
    id: bibleBookIdentifierFrom(definition.name),
    name,
    title: displayTitleOf(title),
    chapters: book.chapters,
    ...(book.introduction === null ? {} : { introduction: book.introduction }),
  });
};

export type BibleContent = {
  readonly index: BibleIndex;
  readonly books: readonly BibleBook[];
};

const requireSources = (sources: UnknownRecord, sourceIds: readonly string[]): void => {
  for (const sourceId of sourceIds) {
    if (!isRecord(sources[sourceId])) {
      throw new ContentBuildError(ContentBuildErrorCode.MissingSource, sourceId);
    }
  }
};

export const buildBibleContent = async (
  repositoryRoot: URL,
  reading: ContentReading,
): Promise<BibleContent> => {
  const { edition } = reading;
  const sources = recordFrom(await readJsonFile(SOURCE_DATABASE, repositoryRoot), 'sources');

  requireSources(sources, [edition.sourceId]);
  const directory = new URL(edition.directory, repositoryRoot);
  const fileNames = await editionFileNamesOf(edition, repositoryRoot);
  const parsed = await Promise.all(
    BIBLE_DEFINITIONS.map(async (definition) => {
      const fileName = editionFileOf(edition, definition.code, fileNames);
      const source = await Bun.file(new URL(fileName, directory)).text();

      return parseBibleBook(
        definition,
        reading,
        edition.keepsNotes ? source : source.replaceAll(NOTE_PATTERN, ''),
        fileName,
      );
    }),
  );
  const database = await readJsonFile(edition.redLetterDatabase, repositoryRoot);
  const books = applyRedLetter(parsed, database, edition.sourceId);
  const redLetter = redLetterMarkingFrom(database, reading.language);

  requireSources(sources, [...redLetter.witnessSourceIds, ...redLetter.toolSourceIds]);

  const index = bibleIndexFrom({
    schemaVersion: BIBLE_SCHEMA_VERSION,
    sourceId: edition.sourceId,
    edition: edition.id,
    redLetter,
    books: BIBLE_DEFINITIONS.map((definition, position) => ({
      id: bibleBookIdentifierFrom(definition.name),
      name: reading.bookNameOf(definition),
      testament: definition.testament,
      chapterCount: books[position]?.chapters.filter((chapter) => chapter.number > 0).length,
    })),
  });

  return { index, books };
};
