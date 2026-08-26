import {
  PrayerId,
  StepAnchor,
  StepArchetype,
  type NonBeadAnchor,
  type PrayerStep,
  type Progression,
  type StepAnchorPoint,
} from './progression.ts';

export enum BeadKind {
  OurFather = 'our-father',
  HailMary = 'hail-mary',
}

export enum ChainRegion {
  LoopOpening = 'loop-opening',
  LoopSpan = 'loop-span',
  LoopClosing = 'loop-closing',
  PendantSpan = 'pendant-span',
  PendantCrucifix = 'pendant-crucifix',
}

export enum DrapeErrorCode {
  BeadIndexOutOfRange = 'bead-index-out-of-range',
  UnplaceableBeadCount = 'unplaceable-bead-count',
  UnanchorableStep = 'unanchorable-step',
  EmptyPath = 'empty-path',
}

export enum DrapeAlignment {
  TailRight = 'xMaxYMin meet',
  Centred = 'xMidYMin meet',
}

const DRAPE_ERROR_MESSAGE: Readonly<Record<DrapeErrorCode, string>> = {
  [DrapeErrorCode.BeadIndexOutOfRange]: 'Bead index is out of range',
  [DrapeErrorCode.UnplaceableBeadCount]: 'Bead count is too small for the pendant',
  [DrapeErrorCode.UnanchorableStep]: 'Step cannot be anchored to a bead',
  [DrapeErrorCode.EmptyPath]: 'Path must carry at least two points',
};

export class DrapeError extends Error {
  override readonly name = 'DrapeError';

  constructor(readonly code: DrapeErrorCode) {
    super(DRAPE_ERROR_MESSAGE[code]);
  }
}

export type Point = {
  readonly x: number;
  readonly y: number;
};

export type ViewBox = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type PlacedBead = {
  readonly beadIndex: number;
  readonly kind: BeadKind;
  readonly decade: number | undefined;
  readonly center: Point;
  readonly radius: number;
};

export type Marker = {
  readonly center: Point;
  readonly radius: number;
};

export type ChainSpan = {
  readonly from: Point;
  readonly to: Point;
  readonly radius: number;
};

export type ChainSegment = {
  readonly region: ChainRegion;
  readonly ordinal: number;
  readonly path: string;
  readonly length: number;
  readonly linkCount: number;
};

export type DrapeGeometry = {
  readonly viewBox: ViewBox;
  readonly beads: readonly PlacedBead[];
  readonly chainSegments: readonly ChainSegment[];
  readonly centerpiece: Marker;
  readonly crucifix: Marker;
};

export type BeadSlot = {
  readonly kind: BeadKind;
  readonly decade: number | undefined;
};

const CANONICAL_WIDTH = 600;
const CANONICAL_HEIGHT = 1080;

const HAIL_MARY_BEAD_RADIUS = 7.38;
const OUR_FATHER_BEAD_RADIUS = 12.3;
const CENTERPIECE_RADIUS = 18.04;
const CRUCIFIX_HALF_HEIGHT = 27.88;
const LINK_LENGTH = 4.51;

const ADJACENT_LINK_COUNT = 2;
const SPACED_LINK_COUNT = 5;

export const CENTERPIECE_RING_SCALE = 1.18;

const SAMPLES_PER_SEGMENT = 160;
const CUBIC_WEIGHT = 3;
const VIEWBOX_PAD = 6;
const CHAIN_BOUND_RADIUS = 2;
const PATH_PRECISION = 2;
const CLOSURE_ITERATIONS = 40;
const CLOSURE_MIN_SCALE = 0.5;
const CLOSURE_MAX_SCALE = 3;

const PENDANT_LINKS_BEFORE: readonly number[] = [
  SPACED_LINK_COUNT,
  SPACED_LINK_COUNT,
  ADJACENT_LINK_COUNT,
  ADJACENT_LINK_COUNT,
  SPACED_LINK_COUNT,
];

