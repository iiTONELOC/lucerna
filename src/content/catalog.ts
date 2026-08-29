import generatedBibleIndex from '../generated/bible/douay-rheims/index.json' with { type: 'json' };
import generatedContent from '../generated/devotional-content.json' with { type: 'json' };
import { CodedError } from '../shared/codedError.ts';
import {
  bibleIndexFrom,
  devotionalContentFrom,
  type Artwork,
  type BibleBookSummary,
  type BibleIndex,
  type DevotionalContent,
  type DevotionalSource,
  type LibraryContent,
  type LibraryWork,
  type Mystery,
  type MysterySet,
  type Prayer,
  type RosaryContent,
} from './schema.ts';

export enum CatalogLookupErrorCode {
  MissingSource = 'missing-source',
  MissingPrayer = 'missing-prayer',
  MissingArtwork = 'missing-artwork',
  MissingMysterySet = 'missing-mystery-set',
  MissingLibraryWork = 'missing-library-work',
  DuplicateIdentifier = 'duplicate-identifier',
}

type CatalogRecordType = 'artwork' | 'library work' | 'mystery set' | 'prayer' | 'source';

const lookupErrorMessage = (
  code: CatalogLookupErrorCode,
  recordType: CatalogRecordType,
  id: string,
): string => {
  if (code === CatalogLookupErrorCode.DuplicateIdentifier) {
    return `Duplicate ${recordType} identifier ${id}`;
  }

  return `Missing ${recordType} ${id}`;
};

export class CatalogLookupError extends CodedError<CatalogLookupErrorCode> {
  constructor(
    code: CatalogLookupErrorCode,
    readonly recordType: CatalogRecordType,
    readonly id: string,
  ) {
    super('CatalogLookupError', code, lookupErrorMessage(code, recordType, id));
  }
}

export type ResolvedPrayer = Prayer & {
  readonly source: DevotionalSource;
};

export type ResolvedArtwork = Artwork & {
  readonly source: DevotionalSource;
};

export type ResolvedMystery = Mystery & {
  readonly artworks: readonly ResolvedArtwork[];
  readonly provenance: {
    readonly title: DevotionalSource;
    readonly fruit: DevotionalSource;
    readonly scripture: DevotionalSource;
    readonly scriptureSelection: DevotionalSource;
    readonly reflection: DevotionalSource;
  };
};

export type ResolvedMysterySet = Omit<MysterySet, 'mysteries'> & {
  readonly nameSource: DevotionalSource;
  readonly mysteries: readonly ResolvedMystery[];
};

export type ResolvedRosary = Omit<RosaryContent, 'mysterySets' | 'prayerStageArt'> & {
  readonly scheduleSource: DevotionalSource;
  readonly prayers: readonly ResolvedPrayer[];
  readonly mysterySets: readonly ResolvedMysterySet[];
  readonly prayerStageArt: Readonly<Record<string, readonly ResolvedArtwork[]>>;
};

export type ResolvedLibraryWork = LibraryWork & {
  readonly source: DevotionalSource;
};

export type ResolvedLibrary = {
  readonly works: readonly ResolvedLibraryWork[];
  readonly workById: (id: string) => ResolvedLibraryWork;
};

export type ResolvedRedLetter = {
  readonly notice: string;
  readonly witnesses: readonly DevotionalSource[];
  readonly tools: readonly DevotionalSource[];
};

export type ResolvedBible = {
  readonly source: DevotionalSource;
  readonly redLetter: ResolvedRedLetter;
  readonly books: readonly BibleBookSummary[];
};

export type ContentCatalog = {
  readonly sources: readonly DevotionalSource[];
  readonly prayers: readonly ResolvedPrayer[];
  readonly artworks: readonly ResolvedArtwork[];
  readonly rosary: ResolvedRosary;
  readonly bible: ResolvedBible;
  readonly sourceById: (id: string) => DevotionalSource;
  readonly prayerById: (id: string) => ResolvedPrayer;
  readonly artworkById: (id: string) => ResolvedArtwork;
  readonly mysterySetById: (id: string) => ResolvedMysterySet;
};

const recordsById = <RecordType extends { readonly id: string }>(
  records: readonly RecordType[],
  recordType: CatalogRecordType,
): ReadonlyMap<string, RecordType> => {
  const byId = new Map<string, RecordType>();

  for (const record of records) {
    if (byId.has(record.id)) {
      throw new CatalogLookupError(
        CatalogLookupErrorCode.DuplicateIdentifier,
        recordType,
        record.id,
      );
    }

    byId.set(record.id, record);
  }

  return byId;
};

const requiredRecord = <RecordType>(
  records: ReadonlyMap<string, RecordType>,
  id: string,
  code: CatalogLookupErrorCode,
  recordType: CatalogRecordType,
): RecordType => {
  const record = records.get(id);

  if (record === undefined) {
    throw new CatalogLookupError(code, recordType, id);
  }

  return record;
};

