import { contentCatalog, type ResolvedMysterySet } from '../../content/catalog.ts';
import { guidanceStatementsOf, type GuidanceStatement } from '../../content/schema.ts';
import { capitalize } from '../../shared/text.ts';
import { scriptureLocationOf, type BibleVerseLocation } from '../library/model.ts';
import { FRUIT_LABEL, PrayerId, PrayerStartKind, type PrayerStart } from '../prayer/progression.ts';
import { Weekday } from '../rosary/schedule.ts';
import {
  apparatusReferenceTarget,
  type ReadingLocation,
  type ReferenceTarget,
} from './referenceCatalog.ts';

export enum ReferenceUseKind {
  Prayers = 'Prayers',
  Schedule = 'Weekly schedule',
  SeasonalSundays = 'Seasonal Sundays',
  SetNames = 'Mystery sets',
  Mysteries = 'Mysteries',
  MysteryNames = 'Mystery names',
  Fruits = 'Fruits',
  PassageSelections = 'Passage selections',
  Readings = 'Readings',
  Reflections = 'Reflections',
  Guidance = 'Guidance',
  RedLetter = 'Words of Christ in red',
}

export const COMPACT_USE_KINDS: ReadonlySet<ReferenceUseKind> = new Set([
  ReferenceUseKind.Prayers,
  ReferenceUseKind.Schedule,
  ReferenceUseKind.SeasonalSundays,
  ReferenceUseKind.SetNames,
]);

export enum ReferenceUseActionKind {
  Pray = 'pray',
  ShowSet = 'show-set',
  OpenReference = 'open-reference',
  OpenBible = 'open-bible',
  Read = 'read',
  OpenScripture = 'open-scripture',
}

export type ReferenceUseAction =
  | {
      readonly kind: ReferenceUseActionKind.Pray;
      readonly mysterySetId?: string;
      readonly start: PrayerStart;
    }
  | { readonly kind: ReferenceUseActionKind.ShowSet; readonly mysterySetId: string }
  | { readonly kind: ReferenceUseActionKind.OpenReference; readonly target: ReferenceTarget }
  | { readonly kind: ReferenceUseActionKind.OpenBible }
  | { readonly kind: ReferenceUseActionKind.Read; readonly location: ReadingLocation }
  | {
      readonly kind: ReferenceUseActionKind.OpenScripture;
      readonly bookId: string;
      readonly verse: BibleVerseLocation;
    };

export type ReferenceUseRow = {
  readonly key: string;
  readonly title: string;
  readonly detail?: string;
  readonly trailing?: string;
  readonly locator?: string;
  readonly action?: ReferenceUseAction;
};

export type ReferenceUseGroup = {
  readonly mysterySetId?: string;
  readonly label?: string;
  readonly rows: readonly ReferenceUseRow[];
};

export type ReferenceUseSection = {
  readonly kind: ReferenceUseKind;
  readonly groups: readonly ReferenceUseGroup[];
};

type ResolvedMystery = ResolvedMysterySet['mysteries'][number];

const DETAIL_SEPARATOR = ' · ';

export const sectionsLabel = (sections: readonly string[]): string =>
  `${sections.length === 1 ? 'Section' : 'Sections'} ${sections.join(', ')}`;

const fruitLine = (fruit: string): string => [FRUIT_LABEL, fruit].join(DETAIL_SEPARATOR);

const prayerIdOf = (id: string): PrayerId | undefined =>
  Object.values(PrayerId).find((prayerId) => prayerId === id);

const showSet = (mysterySetId: string): ReferenceUseAction => ({
  kind: ReferenceUseActionKind.ShowSet,
  mysterySetId,
});

const flat = (rows: readonly ReferenceUseRow[]): readonly ReferenceUseGroup[] =>
  rows.length === 0 ? [] : [{ rows }];

const prayerRows = (
  cited: (prayerId: string, sourceId: string) => boolean,
  featuredArtworkId?: string,
): readonly ReferenceUseRow[] =>
  contentCatalog.prayers.flatMap((prayer) => {
    const prayerId = prayerIdOf(prayer.id);

    if (prayerId === undefined || !cited(prayer.id, prayer.sourceId)) {
      return [];
    }

    const start: PrayerStart = {
      kind: PrayerStartKind.Prayer,
      prayerId,
      ...(featuredArtworkId === undefined ? {} : { featuredArtworkId }),
    };

    return [
      { action: { kind: ReferenceUseActionKind.Pray, start }, key: prayer.id, title: prayer.title },
    ];
  });