export const PENDANT_BEAD_COUNT = PENDANT_LINKS_BEFORE.length;

const MEDAL_ANCHOR: Point = { x: 0.883, y: 0.36 };

const LOOP_ANCHORS: readonly Point[] = [
  { x: 0.883, y: 0.36 },
  { x: 0.917, y: 0.33 },
  { x: 0.921, y: 0.27 },
  { x: 0.9, y: 0.23 },
  { x: 0.882, y: 0.19 },
  { x: 0.45, y: 0.172 },
  { x: 0.1, y: 0.2 },
  { x: 0.035, y: 0.208 },
  { x: 0.008, y: 0.225 },
  { x: 0.02, y: 0.247 },
  { x: 0.032, y: 0.266 },
  { x: 0.24, y: 0.244 },
  { x: 0.52, y: 0.238 },
  { x: 0.72, y: 0.238 },
  { x: 0.817, y: 0.252 },
  { x: 0.845, y: 0.29 },
  { x: 0.857, y: 0.318 },
  { x: 0.87, y: 0.341 },
  { x: 0.883, y: 0.36 },
];

const PENDANT_ANCHORS: readonly Point[] = [
  { x: 0.883, y: 0.368 },
  { x: 0.883, y: 0.55 },
  { x: 0.883, y: 0.68 },
  { x: 0.883, y: 0.86 },
];

const BEAD_RADIUS: Readonly<Record<BeadKind, number>> = {
  [BeadKind.OurFather]: OUR_FATHER_BEAD_RADIUS,
  [BeadKind.HailMary]: HAIL_MARY_BEAD_RADIUS,
};

const BEAD_KIND_BY_PRAYER: Readonly<Partial<Record<PrayerId, BeadKind>>> = {
  [PrayerId.OurFather]: BeadKind.OurFather,
  [PrayerId.HailMary]: BeadKind.HailMary,
};

const beadKindOf = (step: PrayerStep): BeadKind => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    throw new DrapeError(DrapeErrorCode.UnanchorableStep);
  }

  const kind = BEAD_KIND_BY_PRAYER[step.prayerId];

  if (kind === undefined) {
    throw new DrapeError(DrapeErrorCode.UnanchorableStep);
  }

  return kind;
};

export const beadSlotsOf = (progression: Progression): readonly BeadSlot[] => {
  const slots: BeadSlot[] = [];

  progression.steps.forEach((step) => {
    if (
      step.anchor.kind === StepAnchor.Bead &&
      step.archetype !== StepArchetype.MysteryAnnouncement
    ) {
      slots[step.anchor.beadIndex] = { kind: beadKindOf(step), decade: step.decade };
    }
  });

  return slots;
};

const requirePoint = (points: readonly Point[], index: number): Point => {
  const point = points[index];

  if (point === undefined) {
    throw new DrapeError(DrapeErrorCode.EmptyPath);
  }

  return point;
};

const requireNumber = (values: readonly number[], index: number): number => {
  const value = values[index];

  if (value === undefined) {
    throw new DrapeError(DrapeErrorCode.EmptyPath);
  }

  return value;
};

const requireSlot = (slots: readonly BeadSlot[], index: number): BeadSlot => {
  const slot = slots[index];

  if (slot === undefined) {
    throw new DrapeError(DrapeErrorCode.BeadIndexOutOfRange);
  }

  return slot;
};

type Cubic = {
  readonly start: Point;
  readonly firstControl: Point;
  readonly secondControl: Point;
  readonly end: Point;
};

