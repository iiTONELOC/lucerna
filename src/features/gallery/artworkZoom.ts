import type { Point } from '../prayer/drape.ts';

export type Extent = { readonly height: number; readonly width: number };

export type ZoomView = { readonly pan: Point; readonly scale: number };

export const ZOOM_LIMIT = 4;

const TAP_ZOOM = 2;

export const UNZOOMED: ZoomView = { pan: { x: 0, y: 0 }, scale: 1 };

const within = (value: number, reach: number): number => Math.min(reach, Math.max(-reach, value));

const reachOf = (fitted: number, scale: number, region: number): number =>
  Math.max(0, (fitted * scale - region) / 2);

export const scaleWithin = (scale: number): number => Math.min(ZOOM_LIMIT, Math.max(1, scale));

export const settleZoom = (view: ZoomView, fitted: Extent, region: Extent): ZoomView => {
  const scale = scaleWithin(view.scale);

  return {
    pan: {
      x: within(view.pan.x, reachOf(fitted.width, scale, region.width)),
      y: within(view.pan.y, reachOf(fitted.height, scale, region.height)),
    },
    scale,
  };
};

export const toggleZoomAt = (
  view: ZoomView,
  point: Point,
  fitted: Extent,
  region: Extent,
): ZoomView => {
  if (view.scale !== 1) {
    return UNZOOMED;
  }

  const spread = TAP_ZOOM - 1;

  return settleZoom(
    {
      pan: { x: (region.width / 2 - point.x) * spread, y: (region.height / 2 - point.y) * spread },
      scale: TAP_ZOOM,
    },
    fitted,
    region,
  );
};

export const centroidOf = (points: readonly Point[]): Point => ({
  x: points.reduce((sum, { x }) => sum + x, 0) / points.length,
  y: points.reduce((sum, { y }) => sum + y, 0) / points.length,
});

export const spreadOf = (points: readonly Point[]): number => {
  const [first, second] = points;

  return first === undefined || second === undefined
    ? 0
    : Math.hypot(first.x - second.x, first.y - second.y);
};
