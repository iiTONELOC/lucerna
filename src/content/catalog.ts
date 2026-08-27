import generatedContent from '../generated/devotional-content.json' with { type: 'json' };
import {
  devotionalContentFrom,
  type Artwork,
  type DevotionalContent,
  type DevotionalSource,
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
  DuplicateIdentifier = 'duplicate-identifier',
}

type CatalogRecordType = 'artwork' | 'mystery set' | 'prayer' | 'source';

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

export class CatalogLookupError extends Error {
  override readonly name = 'CatalogLookupError';

  constructor(
    readonly code: CatalogLookupErrorCode,
    readonly recordType: CatalogRecordType,
    readonly id: string,
  ) {
    super(lookupErrorMessage(code, recordType, id));
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

export type ContentCatalog = {
  readonly sources: readonly DevotionalSource[];
  readonly prayers: readonly ResolvedPrayer[];
  readonly artworks: readonly ResolvedArtwork[];
  readonly rosary: ResolvedRosary;
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

export const createContentCatalog = (content: DevotionalContent): ContentCatalog => {
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
  const prayerStageArt = Object.fromEntries(
    Object.entries(content.rosary.prayerStageArt).map(([prayerId, artIds]) => [
      prayerId,
      artIds.map((artId) => artworkById(artId)),
    ]),
  );

  return {
    sources: content.sources,
    prayers,
    artworks,
    rosary: {
      ...content.rosary,
      scheduleSource: sourceById(content.rosary.schedule.sourceId),
      prayers: content.rosary.prayerIds.map((prayerId) => prayerById(prayerId)),
      mysterySets,
      prayerStageArt,
    },
    sourceById,
    prayerById,
    artworkById,
    mysterySetById,
  };
};

export const contentCatalog = createContentCatalog(devotionalContentFrom(generatedContent));
