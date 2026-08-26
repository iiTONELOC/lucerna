import { describe, expect, test } from 'bun:test';
import { contentCatalog, type ResolvedMysterySet } from '../../content/catalog.ts';
import type { RosaryGuidance } from '../../content/schema.ts';
import {
  advance,
  beadIndexOf,
  createProgression,
  currentStep,
  DEFAULT_ROSARY_OPTIONS,
  isAtEnd,
  isAtStart,
  jumpTo,
  nonBeadAnchorsOf,
  PrayerId,
  ProgressionError,
  ProgressionErrorCode,
  retreat,
  SilentStepId,
  StepAnchor,
  StepArchetype,
  stepAt,
  stepIndexForAnchor,
  stepIndexForBead,
  type ChainAnchor,
  type PrayerStep,
  type Progression,
} from './progression.ts';

const TOTAL_STEPS_WITH_FATIMA = 80;
const TOTAL_STEPS_WITHOUT_FATIMA = 75;
const TOTAL_BEADS = 59;
const NON_BEAD_TARGETS = 8;
const FIRST_DECADE_OUR_FATHER_BEAD = 4;
const LAST_OPENING_HAIL_MARY_BEAD = 3;
const LAST_BEAD = 58;

const guidance = contentCatalog.rosary.guidance;

const mysterySetFixture = (): ResolvedMysterySet => {
  const [mysterySet] = contentCatalog.rosary.mysterySets;

  if (mysterySet === undefined) {
    throw new ProgressionError(ProgressionErrorCode.EmptyMysterySet);
  }

  return mysterySet;
};

const progressionFixture = (): Progression =>
  createProgression(mysterySetFixture(), guidance, DEFAULT_ROSARY_OPTIONS);

const progressionWithoutFatima = (): Progression =>
  createProgression(mysterySetFixture(), guidance, { includeFatimaPrayer: false });

const stepsOfArchetype = (progression: Progression, archetype: StepArchetype): PrayerStep[] =>
  progression.steps.filter((step) => step.archetype === archetype);

const chainAnchorAt = (progression: Progression, index: number): ChainAnchor => {
  const anchor = stepAt(progression, index).anchor;

  if (anchor.kind !== StepAnchor.ChainLeading && anchor.kind !== StepAnchor.ChainTrailing) {
    throw new ProgressionError(ProgressionErrorCode.StepIndexOutOfRange);
  }

  return anchor;
};

describe('createProgression', () => {
  test('builds every step the official sequence calls for, Fatima included', () => {
    expect(progressionFixture().steps).toHaveLength(TOTAL_STEPS_WITH_FATIMA);
  });

  test('omits only the Fatima prayers when the option is off', () => {
    const withoutFatima = progressionWithoutFatima();

    expect(withoutFatima.steps).toHaveLength(TOTAL_STEPS_WITHOUT_FATIMA);
    expect(
      withoutFatima.steps.some(
        (step) =>
          step.archetype === StepArchetype.FramedPrayer && step.prayerId === PrayerId.FatimaPrayer,
      ),
    ).toBe(false);
  });

  test('anchors the 59 prayers and five mystery announcements to beads', () => {
    for (const progression of [progressionFixture(), progressionWithoutFatima()]) {
      const beadSteps = progression.steps.filter((step) => step.anchor.kind === StepAnchor.Bead);

      expect(beadSteps).toHaveLength(TOTAL_BEADS + 5);
      expect(progression.stepIndexByBead).toHaveLength(TOTAL_BEADS);
    }
  });

  test('assigns bead indices in prayed order with no gaps', () => {
    const progression = progressionFixture();
    const beadIndices = progression.steps
      .map((step) => beadIndexOf(step))
      .filter((beadIndex) => beadIndex !== undefined);

    expect([...new Set(beadIndices)]).toEqual(
      Array.from({ length: TOTAL_BEADS }, (_, index) => index),
    );
    expect(
      beadIndices.filter((beadIndex) => beadIndex === FIRST_DECADE_OUR_FATHER_BEAD),
    ).toHaveLength(2);
  });

  test('splits the sequence into the four archetypes in their sourced proportions', () => {
    const progression = progressionFixture();

    expect(stepsOfArchetype(progression, StepArchetype.Silent)).toHaveLength(5);
    expect(stepsOfArchetype(progression, StepArchetype.CountedRepetition)).toHaveLength(53);
    expect(stepsOfArchetype(progression, StepArchetype.MysteryAnnouncement)).toHaveLength(5);
    expect(stepsOfArchetype(progression, StepArchetype.FramedPrayer)).toHaveLength(17);
  });
});

