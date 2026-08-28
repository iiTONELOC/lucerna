import { access } from 'fs/promises';
import { fileURLToPath } from 'url';

import {
  DEVOTIONAL_SCHEMA_VERSION,
  devotionalContentFrom,
  guidanceStatementsOf,
  type Artwork,
  type DevotionalContent,
  type DevotionalSource,
  type GuidanceStatement,
  type LibraryContent,
  type Mystery,
  type MysterySet,
  type Prayer,
  type SourceReference,
} from '../../src/content/schema.ts';
import {
  ContentBuildError,
  ContentBuildErrorCode,
  readJsonFile,
  recordFrom,
  requiredPositiveInteger,
  requiredString,
} from './records.ts';
import {
  RED_LETTER_DATABASE,
  bibleBookIdentifierFrom,
  redLetterBooksFrom,
  type RedLetterBooks,
} from './redLetter.ts';
import { reflectionBlockIndexOf, reflectionTextFrom } from './reflections.ts';
import {
  extractPassageContent,
  SCRIPTURE_SOURCE_DIRECTORY,
  type ScriptureRange,
  validateScriptureRange,
} from './scripture.ts';

export const SOURCE_DATABASE = 'data/db/sources.json';
const PRAYER_DATABASE = 'data/db/prayers.json';
const ART_DATABASE = 'data/db/art.json';
const ROSARY_DATABASE = 'data/db/rosary.json';
const ART_ASSET_DIRECTORY = 'src/assets/';
const EXPECTED_MYSTERY_SET_COUNT = 4;
const EXPECTED_MYSTERIES_PER_SET = 5;

type JsonRecord = Record<string, unknown>;

type RelationshipContext = {
  readonly artworks: ReadonlyMap<string, Artwork>;
  readonly mysterySets: ReadonlyMap<string, MysterySet>;
  readonly prayers: ReadonlyMap<string, Prayer>;
  readonly references: Set<string>;
  readonly sources: ReadonlyMap<string, DevotionalSource>;
};

const fail = (context: string): never => {
  throw new ContentBuildError(ContentBuildErrorCode.InvalidField, context);
};

const arrayFrom = (value: unknown, context: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return fail(context);
  }

  return value;
};

const uniqueMap = <RecordType extends { readonly id: string }>(
  records: readonly RecordType[],
  context: string,
): ReadonlyMap<string, RecordType> => {
  const byId = new Map(records.map((record) => [record.id, record]));

  if (byId.size !== records.length) {
    return fail(context);
  }

  return byId;
};

const requireId = <Value>(values: ReadonlyMap<string, Value>, id: string, context: string): Value =>
  values.get(id) ?? fail(`${context} ${id}`);

const requireSource = (
  sources: ReadonlyMap<string, DevotionalSource>,
  sourceId: string,
): DevotionalSource => requireId(sources, sourceId, 'source');

const sourceEntriesFrom = (value: unknown): readonly JsonRecord[] => {
  const sources = recordFrom(value, ContentBuildErrorCode.InvalidField, 'sources');

  return Object.entries(sources)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, source]) => ({
      id,
      ...recordFrom(source, ContentBuildErrorCode.InvalidField, `source ${id}`),
    }));
};

const sourceHeaderFrom = (source: string): string | undefined =>
  source
    .split(/\r?\n/u)
    .find((line) => line.startsWith(String.raw`\h `))
    ?.slice(3)
    .trim();

const sourceFilesForBooks = async (
  books: ReadonlySet<string>,
  repositoryRoot: URL,
): Promise<ReadonlyMap<string, string>> => {
  const sourceDirectory = new URL(SCRIPTURE_SOURCE_DIRECTORY, repositoryRoot);
  const filenames: string[] = [];

  for await (const filename of new Bun.Glob('*.sfm').scan({
    cwd: fileURLToPath(sourceDirectory),
    onlyFiles: true,
  })) {
    filenames.push(filename);
  }

  filenames.sort((left, right) => left.localeCompare(right, 'en'));
  const sourceFiles = new Map<string, string>();

  for (const filename of filenames) {
    const source = await Bun.file(new URL(filename, sourceDirectory)).text();
    const book = sourceHeaderFrom(source);

    if (book === undefined || !books.has(book)) {
      continue;
    }

    if (sourceFiles.has(book)) {
      fail(`duplicate scripture book ${book}`);
    }

    sourceFiles.set(book, `${SCRIPTURE_SOURCE_DIRECTORY}${filename}`);
  }

  for (const book of books) {
    requireId(sourceFiles, book, 'scripture book');
  }

  return sourceFiles;
};

