import { format } from 'prettier';

import { buildBibleContent } from './content/bible.ts';
import { buildDevotionalContent, SOURCE_DATABASE } from './content/devotional.ts';
import { buildLibraryContent } from './content/library.ts';
import {
  ContentBuildError,
  ContentBuildErrorCode,
  readJsonFile,
  sourceRecordOf,
} from './content/records.ts';
import { arrayFrom, positiveIntegerFrom, recordFrom, stringFrom } from '../src/content/schema.ts';
import {
  extractPassage,
  scriptureBookFromReference,
  type ScriptureRange,
  validateScriptureRange,
} from './content/scripture.ts';

export type SplashVerseContent = {
  readonly reference: string;
  readonly text: string;
  readonly sourceId: string;
  readonly sourceLabel: string;
};

type SplashVerseRecord = ScriptureRange & {
  readonly sourceId: string;
};

const SPLASH_DATABASE = 'data/db/splash-verses.json';
const GENERATED_SPLASH_CONTENT = 'src/generated/splash-verses.json';
const GENERATED_DEVOTIONAL_CONTENT = 'src/generated/devotional-content.json';
const GENERATED_LIBRARY_CONTENT = 'src/generated/library-content.json';
const GENERATED_BIBLE_DIRECTORY = 'src/generated/bible/douay-rheims/';
const GENERATED_BIBLE_INDEX = 'src/generated/bible/douay-rheims/index.json';

const parseSplashVerse = (value: unknown, index: number): SplashVerseRecord => {
  const path = `openingSplashVerses[${index}]`;
  const record = recordFrom(value, path);
  const reference = stringFrom(record, 'reference', path);
  const range: ScriptureRange = {
    reference,
    book: scriptureBookFromReference(reference),
    chapter: positiveIntegerFrom(record, 'chapter', path),
    verseStart: positiveIntegerFrom(record, 'verseStart', path),
    verseEnd: positiveIntegerFrom(record, 'verseEnd', path),
    sourceFile: stringFrom(record, 'sourceFile', path),
  };

  validateScriptureRange(range);

  return {
    ...range,
    sourceId: stringFrom(record, 'sourceId', path),
  };
};

const parseSplashDatabase = (value: unknown): readonly SplashVerseRecord[] => {
  const database = recordFrom(value, 'splash');
  const verses = arrayFrom(database['openingSplashVerses'], 'openingSplashVerses').map(
    (record, index) => parseSplashVerse(record, index),
  );
  const references = new Set(verses.map(({ reference }) => reference));

  if (verses.length === 0 || references.size !== verses.length) {
    throw new ContentBuildError(ContentBuildErrorCode.DuplicateReference);
  }

  return verses;
};

const sourceLabel = (value: unknown, sourceId: string): string =>
  stringFrom(sourceRecordOf(value, sourceId), 'work', `sources.${sourceId}`);

export const buildSplashContent = async (
  repositoryRoot: URL,
): Promise<readonly SplashVerseContent[]> => {
  const splashDatabase = parseSplashDatabase(await readJsonFile(SPLASH_DATABASE, repositoryRoot));
  const sources = await readJsonFile(SOURCE_DATABASE, repositoryRoot);

  return Promise.all(
    splashDatabase.map(async (verse) => ({
      reference: verse.reference,
      text: extractPassage(await Bun.file(new URL(verse.sourceFile, repositoryRoot)).text(), verse),
      sourceId: verse.sourceId,
      sourceLabel: sourceLabel(sources, verse.sourceId),
    })),
  );
};

const writeBibleContent = async (repositoryRoot: URL): Promise<void> => {
  const bible = await buildBibleContent(repositoryRoot);
  const directory = new URL(GENERATED_BIBLE_DIRECTORY, repositoryRoot);

  await Promise.all(
    bible.books.map((book) =>
      Bun.write(new URL(`${book.id}.json`, directory), `${JSON.stringify(book)}\n`),
    ),
  );
  await Bun.write(
    new URL(GENERATED_BIBLE_INDEX, repositoryRoot),
    await format(JSON.stringify(bible.index), { parser: 'json' }),
  );
};

const writeContent = async (): Promise<void> => {
  const repositoryRoot = new URL('../', import.meta.url);
  const [splashContent, libraryContent] = await Promise.all([
    buildSplashContent(repositoryRoot),
    buildLibraryContent(repositoryRoot),
  ]);
  const devotionalContent = await buildDevotionalContent(repositoryRoot, libraryContent);

  await writeBibleContent(repositoryRoot);

  await Bun.write(
    new URL(GENERATED_SPLASH_CONTENT, repositoryRoot),
    `${JSON.stringify(splashContent, null, 2)}\n`,
  );
  await Bun.write(
    new URL(GENERATED_DEVOTIONAL_CONTENT, repositoryRoot),
    await format(JSON.stringify(devotionalContent), { parser: 'json' }),
  );
  await Bun.write(
    new URL(GENERATED_LIBRARY_CONTENT, repositoryRoot),
    await format(JSON.stringify(libraryContent), { parser: 'json' }),
  );
};

if (import.meta.main) {
  await writeContent();
}