const cubicAt = (cubic: Cubic, at: number): Point => {
  const inverse = 1 - at;
  const startWeight = inverse * inverse * inverse;
  const firstWeight = CUBIC_WEIGHT * inverse * inverse * at;
  const secondWeight = CUBIC_WEIGHT * inverse * at * at;
  const endWeight = at * at * at;

  return {
    x:
      startWeight * cubic.start.x +
      firstWeight * cubic.firstControl.x +
      secondWeight * cubic.secondControl.x +
      endWeight * cubic.end.x,
    y:
      startWeight * cubic.start.y +
      firstWeight * cubic.firstControl.y +
      secondWeight * cubic.secondControl.y +
      endWeight * cubic.end.y,
  };
};

type SampledPath = {
  readonly points: readonly Point[];
  readonly lengths: readonly number[];
  readonly total: number;
};

const measure = (points: readonly Point[]): SampledPath => {
  const lengths: number[] = [0];

  for (let index = 1; index < points.length; index += 1) {
    const previous = requirePoint(points, index - 1);
    const current = requirePoint(points, index);

    lengths.push(
      requireNumber(lengths, index - 1) +
        Math.hypot(current.x - previous.x, current.y - previous.y),
    );
  }

  return { points, lengths, total: requireNumber(lengths, lengths.length - 1) };
};

const samplePath = (anchors: readonly Point[], width: number, height: number): SampledPath => {
  const scaled = anchors.map((anchor) => ({ x: anchor.x * width, y: anchor.y * height }));
  const points: Point[] = [requirePoint(scaled, 0)];

  for (let index = 1; index + 2 < scaled.length; index += CUBIC_WEIGHT) {
    const cubic: Cubic = {
      start: requirePoint(scaled, index - 1),
      firstControl: requirePoint(scaled, index),
      secondControl: requirePoint(scaled, index + 1),
      end: requirePoint(scaled, index + 2),
    };

    for (let sample = 1; sample <= SAMPLES_PER_SEGMENT; sample += 1) {
      points.push(cubicAt(cubic, sample / SAMPLES_PER_SEGMENT));
    }
  }

  return measure(points);
};

const scaleAbout = (path: SampledPath, origin: Point, factor: number): SampledPath =>
  measure(
    path.points.map((point) => ({
      x: origin.x + (point.x - origin.x) * factor,
      y: origin.y + (point.y - origin.y) * factor,
    })),
  );

const indexAtLength = (path: SampledPath, target: number): number => {
  const clamped = Math.min(Math.max(target, 0), path.total);
  let low = 0;
  let high = path.lengths.length - 1;

  while (low < high) {
    const middle = Math.floor((low + high) / 2);

    if (requireNumber(path.lengths, middle) < clamped) {
      low = middle + 1;
    } else {
      high = middle;
    }
  }

  return Math.max(low, 0);
};

const shareBetween = (value: number, near: number, far: number): number =>
  far === near ? 0 : Math.min(Math.max((value - near) / (far - near), 0), 1);

const pointAtLength = (path: SampledPath, target: number): Point => {
  const index = indexAtLength(path, target);
  const before = Math.max(index - 1, 0);
  const share = shareBetween(
    target,
    requireNumber(path.lengths, before),
    requireNumber(path.lengths, index),
  );
  const start = requirePoint(path.points, before);
  const end = requirePoint(path.points, index);

  return { x: start.x + (end.x - start.x) * share, y: start.y + (end.y - start.y) * share };
};

type SegmentRequest = {
  readonly region: ChainRegion;
  readonly ordinal: number;
  readonly path: SampledPath;
  readonly from: number;
  readonly to: number;
  readonly linkCount: number;
};

const segmentBetween = (request: SegmentRequest): ChainSegment | null => {
  if (request.to <= request.from) {
    return null;
  }

  const first = indexAtLength(request.path, request.from);
  const last = indexAtLength(request.path, request.to);
  const points = request.path.points.slice(first, Math.max(last, first + 1) + 1);

  if (points.length < 2) {
    return null;
  }

  const coordinates = points.map(
    (point) => `${point.x.toFixed(PATH_PRECISION)},${point.y.toFixed(PATH_PRECISION)}`,
  );

  return {
    region: request.region,
    ordinal: request.ordinal,
    path: `M${coordinates.join(' L')}`,
    length: request.to - request.from,
    linkCount: request.linkCount,
  };
};

