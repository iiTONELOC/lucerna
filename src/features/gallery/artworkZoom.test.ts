import { describe, expect, test } from 'bun:test';
import { settleZoom, toggleZoomAt, UNZOOMED, ZOOM_LIMIT } from './artworkZoom.ts';

const region = { height: 800, width: 1000 };
const fitted = { height: 800, width: 500 };

describe('artwork zoom', () => {
  test('holds the scale between one and the limit', () => {
    expect(settleZoom({ pan: { x: 0, y: 0 }, scale: 9 }, fitted, region).scale).toBe(ZOOM_LIMIT);
    expect(settleZoom({ pan: { x: 0, y: 0 }, scale: 0.2 }, fitted, region).scale).toBe(1);
  });

  test('keeps the pan inside the painting', () => {
    const settled = settleZoom({ pan: { x: 900, y: -900 }, scale: 2 }, fitted, region);

    expect(settled.pan).toEqual({ x: 0, y: -400 });
  });

  test('double tap zooms in at the point and back out', () => {
    const zoomed = toggleZoomAt(UNZOOMED, { x: 500, y: 200 }, fitted, region);

    expect(zoomed).toEqual({ pan: { x: 0, y: 200 }, scale: 2 });
    expect(toggleZoomAt(zoomed, { x: 10, y: 10 }, fitted, region)).toEqual(UNZOOMED);
  });
});