const scriptureBook = (scripture: JsonRecord): string => requiredString(scripture, 'book');

const mysteryRecordsFrom = (rosary: JsonRecord): readonly JsonRecord[] =>
  arrayFrom(rosary.mysterySets, 'mystery sets').flatMap((value, setIndex) => {
    const mysterySet = recordFrom(
      value,
      ContentBuildErrorCode.InvalidField,
      `mystery set ${setIndex}`,
    );

    return arrayFrom(mysterySet.mysteries, `mysteries ${setIndex}`).map((mystery, index) =>
      recordFrom(mystery, ContentBuildErrorCode.InvalidField, `mystery ${setIndex}.${index}`),
    );
  });

type ReflectionSourceLoader = (sourceId: string) => Promise<string>;

const reflectionSourceLoaderFrom = (
  sources: unknown,
  repositoryRoot: URL,
): ReflectionSourceLoader => {
  const cache = new Map<string, Promise<string>>();

  return (sourceId: string): Promise<string> => {
    const cached = cache.get(sourceId);

    if (cached !== undefined) {
      return cached;
    }

    const records = recordFrom(sources, ContentBuildErrorCode.MissingSource, sourceId);
    const source = recordFrom(records[sourceId], ContentBuildErrorCode.MissingSource, sourceId);
    const loaded = Bun.file(new URL(requiredString(source, 'path'), repositoryRoot)).text();

    cache.set(sourceId, loaded);
    return loaded;
  };
};

const enrichReflection = async (
  mystery: JsonRecord,
  loadReflectionSource: ReflectionSourceLoader,
  library: LibraryContent,
): Promise<JsonRecord> => {
  const reflection = recordFrom(
    mystery['reflection'],
    ContentBuildErrorCode.InvalidField,
    'reflection',
  );

  if (requiredString(reflection, 'status') !== 'mapped') {
    return reflection;
  }

  const sourceId = requiredString(reflection, 'sourceId');
  const text = reflectionTextFrom(
    requiredString(reflection, 'sectionId'),
    await loadReflectionSource(sourceId),
  );

  return {
    ...reflection,
    text,
    blockIndex: reflectionBlockIndexOf(library, sourceId, text),
  };
};

type MysteryEnrichmentContext = {
  readonly sourceFiles: ReadonlyMap<string, string>;
  readonly loadReflectionSource: ReflectionSourceLoader;
  readonly library: LibraryContent;
  readonly repositoryRoot: URL;
  readonly redLetter: RedLetterBooks;
};

const enrichMystery = async (
  mystery: JsonRecord,
  {
    sourceFiles,
    loadReflectionSource,
    library,
    repositoryRoot,
    redLetter,
  }: MysteryEnrichmentContext,
): Promise<JsonRecord> => {
  const scripture = recordFrom(
    mystery['scripture'],
    ContentBuildErrorCode.InvalidField,
    'scripture',
  );
  const book = scriptureBook(scripture);
  const range: ScriptureRange = {
    reference: requiredString(scripture, 'reference'),
    book,
    chapter: requiredPositiveInteger(scripture, 'chapter'),
    verseStart: requiredPositiveInteger(scripture, 'verseStart'),
    verseEnd: requiredPositiveInteger(scripture, 'verseEnd'),
    sourceFile: requireId(sourceFiles, book, 'scripture book'),
  };

  validateScriptureRange(range);
  const { text, red } = extractPassageContent(
    await Bun.file(new URL(range.sourceFile, repositoryRoot)).text(),
    range,
    redLetter.get(bibleBookIdentifierFrom(book)),
  );

  return {
    ...mystery,
    scripture: {
      ...scripture,
      text,
      ...(red.length === 0 ? {} : { red }),
    },
    reflection: await enrichReflection(mystery, loadReflectionSource, library),
  };
};