const linkCountBetween = (before: BeadKind, after: BeadKind): number =>
  before === BeadKind.OurFather || after === BeadKind.OurFather
    ? SPACED_LINK_COUNT
    : ADJACENT_LINK_COUNT;

const loopEndPad = (): number =>
  CENTERPIECE_RADIUS + SPACED_LINK_COUNT * LINK_LENGTH + HAIL_MARY_BEAD_RADIUS;

const centreDistance = (before: BeadKind, after: BeadKind): number =>
  BEAD_RADIUS[before] + linkCountBetween(before, after) * LINK_LENGTH + BEAD_RADIUS[after];

const chordFrom = (path: SampledPath, origin: Point, index: number): number => {
  const point = requirePoint(path.points, index);

  return Math.hypot(point.x - origin.x, point.y - origin.y);
};

const walkByChord = (path: SampledPath, slots: readonly BeadSlot[]): readonly number[] => {
  const positions: number[] = [loopEndPad()];
  let previous = pointAtLength(path, loopEndPad());
  let cursor = indexAtLength(path, loopEndPad());

  for (let index = 1; index < slots.length; index += 1) {
    const wanted = centreDistance(
      requireSlot(slots, index - 1).kind,
      requireSlot(slots, index).kind,
    );

    while (cursor < path.points.length - 1 && chordFrom(path, previous, cursor) < wanted) {
      cursor += 1;
    }

    const before = Math.max(cursor - 1, 0);
    const share = shareBetween(
      wanted,
      chordFrom(path, previous, before),
      chordFrom(path, previous, cursor),
    );
    const at =
      requireNumber(path.lengths, before) +
      (requireNumber(path.lengths, cursor) - requireNumber(path.lengths, before)) * share;

    positions.push(at);
    previous = pointAtLength(path, at);
  }

  return positions;
};

const loopPathClosingOnChain = (
  drawn: SampledPath,
  medal: Point,
  slots: readonly BeadSlot[],
): SampledPath => {
  let low = CLOSURE_MIN_SCALE;
  let high = CLOSURE_MAX_SCALE;

  for (let iteration = 0; iteration < CLOSURE_ITERATIONS; iteration += 1) {
    const middle = (low + high) / 2;
    const candidate = scaleAbout(drawn, medal, middle);
    const positions = walkByChord(candidate, slots);
    const consumed = requireNumber(positions, positions.length - 1) + loopEndPad();

    if (consumed > candidate.total) {
      low = middle;
    } else {
      high = middle;
    }
  }

  return scaleAbout(drawn, medal, high);
};

const loopBeadsOf = (
  path: SampledPath,
  slots: readonly BeadSlot[],
  positions: readonly number[],
): readonly PlacedBead[] =>
  slots.map((slot, offset) => ({
    beadIndex: PENDANT_BEAD_COUNT + offset,
    kind: slot.kind,
    decade: slot.decade,
    center: pointAtLength(path, requireNumber(positions, offset)),
    radius: BEAD_RADIUS[slot.kind],
  }));

type PendantStep = {
  readonly slot: BeadSlot;
  readonly radius: number;
  readonly distance: number;
};

const pendantWalkOf = (slots: readonly BeadSlot[]): readonly PendantStep[] => {
  let cursor = CENTERPIECE_RADIUS;

  return slots.toReversed().map((slot, offset) => {
    const radius = BEAD_RADIUS[slot.kind];
    const distance =
      cursor + (PENDANT_LINKS_BEFORE[offset] ?? ADJACENT_LINK_COUNT) * LINK_LENGTH + radius;

    cursor = distance + radius;

    return { slot, radius, distance };
  });
};

