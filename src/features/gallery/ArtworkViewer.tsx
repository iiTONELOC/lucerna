import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type RefObject,
} from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import type { ResolvedArtwork } from '../../content/catalog.ts';
import { useReading, type ReadingSnapshot } from '../../content/reading.ts';
import { classNames } from '../../shared/classNames.ts';
import { useDialogOpen } from '../../shared/focus.ts';
import { isShortcutEvent, KeyName } from '../../shared/keyboard.ts';
import { QUIET_BUTTON_CLASS_NAME } from '../../styles.ts';
import type { Point } from '../prayer/drape.ts';
import {
  centroidOf,
  scaleWithin,
  settleZoom,
  spreadOf,
  toggleZoomAt,
  UNZOOMED,
  type ZoomView,
} from './artworkZoom.ts';

export const FITTED_ARTWORK_CLASS_NAME =
  'aspect-(--artwork-aspect) w-[min(100cqw,calc(100cqh*var(--artwork-aspect)))]';

const DRAG_THRESHOLD_PIXELS = 10;

const DISMISS_DISTANCE_PIXELS = 88;

const DOUBLE_TAP_MILLISECONDS = 300;

const WHEEL_ZOOM_RATE = 0.01;

type Artwork = ResolvedArtwork;

type ArtworkStyle = CSSProperties & { readonly '--artwork-aspect': string };

type ZoomStyle = CSSProperties & {
  readonly '--pan-x': string;
  readonly '--pan-y': string;
  readonly '--zoom': string;
};

const altOf = (reading: ReadingSnapshot, artwork: Artwork): string =>
  reading.wording.artworkAlt(artwork.title, artwork.artist);

const artworkStyleOf = (artwork: Artwork): ArtworkStyle => ({
  '--artwork-aspect': `${String(artwork.width)} / ${String(artwork.height)}`,
});

const zoomStyleOf = ({ pan, scale }: ZoomView): ZoomStyle => ({
  '--pan-x': `${String(pan.x)}px`,
  '--pan-y': `${String(pan.y)}px`,
  '--zoom': String(scale),
});

function ExpandGlyph() {
  return (
    <svg aria-hidden="true" className="size-5" fill="none" viewBox="0 0 24 24">
      <path
        d="M4 10 L4 4 L10 4 M4 4 L10 10 M20 14 L20 20 L14 20 M20 20 L14 14"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.75"
      />
    </svg>
  );
}

type FramedArtworkProps = {
  readonly artwork: Artwork;
  readonly className: string;
  readonly onExpand: () => void;
};

const useSpaceToExpand = (onExpand: () => void): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === KeyName.Space && isShortcutEvent(event)) {
        event.preventDefault();
        onExpand();
      }
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [onExpand]);
};

export function FramedArtwork({ artwork, className, onExpand }: FramedArtworkProps) {
  const reading = useReading();
  useSpaceToExpand(onExpand);

  return (
    <button
      aria-label={reading.wording.gallery.viewFullSize}
      className={classNames(
        'group focus-ring relative flex cursor-zoom-in border border-outline bg-surface p-2',
        className,
      )}
      onClick={onExpand}
      style={artworkStyleOf(artwork)}
      type="button"
    >
      <img
        alt={altOf(reading, artwork)}
        className="size-full object-cover"
        decoding="async"
        height={artwork.height}
        src={resolveArtAsset(artwork.file)}
        width={artwork.width}
      />
      <span className="absolute right-4 bottom-4 grid size-11 place-items-center rounded-full border border-outline bg-surface text-accent-current opacity-0 transition group-hover:text-accent group-hover:opacity-100 group-focus-visible:opacity-100">
        <ExpandGlyph />
      </span>
    </button>
  );
}

type Press = {
  readonly origin: Point;
  readonly spread: number;
  readonly view: ZoomView;
  readonly moved: boolean;
};

type ZoomContext = {
  readonly imageRef: RefObject<HTMLImageElement | null>;
  readonly stageRef: RefObject<HTMLDivElement | null>;
};

