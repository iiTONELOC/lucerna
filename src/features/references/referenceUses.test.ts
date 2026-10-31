import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import { artworkPlanFor, featuring } from '../prayer/artworkPlan.ts';
import {
  createProgression,
  PrayerId,
  PrayerStartKind,
  StepArchetype,
  stepIndexForStart,
} from '../prayer/progression.ts';
import {
  ReferenceUseActionKind,
  ReferenceUseKind,
  usesOfArtwork,
  usesOfSource,
} from './referenceUses.ts';

const requiredFirstSet = () => {
  const mysterySet = contentCatalog.rosary.mysterySets[0];

  if (mysterySet === undefined) {
    throw new RangeError('Catalog must contain a mystery set');
  }

  return mysterySet;
};

const firstSet = requiredFirstSet();
const firstMystery = firstSet.mysteries[0];

const sectionOf = (sections: ReturnType<typeof usesOfSource>, kind: ReferenceUseKind) =>
  sections.find((section) => section.kind === kind);

const progressionOfFirstSet = () =>
  createProgression(firstSet, contentCatalog.rosary.guidance, { includeFatimaPrayer: true });

describe('where Lucerna uses a source', () => {
  test('lists a prayer and opens the prayer at that step', () => {
    const ourFather = contentCatalog.prayers.find(({ id }) => id === PrayerId.OurFather);
    const prayers = sectionOf(usesOfSource(ourFather?.sourceId ?? ''), ReferenceUseKind.Prayers);
    const row = prayers?.groups[0]?.rows.find(({ title }) => title === ourFather?.title);

    expect(row?.action).toEqual({
      kind: ReferenceUseActionKind.Pray,
      start: { kind: PrayerStartKind.Prayer, prayerId: PrayerId.OurFather },
    });
  });

  test('groups mystery fruits by mystery set with the fruit line', () => {
    const fruits = sectionOf(
      usesOfSource(firstMystery?.fruitSourceId ?? ''),
      ReferenceUseKind.Fruits,
    );

    expect(fruits?.groups.map(({ mysterySetId }) => mysterySetId)).toEqual(
      contentCatalog.rosary.mysterySets.map(({ id }) => id),
    );
    expect(fruits?.groups[0]?.rows[0]?.detail).toBe(
      `Fruit of the Mystery · ${firstMystery?.fruit ?? ''}`,
    );
  });

  test('shows the set for each weekday of the schedule', () => {
    const schedule = contentCatalog.rosary.schedule;
    const rows = sectionOf(usesOfSource(schedule.sourceId), ReferenceUseKind.Schedule)?.groups[0]
      ?.rows;

    expect(rows?.[0]?.title).toBe('Sunday');
    expect(rows?.[0]?.action).toEqual({
      kind: ReferenceUseActionKind.ShowSet,
      mysterySetId: schedule.sunday,
    });
  });

  test('opens the prayer at the guidance a row cites', () => {
    const guidance = contentCatalog.rosary.guidance.decadeHailMarys;
    const sourceId = guidance.sourceRefs[0]?.sourceId ?? '';
    const row = sectionOf(usesOfSource(sourceId), ReferenceUseKind.Guidance)?.groups[0]?.rows.find(
      ({ detail }) => detail === guidance.text,
    );

    if (row?.action?.kind !== ReferenceUseActionKind.Pray) {
      throw new TypeError('A guidance row must open the prayer');
    }

    const progression = progressionOfFirstSet();
    const step = progression.steps[stepIndexForStart(progression, row.action.start)];

    expect(step?.archetype).toBe(StepArchetype.CountedRepetition);
    expect(step?.decade).toBe(1);
  });
});

describe('where Lucerna uses an artwork', () => {
  test('lists the mystery it belongs to and features it when prayed', () => {
    const artwork = firstMystery?.artworks[0];

    if (artwork === undefined) {
      throw new RangeError('A mystery must carry an artwork');
    }

    const mysteries = sectionOf(usesOfArtwork(artwork.id), ReferenceUseKind.Mysteries);

    expect(mysteries?.groups[0]?.mysterySetId).toBe(firstSet.id);
    expect(mysteries?.groups[0]?.rows[0]?.action).toEqual({
      kind: ReferenceUseActionKind.Pray,
      mysterySetId: firstSet.id,
      start: { decade: 1, featuredArtworkId: artwork.id, kind: PrayerStartKind.Mystery },
    });
  });
});

describe('opening the prayer at a use', () => {
  test('starts at the cited mystery announcement', () => {
    const progression = progressionOfFirstSet();
    const step =
      progression.steps[
        stepIndexForStart(progression, { decade: 3, kind: PrayerStartKind.Mystery })
      ];

    expect(step?.archetype).toBe(StepArchetype.MysteryAnnouncement);
    expect(step?.decade).toBe(3);
  });

  test('shows the featured artwork on every step of its mystery', () => {
    const progression = progressionOfFirstSet();
    const artwork = firstMystery?.artworks.at(-1);
    const plan = featuring(artworkPlanFor(progression), progression, {
      decade: 1,
      featuredArtworkId: artwork?.id ?? '',
      kind: PrayerStartKind.Mystery,
    });
    const decadeArtworkIds = progression.steps.flatMap((step, index) =>
      step.decade === 1 &&
      (step.archetype === StepArchetype.MysteryAnnouncement ||
        step.prayerId === PrayerId.HailMary ||
        step.prayerId === PrayerId.OurFather)
        ? [plan[index]?.id]
        : [],
    );

    expect(decadeArtworkIds.length).toBeGreaterThan(0);
    expect(new Set(decadeArtworkIds)).toEqual(new Set([artwork?.id]));
  });
});