describe('createProgression validation', () => {
  test('rejects a mystery set with no mysteries rather than building a short rosary', () => {
    const emptySet: ResolvedMysterySet = { ...mysterySetFixture(), mysteries: [] };

    expect(() => createProgression(emptySet, guidance, DEFAULT_ROSARY_OPTIONS)).toThrow(
      ProgressionError,
    );
  });
});

describe('silent steps', () => {
  test('the silent steps are exactly the ones the content declares silent', () => {
    const progression = progressionFixture();
    const silentIds = progression.steps
      .filter((step) => step.archetype === StepArchetype.Silent)
      .map((step) => step.silentStepId);

    expect(new Set<string>(silentIds)).toEqual(new Set(guidance.silentSteps));
  });

  test('silent steps carry no guidance and every other step carries some', () => {
    for (const step of progressionFixture().steps) {
      if (step.archetype === StepArchetype.Silent) {
        expect(step.guidance).toBeUndefined();
      } else {
        expect(step.guidance.text.length).toBeGreaterThan(0);
      }
    }
  });

  test('refuses to build when the content and the declared silent steps disagree', () => {
    const drifted: RosaryGuidance = { ...guidance, silentSteps: [SilentStepId.ApostlesCreed] };

    expect(() => createProgression(mysterySetFixture(), drifted, DEFAULT_ROSARY_OPTIONS)).toThrow(
      ProgressionError,
    );
  });
});

describe('mystery announcements', () => {
  test('announces the five mysteries in ordinal order', () => {
    const announcements = progressionFixture().steps.filter(
      (step) => step.archetype === StepArchetype.MysteryAnnouncement,
    );

    expect(announcements.map((step) => step.mystery.ordinal)).toEqual([1, 2, 3, 4, 5]);
    expect(announcements.map((step) => step.mystery.title)).toEqual(
      mysterySetFixture().mysteries.map((mystery) => mystery.title),
    );
  });

  test('places each announcement on its own decade Our Father bead', () => {
    const progression = progressionFixture();

    progression.steps.forEach((step, index) => {
      if (step.archetype !== StepArchetype.MysteryAnnouncement) {
        return;
      }

      const next = stepAt(progression, index + 1);

      expect(next.archetype).toBe(StepArchetype.FramedPrayer);
      expect(next.decade).toBe(step.decade);
      expect(next.anchor.kind).toBe(StepAnchor.Bead);
      expect(next.anchor).toEqual(step.anchor);
    });
  });
});

describe('decade Hail Mary guidance', () => {
  test('names the mystery being meditated with the leading article lowercased', () => {
    const progression = progressionFixture();
    const firstMystery = mysterySetFixture().mysteries[0];
    const decadeHailMary = progression.steps.find(
      (step) => step.archetype === StepArchetype.CountedRepetition && step.decade === 1,
    );

    expect(firstMystery).toBeDefined();
    expect(decadeHailMary?.guidance?.text).toBe(
      `Meditate on the ${firstMystery?.title.replace('The ', '')} while praying these ten Hail Marys.`,
    );
  });

  test('leaves no placeholder unresolved on any step', () => {
    for (const step of progressionFixture().steps) {
      expect(step.guidance?.text ?? '').not.toContain('{mystery}');
    }
  });

  test('refuses to build when the guidance template loses its placeholder', () => {
    const drifted: RosaryGuidance = {
      ...guidance,
      decadeHailMarys: { ...guidance.decadeHailMarys, text: 'Meditate while praying.' },
    };

    expect(() => createProgression(mysterySetFixture(), drifted, DEFAULT_ROSARY_OPTIONS)).toThrow(
      ProgressionError,
    );
  });
});

describe('chain anchors', () => {
  test('bounds the opening Glory Be by the last opening bead and first decade bead', () => {
    const progression = progressionFixture();
    const openingGloryBe = progression.steps.findIndex(
      (step) => step.archetype === StepArchetype.Silent && step.prayerId === PrayerId.GloryBe,
    );
    const anchor = chainAnchorAt(progression, openingGloryBe);

    expect(anchor.kind).toBe(StepAnchor.ChainTrailing);
    expect(anchor.fromBeadIndex).toBe(LAST_OPENING_HAIL_MARY_BEAD);
    expect(anchor.toBeadIndex).toBe(FIRST_DECADE_OUR_FATHER_BEAD);
  });

  test('anchors the first announcement to the first decade Our Father bead', () => {
    const progression = progressionFixture();
    const firstAnnouncement = progression.steps.findIndex(
      (step) => step.archetype === StepArchetype.MysteryAnnouncement,
    );
    const anchor = stepAt(progression, firstAnnouncement).anchor;

    expect(anchor).toEqual({
      kind: StepAnchor.Bead,
      beadIndex: FIRST_DECADE_OUR_FATHER_BEAD,
    });
  });
});