const byOrdinal = (
  left: { readonly ordinal: number },
  right: { readonly ordinal: number },
): number => left.ordinal - right.ordinal;

const resolvedMysterySetsFrom = (
  mysterySets: readonly MysterySet[],
  sourceById: (id: string) => DevotionalSource,
  artworkById: (id: string) => ResolvedArtwork,
): readonly ResolvedMysterySet[] =>
  [...mysterySets].sort(byOrdinal).map<ResolvedMysterySet>((mysterySet) => ({
    ...mysterySet,
    nameSource: sourceById(mysterySet.nameSourceId),
    mysteries: [...mysterySet.mysteries].sort(byOrdinal).map<ResolvedMystery>((mystery) => ({
      ...mystery,
      artworks: mystery.artIds.map((artId) => artworkById(artId)),
      provenance: {
        title: sourceById(mystery.titleSourceId),
        fruit: sourceById(mystery.fruitSourceId),
        scripture: sourceById(mystery.scripture.sourceId),
        scriptureSelection: sourceById(mystery.scripture.selectionSourceId),
        reflection: sourceById(mystery.reflection.sourceId),
      },
    })),
  }));

const resolvedStageArtFrom = (
  stageArt: Readonly<Record<string, readonly string[]>>,
  artworkById: (id: string) => ResolvedArtwork,
): Readonly<Record<string, readonly ResolvedArtwork[]>> =>
  Object.fromEntries(
    Object.entries(stageArt).map(([prayerId, artIds]) => [
      prayerId,
      artIds.map((artId) => artworkById(artId)),
    ]),
  );

export const resolveLibrary = (
  library: LibraryContent,
  sourceById: (id: string) => DevotionalSource,
): ResolvedLibrary => {
  const works = library.works.map<ResolvedLibraryWork>((work) => ({
    ...work,
    source: sourceById(work.sourceId),
  }));
  const workRecords = recordsById(works, 'library work');

  return {
    works,
    workById: (id: string): ResolvedLibraryWork =>
      requiredRecord(workRecords, id, CatalogLookupErrorCode.MissingLibraryWork, 'library work'),
  };
};

const resolvedBibleFrom = (
  bible: BibleIndex,
  sourceById: (id: string) => DevotionalSource,
): ResolvedBible => ({
  source: sourceById(bible.sourceId),
  redLetter: {
    notice: bible.redLetter.notice,
    witnesses: bible.redLetter.witnessSourceIds.map(sourceById),
    tools: bible.redLetter.toolSourceIds.map(sourceById),
  },
  books: bible.books,
});

export const createContentCatalog = (
  content: DevotionalContent,
  bible: BibleIndex,
): ContentCatalog => {
  const sourceRecords = recordsById(content.sources, 'source');
  const sourceById = (id: string): DevotionalSource =>
    requiredRecord(sourceRecords, id, CatalogLookupErrorCode.MissingSource, 'source');
  const artworks = content.artworks.map<ResolvedArtwork>((artwork) => ({
    ...artwork,
    source: sourceById(artwork.sourceId),
  }));
  const artworkRecords = recordsById(artworks, 'artwork');
  const artworkById = (id: string): ResolvedArtwork =>
    requiredRecord(artworkRecords, id, CatalogLookupErrorCode.MissingArtwork, 'artwork');
  const prayers = content.prayers.map<ResolvedPrayer>((prayer) => ({
    ...prayer,
    source: sourceById(prayer.sourceId),
  }));
  const prayerRecords = recordsById(prayers, 'prayer');
  const prayerById = (id: string): ResolvedPrayer =>
    requiredRecord(prayerRecords, id, CatalogLookupErrorCode.MissingPrayer, 'prayer');
  const mysterySets = resolvedMysterySetsFrom(content.rosary.mysterySets, sourceById, artworkById);
  const mysterySetRecords = recordsById(mysterySets, 'mystery set');
  const mysterySetById = (id: string): ResolvedMysterySet =>
    requiredRecord(mysterySetRecords, id, CatalogLookupErrorCode.MissingMysterySet, 'mystery set');

  return {
    sources: content.sources,
    prayers,
    artworks,
    rosary: {
      ...content.rosary,
      scheduleSource: sourceById(content.rosary.schedule.sourceId),
      prayers: content.rosary.prayerIds.map((prayerId) => prayerById(prayerId)),
      mysterySets,
      prayerStageArt: resolvedStageArtFrom(content.rosary.prayerStageArt, artworkById),
    },
    bible: resolvedBibleFrom(bible, sourceById),
    sourceById,
    prayerById,
    artworkById,
    mysterySetById,
  };
};

export const contentCatalog = createContentCatalog(
  devotionalContentFrom(generatedContent),
  bibleIndexFrom(generatedBibleIndex),
);