const settleIn = (view: ZoomView, { imageRef, stageRef }: ZoomContext): ZoomView => {
  const image = imageRef.current;
  const stage = stageRef.current;

  return image === null || stage === null
    ? view
    : settleZoom(
        view,
        { height: image.offsetHeight, width: image.offsetWidth },
        { height: stage.clientHeight, width: stage.clientWidth },
      );
};

const pointIn = (stage: HTMLElement | null, event: { clientX: number; clientY: number }): Point => {
  const box = stage?.getBoundingClientRect();

  return { x: event.clientX - (box?.left ?? 0), y: event.clientY - (box?.top ?? 0) };
};

const pressedView = (press: Press, points: readonly Point[]): ZoomView => {
  const centre = centroidOf(points);
  const spread = spreadOf(points);
  const scale = press.spread > 0 && spread > 0 ? press.view.scale * (spread / press.spread) : 1;

  return {
    pan: {
      x: press.view.pan.x + centre.x - press.origin.x,
      y: press.view.pan.y + centre.y - press.origin.y,
    },
    scale: scaleWithin(press.view.scale * scale),
  };
};

const dismisses = (press: Press, view: ZoomView): boolean => {
  const down = view.pan.y - press.view.pan.y;

  return (
    press.view.scale === 1 &&
    down > DISMISS_DISTANCE_PIXELS &&
    down > Math.abs(view.pan.x - press.view.pan.x)
  );
};

const usePinchZoom = (
  context: ZoomContext,
  view: RefObject<ZoomView>,
  show: (next: ZoomView) => void,
): void => {
  useEffect(() => {
    const stage = context.stageRef.current;
    let gestureScale = 1;

    const zoomTo = (scale: number): void => {
      show(settleIn({ ...view.current, scale }, context));
    };
    const onWheel = (event: WheelEvent): void => {
      if (event.ctrlKey) {
        event.preventDefault();
        zoomTo(view.current.scale * (1 - event.deltaY * WHEEL_ZOOM_RATE));
      }
    };
    const onGestureStart = (event: Event): void => {
      event.preventDefault();
      gestureScale = view.current.scale;
    };
    const onGestureChange = (event: Event): void => {
      event.preventDefault();

      if ('scale' in event && typeof event.scale === 'number') {
        zoomTo(gestureScale * event.scale);
      }
    };

    stage?.addEventListener('wheel', onWheel, { passive: false });
    stage?.addEventListener('gesturestart', onGestureStart);
    stage?.addEventListener('gesturechange', onGestureChange);
    return () => {
      stage?.removeEventListener('wheel', onWheel);
      stage?.removeEventListener('gesturestart', onGestureStart);
      stage?.removeEventListener('gesturechange', onGestureChange);
    };
  }, [context, show, view]);
};

const useTapZoom = (context: ZoomContext, onClose: () => void) => {
  const tapRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (tapRef.current !== null) {
        clearTimeout(tapRef.current);
      }
    },
    [],
  );

  return (point: Point, view: ZoomView): ZoomView | null => {
    const pending = tapRef.current;
    const { imageRef, stageRef } = context;

    if (pending === null) {
      tapRef.current = setTimeout(() => {
        tapRef.current = null;
        onClose();
      }, DOUBLE_TAP_MILLISECONDS);
      return null;
    }

    clearTimeout(pending);
    tapRef.current = null;
    return toggleZoomAt(
      view,
      point,
      { height: imageRef.current?.offsetHeight ?? 0, width: imageRef.current?.offsetWidth ?? 0 },
      { height: stageRef.current?.clientHeight ?? 0, width: stageRef.current?.clientWidth ?? 0 },
    );
  };
};

