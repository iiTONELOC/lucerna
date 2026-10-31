import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import { decadeStrandOf, strandTargetOf } from './decadeStrand.ts';
import { BeadKind, beadSlotsOf, createDrapeGeometry } from './drape.ts';
import { createProgression, StepAnchor } from './progression.ts';

const DECADE_BEADS = 11;
const mysterySet = contentCatalog.rosary.mysterySets[0];

if (mysterySet === undefined) {
  throw new RangeError('Catalog must contain a mystery set');
}

const geometry = createDrapeGeometry(
  beadSlotsOf(
    createProgression(mysterySet, contentCatalog.rosary.guidance, { includeFatimaPrayer: true }),
  ),
);

describe('current decade strand', () => {
  test('lays the decade Our Father and ten Hail Marys on one line in order', () => {
    const strand = decadeStrandOf(geometry, 2);
    const xs = strand.beads.map(({ center }) => center.x);

    expect(strand.beads).toHaveLength(DECADE_BEADS);
    expect(strand.beads[0]?.kind).toBe(BeadKind.OurFather);
    expect(new Set(strand.beads.map(({ center }) => center.y)).size).toBe(1);
    expect(xs).toEqual([...xs].sort((left, right) => left - right));
    expect(strand.beads.map(({ beadIndex }) => beadIndex)).toEqual(
      geometry.beads.filter(({ decade }) => decade === 2).map(({ beadIndex }) => beadIndex),
    );
  });

  test('lays the pendant beads outside a decade', () => {
    expect(decadeStrandOf(geometry, undefined).beads.map(({ decade }) => decade)).toEqual(
      geometry.beads.filter(({ decade }) => decade === undefined).map(({ decade }) => decade),
    );
  });

  test('lights the current bead on the strand and nothing off it', () => {
    const strand = decadeStrandOf(geometry, 1);
    const bead = strand.beads[3];

    if (bead === undefined) {
      throw new RangeError('A decade strand must carry eleven beads');
    }

    expect(strandTargetOf(strand, { beadIndex: bead.beadIndex, kind: StepAnchor.Bead })).toEqual({
      beadIndex: bead.beadIndex,
      kind: StepAnchor.Bead,
      marker: { center: bead.center, radius: bead.radius },
    });
    expect(strandTargetOf(strand, { kind: StepAnchor.Crucifix })).toBeNull();
  });
});