const pendantBeadsOf = (path: SampledPath, walk: readonly PendantStep[]): readonly PlacedBead[] =>
  walk.toReversed().map((step, offset) => ({
    beadIndex: offset,
    kind: step.slot.kind,
    decade: step.slot.decade,
    center: pointAtLength(path, step.distance),
    radius: step.radius,
  }));

const loopSegmentsOf = (
  path: SampledPath,
  slots: readonly BeadSlot[],
  positions: readonly number[],
): readonly ChainSegment[] => {
  const drawn = slots.map((slot, offset) => {
    const at = requireNumber(positions, offset);

    if (offset === 0) {
      return segmentBetween({
        region: ChainRegion.LoopOpening,
        ordinal: offset,
        path,
        from: CENTERPIECE_RADIUS,
        to: at - BEAD_RADIUS[slot.kind],
        linkCount: SPACED_LINK_COUNT,
      });
    }

    const before = requireSlot(slots, offset - 1);

    return segmentBetween({
      region: ChainRegion.LoopSpan,
      ordinal: offset,
      path,
      from: requireNumber(positions, offset - 1) + BEAD_RADIUS[before.kind],
      to: at - BEAD_RADIUS[slot.kind],
      linkCount: linkCountBetween(before.kind, slot.kind),
    });
  });

  const last = requireSlot(slots, slots.length - 1);

  drawn.push(
    segmentBetween({
      region: ChainRegion.LoopClosing,
      ordinal: slots.length,
      path,
      from: requireNumber(positions, positions.length - 1) + BEAD_RADIUS[last.kind],
      to: path.total - CENTERPIECE_RADIUS,
      linkCount: SPACED_LINK_COUNT,
    }),
  );

  return drawn.filter((segment) => segment !== null);
};

const pendantSegmentsOf = (
  path: SampledPath,
  walk: readonly PendantStep[],
  crucifix: Marker,
  crucifixDistance: number,
): readonly ChainSegment[] => {
  const drawn = walk.map((step, offset) => {
    const previous = walk[offset - 1];

    return segmentBetween({
      region: ChainRegion.PendantSpan,
      ordinal: offset,
      path,
      from: previous === undefined ? CENTERPIECE_RADIUS : previous.distance + previous.radius,
      to: step.distance - step.radius,
      linkCount: PENDANT_LINKS_BEFORE[offset] ?? ADJACENT_LINK_COUNT,
    });
  });
  const last = walk.at(-1);

  drawn.push(
    segmentBetween({
      region: ChainRegion.PendantCrucifix,
      ordinal: walk.length,
      path,
      from: last === undefined ? CENTERPIECE_RADIUS : last.distance + last.radius,
      to: crucifixDistance - crucifix.radius,
      linkCount: SPACED_LINK_COUNT,
    }),
  );

  return drawn.filter((segment) => segment !== null);
};

type Bounds = {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
};

const growBounds = (bounds: Bounds, center: Point, radius: number): void => {
  bounds.minX = Math.min(bounds.minX, center.x - radius);
  bounds.minY = Math.min(bounds.minY, center.y - radius);
  bounds.maxX = Math.max(bounds.maxX, center.x + radius);
  bounds.maxY = Math.max(bounds.maxY, center.y + radius);
};

const viewBoxOf = (
  beads: readonly PlacedBead[],
  markers: readonly Marker[],
  path: SampledPath,
): ViewBox => {
  const bounds: Bounds = {
    minX: Number.POSITIVE_INFINITY,
    minY: Number.POSITIVE_INFINITY,
    maxX: Number.NEGATIVE_INFINITY,
    maxY: Number.NEGATIVE_INFINITY,
  };

  beads.forEach((bead) => growBounds(bounds, bead.center, bead.radius));
  markers.forEach((marker) => growBounds(bounds, marker.center, marker.radius));
  path.points.forEach((point) => growBounds(bounds, point, CHAIN_BOUND_RADIUS));

  return {
    x: bounds.minX - VIEWBOX_PAD,
    y: bounds.minY - VIEWBOX_PAD,
    width: bounds.maxX - bounds.minX + VIEWBOX_PAD * 2,
    height: bounds.maxY - bounds.minY + VIEWBOX_PAD * 2,
  };
};

