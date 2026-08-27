import {
  contentCatalog,
  type ContentCatalog,
  type ResolvedArtwork,
} from '../../content/catalog.ts';
import {
  guidanceStatementsOf,
  type DevotionalSource,
  type GuidanceStatement,
  type MysteryReflection,
  type SourceReference,
} from '../../content/schema.ts';

export enum ReferenceGroup {
  RosaryText = 'rosary-text',
  Scripture = 'scripture',
  Guidance = 'guidance',
  Apparatus = 'apparatus',
  Artwork = 'artwork',
  Rights = 'rights',
}

export type ReadingLocation = {
  readonly workId: string;
  readonly blockIndex: number;
};

export type SourceReferenceTarget = {
  readonly group:
    | ReferenceGroup.RosaryText
    | ReferenceGroup.Scripture
    | ReferenceGroup.Guidance
    | ReferenceGroup.Apparatus
    | ReferenceGroup.Rights;
  readonly sourceId: string;
  readonly locator?: string;
  readonly sections?: readonly string[];
  readonly supportingReferences?: readonly SourceReference[];
  readonly reading?: ReadingLocation;
};

export type ArtworkReferenceTarget = {
  readonly group: ReferenceGroup.Artwork;
  readonly sourceId: string;
  readonly artworkId: string;
};

export type ReferenceTarget = ArtworkReferenceTarget | SourceReferenceTarget;

export type ReferenceRecord = {
  readonly id: string;
  readonly title: string;
  readonly subtitle: string;
  readonly target: ReferenceTarget;
};

export type ReferenceSection = {
  readonly description: string;
  readonly group: ReferenceGroup;
  readonly label: string;
  readonly records: readonly ReferenceRecord[];
};

const GROUP_ORDER: readonly ReferenceGroup[] = Object.freeze([
  ReferenceGroup.RosaryText,
  ReferenceGroup.Scripture,
  ReferenceGroup.Guidance,
  ReferenceGroup.Apparatus,
  ReferenceGroup.Artwork,
  ReferenceGroup.Rights,
]);

export const referenceGroupLabel = (group: ReferenceGroup): string => {
  switch (group) {
    case ReferenceGroup.RosaryText:
      return 'Rosary text';
    case ReferenceGroup.Scripture:
      return 'Scripture';
    case ReferenceGroup.Guidance:
      return 'Rosary Guidance';
    case ReferenceGroup.Apparatus:
      return 'Apparatus';
    case ReferenceGroup.Artwork:
      return 'Artwork';
    case ReferenceGroup.Rights:
      return 'Rights';
  }
};

const groupDescription = (group: ReferenceGroup): string => {
  switch (group) {
    case ReferenceGroup.RosaryText:
      return 'Sources for the prayers, mystery names, weekly schedule, fruits, passage selections, and reflections.';
    case ReferenceGroup.Scripture:
      return 'The Bible edition used for the readings.';
    case ReferenceGroup.Guidance:
      return 'The instructions behind the prompts shown during prayer.';
    case ReferenceGroup.Apparatus:
      return 'The words of Christ marking and the editions cross-referenced to prepare it.';
    case ReferenceGroup.Artwork:
      return 'The source record and rights note for every artwork bundled with Lucerna.';
    case ReferenceGroup.Rights:
      return 'The open-access policies that govern the bundled image files.';
  }
};

const uniqueSources = (
  catalog: ContentCatalog,
  sourceIds: readonly string[],
): readonly DevotionalSource[] => {
  const seen = new Set<string>();
  const sources: DevotionalSource[] = [];

  for (const sourceId of sourceIds) {
    if (!seen.has(sourceId)) {
      seen.add(sourceId);
      sources.push(catalog.sourceById(sourceId));
    }
  }

  return sources;
};

const rosaryTextSources = (catalog: ContentCatalog): readonly DevotionalSource[] => {
  const sourceIds = [
    catalog.rosary.schedule.sourceId,
    ...catalog.prayers.map((prayer) => prayer.sourceId),
  ];

  for (const mysterySet of catalog.rosary.mysterySets) {
    sourceIds.push(mysterySet.nameSourceId);

    for (const mystery of mysterySet.mysteries) {
      sourceIds.push(
        mystery.titleSourceId,
        mystery.fruitSourceId,
        mystery.scripture.selectionSourceId,
        mystery.reflection.sourceId,
      );
    }
  }

  return uniqueSources(catalog, sourceIds);
};

const scriptureSources = (catalog: ContentCatalog): readonly DevotionalSource[] => {
  const sourceIds: string[] = [];

  for (const mysterySet of catalog.rosary.mysterySets) {
    for (const mystery of mysterySet.mysteries) {
      sourceIds.push(mystery.scripture.sourceId);
    }
  }

  return uniqueSources(catalog, sourceIds);
};

const apparatusSources = (catalog: ContentCatalog): readonly DevotionalSource[] => {
  const redLetter = catalog.bible.redLetter;

  return uniqueSources(catalog, [
    ...redLetter.witnesses.map(({ id }) => id),
    ...redLetter.tools.map(({ id }) => id),
  ]);
};

