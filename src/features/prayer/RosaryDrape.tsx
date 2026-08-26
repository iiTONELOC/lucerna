import { useId, useRef, type KeyboardEvent, type MouseEvent } from 'react';
import {
  activeTargetOf,
  BeadKind,
  CENTERPIECE_RING_SCALE,
  DrapeAlignment,
  nearestAnchorOf,
  type ActiveTarget,
  type ChainSegment,
  type ChainSpan,
  type DrapeGeometry,
  type Marker,
  type PlacedBead,
} from './drape.ts';
import { StepAnchor, type NonBeadAnchor, type StepAnchorPoint } from './progression.ts';

const CONTACT_BLUR = 1.5;
const GLOW_BLUR = 4;
const CONTACT_DROP_RATIO = 0.55;
const CONTACT_RADIUS_X_RATIO = 0.85;
const CONTACT_RADIUS_Y_RATIO = 0.35;
const CONTACT_OPACITY = 0.45;
const SPECULAR_OFFSET_RATIO = 0.34;
const SPECULAR_RISE_RATIO = 0.4;
const SPECULAR_RADIUS_X_RATIO = 0.24;
const SPECULAR_RADIUS_Y_RATIO = 0.17;
const SPECULAR_TILT = -25;
const CHAIN_SHADOW_WIDTH = 3.5;
const CHAIN_WIDTH = 2.5;
const DETAIL_STROKE_WIDTH = 0.75;
const LINK_FILL_RATIO = 0.46;
const BEAD_STROKE_OPACITY = 0.6;
const ACTIVE_BEAD_GROWTH = 2;
const ACTIVE_GLOW_OPACITY = 0.8;
const ACTIVE_LINK_WIDTH = 4.5;
const ACTIVE_LINK_OPACITY = 0.95;
const CENTERPIECE_INNER_RING = 0.72;
const CENTERPIECE_INNER_RING_Y = 0.86;
const CENTERPIECE_CORE_RING = 0.58;
const CENTERPIECE_CORE_RING_Y = 0.7;
const CRUCIFIX_STROKE_WIDTH = 12;
const CRUCIFIX_ARM_LENGTH = 40;
const CRUCIFIX_BAR_FRACTION = 3;
const CRUCIFIX_HIGHLIGHT_SCALE = 0.66;
const CRUCIFIX_RING_DIVISOR = 4;
const HALF = 2;

const HIT_STROKE_WIDTH = 9;
const TOUCH_TARGET_MINIMUM_PIXELS = 44;

const CRUCIFIX_RING_RADIUS = CRUCIFIX_STROKE_WIDTH / CRUCIFIX_RING_DIVISOR;

const BEAD_LABEL: Readonly<Record<BeadKind, string>> = {
  [BeadKind.OurFather]: 'Our Father',
  [BeadKind.HailMary]: 'Hail Mary',
};

const TARGET_LABEL: Readonly<Record<NonBeadAnchor['kind'], string>> = {
  [StepAnchor.Crucifix]: 'Crucifix',
  [StepAnchor.Centerpiece]: 'Centerpiece',
  [StepAnchor.ChainLeading]: 'Chain before the next bead',
  [StepAnchor.ChainTrailing]: 'Chain after the previous bead',
};

const HIT_CLASS_NAME =
  'pointer-events-auto cursor-pointer outline-none [-webkit-tap-highlight-color:transparent] focus-visible:outline-2 focus-visible:outline-accent';

const BEAD_CLASS_NAME =
  'pointer-events-none outline-none focus-visible:outline-2 focus-visible:outline-accent';

const selectOnKey =
  (select: () => void) =>
  (event: KeyboardEvent<SVGElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  };

type DrapeIds = {
  readonly bead: string;
  readonly unprayed: string;
  readonly active: string;
  readonly medal: string;
  readonly contact: string;
  readonly glow: string;
};

const drapeIdsFrom = (prefix: string): DrapeIds => ({
  bead: `${prefix}-bead`,
  unprayed: `${prefix}-unprayed`,
  active: `${prefix}-active`,
  medal: `${prefix}-medal`,
  contact: `${prefix}-contact`,
  glow: `${prefix}-glow`,
});