const enrichRosary = async (
  value: unknown,
  sources: unknown,
  library: LibraryContent,
  repositoryRoot: URL,
): Promise<JsonRecord> => {
  const rosary = recordFrom(value, ContentBuildErrorCode.InvalidField, 'rosary');
  const mysteries = mysteryRecordsFrom(rosary);
  const books = new Set(
    mysteries.map((mystery) =>
      scriptureBook(
        recordFrom(mystery['scripture'], ContentBuildErrorCode.InvalidField, 'scripture'),
      ),
    ),
  );
  const sourceFiles = await sourceFilesForBooks(books, repositoryRoot);
  const loadReflectionSource = reflectionSourceLoaderFrom(sources, repositoryRoot);
  const redLetter = redLetterBooksFrom(await readJsonFile(RED_LETTER_DATABASE, repositoryRoot));
  const mysterySets = await Promise.all(
    arrayFrom(rosary.mysterySets, 'mystery sets').map(async (value, setIndex) => {
      const mysterySet = recordFrom(
        value,
        ContentBuildErrorCode.InvalidField,
        `mystery set ${setIndex}`,
      );
      const enrichedMysteries = await Promise.all(
        arrayFrom(mysterySet.mysteries, `mysteries ${setIndex}`).map((mystery, index) =>
          enrichMystery(
            recordFrom(mystery, ContentBuildErrorCode.InvalidField, `mystery ${setIndex}.${index}`),
            { sourceFiles, loadReflectionSource, library, repositoryRoot, redLetter },
          ),
        ),
      );

      return { ...mysterySet, mysteries: enrichedMysteries };
    }),
  );

  return { ...rosary, mysterySets };
};

const validateSourceReference = (
  reference: SourceReference,
  sources: ReadonlyMap<string, DevotionalSource>,
): void => {
  requireSource(sources, reference.sourceId);
};

const validateGuidanceStatement = (
  statement: GuidanceStatement,
  sources: ReadonlyMap<string, DevotionalSource>,
): void => {
  requireSource(sources, statement.sourceId);
  statement.sourceRefs.forEach((reference) => validateSourceReference(reference, sources));
};

const validateGuidance = (
  content: DevotionalContent,
  sources: ReadonlyMap<string, DevotionalSource>,
): void => {
  const { guidance } = content.rosary;

  guidance.sourceIds.forEach((sourceId) => requireSource(sources, sourceId));
  guidanceStatementsOf(guidance).forEach((statement) =>
    validateGuidanceStatement(statement, sources),
  );
  requireSource(sources, guidance.fruitLine.sourceId);
  guidance.fruitLine.sourceRefs.forEach((reference) => validateSourceReference(reference, sources));
};

const validateFiles = async (content: DevotionalContent, repositoryRoot: URL): Promise<void> => {
  for (const source of content.sources) {
    if (source.path !== undefined) {
      if (source.path.startsWith('/') || source.path.includes('..')) {
        fail(`source path ${source.path}`);
      }

      await access(new URL(source.path, repositoryRoot));
    }
  }

  for (const artwork of content.artworks) {
    if (
      !artwork.file.startsWith('art/') ||
      artwork.file.includes('..') ||
      !(await Bun.file(new URL(`${ART_ASSET_DIRECTORY}${artwork.file}`, repositoryRoot)).exists())
    ) {
      fail(`art file ${artwork.file}`);
    }
  }
};

const relationshipContextFrom = (content: DevotionalContent): RelationshipContext => ({
  artworks: uniqueMap(content.artworks, 'art identifiers'),
  mysterySets: uniqueMap(content.rosary.mysterySets, 'mystery set identifiers'),
  prayers: uniqueMap(content.prayers, 'prayer identifiers'),
  references: new Set<string>(),
  sources: uniqueMap(content.sources, 'source identifiers'),
});

const validateRosaryOwners = (content: DevotionalContent, context: RelationshipContext): void => {
  content.prayers.forEach((prayer) => requireSource(context.sources, prayer.sourceId));
  content.artworks.forEach((artwork) => {
    if (requireSource(context.sources, artwork.sourceId).type !== 'art') {
      fail(`art source ${artwork.sourceId}`);
    }
  });
  content.rosary.prayerIds.forEach((prayerId) => requireId(context.prayers, prayerId, 'prayer'));
  requireSource(context.sources, content.rosary.schedule.sourceId);

  if (
    content.rosary.devotion !== 'rosary' ||
    content.rosary.mysterySets.length !== EXPECTED_MYSTERY_SET_COUNT ||
    content.rosary.prayerIds.length !== context.prayers.size
  ) {
    fail('rosary structure');
  }
};