describe('decade chain anchors', () => {
  test('rests the Glory Be and the Fatima prayer on the same link, as the beads do', () => {
    const progression = progressionFixture();
    const trailing = progression.steps
      .filter((step) => step.archetype === StepArchetype.FramedPrayer)
      .filter((step) => step.decade === 1 && step.anchor.kind === StepAnchor.ChainTrailing);

    expect(trailing).toHaveLength(2);
    expect(trailing.map((step) => step.prayerId)).toEqual([
      PrayerId.GloryBe,
      PrayerId.FatimaPrayer,
    ]);
    expect(trailing[0]?.anchor).toEqual(trailing[1]?.anchor);
  });

  test('bounds the final decade trailing link by the centerpiece, not a bead', () => {
    const progression = progressionFixture();
    const lastTrailing = progression.steps.findLastIndex(
      (step) => step.anchor.kind === StepAnchor.ChainTrailing,
    );
    const anchor = chainAnchorAt(progression, lastTrailing);

    expect(anchor.fromBeadIndex).toBe(LAST_BEAD);
    expect(anchor.toBeadIndex).toBeUndefined();
  });
});

describe('closing steps', () => {
  test('ends with Hail Holy Queen, the final prayer, and one Sign of the Cross', () => {
    const closing = progressionFixture().steps.slice(-3);
    const [hailHolyQueen, finalPrayer, signOfTheCross] = closing;

    expect(closing).toHaveLength(3);

    if (
      hailHolyQueen?.archetype !== StepArchetype.FramedPrayer ||
      finalPrayer?.archetype !== StepArchetype.FramedPrayer ||
      signOfTheCross?.archetype !== StepArchetype.Silent
    ) {
      throw new Error('Unexpected closing sequence');
    }

    expect(hailHolyQueen.prayerId).toBe(PrayerId.HailHolyQueen);
    expect(hailHolyQueen.anchor.kind).toBe(StepAnchor.Centerpiece);
    expect(finalPrayer.prayerId).toBe(PrayerId.ClosingPrayer);
    expect(finalPrayer.anchor.kind).toBe(StepAnchor.Crucifix);
    expect(signOfTheCross.prayerId).toBe(PrayerId.SignOfTheCross);
    expect(signOfTheCross.anchor.kind).toBe(StepAnchor.Crucifix);
  });

  test('ends at the crucifix with the Sign of the Cross both sources require', () => {
    const progression = progressionFixture();
    const last = stepAt(progression, progression.steps.length - 1);
    const silentSteps = progression.steps.filter((step) => step.archetype === StepArchetype.Silent);

    expect(last.archetype).toBe(StepArchetype.Silent);
    expect(last.anchor.kind).toBe(StepAnchor.Crucifix);
    expect(silentSteps.at(-1)?.silentStepId).toBe(SilentStepId.ClosingSignOfTheCross);
    expect(silentSteps.at(-1)?.prayerId).toBe(PrayerId.SignOfTheCross);
  });

  test('prays the Hail Holy Queen at the centerpiece', () => {
    const hailHolyQueen = progressionFixture().steps.find(
      (step) =>
        step.archetype === StepArchetype.FramedPrayer && step.prayerId === PrayerId.HailHolyQueen,
    );

    expect(hailHolyQueen?.anchor.kind).toBe(StepAnchor.Centerpiece);
  });
});

describe('navigation', () => {
  test('clamps at the first step so retreating from the start cannot underflow', () => {
    const progression = progressionFixture();

    expect(isAtStart(progression)).toBe(true);
    expect(retreat(progression).index).toBe(0);
    expect(jumpTo(progression, -1).index).toBe(0);
  });

  test('clamps at the last step so advancing from the end cannot overflow', () => {
    const progression = jumpTo(progressionFixture(), TOTAL_STEPS_WITH_FATIMA);

    expect(isAtEnd(progression)).toBe(true);
    expect(progression.index).toBe(TOTAL_STEPS_WITH_FATIMA - 1);
    expect(advance(progression).index).toBe(TOTAL_STEPS_WITH_FATIMA - 1);
  });

  test('moves one step at a time without mutating the progression it was given', () => {
    const progression = progressionFixture();
    const moved = advance(progression);

    expect(progression.index).toBe(0);
    expect(moved.index).toBe(1);
    expect(currentStep(moved)).toBe(stepAt(progression, 1));
  });

  test('rejects a step index outside the sequence rather than clamping the lookup', () => {
    const progression = progressionFixture();

    expect(() => stepAt(progression, TOTAL_STEPS_WITH_FATIMA)).toThrow(ProgressionError);
    expect(() => stepAt(progression, -1)).toThrow(ProgressionError);
  });
});

