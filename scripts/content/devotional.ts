import {
  DEVOTIONAL_SCHEMA_VERSION,
  devotionalContentFrom,
  guidanceStatementsOf,
  ReflectionStatus,
  Translation,
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
import { arrayFrom, positiveIntegerFrom, recordFrom, stringFrom } from '../../src/content/shape.ts';
import { BIBLE_DEFINITIONS } from './bibleBooks.ts';
import {
  BIBLE_EDITIONS,
  CONTENT_LANGUAGES,
  type ContentLanguage,
  type ContentReading,
} from './editions.ts';
import { buildLibraryContent } from './library.ts';
import { BibleEditionId, Language } from '../../src/content/language.ts';
import { contentInLanguage, sourcesInLanguage } from './overlay.ts';
import { buildFailure, ContentBuildErrorCode, readJsonFile, sourceRecordOf } from './records.ts';
import {
  bibleBookIdentifierFrom,
  redLetterBooksFrom,
  toolMarkingFrom,
  type RedLetterBooks,
} from './redLetter.ts';
import { reflectionBlockIndexOf, reflectionTextFrom } from './reflections.ts';
import {
  extractPassageContent,
  editionRangeOf,
  sourceCodeOf,
  sourceBookOf,
  type ScriptureRange,
  validateScriptureRange,
} from './scripture.ts';

export const SOURCE_DATABASE = 'data/db/sources.json';
const DOUAY_RHEIMS = BIBLE_EDITIONS[BibleEditionId.DouayRheims];
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

const fail = buildFailure(ContentBuildErrorCode.InvalidField);

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

const sourceEntriesFrom = (value: unknown): readonly JsonRecord[] =>
  Object.entries(recordFrom(value, 'sources'))
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, source]) => ({ id, ...recordFrom(source, `sources.${id}`) }));

const sourceFilesForBooks = async (
  books: ReadonlySet<string>,
  repositoryRoot: URL,
): Promise<ReadonlyMap<string, string>> => {
  const sourceDirectory = new URL(DOUAY_RHEIMS.directory, repositoryRoot);
  const filenames: string[] = [];

  for await (const filename of new Bun.Glob(`*${DOUAY_RHEIMS.extension}`).scan({
    cwd: sourceDirectory.pathname,
    onlyFiles: true,
  })) {
    filenames.push(filename);
  }

  filenames.sort((left, right) => left.localeCompare(right, 'en'));
  const sourceFiles = new Map<string, string>();

  for (const filename of filenames) {
    const source = await Bun.file(new URL(filename, sourceDirectory)).text();
    const book = sourceBookOf(source);

    if (book === undefined || !books.has(book)) {
      continue;
    }

    if (sourceFiles.has(book)) {
      fail(`duplicate scripture book ${book}`);
    }

    sourceFiles.set(book, `${DOUAY_RHEIMS.directory}${filename}`);
  }

  for (const book of books) {
    requireId(sourceFiles, book, 'scripture book');
  }

  return sourceFiles;
};

const scriptureBook = (scripture: JsonRecord): string => stringFrom(scripture, 'book', 'scripture');

const mysterySetPath = (setIndex: number): string => `rosary.mysterySets[${setIndex}]`;

const mysteryPath = (setIndex: number, index: number): string =>
  `${mysterySetPath(setIndex)}.mysteries[${index}]`;

