import { format } from 'prettier';

import { LANGUAGES } from '../src/content/language.ts';
import { buildBibleContent } from './content/bible.ts';
import { buildDevotionalContent, SOURCE_DATABASE } from './content/devotional.ts';
import {
  CONTENT_LANGUAGES,
  generatedBibleDirectoryOf,
  generatedReadingDirectoryOf,
  readingsOf,
  type ContentLanguage,
  type ContentReading,
} from './content/editions.ts';
import { buildLibraryContent } from './content/library.ts';
import { sourcesInLanguage } from './content/overlay.ts';
import {
  ContentBuildError,
  ContentBuildErrorCode,
  readJsonFile,
  sourceRecordOf,
} from './content/records.ts';
import { arrayFrom, positiveIntegerFrom, recordFrom, stringFrom } from '../src/content/shape.ts';
import type { LibraryContent, SplashVerse } from '../src/content/schema.ts';
import {
  editionRangeOf,
  extractPassage,
  scriptureBookFromReference,
  type ScriptureRange,
  validateScriptureRange,
} from './content/scripture.ts';

type SplashVerseRecord = ScriptureRange & {
  readonly sourceId: string;
};

const SPLASH_DATABASE = 'data/db/splash-verses.json';
const GENERATED_SPLASH_CONTENT = 'splash-verses.json';
const GENERATED_DEVOTIONAL_CONTENT = 'devotional-content.json';
const GENERATED_LIBRARY_CONTENT = 'library-content.json';
const GENERATED_BIBLE_BOOKS = 'books/';
const GENERATED_BIBLE_INDEX = 'index.json';

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
  contentLanguage: ContentReading,
): Promise<readonly SplashVerse[]> => {
  const splashDatabase = parseSplashDatabase(await readJsonFile(SPLASH_DATABASE, repositoryRoot));
  const sources = await sourcesInLanguage(
    contentLanguage,
    await readJsonFile(SOURCE_DATABASE, repositoryRoot),
    repositoryRoot,
  );
  const { sourceId } = contentLanguage.edition;

  return Promise.all(
    splashDatabase.map(async (verse) => {
      const range = await editionRangeOf(verse, contentLanguage, repositoryRoot);

      return {
        reference: range.reference,
        text: extractPassage(
          await Bun.file(new URL(range.sourceFile, repositoryRoot)).text(),
          range,
        ),
        sourceId,
        sourceLabel: sourceLabel(sources, sourceId),
      };
    }),
  );
};

const writeBibleContent = async (repositoryRoot: URL, reading: ContentReading): Promise<void> => {
  const bible = await buildBibleContent(repositoryRoot, reading);
  const editionDirectory = generatedBibleDirectoryOf(reading);
  const directory = new URL(`${editionDirectory}${GENERATED_BIBLE_BOOKS}`, repositoryRoot);

  await Promise.all(
    bible.books.map((book) =>
      Bun.write(new URL(`${book.id}.json`, directory), `${JSON.stringify(book)}\n`),
    ),
  );
  await Bun.write(
    new URL(`${editionDirectory}${GENERATED_BIBLE_INDEX}`, repositoryRoot),
    await format(JSON.stringify(bible.index), { parser: 'json' }),
  );
};

const writeReadingContent = async (
  repositoryRoot: URL,
  reading: ContentReading,
  libraryContent: LibraryContent,
): Promise<void> => {
  const directory = generatedReadingDirectoryOf(reading);
  const [splashContent, devotionalContent] = await Promise.all([
    buildSplashContent(repositoryRoot, reading),
    buildDevotionalContent(repositoryRoot, libraryContent, reading),
  ]);

  await writeBibleContent(repositoryRoot, reading);
  await Bun.write(
    new URL(`${directory}${GENERATED_SPLASH_CONTENT}`, repositoryRoot),
    `${JSON.stringify(splashContent, null, 2)}\n`,
  );
  await Bun.write(
    new URL(`${directory}${GENERATED_DEVOTIONAL_CONTENT}`, repositoryRoot),
    await format(JSON.stringify(devotionalContent), { parser: 'json' }),
  );
};

const writeLanguageContent = async (
  repositoryRoot: URL,
  contentLanguage: ContentLanguage,
): Promise<void> => {
  const libraryContent = await buildLibraryContent(repositoryRoot, contentLanguage);

  await Promise.all(
    readingsOf(contentLanguage).map((reading) =>
      writeReadingContent(repositoryRoot, reading, libraryContent),
    ),
  );
  await Bun.write(
    new URL(`${contentLanguage.generatedDirectory}${GENERATED_LIBRARY_CONTENT}`, repositoryRoot),
    await format(JSON.stringify(libraryContent), { parser: 'json' }),
  );
};

const writeContent = async (): Promise<void> => {
  const repositoryRoot = new URL('../', import.meta.url);

  await Promise.all(
    LANGUAGES.map((language) => writeLanguageContent(repositoryRoot, CONTENT_LANGUAGES[language])),
  );
};

if (import.meta.main) {
  await writeContent();
}
