import { type ResolvedMysterySet, type ResolvedToolMarking } from '../../content/catalog.ts';
import { type ReadingSnapshot } from '../../content/reading.ts';
import {
  guidanceStatementsOf,
  type DevotionalSource,
  type GuidanceStatement,
} from '../../content/schema.ts';
import { scriptureLocationOf, type BibleVerseLocation } from '../library/model.ts';
import { FRUIT_LABEL, PrayerId, PrayerStartKind, type PrayerStart } from '../prayer/progression.ts';
import { Weekday } from '../rosary/schedule.ts';
import {
  apparatusReferenceTarget,
  type ReadingLocation,
  type ReferenceTarget,
} from './referenceCatalog.ts';

export enum ReferenceUseKind {
  Prayers = 'prayers',
  Schedule = 'schedule',
  SeasonalSundays = 'seasonal-sundays',
  SetNames = 'set-names',
  Mysteries = 'mysteries',
  MysteryNames = 'mystery-names',
  Fruits = 'fruits',
  PassageSelections = 'passage-selections',
  Readings = 'readings',
  Reflections = 'reflections',
  Guidance = 'guidance',
  RedLetter = 'red-letter',
  AiTranslation = 'ai-translation',
}

export const REFERENCE_USE_LABEL = (
  reading: ReadingSnapshot,
): Readonly<Record<ReferenceUseKind, string>> => ({
  [ReferenceUseKind.Prayers]: reading.wording.references.prayers,
  [ReferenceUseKind.Schedule]: reading.wording.references.schedule,
  [ReferenceUseKind.SeasonalSundays]: reading.wording.references.seasonalSundays,
  [ReferenceUseKind.SetNames]: reading.wording.references.setNames,
  [ReferenceUseKind.Mysteries]: reading.wording.references.mysteries,
  [ReferenceUseKind.MysteryNames]: reading.wording.references.mysteryNames,
  [ReferenceUseKind.Fruits]: reading.wording.references.fruits,
  [ReferenceUseKind.PassageSelections]: reading.wording.references.passageSelections,
  [ReferenceUseKind.Readings]: reading.wording.references.readings,
  [ReferenceUseKind.Reflections]: reading.wording.references.reflections,
  [ReferenceUseKind.Guidance]: reading.wording.prayer.guidance,
  [ReferenceUseKind.RedLetter]: reading.wording.references.redLetter,
  [ReferenceUseKind.AiTranslation]: reading.wording.settings.aiTranslated,
});

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

export const sectionsLabel = (reading: ReadingSnapshot, sections: readonly string[]): string =>
  reading.wording.references.sections(sections);

const fruitLine = (reading: ReadingSnapshot, fruit: string): string =>
  [FRUIT_LABEL(reading), fruit].join(DETAIL_SEPARATOR);

const prayerIdOf = (id: string): PrayerId | undefined =>
  Object.values(PrayerId).find((prayerId) => prayerId === id);

const showSet = (mysterySetId: string): ReferenceUseAction => ({
  kind: ReferenceUseActionKind.ShowSet,
  mysterySetId,
});

const flat = (rows: readonly ReferenceUseRow[]): readonly ReferenceUseGroup[] =>
  rows.length === 0 ? [] : [{ rows }];

const prayerRows = (
  reading: ReadingSnapshot,
  cited: (prayerId: string, sourceId: string) => boolean,
  featuredArtworkId?: string,
): readonly ReferenceUseRow[] =>
  reading.catalog.prayers.flatMap((prayer) => {
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

const scheduleRows = (reading: ReadingSnapshot, sourceId: string): readonly ReferenceUseRow[] => {
  const schedule = reading.catalog.rosary.schedule;

  return schedule.sourceId === sourceId
    ? Object.values(Weekday).map((weekday) => ({
        action: showSet(schedule[weekday]),
        detail: reading.catalog.mysterySetById(schedule[weekday]).name,
        key: weekday,
        title: reading.wording.weekdays[weekday],
      }))
    : [];
};

const seasonalRows = (reading: ReadingSnapshot, sourceId: string): readonly ReferenceUseRow[] =>
  reading.catalog.rosary.schedule.seasonalSundays
    .filter((rule) => rule.sourceId === sourceId)
    .map((rule) => ({
      action: showSet(rule.mysterySetId),
      detail: reading.wording.seasons[rule.season],
      key: rule.season,
      title: reading.catalog.mysterySetById(rule.mysterySetId).name,
    }));

const setNameRows = (reading: ReadingSnapshot, sourceId: string): readonly ReferenceUseRow[] =>
  reading.catalog.rosary.mysterySets
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

const readingRow = (
  reading: ReadingSnapshot,
  mystery: ResolvedMystery,
): Partial<ReferenceUseRow> => {
  const location = scriptureLocationOf(reading, mystery.scripture);

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
  reading: ReadingSnapshot,
  mystery: ResolvedMystery,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): Partial<ReferenceUseRow> => {
  switch (kind) {
    case ReferenceUseKind.Mysteries: {
      const fruit =
        featuredArtworkId === undefined ? fruitLine(reading, mystery.fruit) : mystery.fruit;
      return { detail: [fruit, mystery.scripture.reference].join(DETAIL_SEPARATOR) };
    }
    case ReferenceUseKind.Fruits:
      return { detail: fruitLine(reading, mystery.fruit) };
    case ReferenceUseKind.PassageSelections:
      return { detail: mystery.scripture.reference };
    case ReferenceUseKind.Readings:
      return { detail: mystery.scripture.reference, ...readingRow(reading, mystery) };
    case ReferenceUseKind.Reflections:
      return reflectionRow(mystery);
    default:
      return {};
  }
};

const mysteryRow = (
  reading: ReadingSnapshot,
  mystery: ResolvedMystery,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): ReferenceUseRow => {
  const face = mysteryFace(reading, mystery, kind, featuredArtworkId);

  return {
    key: `${mystery.set}:${String(mystery.ordinal)}`,
    title: mystery.title,
    ...face,
    action: face.action ?? prayMystery(mystery, featuredArtworkId),
  };
};

const mysteryGroups = (
  reading: ReadingSnapshot,
  includes: (mystery: ResolvedMystery) => boolean,
  kind: ReferenceUseKind,
  featuredArtworkId?: string,
): readonly ReferenceUseGroup[] =>
  reading.catalog.rosary.mysterySets.flatMap((mysterySet) => {
    const rows = mysterySet.mysteries
      .filter(includes)
      .map((mystery) => mysteryRow(reading, mystery, kind, featuredArtworkId));

    return rows.length === 0 ? [] : [{ label: mysterySet.name, mysterySetId: mysterySet.id, rows }];
  });

const guidanceRows = (reading: ReadingSnapshot, sourceId: string): readonly ReferenceUseRow[] =>
  guidanceStatementsOf(reading.catalog.rosary.guidance).flatMap((guidance: GuidanceStatement) =>
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
          : { trailing: sectionsLabel(reading, reference.sections) }),
      })),
  );

