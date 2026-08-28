import {
  BIBLE_SCHEMA_VERSION,
  BibleBlockKind,
  BibleRunKind,
  BibleTestament,
  bibleBookFrom,
  bibleIndexFrom,
  recordFrom,
  type BibleBlock,
  type BibleBook,
  type BibleChapter,
  type BibleIndex,
  type BibleRun,
  type BibleVerse,
  type ScriptureRedSpan,
} from '../../src/content/schema.ts';
import { isRecord } from '../../src/shared/guards.ts';
import { SOURCE_DATABASE } from './devotional.ts';
import { buildFailure, ContentBuildError, ContentBuildErrorCode, readJsonFile } from './records.ts';
import {
  BIBLE_SOURCE_ID,
  RED_LETTER_DATABASE,
  bibleBookIdentifierFrom,
  redLetterBooksFrom,
  redLetterError,
  redLetterMarkingFrom,
  redSpansOf,
  type RedLetterEntry,
} from './redLetter.ts';
import {
  CHAPTER_MARKER,
  FOOTNOTE_END,
  FOOTNOTE_START,
  SCRIPTURE_SOURCE_DIRECTORY,
  VERSE_MARKER,
} from './scripture.ts';

type BibleBookDefinition = {
  readonly code: string;
  readonly name: string;
};

const OLD_TESTAMENT: readonly BibleBookDefinition[] = [
  { code: 'GEN', name: 'Genesis' },
  { code: 'EXO', name: 'Exodus' },
  { code: 'LEV', name: 'Leviticus' },
  { code: 'NUM', name: 'Numbers' },
  { code: 'DEU', name: 'Deuteronomy' },
  { code: 'JOS', name: 'Josue' },
  { code: 'JDG', name: 'Judges' },
  { code: 'RUT', name: 'Ruth' },
  { code: '1SA', name: '1 Kings' },
  { code: '2SA', name: '2 Kings' },
  { code: '1KI', name: '3 Kings' },
  { code: '2KI', name: '4 Kings' },
  { code: '1CH', name: '1 Paralipomenon' },
  { code: '2CH', name: '2 Paralipomenon' },
  { code: 'EZR', name: '1 Esdras' },
  { code: 'NEH', name: '2 Esdras' },
  { code: 'TOB', name: 'Tobias' },
  { code: 'JDT', name: 'Judith' },
  { code: 'EST', name: 'Esther' },
  { code: 'JOB', name: 'Job' },
  { code: 'PSA', name: 'Psalms' },
  { code: 'PRO', name: 'Proverbs' },
  { code: 'ECC', name: 'Ecclesiastes' },
  { code: 'SNG', name: 'Canticle of Canticles' },
  { code: 'WIS', name: 'Wisdom' },
  { code: 'SIR', name: 'Ecclesiasticus' },
  { code: 'ISA', name: 'Isaias' },
  { code: 'JER', name: 'Jeremias' },
  { code: 'LAM', name: 'Lamentations' },
  { code: 'BAR', name: 'Baruch' },
  { code: 'EZK', name: 'Ezechiel' },
  { code: 'DAN', name: 'Daniel' },
  { code: 'HOS', name: 'Osee' },
  { code: 'JOL', name: 'Joel' },
  { code: 'AMO', name: 'Amos' },
  { code: 'OBA', name: 'Abdias' },
  { code: 'JON', name: 'Jonas' },
  { code: 'MIC', name: 'Micheas' },
  { code: 'NAM', name: 'Nahum' },
  { code: 'HAB', name: 'Habacuc' },
  { code: 'ZEP', name: 'Sophonias' },
  { code: 'HAG', name: 'Aggeus' },
  { code: 'ZEC', name: 'Zacharias' },
  { code: 'MAL', name: 'Malachias' },
  { code: '1MA', name: '1 Machabees' },
  { code: '2MA', name: '2 Machabees' },
];

const NEW_TESTAMENT: readonly BibleBookDefinition[] = [
  { code: 'MAT', name: 'Matthew' },
  { code: 'MRK', name: 'Mark' },
  { code: 'LUK', name: 'Luke' },
  { code: 'JHN', name: 'John' },
  { code: 'ACT', name: 'Acts of the Apostles' },
  { code: 'ROM', name: 'Romans' },
  { code: '1CO', name: '1 Corinthians' },
  { code: '2CO', name: '2 Corinthians' },
  { code: 'GAL', name: 'Galatians' },
  { code: 'EPH', name: 'Ephesians' },
  { code: 'PHP', name: 'Philippians' },
  { code: 'COL', name: 'Colossians' },
  { code: '1TH', name: '1 Thessalonians' },
  { code: '2TH', name: '2 Thessalonians' },
  { code: '1TI', name: '1 Timothy' },
  { code: '2TI', name: '2 Timothy' },
  { code: 'TIT', name: 'Titus' },
  { code: 'PHM', name: 'Philemon' },
  { code: 'HEB', name: 'Hebrews' },
  { code: 'JAM', name: 'James' },
  { code: '1PE', name: '1 Peter' },
  { code: '2PE', name: '2 Peter' },
  { code: '1JN', name: '1 John' },
  { code: '2JN', name: '2 John' },
  { code: '3JN', name: '3 John' },
  { code: 'JUD', name: 'Jude' },
  { code: 'REV', name: 'Apocalypse' },
];