function DrapeDefs({ ids }: { readonly ids: DrapeIds }) {
  return (
    <defs>
      <radialGradient cx="50%" cy="50%" fx="33%" fy="30%" id={ids.bead} r="62%">
        <stop offset="0%" stopColor="var(--bead-light)" />
        <stop offset="22%" stopColor="var(--bead-light)" stopOpacity={0.85} />
        <stop offset="58%" stopColor="var(--bead-fill)" />
        <stop offset="100%" stopColor="var(--bead-dark)" />
      </radialGradient>
      <radialGradient cx="50%" cy="50%" fx="33%" fy="30%" id={ids.unprayed} r="62%">
        <stop offset="0%" stopColor="var(--bead-fill)" />
        <stop offset="58%" stopColor="var(--bead-dark)" />
        <stop offset="100%" stopColor="var(--theme-background)" />
      </radialGradient>
      <radialGradient cx="50%" cy="50%" fx="33%" fy="30%" id={ids.active} r="62%">
        <stop offset="0%" stopColor="var(--bead-active-core)" />
        <stop offset="28%" stopColor="var(--bead-active-core)" />
        <stop offset="72%" stopColor="var(--bead-active-mid)" />
        <stop offset="100%" stopColor="var(--bead-active-edge)" />
      </radialGradient>
      <linearGradient id={ids.medal} x1="0" x2="0" y1="0" y2="1">
        <stop offset="0%" stopColor="var(--bead-light)" />
        <stop offset="50%" stopColor="var(--bead-chain)" />
        <stop offset="100%" stopColor="var(--bead-light)" />
      </linearGradient>
      <filter height="180%" id={ids.contact} width="180%" x="-40%" y="-40%">
        <feGaussianBlur stdDeviation={CONTACT_BLUR} />
      </filter>
      <filter height="260%" id={ids.glow} width="260%" x="-80%" y="-80%">
        <feGaussianBlur stdDeviation={GLOW_BLUR} />
      </filter>
    </defs>
  );
}

function ChainLayer({ segments }: { readonly segments: readonly ChainSegment[] }) {
  return (
    <g aria-hidden="true" fill="none" strokeLinecap="round">
      {segments.map((segment) => {
        const period = segment.length / segment.linkCount;
        const dash = `${period * LINK_FILL_RATIO} ${period * (1 - LINK_FILL_RATIO)}`;

        return (
          <g key={`${segment.region}-${segment.ordinal}`}>
            <path
              d={segment.path}
              stroke="var(--chain-shadow)"
              strokeDasharray={dash}
              strokeWidth={CHAIN_SHADOW_WIDTH}
            />
            <path
              d={segment.path}
              stroke="var(--chain-fill)"
              strokeDasharray={dash}
              strokeWidth={CHAIN_WIDTH}
            />
            <path
              d={segment.path}
              stroke="var(--chain-light)"
              strokeDasharray={dash}
              strokeWidth={DETAIL_STROKE_WIDTH}
            />
          </g>
        );
      })}
    </g>
  );
}

function ContactShadows({
  beads,
  filterId,
}: {
  readonly beads: readonly PlacedBead[];
  readonly filterId: string;
}) {
  return (
    <g aria-hidden="true">
      {beads.map((bead) => (
        <ellipse
          cx={bead.center.x}
          cy={bead.center.y + bead.radius * CONTACT_DROP_RATIO}
          fill="var(--bead-dark)"
          filter={`url(#${filterId})`}
          key={`contact-${bead.beadIndex}`}
          opacity={CONTACT_OPACITY}
          rx={bead.radius * CONTACT_RADIUS_X_RATIO}
          ry={bead.radius * CONTACT_RADIUS_Y_RATIO}
        />
      ))}
    </g>
  );
}

function Speculars({ beads }: { readonly beads: readonly PlacedBead[] }) {
  return (
    <g aria-hidden="true">
      {beads.map((bead) => {
        const cx = bead.center.x - bead.radius * SPECULAR_OFFSET_RATIO;
        const cy = bead.center.y - bead.radius * SPECULAR_RISE_RATIO;

        return (
          <ellipse
            cx={cx}
            cy={cy}
            fill="var(--bead-specular)"
            key={`specular-${bead.beadIndex}`}
            opacity="var(--bead-specular-opacity)"
            rx={bead.radius * SPECULAR_RADIUS_X_RATIO}
            ry={bead.radius * SPECULAR_RADIUS_Y_RATIO}
            transform={`rotate(${SPECULAR_TILT} ${cx} ${cy})`}
          />
        );
      })}
    </g>
  );
}