const scheduleRows = (sourceId: string): readonly ReferenceUseRow[] => {
  const schedule = contentCatalog.rosary.schedule;

  return schedule.sourceId === sourceId
    ? Object.values(Weekday).map((weekday) => ({
        action: showSet(schedule[weekday]),
        detail: contentCatalog.mysterySetById(schedule[weekday]).name,
        key: weekday,
        title: capitalize(weekday),
      }))
    : [];
};

const seasonalRows = (sourceId: string): readonly ReferenceUseRow[] =>
  contentCatalog.rosary.schedule.seasonalSundays
    .filter((rule) => rule.sourceId === sourceId)
    .map((rule) => ({
      action: showSet(rule.mysterySetId),
      detail: capitalize(rule.season),
      key: rule.season,
      title: contentCatalog.mysterySetById(rule.mysterySetId).name,
    }));

const setNameRows = (sourceId: string): readonly ReferenceUseRow[] =>
  contentCatalog.rosary.mysterySets
    .filter((mysterySet) => mysterySet.nameSourceId === sourceId)
    .map((mysterySet) => ({
      action: showSet(mysterySet.id),
      key: mysterySet.id,
      title: mysterySet.name,
    }));

const mysterySourceOf = (mystery: ResolvedMystery, kind: ReferenceUseKind): string | undefined => {
  switch (kind) {
    case ReferenceUseKind.MysteryNames:
      return mystery.titleSourceId;
    case ReferenceUseKind.Fruits:
      return mystery.fruitSourceId;
    case ReferenceUseKind.PassageSelections:
      return mystery.scripture.selectionSourceId;
    case ReferenceUseKind.Readings:
      return mystery.scripture.sourceId;
    case ReferenceUseKind.Reflections:
      return mystery.reflection.sourceId;
    default:
      return undefined;
  }
};

const prayMystery = (mystery: ResolvedMystery, featuredArtworkId?: string): ReferenceUseAction => ({
  kind: ReferenceUseActionKind.Pray,
  mysterySetId: mystery.set,
  start: {
    decade: mystery.ordinal,
    kind: PrayerStartKind.Mystery,
    ...(featuredArtworkId === undefined ? {} : { featuredArtworkId }),
  },
});

const readingRow = (mystery: ResolvedMystery): Partial<ReferenceUseRow> => {
  const location = scriptureLocationOf(mystery.scripture);

  return location === null
    ? {}
    : { action: { kind: ReferenceUseActionKind.OpenScripture, ...location } };
};

const reflectionRow = (mystery: ResolvedMystery): Partial<ReferenceUseRow> => {
  const { blockIndex, locator, sourceId, status } = mystery.reflection;

  return {
    detail: locator,
    locator,
    trailing: status,
    ...(blockIndex === undefined
      ? {}
      : {
          action: { kind: ReferenceUseActionKind.Read, location: { blockIndex, workId: sourceId } },
        }),
  };
};

const mysteryFace = (
  mystery: ResolvedMystery,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): Partial<ReferenceUseRow> => {
  switch (kind) {
    case ReferenceUseKind.Mysteries: {
      const fruit = featuredArtworkId === undefined ? fruitLine(mystery.fruit) : mystery.fruit;
      return { detail: [fruit, mystery.scripture.reference].join(DETAIL_SEPARATOR) };
    }
    case ReferenceUseKind.Fruits:
      return { detail: fruitLine(mystery.fruit) };
    case ReferenceUseKind.PassageSelections:
      return { detail: mystery.scripture.reference };
    case ReferenceUseKind.Readings:
      return { detail: mystery.scripture.reference, ...readingRow(mystery) };
    case ReferenceUseKind.Reflections:
      return reflectionRow(mystery);
    default:
      return {};
  }
};

const mysteryRow = (
  mystery: ResolvedMystery,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): ReferenceUseRow => {
  const face = mysteryFace(mystery, kind, featuredArtworkId);

  return {
    key: `${mystery.set}:${String(mystery.ordinal)}`,
    title: mystery.title,
    ...face,
    action: face.action ?? prayMystery(mystery, featuredArtworkId),
  };
};

