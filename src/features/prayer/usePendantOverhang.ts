import { useCallback, type RefObject } from 'react';
import { useResizeMeasure, type Measurement } from '../../shared/useResizeMeasure.ts';
import { CENTERPIECE_RING_SCALE, PENDANT_BEAD_COUNT, type DrapeGeometry } from './drape.ts';

const OVERHANG_GAP_PIXELS = 4;

export type PendantOverhangRefs = {
  readonly drape: RefObject<HTMLDivElement | null>;
  readonly reading: RefObject<HTMLElement | null>;
  readonly scripture: RefObject<HTMLParagraphElement | null>;
};

export type PendantOverhang = {
  readonly width: number;
};

const NO_OVERHANG: PendantOverhang = { width: 0 };

const pendantMarkers = (geometry: DrapeGeometry) => [
  ...geometry.beads
    .filter((bead) => bead.beadIndex < PENDANT_BEAD_COUNT)
    .map((bead) => ({ center: bead.center, radius: bead.radius })),
  {
    center: geometry.centerpiece.center,
    radius: geometry.centerpiece.radius * CENTERPIECE_RING_SCALE,
  },
  geometry.crucifix,
];

export const pendantLeftOf = (geometry: DrapeGeometry): number =>
  (Math.min(...pendantMarkers(geometry).map((marker) => marker.center.x - marker.radius)) -
    geometry.viewBox.x) /
  geometry.viewBox.width;

const pendantBottomOf = (geometry: DrapeGeometry): number =>
  (Math.max(...pendantMarkers(geometry).map((marker) => marker.center.y + marker.radius)) -
    geometry.viewBox.y) /
  geometry.viewBox.width;

const overhangOf = (
  drape: HTMLDivElement,
  reading: HTMLElement,
  scripture: HTMLParagraphElement,
  geometry: DrapeGeometry,
): PendantOverhang => {
  const drapeRect = drape.getBoundingClientRect();
  const textRect = scripture.getBoundingClientRect();
  const scrollRange = reading.scrollHeight - reading.clientHeight;
  const highestTextTop = textRect.top + reading.scrollTop - scrollRange;
  const pendantLeft = drapeRect.left + pendantLeftOf(geometry) * drapeRect.width;
  const pendantBottom = drapeRect.top + pendantBottomOf(geometry) * drapeRect.width;
  const width = Math.ceil(textRect.right - pendantLeft + OVERHANG_GAP_PIXELS);

  return pendantBottom <= highestTextTop || width <= 0 ? NO_OVERHANG : { width };
};

const OVERHANG_MEASUREMENT: Measurement<PendantOverhang> = {
  initial: NO_OVERHANG,
  same: (previous, next) => previous.width === next.width,
};

export const usePendantOverhang = (
  geometry: DrapeGeometry,
  key: string,
  refs: PendantOverhangRefs,
): PendantOverhang => {
  const { drape, reading, scripture } = refs;
  const measure = useCallback((): PendantOverhang => {
    const drapeElement = drape.current;
    const readingElement = reading.current;
    const scriptureElement = scripture.current;

    return drapeElement === null || readingElement === null || scriptureElement === null
      ? NO_OVERHANG
      : overhangOf(drapeElement, readingElement, scriptureElement, geometry);
  }, [drape, geometry, reading, scripture]);

  return useResizeMeasure(scripture, measure, OVERHANG_MEASUREMENT, key)[0];
};