function ActiveChainSpan({ span, glowId }: { readonly span: ChainSpan; readonly glowId: string }) {
  const ends = { x1: span.from.x, x2: span.to.x, y1: span.from.y, y2: span.to.y };

  return (
    <>
      <line
        filter={`url(#${glowId})`}
        opacity={ACTIVE_GLOW_OPACITY}
        stroke="var(--bead-active-glow)"
        strokeLinecap="round"
        strokeWidth={span.radius}
        {...ends}
      />
      <line
        opacity={ACTIVE_LINK_OPACITY}
        stroke="var(--bead-active-mid)"
        strokeLinecap="round"
        strokeWidth={ACTIVE_LINK_WIDTH}
        {...ends}
      />
    </>
  );
}

function ActiveHighlight({
  target,
  ids,
}: {
  readonly target: ActiveTarget;
  readonly ids: DrapeIds;
}) {
  if (target.kind === StepAnchor.Bead) {
    return (
      <circle
        cx={target.marker.center.x}
        cy={target.marker.center.y}
        fill="var(--bead-active-glow)"
        filter={`url(#${ids.glow})`}
        opacity={ACTIVE_GLOW_OPACITY}
        r={target.marker.radius + GLOW_BLUR}
      />
    );
  }

  if (target.kind === StepAnchor.ChainLeading || target.kind === StepAnchor.ChainTrailing) {
    return <ActiveChainSpan glowId={ids.glow} span={target.span} />;
  }

  return null;
}

type BeadLayerProps = {
  readonly beads: readonly PlacedBead[];
  readonly ids: DrapeIds;
  readonly activeBeadIndex: number | null;
  readonly prayedThroughBeadIndex: number;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
};

function BeadLayer(props: BeadLayerProps) {
  return (
    <>
      {props.beads.map((bead) => {
        const active = bead.beadIndex === props.activeBeadIndex;
        const prayed = bead.beadIndex <= props.prayedThroughBeadIndex;
        const resting = prayed ? props.ids.bead : props.ids.unprayed;
        const select = () => props.onSelect({ kind: StepAnchor.Bead, beadIndex: bead.beadIndex });

        return (
          <circle
            aria-current={active ? 'step' : undefined}
            aria-label={`${BEAD_LABEL[bead.kind]} bead ${bead.beadIndex + 1}`}
            className={BEAD_CLASS_NAME}
            cx={bead.center.x}
            cy={bead.center.y}
            fill={`url(#${active ? props.ids.active : resting})`}
            key={bead.beadIndex}
            onKeyDown={selectOnKey(select)}
            r={active ? bead.radius + ACTIVE_BEAD_GROWTH : bead.radius}
            role="button"
            stroke="var(--bead-dark)"
            strokeOpacity={BEAD_STROKE_OPACITY}
            strokeWidth={DETAIL_STROKE_WIDTH}
            tabIndex={active ? 0 : -1}
          />
        );
      })}
    </>
  );
}

function Centerpiece({
  marker,
  ids,
  active,
}: {
  readonly marker: Marker;
  readonly ids: DrapeIds;
  readonly active: boolean;
}) {
  const { center, radius } = marker;

  return (
    <g aria-hidden="true">
      <ellipse
        cx={center.x}
        cy={center.y}
        fill={`url(#${active ? ids.active : ids.medal})`}
        rx={radius}
        ry={radius * CENTERPIECE_RING_SCALE}
        stroke="var(--bead-dark)"
        strokeWidth={1}
      />
      <ellipse
        cx={center.x}
        cy={center.y}
        fill="none"
        opacity={0.7}
        rx={radius * CENTERPIECE_INNER_RING}
        ry={radius * CENTERPIECE_INNER_RING_Y}
        stroke="var(--bead-light)"
        strokeWidth={1}
      />
      <ellipse
        cx={center.x}
        cy={center.y}
        fill="none"
        opacity={0.5}
        rx={radius * CENTERPIECE_CORE_RING}
        ry={radius * CENTERPIECE_CORE_RING_Y}
        stroke="var(--bead-dark)"
        strokeWidth={DETAIL_STROKE_WIDTH}
      />
    </g>
  );
}

