import { useLayoutEffect, useState, type RefObject } from 'react';

import { PENDANT_BEAD_COUNT, type DrapeGeometry } from './drape.ts';

const HEADING_CLEARANCE_RADII = 2.2;

export type NotesCollisionRefs = {
  readonly artwork: RefObject<HTMLDivElement | null>;
  readonly drape: RefObject<HTMLDivElement | null>;
  readonly notes: RefObject<HTMLDivElement | null>;
};

export type NotesCollision = {
  readonly collides: boolean;
  readonly collapsedHeight: number;
};

type Rect = {
  readonly left: number;
  readonly right: number;
  readonly top: number;
  readonly bottom: number;
};

const NO_COLLISION: NotesCollision = { collides: false, collapsedHeight: 0 };

export const loopBandBottomOf = (geometry: DrapeGeometry): number => {
  const midline = geometry.viewBox.x + geometry.viewBox.width / 2;

  return geometry.beads
    .filter((bead) => bead.beadIndex >= PENDANT_BEAD_COUNT && bead.center.x < midline)
    .reduce(
      (lowest, bead) => Math.max(lowest, bead.center.y + bead.radius * HEADING_CLEARANCE_RADII),
      geometry.viewBox.y,
    );
};

const loopBandRectOf = (drape: HTMLDivElement, geometry: DrapeGeometry): Rect => {
  const rect = drape.getBoundingClientRect();
  const scale = rect.width / geometry.viewBox.width;

  return {
    left: rect.left,
    right: rect.left + rect.width / 2,
    top: rect.top,
    bottom: rect.top + (loopBandBottomOf(geometry) - geometry.viewBox.y) * scale,
  };
};

const intersects = (a: Rect, b: Rect): boolean =>
  a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;

const restingNotesRectOf = (box: HTMLDivElement): Rect => {
  const rect = box.getBoundingClientRect();

  return {
    left: rect.left,
    right: rect.right,
    top: rect.bottom - box.scrollHeight,
    bottom: rect.bottom,
  };
};

const collapsedHeightOf = (box: HTMLDivElement): number => {
  const firstNote = box.firstElementChild;

  if (firstNote === null) {
    return 0;
  }

  const style = getComputedStyle(box);
  const padding = Number.parseFloat(style.paddingTop) + Number.parseFloat(style.paddingBottom);

  return Math.ceil(firstNote.getBoundingClientRect().height + padding);
};

const collisionOf = (
  drape: HTMLDivElement,
  box: HTMLDivElement,
  geometry: DrapeGeometry,
): NotesCollision => {
  const collides = intersects(loopBandRectOf(drape, geometry), restingNotesRectOf(box));

  return collides ? { collides, collapsedHeight: collapsedHeightOf(box) } : NO_COLLISION;
};

const sameCollision = (a: NotesCollision, b: NotesCollision): boolean =>
  a.collides === b.collides && a.collapsedHeight === b.collapsedHeight;

export const useNotesCollision = (
  geometry: DrapeGeometry,
  key: string,
  refs: NotesCollisionRefs,
): NotesCollision => {
  const [collision, setCollision] = useState(NO_COLLISION);
  const { artwork, drape, notes } = refs;

  useLayoutEffect(() => {
    const measure = (): void => {
      const drapeElement = drape.current;
      const notesElement = notes.current;
      const next =
        drapeElement === null || notesElement === null
          ? NO_COLLISION
          : collisionOf(drapeElement, notesElement, geometry);

      setCollision((previous) => (sameCollision(previous, next) ? previous : next));
    };

    measure();

    const artworkElement = artwork.current;

    if (artworkElement === null || typeof ResizeObserver === 'undefined') {
      return undefined;
    }

    const observer = new ResizeObserver(measure);

    observer.observe(artworkElement);

    return () => observer.disconnect();
  }, [artwork, drape, geometry, key, notes]);

  return collision;
};