const validateRosarySchedule = (content: DevotionalContent, context: RelationshipContext): void => {
  const schedule = content.rosary.schedule;
  const weekdaySetIds = [
    schedule.sunday,
    schedule.monday,
    schedule.tuesday,
    schedule.wednesday,
    schedule.thursday,
    schedule.friday,
    schedule.saturday,
  ];

  for (const setId of weekdaySetIds) {
    requireId(context.mysterySets, setId, 'scheduled mystery set');
  }

  for (const rule of schedule.seasonalSundays) {
    requireId(context.mysterySets, rule.mysterySetId, 'seasonal mystery set');
    requireSource(context.sources, rule.sourceId);
  }
};

const validateMystery = (
  mystery: Mystery,
  mysterySetId: string,
  ordinals: Set<number>,
  context: RelationshipContext,
): void => {
  requireSource(context.sources, mystery.titleSourceId);
  requireSource(context.sources, mystery.fruitSourceId);
  requireSource(context.sources, mystery.scripture.selectionSourceId);
  requireSource(context.sources, mystery.reflection.sourceId);
  mystery.artIds.forEach((artId) => requireId(context.artworks, artId, 'mystery art'));

  if (
    mystery.set !== mysterySetId ||
    requireSource(context.sources, mystery.scripture.sourceId).type !== 'bible' ||
    mystery.scripture.verseEnd < mystery.scripture.verseStart ||
    ordinals.has(mystery.ordinal) ||
    context.references.has(mystery.scripture.reference)
  ) {
    fail(`mystery ${mysterySetId}.${mystery.ordinal}`);
  }

  ordinals.add(mystery.ordinal);
  context.references.add(mystery.scripture.reference);
};

const validateMysterySet = (mysterySet: MysterySet, context: RelationshipContext): void => {
  requireSource(context.sources, mysterySet.nameSourceId);

  if (mysterySet.mysteries.length !== EXPECTED_MYSTERIES_PER_SET) {
    fail(`mystery count ${mysterySet.id}`);
  }

  const ordinals = new Set<number>();

  for (const mystery of mysterySet.mysteries) {
    validateMystery(mystery, mysterySet.id, ordinals, context);
  }
};

const validatePrayerStageArt = (content: DevotionalContent, context: RelationshipContext): void => {
  for (const [prayerId, artIds] of Object.entries(content.rosary.prayerStageArt)) {
    requireId(context.prayers, prayerId, 'prayer stage');
    artIds.forEach((artId) => requireId(context.artworks, artId, 'prayer stage art'));
  }

  if (
    Object.keys(content.rosary.prayerStageArt).length !== context.prayers.size ||
    context.references.size !== EXPECTED_MYSTERY_SET_COUNT * EXPECTED_MYSTERIES_PER_SET
  ) {
    fail('compiled rosary relationships');
  }
};

const validateRelationships = async (
  content: DevotionalContent,
  repositoryRoot: URL,
): Promise<void> => {
  const context = relationshipContextFrom(content);

  validateRosaryOwners(content, context);
  validateRosarySchedule(content, context);
  content.rosary.mysterySets.forEach((mysterySet) => validateMysterySet(mysterySet, context));
  validatePrayerStageArt(content, context);
  validateGuidance(content, context.sources);
  await validateFiles(content, repositoryRoot);
};

export const buildDevotionalContent = async (
  repositoryRoot: URL,
  library: LibraryContent,
): Promise<DevotionalContent> => {
  const [sources, prayers, artworks, rosary] = await Promise.all([
    readJsonFile(SOURCE_DATABASE, repositoryRoot),
    readJsonFile(PRAYER_DATABASE, repositoryRoot),
    readJsonFile(ART_DATABASE, repositoryRoot),
    readJsonFile(ROSARY_DATABASE, repositoryRoot),
  ]);
  const content = devotionalContentFrom({
    schemaVersion: DEVOTIONAL_SCHEMA_VERSION,
    sources: sourceEntriesFrom(sources),
    prayers,
    artworks,
    rosary: await enrichRosary(rosary, sources, library, repositoryRoot),
  });

  await validateRelationships(content, repositoryRoot);

  return content;
};