export const createDrapeGeometry = (slots: readonly BeadSlot[]): DrapeGeometry => {
  if (slots.length <= PENDANT_BEAD_COUNT) {
    throw new DrapeError(DrapeErrorCode.UnplaceableBeadCount);
  }

  const medal: Point = {
    x: MEDAL_ANCHOR.x * CANONICAL_WIDTH,
    y: MEDAL_ANCHOR.y * CANONICAL_HEIGHT,
  };
  const pendantPath = samplePath(PENDANT_ANCHORS, CANONICAL_WIDTH, CANONICAL_HEIGHT);
  const loopSlots = slots.slice(PENDANT_BEAD_COUNT);
  const loopPath = loopPathClosingOnChain(
    samplePath(LOOP_ANCHORS, CANONICAL_WIDTH, CANONICAL_HEIGHT),
    medal,
    loopSlots,
  );
  const positions = walkByChord(loopPath, loopSlots);
  const walk = pendantWalkOf(slots.slice(0, PENDANT_BEAD_COUNT));
  const lastPendant = walk.at(-1);
  const crucifixDistance =
    (lastPendant === undefined ? CENTERPIECE_RADIUS : lastPendant.distance + lastPendant.radius) +
    SPACED_LINK_COUNT * LINK_LENGTH +
    CRUCIFIX_HALF_HEIGHT;
  const crucifix: Marker = {
    center: pointAtLength(pendantPath, crucifixDistance),
    radius: CRUCIFIX_HALF_HEIGHT,
  };
  const centerpiece: Marker = { center: medal, radius: CENTERPIECE_RADIUS };
  const beads = [
    ...pendantBeadsOf(pendantPath, walk),
    ...loopBeadsOf(loopPath, loopSlots, positions),
  ];

  return {
    viewBox: viewBoxOf(
      beads,
      [{ center: medal, radius: CENTERPIECE_RADIUS * CENTERPIECE_RING_SCALE }, crucifix],
      loopPath,
    ),
    beads,
    chainSegments: [
      ...loopSegmentsOf(loopPath, loopSlots, positions),
      ...pendantSegmentsOf(pendantPath, walk, crucifix, crucifixDistance),
    ],
    centerpiece,
    crucifix,
  };
};

type AnchorCandidate = {
  readonly anchor: StepAnchorPoint;
  readonly distance: number;
};

const distanceToSegment = (point: Point, from: Point, to: Point): number => {
  const spanX = to.x - from.x;
  const spanY = to.y - from.y;
  const lengthSquared = spanX * spanX + spanY * spanY;

  if (lengthSquared === 0) {
    return Math.hypot(point.x - from.x, point.y - from.y);
  }

  const along = ((point.x - from.x) * spanX + (point.y - from.y) * spanY) / lengthSquared;
  const clamped = Math.min(Math.max(along, 0), 1);

  return Math.hypot(point.x - (from.x + clamped * spanX), point.y - (from.y + clamped * spanY));
};

const anchorCandidateOf = (
  geometry: DrapeGeometry,
  anchor: NonBeadAnchor,
  point: Point,
): AnchorCandidate => {
  const target = activeTargetOf(geometry, anchor);

  if (target.kind === StepAnchor.ChainLeading || target.kind === StepAnchor.ChainTrailing) {
    return { anchor, distance: distanceToSegment(point, target.span.from, target.span.to) };
  }

  return {
    anchor,
    distance: Math.hypot(target.marker.center.x - point.x, target.marker.center.y - point.y),
  };
};

