import {
  useCallback,
  useRef,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type RefObject,
} from 'react';
import { useResizeMeasure, type Measurement } from './useResizeMeasure.ts';

const DRAG_THRESHOLD_PIXELS = 6;
const EDGE_TOLERANCE_PIXELS = 1;

type DragOrigin = {
  readonly pointerId: number;
  readonly scrollLeft: number;
  readonly x: number;
};

type DragState = {
  dragged: boolean;
  origin: DragOrigin | null;
};

export type TrackEdges = {
  readonly atStart: boolean;
  readonly atEnd: boolean;
};

const trackedOrigin = (state: DragState, pointerId: number): DragOrigin | null => {
  const origin = state.origin;

  return origin !== null && origin.pointerId === pointerId ? origin : null;
};

const applyDrag = (track: HTMLElement, state: DragState, origin: DragOrigin, x: number): void => {
  const distance = x - origin.x;

  if (!state.dragged && Math.abs(distance) < DRAG_THRESHOLD_PIXELS) {
    return;
  }

  if (!state.dragged) {
    track.setPointerCapture(origin.pointerId);
    state.dragged = true;
  }

  track.scrollLeft = origin.scrollLeft - distance;
};

const stepDistance = (track: HTMLElement): number => {
  const card = track.firstElementChild;

  if (card === null) {
    return track.clientWidth;
  }

  const gap = Number.parseFloat(globalThis.getComputedStyle(track).columnGap);

  return card.getBoundingClientRect().width + (Number.isNaN(gap) ? 0 : gap);
};

const startDrag = (state: DragState, event: ReactPointerEvent<HTMLElement>): void => {
  if (event.pointerType !== 'mouse' || event.button !== 0) {
    return;
  }

  state.dragged = false;
  state.origin = {
    pointerId: event.pointerId,
    scrollLeft: event.currentTarget.scrollLeft,
    x: event.clientX,
  };
};

const continueDrag = (state: DragState, event: ReactPointerEvent<HTMLElement>): void => {
  const origin = trackedOrigin(state, event.pointerId);

  if (origin === null) {
    return;
  }

  if (event.buttons === 0) {
    state.origin = null;
    return;
  }

  applyDrag(event.currentTarget, state, origin, event.clientX);
};

const finishDrag = (state: DragState, event: ReactPointerEvent<HTMLElement>): void => {
  if (trackedOrigin(state, event.pointerId) === null) {
    return;
  }

  if (event.currentTarget.hasPointerCapture(event.pointerId)) {
    event.currentTarget.releasePointerCapture(event.pointerId);
  }

  state.origin = null;
};

const suppressDragClick = (state: DragState, event: ReactMouseEvent<HTMLElement>): void => {
  if (!state.dragged) {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  state.dragged = false;
};

const useDragHandlers = <ElementType extends HTMLElement>() => {
  const stateRef = useRef<DragState>({ dragged: false, origin: null });
  const onPointerUp = (event: ReactPointerEvent<ElementType>): void =>
    finishDrag(stateRef.current, event);

  return {
    onClickCapture: (event: ReactMouseEvent<ElementType>): void =>
      suppressDragClick(stateRef.current, event),
    onPointerCancel: onPointerUp,
    onPointerDown: (event: ReactPointerEvent<ElementType>): void =>
      startDrag(stateRef.current, event),
    onPointerMove: (event: ReactPointerEvent<ElementType>): void =>
      continueDrag(stateRef.current, event),
    onPointerUp,
  };
};

const EDGES_MEASUREMENT: Measurement<TrackEdges> = {
  initial: { atStart: true, atEnd: true },
  same: (previous, next) => previous.atStart === next.atStart && previous.atEnd === next.atEnd,
};

const useTrackEdges = <ElementType extends HTMLElement>(
  trackRef: RefObject<ElementType | null>,
  items: readonly unknown[],
) => {
  const measure = useCallback((): TrackEdges => {
    const track = trackRef.current;

    if (track === null) {
      return EDGES_MEASUREMENT.initial;
    }

    const furthest = track.scrollWidth - track.clientWidth;

    return {
      atStart: track.scrollLeft <= EDGE_TOLERANCE_PIXELS,
      atEnd: track.scrollLeft >= furthest - EDGE_TOLERANCE_PIXELS,
    };
  }, [trackRef]);
  const [edges, syncEdges] = useResizeMeasure(trackRef, measure, EDGES_MEASUREMENT, items);

  return { edges, syncEdges };
};

export const useHorizontalTrack = <ElementType extends HTMLElement>(items: readonly unknown[]) => {
  const trackRef = useRef<ElementType | null>(null);
  const dragHandlers = useDragHandlers<ElementType>();
  const { edges, syncEdges } = useTrackEdges(trackRef, items);

  const scrollByPage = (direction: number): void => {
    const track = trackRef.current;

    if (track !== null) {
      track.scrollBy({ behavior: 'smooth', left: direction * stepDistance(track) });
    }
  };

  return {
    edges,
    handlers: { ...dragHandlers, onScroll: syncEdges },
    scrollByPage,
    trackRef,
  };
};