type TestamentDefinition = BibleBookDefinition & {
  readonly testament: BibleTestament;
};

const BIBLE_DEFINITIONS: readonly TestamentDefinition[] = [
  ...OLD_TESTAMENT.map((definition) => ({ ...definition, testament: BibleTestament.Old })),
  ...NEW_TESTAMENT.map((definition) => ({ ...definition, testament: BibleTestament.New })),
];

const PREFACE_CHAPTER_MARKER = String.raw`\c0`;
const CHAPTER_LABEL_MARKER = String.raw`\cl `;
const CHAPTER_SUMMARY_MARKER = String.raw`\cd `;
const PARAGRAPH_MARKER = String.raw`\p`;
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

  if (chapter.label === null || chapter.blocks.length === 0) {
    return structureError(context);
  }

  book.chapters.push({
    number: chapter.number,
    label: chapter.label,
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

  if (line === PARAGRAPH_MARKER || line === PSALM_TITLE_MARKER) {
    closeParagraph(chapter);
    chapter.paragraph = line === PARAGRAPH_MARKER ? [] : null;
    return;
  }

  if (line.startsWith(VERSE_MARKER)) {
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

const applyRedLetter = (books: readonly BibleBook[], database: unknown): readonly BibleBook[] => {
  const redLetter = redLetterBooksFrom(database);

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

const parseBibleBook = (
  definition: TestamentDefinition,
  source: string,
  fileName: string,
): BibleBook => {
  const book: BookBuilder = {
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
    name: definition.name,
    title,
    chapters: book.chapters,
    ...(book.introduction === null ? {} : { introduction: book.introduction }),
  });
};

const bibleFileFor = (code: string, fileNames: readonly string[]): string => {
  const matches = fileNames.filter((fileName) => fileName.includes(`-${code}-`));
  const fileName = matches[0];

  if (matches.length !== 1 || fileName === undefined) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSourceBook, code);
  }

  return fileName;
};

export type BibleContent = {
  readonly index: BibleIndex;
  readonly books: readonly BibleBook[];
};

export const buildBibleContent = async (repositoryRoot: URL): Promise<BibleContent> => {
  const sources = recordFrom(await readJsonFile(SOURCE_DATABASE, repositoryRoot), 'sources');

  if (!isRecord(sources[BIBLE_SOURCE_ID])) {
    throw new ContentBuildError(ContentBuildErrorCode.MissingSource, BIBLE_SOURCE_ID);
  }

  const directory = new URL(SCRIPTURE_SOURCE_DIRECTORY, repositoryRoot);
  const fileNames = await Array.fromAsync(new Bun.Glob('*.sfm').scan({ cwd: directory.pathname }));
  const parsed = await Promise.all(
    BIBLE_DEFINITIONS.map(async (definition) => {
      const fileName = bibleFileFor(definition.code, fileNames);
      const source = await Bun.file(new URL(fileName, directory)).text();

      return parseBibleBook(definition, source, fileName);
    }),
  );
  const database = await readJsonFile(RED_LETTER_DATABASE, repositoryRoot);
  const books = applyRedLetter(parsed, database);
  const redLetter = redLetterMarkingFrom(database);

  for (const sourceId of [...redLetter.witnessSourceIds, ...redLetter.toolSourceIds]) {
    if (!isRecord(sources[sourceId])) {
      throw new ContentBuildError(ContentBuildErrorCode.MissingSource, sourceId);
    }
  }

  const index = bibleIndexFrom({
    schemaVersion: BIBLE_SCHEMA_VERSION,
    sourceId: BIBLE_SOURCE_ID,
    redLetter,
    books: BIBLE_DEFINITIONS.map((definition, position) => ({
      id: bibleBookIdentifierFrom(definition.name),
      name: definition.name,
      testament: definition.testament,
      chapterCount: books[position]?.chapters.filter((chapter) => chapter.number > 0).length,
    })),
  });

  return { index, books };
};
