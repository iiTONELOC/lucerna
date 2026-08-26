import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import {
  activeTargetOf,
  nearestAnchorOf,
  beadSlotsOf,
  BeadKind,
  createDrapeGeometry,
  PENDANT_BEAD_COUNT,
  type ChainSpan,
  type DrapeGeometry,
} from './drape.ts';
import {
  createProgression,
  DEFAULT_ROSARY_OPTIONS,
  nonBeadAnchorsOf,
  StepAnchor,
  StepArchetype,
} from './progression.ts';

const ROSARY_BEAD_COUNT = 59;
const LOOP_BEAD_COUNT = 54;
const MIN_CANONICAL_ASPECT_RATIO = 1.2;
const MAX_CANONICAL_ASPECT_RATIO = 1.35;
const OUR_FATHER_BEAD_INDEXES: readonly number[] = [0, 4, 15, 26, 37, 48];
const GAP_TOLERANCE = 0.5;
const OFF_CORD_OFFSET = 3;

const mysterySet = contentCatalog.rosary.mysterySets[0];

if (mysterySet === undefined) {
  throw new RangeError('Rosary catalog must contain a mystery set');
}

const progression = createProgression(
  mysterySet,
  contentCatalog.rosary.guidance,
  DEFAULT_ROSARY_OPTIONS,
);
const slots = beadSlotsOf(progression);

const geometry = (): DrapeGeometry => createDrapeGeometry(slots);

const requireChainSpan = (
  target: ReturnType<typeof activeTargetOf>,
  kind: StepAnchor.ChainLeading | StepAnchor.ChainTrailing,
): ChainSpan => {
  if (target.kind !== kind) {
    throw new TypeError('Prayer step must resolve to the expected chain span');
  }

  return target.span;
};

describe('createDrapeGeometry', () => {
  test('places every physical rosary bead exactly once', () => {
    const drape = geometry();

    expect(drape.beads).toHaveLength(ROSARY_BEAD_COUNT);
    expect(new Set(drape.beads.map((bead) => bead.beadIndex)).size).toBe(ROSARY_BEAD_COUNT);
  });

  test('keeps the complete geometry canonical and naturally proportioned', () => {
    const first = geometry();
    const second = geometry();
    const aspectRatio = first.viewBox.width / first.viewBox.height;

    expect(second).toEqual(first);
    expect(aspectRatio).toBeGreaterThan(MIN_CANONICAL_ASPECT_RATIO);
    expect(aspectRatio).toBeLessThan(MAX_CANONICAL_ASPECT_RATIO);
  });

  test('places five opening beads on the pendant and 54 decade beads on the loop', () => {
    const drape = geometry();

    expect(drape.beads.slice(0, PENDANT_BEAD_COUNT)).toHaveLength(PENDANT_BEAD_COUNT);
    expect(drape.beads.slice(PENDANT_BEAD_COUNT)).toHaveLength(LOOP_BEAD_COUNT);
  });

  test('puts every Our Father bead at its physical position on the strand', () => {
    const found = geometry()
      .beads.filter((bead) => bead.kind === BeadKind.OurFather)
      .map((bead) => bead.beadIndex);

    expect(found).toEqual([...OUR_FATHER_BEAD_INDEXES]);
  });
});