const useZoomGestures = (onClose: () => void) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [context] = useState<ZoomContext>(() => ({ imageRef, stageRef }));
  const [zoom, setZoom] = useState<ZoomView>(UNZOOMED);
  const [dragging, setDragging] = useState(false);
  const viewRef = useRef<ZoomView>(UNZOOMED);
  const pointers = useRef(new Map<number, Point>());
  const pressRef = useRef<Press | null>(null);
  const draggedRef = useRef(false);
  const tap = useTapZoom(context, onClose);
  const show = useCallback((next: ZoomView): void => {
    viewRef.current = next;
    setZoom(next);
  }, []);

  usePinchZoom(context, viewRef, show);

  const restart = (moved: boolean): void => {
    const points = [...pointers.current.values()];

    pressRef.current =
      points.length === 0
        ? null
        : { moved, origin: centroidOf(points), spread: spreadOf(points), view: viewRef.current };
  };

  const onPointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, pointIn(stageRef.current, event));
    draggedRef.current = false;
    restart(pressRef.current?.moved ?? false);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    const press = pressRef.current;

    if (press === null || !pointers.current.has(event.pointerId)) {
      return;
    }

    pointers.current.set(event.pointerId, pointIn(stageRef.current, event));
    const points = [...pointers.current.values()];
    const centre = centroidOf(points);
    const travel = Math.hypot(centre.x - press.origin.x, centre.y - press.origin.y);

    if (press.moved || points.length > 1 || travel >= DRAG_THRESHOLD_PIXELS) {
      pressRef.current = { ...press, moved: true };
      setDragging(true);
      show(pressedView(press, points));
    }
  };

  const onPointerEnd = (event: PointerEvent<HTMLDivElement>): void => {
    const press = pressRef.current;

    pointers.current.delete(event.pointerId);
    restart(press?.moved ?? false);

    if (press === null || pointers.current.size > 0 || !press.moved) {
      return;
    }

    draggedRef.current = true;
    setDragging(false);

    if (dismisses(press, viewRef.current)) {
      onClose();
      return;
    }

    show(settleIn(viewRef.current, context));
  };

  const onClick = (event: MouseEvent<HTMLDivElement>): void => {
    if (draggedRef.current) {
      draggedRef.current = false;
      return;
    }

    const next = tap(pointIn(stageRef.current, event), viewRef.current);

    if (next !== null) {
      show(next);
    }
  };

  return {
    dragging,
    handlers: {
      onClick,
      onPointerCancel: onPointerEnd,
      onPointerDown,
      onPointerMove,
      onPointerUp: onPointerEnd,
    },
    imageRef,
    stageRef,
    zoom,
  };
};

function ZoomStage({
  artwork,
  onClose,
}: {
  readonly artwork: Artwork;
  readonly onClose: () => void;
}) {
  const reading = useReading();
  const { dragging, handlers, imageRef, stageRef, zoom } = useZoomGestures(onClose);

  return (
    <div
      {...handlers}
      className="flex min-h-0 min-w-0 flex-1 cursor-zoom-out touch-none items-center justify-center overflow-hidden select-none @container-size"
      ref={stageRef}
    >
      <img
        alt={altOf(reading, artwork)}
        className={classNames(
          'translate-x-(--pan-x) translate-y-(--pan-y) scale-(--zoom)',
          FITTED_ARTWORK_CLASS_NAME,
          dragging
            ? undefined
            : 'transition-[translate,scale] duration-300 ease-out motion-reduce:transition-none',
        )}
        decoding="async"
        draggable={false}
        height={artwork.height}
        ref={imageRef}
        src={resolveArtAsset(artwork.file)}
        style={{ ...artworkStyleOf(artwork), ...zoomStyleOf(zoom) }}
        width={artwork.width}
      />
    </div>
  );
}

type ArtworkViewerProps = {
  readonly artwork: Artwork;
  readonly onClose: () => void;
  readonly open: boolean;
};

export function ArtworkViewer({ artwork, onClose, open }: ArtworkViewerProps) {
  const reading = useReading();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const focusDialog = useCallback(() => dialogRef.current?.focus(), []);

  useDialogOpen(dialogRef, open, true, focusDialog);

  return (
    <dialog
      aria-label={altOf(reading, artwork)}
      className="m-0 size-full max-h-none max-w-none flex-col bg-background p-0 pt-safe-top pb-safe-bottom text-foreground backdrop:bg-background open:flex focus:outline-none"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={onClose}
      ref={dialogRef}
      tabIndex={-1}
    >
      <div className="flex shrink-0 px-4">
        <button className={QUIET_BUTTON_CLASS_NAME} onClick={onClose} type="button">
          {reading.wording.common.close}
        </button>
      </div>
      {open ? <ZoomStage artwork={artwork} onClose={onClose} /> : null}
    </dialog>
  );
}
