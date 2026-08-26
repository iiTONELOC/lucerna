import { format } from 'prettier';

import { buildDevotionalContent, SOURCE_DATABASE } from './content/devotional.ts';
import {
  ContentBuildError,
  ContentBuildErrorCode,
  readJsonFile,
  recordFrom,
  requiredPositiveInteger,
  requiredString,
} from './content/records.ts';
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

const parseSplashVerse = (value: unknown): SplashVerseRecord => {
  const record = recordFrom(value, ContentBuildErrorCode.InvalidSplashRecord);
  const reference = requiredString(record, 'reference');
  const range: ScriptureRange = {
    reference,
    book: scriptureBookFromReference(reference),
    chapter: requiredPositiveInteger(record, 'chapter'),
    verseStart: requiredPositiveInteger(record, 'verseStart'),
    verseEnd: requiredPositiveInteger(record, 'verseEnd'),
    sourceFile: requiredString(record, 'sourceFile'),
  };

  validateScriptureRange(range);

  return {
    ...range,
    sourceId: requiredString(record, 'sourceId'),
  };
};

const parseSplashDatabase = (value: unknown): readonly SplashVerseRecord[] => {
  const database = recordFrom(value, ContentBuildErrorCode.InvalidSplashDatabase);
  const records = database['openingSplashVerses'];

  if (!Array.isArray(records)) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidSplashDatabase);
  }

  const verses = records.map(parseSplashVerse);
  const references = new Set(verses.map(({ reference }) => reference));

  if (verses.length === 0 || references.size !== verses.length) {
    throw new ContentBuildError(ContentBuildErrorCode.DuplicateReference);
  }

  return verses;
};

const sourceLabel = (value: unknown, sourceId: string): string => {
  const sources = recordFrom(value, ContentBuildErrorCode.MissingSource, sourceId);
  const source = recordFrom(sources[sourceId], ContentBuildErrorCode.MissingSource, sourceId);

  return requiredString(source, 'work');
};

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

const writeContent = async (): Promise<void> => {
  const repositoryRoot = new URL('../', import.meta.url);
  const [splashContent, devotionalContent] = await Promise.all([
    buildSplashContent(repositoryRoot),
    buildDevotionalContent(repositoryRoot),
  ]);

  await Bun.write(
    new URL(GENERATED_SPLASH_CONTENT, repositoryRoot),
    `${JSON.stringify(splashContent, null, 2)}\n`,
  );
  await Bun.write(
    new URL(GENERATED_DEVOTIONAL_CONTENT, repositoryRoot),
    await format(JSON.stringify(devotionalContent), { parser: 'json' }),
  );
};

if (import.meta.main) {
  await writeContent();
}