export const nearestAnchorOf = (
  geometry: DrapeGeometry,
  anchors: readonly NonBeadAnchor[],
  point: Point,
): StepAnchorPoint => {
  const beadCandidates: AnchorCandidate[] = geometry.beads.map((bead) => ({
    anchor: { kind: StepAnchor.Bead, beadIndex: bead.beadIndex },
    distance: Math.hypot(bead.center.x - point.x, bead.center.y - point.y),
  }));

  const candidates = beadCandidates.concat(
    anchors.map((anchor) => anchorCandidateOf(geometry, anchor, point)),
  );

  const nearest = candidates.reduce<AnchorCandidate | undefined>(
    (closest, candidate) =>
      closest === undefined || candidate.distance < closest.distance ? candidate : closest,
    undefined,
  );

  if (nearest === undefined) {
    throw new DrapeError(DrapeErrorCode.UnplaceableBeadCount);
  }

  return nearest.anchor;
};

export const beadAt = (geometry: DrapeGeometry, beadIndex: number): PlacedBead => {
  const bead = geometry.beads[beadIndex];

  if (bead === undefined) {
    throw new DrapeError(DrapeErrorCode.BeadIndexOutOfRange);
  }

  return bead;
};

const boundMarker = (geometry: DrapeGeometry, beadIndex: number | undefined): Marker =>
  beadIndex === undefined ? geometry.centerpiece : beadAt(geometry, beadIndex);

export type ActiveTarget =
  | { readonly kind: StepAnchor.Crucifix; readonly marker: Marker }
  | { readonly kind: StepAnchor.Centerpiece; readonly marker: Marker }
  | { readonly kind: StepAnchor.Bead; readonly beadIndex: number; readonly marker: Marker }
  | { readonly kind: StepAnchor.ChainLeading; readonly span: ChainSpan }
  | { readonly kind: StepAnchor.ChainTrailing; readonly span: ChainSpan };

type SpanRequest = {
  readonly geometry: DrapeGeometry;
  readonly kind: StepAnchor.ChainLeading | StepAnchor.ChainTrailing;
  readonly fromBeadIndex: number | undefined;
  readonly toBeadIndex: number | undefined;
};

const chainSpanOf = (request: SpanRequest): ChainSpan => {
  const from = boundMarker(request.geometry, request.fromBeadIndex);
  const to = boundMarker(request.geometry, request.toBeadIndex);
  const span = Math.hypot(to.center.x - from.center.x, to.center.y - from.center.y);
  const unitX = span === 0 ? 0 : (to.center.x - from.center.x) / span;
  const unitY = span === 0 ? 0 : (to.center.y - from.center.y) / span;
  const fromEdge = {
    x: from.center.x + unitX * from.radius,
    y: from.center.y + unitY * from.radius,
  };
  const toEdge = { x: to.center.x - unitX * to.radius, y: to.center.y - unitY * to.radius };
  return {
    from: fromEdge,
    to: toEdge,
    radius: request.kind === StepAnchor.ChainTrailing ? from.radius : to.radius,
  };
};

export const activeTargetOf = (geometry: DrapeGeometry, anchor: StepAnchorPoint): ActiveTarget => {
  switch (anchor.kind) {
    case StepAnchor.Crucifix:
      return { kind: StepAnchor.Crucifix, marker: geometry.crucifix };
    case StepAnchor.Centerpiece:
      return { kind: StepAnchor.Centerpiece, marker: geometry.centerpiece };
    case StepAnchor.Bead:
      return {
        kind: StepAnchor.Bead,
        beadIndex: anchor.beadIndex,
        marker: beadAt(geometry, anchor.beadIndex),
      };
    case StepAnchor.ChainLeading:
    case StepAnchor.ChainTrailing:
      return {
        kind: anchor.kind,
        span: chainSpanOf({
          geometry,
          kind: anchor.kind,
          fromBeadIndex: anchor.fromBeadIndex,
          toBeadIndex: anchor.toBeadIndex,
        }),
      };
  }
};
