import type { CSSProperties } from 'react';
import { RosaryDisplay } from '../../state/preferences/model.ts';
import type { DrapeProps } from './prayerSession.ts';
import {
  ChainRegion,
  LINK_LENGTH,
  linkCountBetween,
  PATH_PRECISION,
  SPACED_LINK_COUNT,
  VIEWBOX_PAD,
  type ActiveTarget,
  type ChainSegment,
  type DrapeGeometry,
  type PlacedBead,
} from './drape.ts';
import { StepAnchor, type StepAnchorPoint } from './progression.ts';

export type StrandGeometry = Pick<DrapeGeometry, 'beads' | 'chainSegments' | 'viewBox'>;

const LEAD_LENGTH = SPACED_LINK_COUNT * LINK_LENGTH;

const straightSegment = (
  from: number,
  to: number,
  level: number,
  linkCount: number,
): ChainSegment => {
  const y = level.toFixed(PATH_PRECISION);

  return {
    length: to - from,
    linkCount,
    ordinal: 0,
    path: `M${from.toFixed(PATH_PRECISION)},${y} L${to.toFixed(PATH_PRECISION)},${y}`,
    region: ChainRegion.LoopSpan,
  };
};

export const decadeStrandOf = (
  geometry: DrapeGeometry,
  decade: number | undefined,
): StrandGeometry => {
  const strand = geometry.beads.filter((bead) => bead.decade === decade);
  const level = Math.max(...strand.map(({ radius }) => radius));
  const beads: PlacedBead[] = [];
  const chainSegments = [straightSegment(0, LEAD_LENGTH, level, SPACED_LINK_COUNT)];
  let cursor = LEAD_LENGTH;

  strand.forEach((bead, index) => {
    const previous = strand[index - 1];

    if (previous !== undefined) {
      const links = linkCountBetween(previous.kind, bead.kind);
      chainSegments.push(straightSegment(cursor, cursor + links * LINK_LENGTH, level, links));
      cursor += links * LINK_LENGTH;
    }

    beads.push({ ...bead, center: { x: cursor + bead.radius, y: level } });
    cursor += bead.radius * 2;
  });

  chainSegments.push(straightSegment(cursor, cursor + LEAD_LENGTH, level, SPACED_LINK_COUNT));

  return {
    beads,
    chainSegments,
    viewBox: {
      height: level * 2 + VIEWBOX_PAD * 2,
      width: cursor + LEAD_LENGTH + VIEWBOX_PAD * 2,
      x: -VIEWBOX_PAD,
      y: -VIEWBOX_PAD,
    },
  };
};

const edgeSpan = (strand: StrandGeometry, leading: boolean): ActiveTarget | null => {
  const bead = leading ? strand.beads[0] : strand.beads.at(-1);

  if (bead === undefined) {
    return null;
  }

  const y = bead.center.y;
  const span = leading
    ? { from: { x: 0, y }, radius: bead.radius, to: { x: bead.center.x - bead.radius, y } }
    : {
        from: { x: bead.center.x + bead.radius, y },
        radius: bead.radius,
        to: { x: bead.center.x + bead.radius + LEAD_LENGTH, y },
      };

  return leading
    ? { kind: StepAnchor.ChainLeading, span }
    : { kind: StepAnchor.ChainTrailing, span };
};

export const strandTargetOf = (
  strand: StrandGeometry,
  anchor: StepAnchorPoint,
): ActiveTarget | null => {
  switch (anchor.kind) {
    case StepAnchor.Bead: {
      const bead = strand.beads.find(({ beadIndex }) => beadIndex === anchor.beadIndex);

      return bead === undefined
        ? null
        : {
            beadIndex: bead.beadIndex,
            kind: StepAnchor.Bead,
            marker: { center: bead.center, radius: bead.radius },
          };
    }
    case StepAnchor.ChainLeading:
      return anchor.toBeadIndex === strand.beads[0]?.beadIndex ? edgeSpan(strand, true) : null;
    case StepAnchor.ChainTrailing:
      return anchor.fromBeadIndex === strand.beads.at(-1)?.beadIndex
        ? edgeSpan(strand, false)
        : null;
    default:
      return null;
  }
};

type StrandStyle = CSSProperties & {
  readonly '--strand-clearance': string;
  readonly '--strand-natural-width': string;
};

const STRAND_NONE: StrandStyle = { '--strand-clearance': '0px', '--strand-natural-width': '0px' };

export const decadeViewOf = (drape: DrapeProps): boolean =>
  drape.display === RosaryDisplay.CurrentDecade;

export const strandStyleOf = (drape: DrapeProps): StrandStyle => {
  if (!decadeViewOf(drape)) {
    return STRAND_NONE;
  }

  const { viewBox } = decadeStrandOf(drape.geometry, drape.decade);
  const ratio = String(viewBox.height / viewBox.width);

  return {
    '--strand-clearance': `calc(min(100cqw - 2rem, ${String(viewBox.width)}px) * ${ratio} + 1rem)`,
    '--strand-natural-width': `${String(viewBox.width)}px`,
  };
};
