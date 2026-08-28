import { useEffect, useRef, useState, type RefObject } from 'react';
import { useEscape } from '../../shared/useEscape.ts';
import { SUBTITLE_CLASS_NAME } from '../../styles.ts';
import { currentJumpOf, type ReaderJump } from './model.ts';
import { scrollToBlock, useTopmostBlockIndex, type TopmostTracker } from './useReadingPosition.ts';

const READER_JUMP_BUTTON_CLASS_NAME = `min-h-11 min-w-9 text-center text-muted transition-colors hover:text-accent-current focus-ring ${SUBTITLE_CLASS_NAME}`;

const READER_JUMP_ROW_CLASS_NAME = `min-h-11 w-full text-left font-semibold text-secondary transition-colors hover:text-accent-current focus-ring ${SUBTITLE_CLASS_NAME}`;

const useHeadingScrolledOff = (headingRef: RefObject<HTMLElement | null>): boolean => {
  const [scrolledOff, setScrolledOff] = useState(false);

  useEffect(() => {
    const heading = headingRef.current;

    if (heading === null) {
      return;
    }

    const observer = new IntersectionObserver(([entry]) => {
      if (entry !== undefined) {
        setScrolledOff(!entry.isIntersecting);
      }
    });

    observer.observe(heading);
    return () => observer.disconnect();
  }, [headingRef]);

  return scrolledOff;
};

const useDismiss = (
  open: boolean,
  close: () => void,
  containerRef: RefObject<HTMLDivElement | null>,
): void => {
  useEscape((event) => {
    if (open) {
      event.preventDefault();
      close();
    }
  }, true);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onPointerDown = (event: PointerEvent): void => {
      if (event.target instanceof Node && containerRef.current?.contains(event.target) !== true) {
        close();
      }
    };

    globalThis.addEventListener('pointerdown', onPointerDown);
    return () => globalThis.removeEventListener('pointerdown', onPointerDown);
  }, [close, containerRef, open]);
};

export function JumpButtons({
  ariaLabelOf,
  articleRef,
  current,
  jumps,
  onJumped,
}: {
  readonly ariaLabelOf?: (jump: ReaderJump) => string;
  readonly articleRef: RefObject<HTMLElement | null>;
  readonly current?: ReaderJump | undefined;
  readonly jumps: readonly ReaderJump[];
  readonly onJumped?: () => void;
}) {
  return jumps.map((jump) => (
    <button
      aria-label={ariaLabelOf?.(jump)}
      className={jump.part === true ? READER_JUMP_ROW_CLASS_NAME : READER_JUMP_BUTTON_CLASS_NAME}
      data-current={jump.blockIndex === current?.blockIndex ? 'true' : 'false'}
      key={jump.blockIndex}
      onClick={() => {
        scrollToBlock(articleRef, jump.blockIndex);
        onJumped?.();
      }}
      type="button"
    >
      {jump.label}
    </button>
  ));
}

function JumpPanel({
  articleRef,
  blockIndex,
  jumps,
  onJumped,
}: {
  readonly articleRef: RefObject<HTMLElement | null>;
  readonly blockIndex: number;
  readonly jumps: readonly ReaderJump[];
  readonly onJumped: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const panel = panelRef.current;
    const target = panel?.querySelector('[data-current="true"]');

    if (panel !== null && target instanceof HTMLElement) {
      panel.scrollTop = target.offsetTop - panel.clientHeight / 2;
    }
  }, []);

  return (
    <div
      className="scroll-region absolute top-full left-1/2 z-20 mt-1 max-h-80 w-80 max-w-[85vw] -translate-x-1/2 overflow-y-auto rounded-lg border border-hairline bg-surface p-3 shadow-lg"
      ref={panelRef}
    >
      <div className="flex flex-wrap justify-start gap-x-1">
        <JumpButtons
          articleRef={articleRef}
          current={currentJumpOf(jumps, blockIndex)}
          jumps={jumps}
          onJumped={onJumped}
        />
      </div>
    </div>
  );
}

export function ReaderLocationControl({
  articleRef,
  headingRef,
  jumps,
  labelOf,
  tracker,
}: {
  readonly articleRef: RefObject<HTMLElement | null>;
  readonly headingRef: RefObject<HTMLElement | null>;
  readonly jumps: readonly ReaderJump[];
  readonly labelOf: (blockIndex: number) => string;
  readonly tracker: TopmostTracker;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const visible = useHeadingScrolledOff(headingRef);
  const blockIndex = useTopmostBlockIndex(tracker);
  const [open, setOpen] = useState(false);

  useDismiss(open, () => setOpen(false), containerRef);
  useEffect(() => {
    if (!visible) {
      setOpen(false);
    }
  }, [visible]);

  return (
    <div className="relative flex min-w-0 justify-center" ref={containerRef}>
      <button
        aria-expanded={open}
        aria-haspopup="true"
        className={`${SUBTITLE_CLASS_NAME} min-h-11 max-w-full truncate text-muted transition-[opacity,translate] duration-300 hover:text-foreground focus-ring motion-reduce:transition-none ${visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {labelOf(blockIndex)}
      </button>
      {open ? (
        <JumpPanel
          articleRef={articleRef}
          blockIndex={blockIndex}
          jumps={jumps}
          onJumped={() => setOpen(false)}
        />
      ) : null}
    </div>
  );
}