describe('anchor navigation', () => {
  test('exposes each non-bead target once', () => {
    const anchors = nonBeadAnchorsOf(progressionFixture());

    expect(anchors).toHaveLength(NON_BEAD_TARGETS);
    expect(anchors.filter((anchor) => anchor.kind === StepAnchor.Crucifix)).toHaveLength(1);
    expect(anchors.filter((anchor) => anchor.kind === StepAnchor.Centerpiece)).toHaveLength(1);
  });

  test('selects the next prayer assigned to a target', () => {
    const progression = progressionFixture();
    const crucifix = stepAt(progression, 0).anchor;
    const firstTrailing = progression.steps.find(
      (step) => step.anchor.kind === StepAnchor.ChainTrailing,
    );

    expect(firstTrailing).toBeDefined();

    if (firstTrailing === undefined) {
      throw new TypeError('Progression must contain a trailing chain prayer');
    }

    const beyondOpening = progression.steps.findIndex(
      (step, stepIndex) => stepIndex > 10 && step.anchor.kind === StepAnchor.Crucifix,
    );

    expect(stepIndexForAnchor(jumpTo(progression, 10), crucifix)).toBe(beyondOpening);
    expect(stepIndexForAnchor(progression, firstTrailing.anchor)).toBe(
      progression.steps.indexOf(firstTrailing),
    );
  });

  test('rejects a target outside the progression', () => {
    const progression = progressionFixture();

    expect(() =>
      stepIndexForAnchor(progression, {
        kind: StepAnchor.Bead,
        beadIndex: TOTAL_BEADS,
      }),
    ).toThrow(ProgressionError);
  });
});

describe('anchor cycling', () => {
  test('cycles back to the first prayer once its target runs out', () => {
    const progression = progressionFixture();
    const closingIndex = progression.steps.findLastIndex(
      (step) => step.anchor.kind === StepAnchor.Crucifix,
    );
    const closing = jumpTo(progression, closingIndex);

    expect(stepIndexForAnchor(closing, currentStep(closing).anchor)).toBe(0);
  });

  test('steps through every prayer that shares one target', () => {
    const progression = progressionFixture();
    const gloryBe = progression.steps.findIndex(
      (step) => step.decade === 1 && step.anchor.kind === StepAnchor.ChainTrailing,
    );
    const anchor = stepAt(progression, gloryBe).anchor;

    expect(stepAt(progression, gloryBe + 1).anchor).toEqual(anchor);
    expect(stepIndexForAnchor(jumpTo(progression, gloryBe), anchor)).toBe(gloryBe + 1);
    expect(stepIndexForAnchor(jumpTo(progression, gloryBe + 1), anchor)).toBe(gloryBe);
  });

  test('steps from a mystery announcement to its Our Father on the shared bead', () => {
    const progression = progressionFixture();
    const announcement = progression.steps.findIndex(
      (step) => step.archetype === StepArchetype.MysteryAnnouncement,
    );
    const anchor = stepAt(progression, announcement).anchor;

    expect(stepIndexForAnchor(jumpTo(progression, announcement), anchor)).toBe(announcement + 1);
    expect(stepIndexForAnchor(jumpTo(progression, announcement + 1), anchor)).toBe(announcement);
  });
});

describe('bead navigation', () => {
  test('round trips every bead to the step that prays it and back', () => {
    const progression = progressionFixture();

    for (let beadIndex = 0; beadIndex < TOTAL_BEADS; beadIndex += 1) {
      const stepIndex = stepIndexForBead(progression, beadIndex);

      expect(beadIndexOf(stepAt(progression, stepIndex))).toBe(beadIndex);
    }
  });

  test('reports no bead for the steps prayed off the beads', () => {
    const progression = progressionFixture();
    const offBead = progression.steps.filter((step) => step.anchor.kind !== StepAnchor.Bead);

    expect(offBead).toHaveLength(TOTAL_STEPS_WITH_FATIMA - TOTAL_BEADS - 5);
    offBead.forEach((step) => expect(beadIndexOf(step)).toBeUndefined());
  });

  test('rejects a bead index outside the rosary', () => {
    const progression = progressionFixture();

    expect(() => stepIndexForBead(progression, TOTAL_BEADS)).toThrow(ProgressionError);
    expect(() => stepIndexForBead(progression, -1)).toThrow(ProgressionError);
  });
});

describe('prayer identities', () => {
  test('every declared prayer id resolves through the catalog', () => {
    for (const prayerId of Object.values(PrayerId)) {
      expect(contentCatalog.prayerById(prayerId).id).toBe(prayerId);
    }
  });

  test('the declared prayer ids are exactly the ones the rosary content lists', () => {
    expect(new Set<string>(Object.values(PrayerId))).toEqual(
      new Set(contentCatalog.rosary.prayerIds),
    );
  });
});