const latinCrossPath = (marker: Marker): string => {
  const { x } = marker.center;
  const top = marker.center.y - marker.radius;
  const height = marker.radius * HALF;
  const halfStem = CRUCIFIX_STROKE_WIDTH / HALF;
  const halfArm = CRUCIFIX_ARM_LENGTH / HALF;
  const bar = top + height / CRUCIFIX_BAR_FRACTION;

  return [
    `M${x - halfStem},${top}`,
    `L${x + halfStem},${top}`,
    `L${x + halfStem},${bar}`,
    `L${x + halfArm},${bar}`,
    `L${x + halfArm},${bar + CRUCIFIX_STROKE_WIDTH}`,
    `L${x + halfStem},${bar + CRUCIFIX_STROKE_WIDTH}`,
    `L${x + halfStem},${top + height}`,
    `L${x - halfStem},${top + height}`,
    `L${x - halfStem},${bar + CRUCIFIX_STROKE_WIDTH}`,
    `L${x - halfArm},${bar + CRUCIFIX_STROKE_WIDTH}`,
    `L${x - halfArm},${bar}`,
    `L${x - halfStem},${bar}`,
    'Z',
  ].join(' ');
};

function CrucifixMark({ marker, active }: { readonly marker: Marker; readonly active: boolean }) {
  const path = latinCrossPath(marker);
  const { center } = marker;

  return (
    <g aria-hidden="true">
      <circle
        cx={center.x}
        cy={center.y - marker.radius}
        fill="none"
        r={CRUCIFIX_RING_RADIUS}
        stroke="var(--bead-chain)"
        strokeWidth={2}
      />
      <path
        d={path}
        fill={active ? 'var(--bead-active-mid)' : 'var(--bead-fill)'}
        stroke="var(--bead-dark)"
        strokeWidth={1}
      />
      <path
        d={path}
        fill="var(--bead-light)"
        opacity={0.5}
        transform={`translate(${center.x} ${center.y}) scale(${CRUCIFIX_HIGHLIGHT_SCALE}) translate(${-center.x} ${-center.y})`}
      />
    </g>
  );
}

const sameSpan = (left: ChainSpan, right: ChainSpan): boolean =>
  left.from.x === right.from.x &&
  left.from.y === right.from.y &&
  left.to.x === right.to.x &&
  left.to.y === right.to.y;

const isActiveTarget = (active: ActiveTarget, candidate: ActiveTarget): boolean => {
  switch (candidate.kind) {
    case StepAnchor.Crucifix:
    case StepAnchor.Centerpiece:
      return active.kind === candidate.kind;
    case StepAnchor.Bead:
      return active.kind === StepAnchor.Bead && active.beadIndex === candidate.beadIndex;
    case StepAnchor.ChainLeading:
    case StepAnchor.ChainTrailing:
      return (
        (active.kind === StepAnchor.ChainLeading || active.kind === StepAnchor.ChainTrailing) &&
        active.kind === candidate.kind &&
        sameSpan(active.span, candidate.span)
      );
  }
};

const anchorKeyOf = (anchor: NonBeadAnchor): string =>
  anchor.kind === StepAnchor.Crucifix || anchor.kind === StepAnchor.Centerpiece
    ? anchor.kind
    : `${anchor.kind}-${String(anchor.fromBeadIndex)}-${String(anchor.toBeadIndex)}`;

type TargetHitProps = {
  readonly anchor: NonBeadAnchor;
  readonly target: ActiveTarget;
  readonly active: boolean;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
};

type HitAttributes = {
  readonly 'aria-current': 'step' | undefined;
  readonly 'aria-label': string;
  readonly className: string;
  readonly onKeyDown: (event: KeyboardEvent<SVGElement>) => void;
  readonly role: string;
  readonly tabIndex: number;
};

