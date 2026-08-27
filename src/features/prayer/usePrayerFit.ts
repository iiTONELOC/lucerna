import { useLayoutEffect, useRef, useState, type RefObject } from 'react';

const OVERFLOW_TOLERANCE = 1;

export const SCROLL_FALLBACK_MAXIMUM_HEIGHT = 640;

type FitState = {
  readonly key: string;
  readonly dense: boolean;
  readonly hideArtwork: boolean;
  readonly hideGuidance: boolean;
};

export type FitRefs = {
  readonly artwork: RefObject<HTMLDivElement | null>;
  readonly reading: RefObject<HTMLElement | null>;
  readonly stage: RefObject<HTMLElement | null>;
  readonly surface: RefObject<HTMLDivElement | null>;
};

export type FitResult = {
  readonly dense: boolean;
  readonly showArtwork: boolean;
  readonly showGuidance: boolean;
};

const initialFitState = (key: string): FitState => ({
  key,
  dense: false,
  hideArtwork: false,
  hideGuidance: false,
});

const overflows = (element: HTMLElement): boolean =>
  element.scrollHeight - element.clientHeight > OVERFLOW_TOLERANCE ||
  element.scrollWidth - element.clientWidth > OVERFLOW_TOLERANCE;

const verticallyOverflows = (element: HTMLElement): boolean =>
  element.scrollHeight - element.clientHeight > OVERFLOW_TOLERANCE;

type MeasuredSizeRef = {
  current: { height: number; width: number };
};

type FitStateWriter = (next: FitState) => void;

const observeFitStage = (
  stage: HTMLElement,
  key: string,
  measuredSize: MeasuredSizeRef,
  setStored: FitStateWriter,
): (() => void) | undefined => {
  measuredSize.current = { height: stage.clientHeight, width: stage.clientWidth };

  if (typeof ResizeObserver === 'undefined') {
    return undefined;
  }

  const observer = new ResizeObserver(([entry]) => {
    if (entry === undefined) {
      return;
    }

    const { blockSize: height, inlineSize: width } = entry.contentBoxSize[0] ?? {
      blockSize: entry.contentRect.height,
      inlineSize: entry.contentRect.width,
    };
    const previous = measuredSize.current;
    const sameHeight = Math.abs(previous.height - height) <= OVERFLOW_TOLERANCE;
    const sameWidth = Math.abs(previous.width - width) <= OVERFLOW_TOLERANCE;

    if (sameHeight && sameWidth) {
      return;
    }

    measuredSize.current = { height, width };
    setStored(initialFitState(key));
  });

  observer.observe(stage);

  return () => observer.disconnect();
};

type FitElements = {
  readonly artwork: HTMLDivElement;
  readonly reading: HTMLElement;
  readonly stage: HTMLElement;
  readonly surface: HTMLDivElement;
};

const fitElementsOf = (refs: FitRefs): FitElements | null => {
  const artwork = refs.artwork.current;
  const reading = refs.reading.current;
  const stage = refs.stage.current;
  const surface = refs.surface.current;

  return artwork === null || reading === null || stage === null || surface === null
    ? null
    : { artwork, reading, stage, surface };
};

const surfaceNeedsFit = (elements: FitElements): boolean =>
  overflows(elements.reading) ||
  overflows(elements.surface) ||
  (elements.stage.clientHeight >= SCROLL_FALLBACK_MAXIMUM_HEIGHT &&
    verticallyOverflows(elements.stage));

const nextFitState = (fit: FitState, elements: FitElements): FitState | null => {
  if (!surfaceNeedsFit(elements)) {
    return null;
  }

  return fit.dense ? null : { ...fit, dense: true };
};

export const usePrayerFit = (key: string, guidanceRequested: boolean, refs: FitRefs): FitResult => {
  const [stored, setStored] = useState<FitState>(() => initialFitState(key));
  const measuredSize = useRef({ height: 0, width: 0 });
  const fit = stored.key === key ? stored : initialFitState(key);
  const { artwork, reading, stage, surface } = refs;

  useLayoutEffect(() => {
    const stageElement = stage.current;

    return stageElement === null
      ? undefined
      : observeFitStage(stageElement, key, measuredSize, setStored);
  }, [key, stage]);

  useLayoutEffect(() => {
    const elements = fitElementsOf({ artwork, reading, stage, surface });

    if (elements === null) {
      return;
    }

    const next = nextFitState(fit, elements);

    if (next !== null) {
      setStored(next);
    }
  }, [artwork, fit, guidanceRequested, key, reading, stage, surface]);

  return {
    dense: fit.dense,
    showArtwork: !fit.hideArtwork,
    showGuidance: guidanceRequested && !fit.hideGuidance,
  };
};