describe('drape chain', () => {
  test('leaves one constant gap between the exteriors of neighbouring loop beads', () => {
    const loop = geometry().beads.slice(PENDANT_BEAD_COUNT);
    const adjacent: number[] = [];
    const spaced: number[] = [];

    for (let index = 1; index < loop.length; index += 1) {
      const before = loop[index - 1];
      const after = loop[index];

      if (before === undefined || after === undefined) {
        throw new TypeError('Loop must expose every neighbouring bead pair');
      }

      const gap =
        Math.hypot(after.center.x - before.center.x, after.center.y - before.center.y) -
        before.radius -
        after.radius;

      if (before.kind === BeadKind.OurFather || after.kind === BeadKind.OurFather) {
        spaced.push(gap);
      } else {
        adjacent.push(gap);
      }
    }

    expect(Math.max(...adjacent) - Math.min(...adjacent)).toBeLessThan(GAP_TOLERANCE);
    expect(Math.max(...spaced) - Math.min(...spaced)).toBeLessThan(GAP_TOLERANCE);
    expect(Math.min(...spaced)).toBeGreaterThan(Math.max(...adjacent));
  });

  test('draws every chain gap as its own segment carrying a whole link count', () => {
    const segments = geometry().chainSegments;

    expect(segments.length).toBeGreaterThan(0);
    expect(new Set(segments.map((segment) => `${segment.region}-${segment.ordinal}`)).size).toBe(
      segments.length,
    );

    segments.forEach((segment) => {
      expect(segment.linkCount).toBeGreaterThan(0);
      expect(Number.isInteger(segment.linkCount)).toBe(true);
      expect(segment.length).toBeGreaterThan(0);
    });
  });
});

describe('activeTargetOf', () => {
  test('uses the full cord for prayers said between beads', () => {
    const drape = geometry();
    const trailingStep = progression.steps.find(
      (step) =>
        step.archetype === StepArchetype.FramedPrayer &&
        step.decade === 1 &&
        step.anchor.kind === StepAnchor.ChainTrailing,
    );

    expect(trailingStep).toBeDefined();

    if (trailingStep === undefined || trailingStep.anchor.kind !== StepAnchor.ChainTrailing) {
      throw new TypeError('Progression must contain a decade chain step');
    }

    const trailing = requireChainSpan(
      activeTargetOf(drape, trailingStep.anchor),
      StepAnchor.ChainTrailing,
    );
    const from = drape.beads[trailingStep.anchor.fromBeadIndex ?? -1];
    const to = drape.beads[trailingStep.anchor.toBeadIndex ?? -1];

    if (from === undefined || to === undefined) {
      throw new TypeError('Chain step must be bounded by both beads');
    }

    expect(
      Math.hypot(trailing.from.x - from.center.x, trailing.from.y - from.center.y),
    ).toBeCloseTo(from.radius);
    expect(Math.hypot(trailing.to.x - to.center.x, trailing.to.y - to.center.y)).toBeCloseTo(
      to.radius,
    );
  });
});

describe('nearestAnchorOf', () => {
  test('a point on a bead centre selects that bead', () => {
    const drape = geometry();
    const anchors = nonBeadAnchorsOf(progression);

    drape.beads.forEach((bead) => {
      expect(nearestAnchorOf(drape, anchors, bead.center)).toEqual({
        kind: StepAnchor.Bead,
        beadIndex: bead.beadIndex,
      });
    });
  });

  test('a point beside a bead still selects that bead', () => {
    const drape = geometry();
    const anchors = nonBeadAnchorsOf(progression);
    const bead = drape.beads[LOOP_BEAD_COUNT];

    if (bead === undefined) {
      throw new TypeError('Drape must place the sampled bead');
    }

    const strayed = { x: bead.center.x + OFF_CORD_OFFSET, y: bead.center.y + OFF_CORD_OFFSET };

    expect(nearestAnchorOf(drape, anchors, strayed)).toEqual({
      kind: StepAnchor.Bead,
      beadIndex: bead.beadIndex,
    });
  });

  test('a point on the crucifix selects the crucifix, not a bead', () => {
    const drape = geometry();
    const anchors = nonBeadAnchorsOf(progression);

    expect(nearestAnchorOf(drape, anchors, drape.crucifix.center)).toEqual({
      kind: StepAnchor.Crucifix,
    });
  });

  test('a point on the centerpiece selects the centerpiece, not a bead', () => {
    const drape = geometry();
    const anchors = nonBeadAnchorsOf(progression);

    expect(nearestAnchorOf(drape, anchors, drape.centerpiece.center)).toEqual({
      kind: StepAnchor.Centerpiece,
    });
  });
});