function TargetHit(props: TargetHitProps) {
  const { anchor, target } = props;
  const select = () => props.onSelect(anchor);
  const shared: HitAttributes = {
    'aria-current': props.active ? 'step' : undefined,
    'aria-label': TARGET_LABEL[anchor.kind],
    className: BEAD_CLASS_NAME,
    onKeyDown: selectOnKey(select),
    role: 'button',
    tabIndex: props.active ? 0 : -1,
  };

  if (target.kind === StepAnchor.Crucifix) {
    return <path d={latinCrossPath(target.marker)} fill="transparent" {...shared} />;
  }

  if (target.kind === StepAnchor.Centerpiece) {
    return (
      <ellipse
        cx={target.marker.center.x}
        cy={target.marker.center.y}
        fill="transparent"
        rx={target.marker.radius}
        ry={target.marker.radius * CENTERPIECE_RING_SCALE}
        {...shared}
      />
    );
  }

  if (target.kind === StepAnchor.ChainLeading || target.kind === StepAnchor.ChainTrailing) {
    return (
      <line
        stroke="transparent"
        strokeLinecap="round"
        strokeWidth={HIT_STROKE_WIDTH}
        x1={target.span.from.x}
        x2={target.span.to.x}
        y1={target.span.from.y}
        y2={target.span.to.y}
        {...shared}
      />
    );
  }

  return null;
}

type TargetLayerProps = {
  readonly geometry: DrapeGeometry;
  readonly anchors: readonly NonBeadAnchor[];
  readonly target: ActiveTarget;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
};

function TargetLayer(props: TargetLayerProps) {
  return (
    <>
      {props.anchors.map((anchor) => {
        const target = activeTargetOf(props.geometry, anchor);

        return (
          <TargetHit
            active={isActiveTarget(props.target, target)}
            anchor={anchor}
            key={anchorKeyOf(anchor)}
            onSelect={props.onSelect}
            target={target}
          />
        );
      })}
    </>
  );
}

type RosaryDrapeProps = {
  readonly geometry: DrapeGeometry;
  readonly target: ActiveTarget;
  readonly anchors: readonly NonBeadAnchor[];
  readonly prayedThroughBeadIndex: number;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
  readonly alignment: DrapeAlignment;
};

const useNearestAnchorSelect = (
  geometry: DrapeGeometry,
  anchors: readonly NonBeadAnchor[],
  onSelect: (anchor: StepAnchorPoint) => void,
) => {
  const bandRef = useRef<SVGPathElement>(null);

  const selectNearestAnchor = (event: MouseEvent<SVGPathElement>): void => {
    const band = bandRef.current;
    const matrix = band === null ? null : band.getScreenCTM();

    if (matrix === null) {
      return;
    }

    const local = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());

    onSelect(nearestAnchorOf(geometry, anchors, { x: local.x, y: local.y }));
  };

  return { bandRef, selectNearestAnchor };
};

export function RosaryDrape(props: RosaryDrapeProps) {
  const { geometry, target, anchors, prayedThroughBeadIndex, onSelect, alignment } = props;
  const ids = drapeIdsFrom(useId());
  const { viewBox } = geometry;
  const activeBeadIndex = target.kind === StepAnchor.Bead ? target.beadIndex : null;
  const { bandRef, selectNearestAnchor } = useNearestAnchorSelect(geometry, anchors, onSelect);

  return (
    <svg
      aria-label="Rosary progress"
      className="pointer-events-none block h-full w-full overflow-visible"
      preserveAspectRatio={alignment}
      viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
    >
      <DrapeDefs ids={ids} />
      <path
        aria-hidden="true"
        className={HIT_CLASS_NAME}
        d={geometry.chainSegments.map((segment) => segment.path).join(' ')}
        fill="none"
        onClick={selectNearestAnchor}
        ref={bandRef}
        stroke="transparent"
        strokeLinecap="round"
        strokeWidth={TOUCH_TARGET_MINIMUM_PIXELS}
        vectorEffect="non-scaling-stroke"
      />
      <ChainLayer segments={geometry.chainSegments} />
      <ContactShadows beads={geometry.beads} filterId={ids.contact} />
      <g aria-hidden="true">
        <ActiveHighlight ids={ids} target={target} />
      </g>
      <BeadLayer
        activeBeadIndex={activeBeadIndex}
        beads={geometry.beads}
        ids={ids}
        onSelect={onSelect}
        prayedThroughBeadIndex={prayedThroughBeadIndex}
      />
      <Speculars beads={geometry.beads} />
      <Centerpiece
        active={target.kind === StepAnchor.Centerpiece}
        ids={ids}
        marker={geometry.centerpiece}
      />
      <CrucifixMark active={target.kind === StepAnchor.Crucifix} marker={geometry.crucifix} />
      <TargetLayer anchors={anchors} geometry={geometry} onSelect={onSelect} target={target} />
    </svg>
  );
}