type ReferenceBearingGuidance = Pick<GuidanceStatement, 'sourceId' | 'sourceRefs'>;

const guidanceSources = (catalog: ContentCatalog): readonly DevotionalSource[] => {
  const guidance = catalog.rosary.guidance;
  const sourceIds = [...guidance.sourceIds];
  const statements: readonly ReferenceBearingGuidance[] = [
    ...guidanceStatementsOf(guidance),
    guidance.fruitLine,
  ];

  for (const statement of statements) {
    sourceIds.push(statement.sourceId, ...statement.sourceRefs.map(({ sourceId }) => sourceId));
  }

  return uniqueSources(catalog, sourceIds);
};

const sourceRecord = (group: SourceReferenceTarget['group'], source: DevotionalSource) => ({
  id: `${group}:${source.id}`,
  subtitle: source.author,
  target: { group, sourceId: source.id },
  title: source.work,
});

const sourceRecords = (
  group: SourceReferenceTarget['group'],
  sources: readonly DevotionalSource[],
): readonly ReferenceRecord[] => sources.map((source) => sourceRecord(group, source));

const artworkRecord = (artwork: ResolvedArtwork): ReferenceRecord => ({
  id: `${ReferenceGroup.Artwork}:${artwork.id}`,
  subtitle: `${artwork.artist} · ${artwork.date} · ${artwork.holder}`,
  target: {
    artworkId: artwork.id,
    group: ReferenceGroup.Artwork,
    sourceId: artwork.sourceId,
  },
  title: artwork.title,
});

const artworkRecords = (catalog: ContentCatalog): readonly ReferenceRecord[] =>
  [...catalog.artworks]
    .sort((left, right) =>
      `${left.artist} ${left.title}`.localeCompare(`${right.artist} ${right.title}`, 'en-US'),
    )
    .map(artworkRecord);

const recordsForGroup = (
  catalog: ContentCatalog,
  group: ReferenceGroup,
): readonly ReferenceRecord[] => {
  switch (group) {
    case ReferenceGroup.RosaryText:
      return sourceRecords(group, rosaryTextSources(catalog));
    case ReferenceGroup.Scripture:
      return sourceRecords(group, scriptureSources(catalog));
    case ReferenceGroup.Guidance:
      return sourceRecords(group, guidanceSources(catalog));
    case ReferenceGroup.Apparatus:
      return sourceRecords(group, apparatusSources(catalog));
    case ReferenceGroup.Artwork:
      return artworkRecords(catalog);
    case ReferenceGroup.Rights:
      return sourceRecords(
        group,
        catalog.sources.filter(({ type }) => type === 'art'),
      );
  }
};

export const referenceSectionsFrom = (catalog: ContentCatalog): readonly ReferenceSection[] =>
  GROUP_ORDER.map((group) => ({
    description: groupDescription(group),
    group,
    label: referenceGroupLabel(group),
    records: recordsForGroup(catalog, group),
  }));

export const referenceSections = referenceSectionsFrom(contentCatalog);

export const artworkReferenceTarget = (artwork: ResolvedArtwork): ArtworkReferenceTarget => ({
  artworkId: artwork.id,
  group: ReferenceGroup.Artwork,
  sourceId: artwork.sourceId,
});

export const rosaryTextReferenceTarget = (sourceId: string): SourceReferenceTarget => ({
  group: ReferenceGroup.RosaryText,
  sourceId,
});

export const apparatusReferenceTarget = (sourceId: string): SourceReferenceTarget => ({
  group: ReferenceGroup.Apparatus,
  sourceId,
});

export const reflectionReferenceTarget = (
  reflection: MysteryReflection,
): SourceReferenceTarget => ({
  group: ReferenceGroup.Guidance,
  locator: reflection.locator,
  sourceId: reflection.sourceId,
  ...(reflection.blockIndex === undefined
    ? {}
    : { reading: { workId: reflection.sourceId, blockIndex: reflection.blockIndex } }),
});

export const guidanceReferenceTarget = (guidance: GuidanceStatement): SourceReferenceTarget => {
  const primary =
    guidance.sourceRefs.find(({ sourceId }) => sourceId === guidance.sourceId) ??
    guidance.sourceRefs[0];

  if (primary === undefined) {
    return { group: ReferenceGroup.Guidance, sourceId: guidance.sourceId };
  }

  return {
    group: ReferenceGroup.Guidance,
    locator: primary.locator,
    ...(primary.sections === undefined ? {} : { sections: primary.sections }),
    sourceId: primary.sourceId,
    supportingReferences: guidance.sourceRefs,
  };
};

export const referenceTargetKey = (target: ReferenceTarget): string => {
  if (target.group === ReferenceGroup.Artwork) {
    return `${target.group}:${target.artworkId}`;
  }

  return [
    target.group,
    target.sourceId,
    target.locator ?? '',
    target.sections?.join(',') ?? '',
  ].join(':');
};