const mysteryRecordsFrom = (rosary: JsonRecord): readonly JsonRecord[] =>
  arrayFrom(rosary.mysterySets, 'rosary.mysterySets').flatMap((value, setIndex) => {
    const mysterySet = recordFrom(value, mysterySetPath(setIndex));

    return arrayFrom(mysterySet.mysteries, `${mysterySetPath(setIndex)}.mysteries`).map(
      (mystery, index) => recordFrom(mystery, mysteryPath(setIndex, index)),
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

    const path = stringFrom(sourceRecordOf(sources, sourceId), 'path', `sources.${sourceId}`);
    const loaded = Bun.file(new URL(path, repositoryRoot)).text();

    cache.set(sourceId, loaded);
    return loaded;
  };
};

type ReflectionLibraries = {
  readonly source: LibraryContent;
  readonly display: LibraryContent;
};

const SENTENCE_BREAK = '. ';

const isHeadingSentence = (heading: string): boolean =>
  heading.endsWith('.') && !heading.includes(SENTENCE_BREAK);

const blockTextOf = (
  work: LibraryContent['works'][number] | undefined,
  blockIndex: number,
): string | undefined => {
  const block = work?.blocks[blockIndex];

  return block !== undefined && 'text' in block ? block.text : undefined;
};

const displayedReflectionOf = (
  { source, display }: ReflectionLibraries,
  workId: string,
  blockIndex: number,
  text: string,
): string | null => {
  const work = display.works.find(({ id }) => id === workId);
  const displayed = blockTextOf(work, blockIndex);
  const original = blockTextOf(
    source.works.find(({ id }) => id === workId),
    blockIndex,
  );

  if (work?.translation === undefined || displayed === undefined || original === undefined) {
    return null;
  }

  if (original === text) {
    return displayed;
  }

  return isHeadingSentence(original.slice(0, -text.length).trimEnd())
    ? displayed.slice(displayed.indexOf(SENTENCE_BREAK) + SENTENCE_BREAK.length)
    : fail(`${workId} reflection heading ${String(blockIndex)}`);
};

const enrichReflection = async (
  mystery: JsonRecord,
  loadReflectionSource: ReflectionSourceLoader,
  libraries: ReflectionLibraries,
): Promise<JsonRecord> => {
  const reflection = recordFrom(mystery['reflection'], 'reflection');

  if (stringFrom(reflection, 'status', 'reflection') !== ReflectionStatus.Mapped) {
    return reflection;
  }

  const sourceId = stringFrom(reflection, 'sourceId', 'reflection');
  const text = reflectionTextFrom(
    stringFrom(reflection, 'sectionId', 'reflection'),
    await loadReflectionSource(sourceId),
  );

  const blockIndex = reflectionBlockIndexOf(libraries.source, sourceId, text);
  const displayed = displayedReflectionOf(libraries, sourceId, blockIndex, text);

  return {
    ...reflection,
    text: displayed ?? text,
    blockIndex,
    ...(displayed === null ? {} : { translation: Translation.Ai }),
  };
};

type MysteryEnrichmentContext = {
  readonly sourceFiles: ReadonlyMap<string, string>;
  readonly loadReflectionSource: ReflectionSourceLoader;
  readonly libraries: ReflectionLibraries;
  readonly repositoryRoot: URL;
  readonly redLetter: RedLetterBooks;
  readonly contentLanguage: ContentReading;
};

const enrichMystery = async (
  mystery: JsonRecord,
  {
    sourceFiles,
    loadReflectionSource,
    libraries,
    repositoryRoot,
    redLetter,
    contentLanguage,
  }: MysteryEnrichmentContext,
): Promise<JsonRecord> => {
  const scripture = recordFrom(mystery['scripture'], 'scripture');
  const book = scriptureBook(scripture);
  const range: ScriptureRange = {
    reference: stringFrom(scripture, 'reference', 'scripture'),
    book,
    chapter: positiveIntegerFrom(scripture, 'chapter', 'scripture'),
    verseStart: positiveIntegerFrom(scripture, 'verseStart', 'scripture'),
    verseEnd: positiveIntegerFrom(scripture, 'verseEnd', 'scripture'),
    sourceFile: requireId(sourceFiles, book, 'scripture book'),
  };

  validateScriptureRange(range);
  const passageRange = await editionRangeOf(range, contentLanguage, repositoryRoot);
  const code = sourceCodeOf(await Bun.file(new URL(range.sourceFile, repositoryRoot)).text());
  const definition = BIBLE_DEFINITIONS.find((candidate) => candidate.code === code);
  const { text, red } = extractPassageContent(
    await Bun.file(new URL(passageRange.sourceFile, repositoryRoot)).text(),
    passageRange,
    redLetter.get(bibleBookIdentifierFrom(book)),
  );

  return {
    ...mystery,
    scripture: {
      ...scripture,
      reference: passageRange.reference,
      bookId: bibleBookIdentifierFrom(definition?.name ?? fail(`scripture book ${book}`)),
      sourceId: contentLanguage.edition.sourceId,
      text,
      ...(red.length === 0 ? {} : { red }),
    },
    reflection: await enrichReflection(mystery, loadReflectionSource, libraries),
  };
};

type RosaryInputs = {
  readonly sources: unknown;
  readonly libraries: ReflectionLibraries;
};

const enrichRosary = async (
  value: unknown,
  { sources, libraries }: RosaryInputs,
  repositoryRoot: URL,
  contentLanguage: ContentReading,
): Promise<JsonRecord> => {
  const rosary = recordFrom(value, 'rosary');
  const mysteries = mysteryRecordsFrom(rosary);
  const books = new Set(
    mysteries.map((mystery) => scriptureBook(recordFrom(mystery['scripture'], 'scripture'))),
  );
  const sourceFiles = await sourceFilesForBooks(books, repositoryRoot);
  const loadReflectionSource = reflectionSourceLoaderFrom(sources, repositoryRoot);
  const { edition } = contentLanguage;
  const redLetter = redLetterBooksFrom(
    await readJsonFile(edition.redLetterDatabase, repositoryRoot),
    edition.sourceId,
  );
  const mysterySets = await Promise.all(
    arrayFrom(rosary.mysterySets, 'rosary.mysterySets').map(async (value, setIndex) => {
      const mysterySet = recordFrom(value, mysterySetPath(setIndex));
      const enrichedMysteries = await Promise.all(
        arrayFrom(mysterySet.mysteries, `${mysterySetPath(setIndex)}.mysteries`).map(
          (mystery, index) =>
            enrichMystery(recordFrom(mystery, mysteryPath(setIndex, index)), {
              sourceFiles,
              loadReflectionSource,
              libraries,
              repositoryRoot,
              redLetter,
              contentLanguage,
            }),
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

      await Bun.file(new URL(source.path, repositoryRoot)).stat();
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
  content.aiTranslation?.toolSourceIds.forEach((sourceId) =>
    requireSource(context.sources, sourceId),
  );

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

const aiTranslationOf = async (
  { aiTranslationDatabase }: ContentLanguage,
  repositoryRoot: URL,
): Promise<JsonRecord> =>
  aiTranslationDatabase === null
    ? {}
    : {
        aiTranslation: toolMarkingFrom(
          recordFrom(
            await readJsonFile(aiTranslationDatabase, repositoryRoot),
            aiTranslationDatabase,
          ),
          fail,
        ),
      };

const sourceLibraryOf = async (
  library: LibraryContent,
  repositoryRoot: URL,
): Promise<LibraryContent> =>
  library.works.some(({ translation }) => translation !== undefined)
    ? buildLibraryContent(repositoryRoot, CONTENT_LANGUAGES[Language.English])
    : library;

export const buildDevotionalContent = async (
  repositoryRoot: URL,
  library: LibraryContent,
  contentLanguage: ContentReading,
): Promise<DevotionalContent> => {
  const [englishSources, englishPrayers, artworks, englishRosary] = await Promise.all([
    readJsonFile(SOURCE_DATABASE, repositoryRoot),
    readJsonFile(PRAYER_DATABASE, repositoryRoot),
    readJsonFile(ART_DATABASE, repositoryRoot),
    readJsonFile(ROSARY_DATABASE, repositoryRoot),
  ]);
  const sources = await sourcesInLanguage(contentLanguage, englishSources, repositoryRoot);
  const { prayers, rosary } = await contentInLanguage(
    contentLanguage,
    { prayers: englishPrayers, rosary: englishRosary },
    repositoryRoot,
  );
  const content = devotionalContentFrom({
    schemaVersion: DEVOTIONAL_SCHEMA_VERSION,
    sources: sourceEntriesFrom(sources),
    prayers,
    artworks,
    rosary: await enrichRosary(
      rosary,
      {
        sources,
        libraries: { source: await sourceLibraryOf(library, repositoryRoot), display: library },
      },
      repositoryRoot,
      contentLanguage,
    ),
    ...(await aiTranslationOf(contentLanguage, repositoryRoot)),
  });

  await validateRelationships(content, repositoryRoot);

  return content;
};