const mysteryGroups = (
  includes: (mystery: ResolvedMystery) => boolean,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): readonly ReferenceUseGroup[] =>
  contentCatalog.rosary.mysterySets.flatMap((mysterySet) => {
    const rows = mysterySet.mysteries
      .filter(includes)
      .map((mystery) => mysteryRow(mystery, kind, featuredArtworkId));

    return rows.length === 0 ? [] : [{ label: mysterySet.name, mysterySetId: mysterySet.id, rows }];
  });

const guidanceRows = (sourceId: string): readonly ReferenceUseRow[] =>
  guidanceStatementsOf(contentCatalog.rosary.guidance).flatMap((guidance: GuidanceStatement) =>
    guidance.sourceRefs
      .filter((reference) => reference.sourceId === sourceId)
      .map((reference) => ({
        action: {
          kind: ReferenceUseActionKind.Pray,
          start: { guidance, kind: PrayerStartKind.Guidance },
        },
        detail: guidance.text,
        key: `${reference.locator}:${guidance.text}`,
        title: reference.locator,
        ...(reference.sections === undefined
          ? {}
          : { trailing: sectionsLabel(reference.sections) }),
      })),
  );

const redLetterRows = (sourceId: string): readonly ReferenceUseRow[] => {
  const redLetter = contentCatalog.bible.redLetter;
  const sources = [...redLetter.witnesses, ...redLetter.tools];

  if (!sources.some(({ id }) => id === sourceId)) {
    return [];
  }

  return [
    {
      action: { kind: ReferenceUseActionKind.OpenBible },
      key: 'red-letter',
      title: redLetter.notice,
    },
    ...sources
      .filter(({ id }) => id !== sourceId)
      .map((source): ReferenceUseRow => ({
        action: {
          kind: ReferenceUseActionKind.OpenReference,
          target: apparatusReferenceTarget(source.id),
        },
        detail: [source.author, source.note].filter(Boolean).join(DETAIL_SEPARATOR),
        key: source.id,
        title: source.work,
        trailing: source.approval,
      })),
  ];
};

const groupsOf = (kind: ReferenceUseKind, sourceId: string): readonly ReferenceUseGroup[] => {
  switch (kind) {
    case ReferenceUseKind.Prayers:
      return flat(prayerRows((_, prayerSourceId) => prayerSourceId === sourceId));
    case ReferenceUseKind.Schedule:
      return flat(scheduleRows(sourceId));
    case ReferenceUseKind.SeasonalSundays:
      return flat(seasonalRows(sourceId));
    case ReferenceUseKind.SetNames:
      return flat(setNameRows(sourceId));
    case ReferenceUseKind.Guidance:
      return flat(guidanceRows(sourceId));
    case ReferenceUseKind.RedLetter:
      return flat(redLetterRows(sourceId));
    default:
      return mysteryGroups((mystery) => mysterySourceOf(mystery, kind) === sourceId, kind);
  }
};

const sectionsOf = (
  entries: readonly (readonly [ReferenceUseKind, readonly ReferenceUseGroup[]])[],
): readonly ReferenceUseSection[] =>
  entries.filter(([, groups]) => groups.length > 0).map(([kind, groups]) => ({ groups, kind }));

export const usesOfSource = (sourceId: string): readonly ReferenceUseSection[] => {
  const sections = sectionsOf(
    Object.values(ReferenceUseKind).map((kind) => [kind, groupsOf(kind, sourceId)]),
  );
  const namesMysteries = sections.some(({ kind }) => kind === ReferenceUseKind.MysteryNames);

  return namesMysteries
    ? sections.filter(({ kind }) => kind !== ReferenceUseKind.SetNames)
    : sections;
};

export const usesOfArtwork = (artworkId: string): readonly ReferenceUseSection[] => {
  const stagePrayerIds = Object.entries(contentCatalog.rosary.prayerStageArt)
    .filter(([, pool]) => pool.some(({ id }) => id === artworkId))
    .map(([prayerId]) => prayerId);

  return sectionsOf([
    [
      ReferenceUseKind.Mysteries,
      mysteryGroups(
        (mystery) => mystery.artworks.some(({ id }) => id === artworkId),
        ReferenceUseKind.Mysteries,
        artworkId,
      ),
    ],
    [
      ReferenceUseKind.Prayers,
      flat(prayerRows((prayerId) => stagePrayerIds.includes(prayerId), artworkId)),
    ],
  ]);
};