const toolRow = (source: DevotionalSource): ReferenceUseRow => ({
  action: {
    kind: ReferenceUseActionKind.OpenReference,
    target: apparatusReferenceTarget(source.id),
  },
  detail: [source.author, source.note].filter(Boolean).join(DETAIL_SEPARATOR),
  key: source.id,
  title: source.work,
  trailing: source.approval,
});

const markingRows = (
  sourceId: string,
  { notice, tools }: ResolvedToolMarking,
  action?: ReferenceUseAction,
): readonly ReferenceUseRow[] =>
  tools.some(({ id }) => id === sourceId)
    ? [
        { key: 'notice', title: notice, ...(action === undefined ? {} : { action }) },
        ...tools.filter(({ id }) => id !== sourceId).map(toolRow),
      ]
    : [];

const redLetterRows = (reading: ReadingSnapshot, sourceId: string): readonly ReferenceUseRow[] => {
  const { notice, tools, witnesses } = reading.catalog.bible.redLetter;

  return markingRows(
    sourceId,
    { notice, tools: [...witnesses, ...tools] },
    { kind: ReferenceUseActionKind.OpenBible },
  );
};

const aiTranslationRows = (
  reading: ReadingSnapshot,
  sourceId: string,
): readonly ReferenceUseRow[] =>
  reading.catalog.aiTranslation === null
    ? []
    : markingRows(sourceId, reading.catalog.aiTranslation);

const groupsOf = (
  reading: ReadingSnapshot,
  kind: ReferenceUseKind,
  sourceId: string,
): readonly ReferenceUseGroup[] => {
  switch (kind) {
    case ReferenceUseKind.Prayers:
      return flat(prayerRows(reading, (_, prayerSourceId) => prayerSourceId === sourceId));
    case ReferenceUseKind.Schedule:
      return flat(scheduleRows(reading, sourceId));
    case ReferenceUseKind.SeasonalSundays:
      return flat(seasonalRows(reading, sourceId));
    case ReferenceUseKind.SetNames:
      return flat(setNameRows(reading, sourceId));
    case ReferenceUseKind.Guidance:
      return flat(guidanceRows(reading, sourceId));
    case ReferenceUseKind.RedLetter:
      return flat(redLetterRows(reading, sourceId));
    case ReferenceUseKind.AiTranslation:
      return flat(aiTranslationRows(reading, sourceId));
    default:
      return mysteryGroups(reading, (mystery) => mysterySourceOf(mystery, kind) === sourceId, kind);
  }
};

const sectionsOf = (
  entries: readonly (readonly [ReferenceUseKind, readonly ReferenceUseGroup[]])[],
): readonly ReferenceUseSection[] =>
  entries.filter(([, groups]) => groups.length > 0).map(([kind, groups]) => ({ groups, kind }));

export const usesOfSource = (
  reading: ReadingSnapshot,
  sourceId: string,
): readonly ReferenceUseSection[] => {
  const sections = sectionsOf(
    Object.values(ReferenceUseKind).map((kind) => [kind, groupsOf(reading, kind, sourceId)]),
  );
  const namesMysteries = sections.some(({ kind }) => kind === ReferenceUseKind.MysteryNames);

  return namesMysteries
    ? sections.filter(({ kind }) => kind !== ReferenceUseKind.SetNames)
    : sections;
};

export const usesOfArtwork = (
  reading: ReadingSnapshot,
  artworkId: string,
): readonly ReferenceUseSection[] => {
  const stagePrayerIds = Object.entries(reading.catalog.rosary.prayerStageArt)
    .filter(([, pool]) => pool.some(({ id }) => id === artworkId))
    .map(([prayerId]) => prayerId);

  return sectionsOf([
    [
      ReferenceUseKind.Mysteries,
      mysteryGroups(
        reading,
        (mystery) => mystery.artworks.some(({ id }) => id === artworkId),
        ReferenceUseKind.Mysteries,
        artworkId,
      ),
    ],
    [
      ReferenceUseKind.Prayers,
      flat(prayerRows(reading, (prayerId) => stagePrayerIds.includes(prayerId), artworkId)),
    ],
  ]);
};
