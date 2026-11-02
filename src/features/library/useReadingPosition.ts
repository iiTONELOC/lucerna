import { useReading } from '../../content/reading.ts';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { MILLISECONDS_PER_SECOND } from '../../shared/time.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { loadReadingPosition, saveReadingPosition } from '../../state/reading/readingPositions.ts';

const TOP_BAND_ROOT_MARGIN = '0px 0px -80% 0px';
const BLOCK_INDEX_ATTRIBUTE = 'data-block-index';

export const blockIndexPropsOf = (index: number): Readonly<Record<string, number>> => ({
  [BLOCK_INDEX_ATTRIBUTE]: index,
});

type ArticleRef = RefObject<HTMLElement | null>;

type ReadingIdentity = {
  readonly contentKey: string;
  readonly storageKey: string;
};

export const scrollToBlock = (articleRef: ArticleRef, index: number): void => {
  const target =
    index > 0
      ? articleRef.current?.querySelector(`[${BLOCK_INDEX_ATTRIBUTE}="${String(index)}"]`)
      : articleRef.current;

  target?.scrollIntoView();
};

const useRestoreReadingPosition = (
  { contentKey, storageKey }: ReadingIdentity,
  articleRef: ArticleRef,
  initialBlockIndex: number | null,
): void => {
  const previous = useRef({ contentKey, storageKey });
  useEffect(() => {
    const editionChanged =
      previous.current.contentKey === contentKey && previous.current.storageKey !== storageKey;
    previous.current = { contentKey, storageKey };
    if (editionChanged) return undefined;
    if (initialBlockIndex !== null) {
      scrollToBlock(articleRef, initialBlockIndex);
      return undefined;
    }

    let cancelled = false;

    void loadReadingPosition(storageKey).then((index) => {
      if (!cancelled && index !== null) {
        scrollToBlock(articleRef, index);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [articleRef, contentKey, initialBlockIndex, storageKey]);
};

const observeTopmostBlock = (
  article: HTMLElement,
  onTopmost: (index: number) => void,
): (() => void) => {
  const visibleIndexes = new Set<number>();
  const firstBlock = article.querySelector(`[${BLOCK_INDEX_ATTRIBUTE}]`);

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const index = Number(entry.target.getAttribute(BLOCK_INDEX_ATTRIBUTE));

        if (entry.isIntersecting) {
          visibleIndexes.add(index);
        } else {
          visibleIndexes.delete(index);
        }
      }

      if (visibleIndexes.size > 0) {
        onTopmost(Math.min(...visibleIndexes));
        return;
      }

      if (firstBlock !== null && firstBlock.getBoundingClientRect().top > 0) {
        onTopmost(Number(firstBlock.getAttribute(BLOCK_INDEX_ATTRIBUTE)));
      }
    },
    { rootMargin: TOP_BAND_ROOT_MARGIN },
  );

  for (const block of article.querySelectorAll(`[${BLOCK_INDEX_ATTRIBUTE}]`)) {
    observer.observe(block);
  }

  return () => observer.disconnect();
};

type TopmostListener = (index: number) => void;

export type TopmostTracker = {
  readonly subscribe: (listener: TopmostListener) => () => void;
};

type TrackerState = {
  readonly listeners: Set<TopmostListener>;
  lastIndex: number | null;
};

export const useTopmostTracker = (articleRef: ArticleRef, contentKey: unknown): TopmostTracker => {
  const stateRef = useRef<TrackerState>({ listeners: new Set(), lastIndex: null });

  useEffect(() => {
    const article = articleRef.current;

    if (article === null) {
      return;
    }

    stateRef.current.lastIndex = null;
    return observeTopmostBlock(article, (index) => {
      stateRef.current.lastIndex = index;
      stateRef.current.listeners.forEach((listener) => listener(index));
    });
  }, [articleRef, contentKey]);

  return useMemo(
    () => ({
      subscribe: (listener: TopmostListener) => {
        stateRef.current.listeners.add(listener);
        const lastIndex = stateRef.current.lastIndex;

        if (lastIndex !== null) {
          listener(lastIndex);
        }

        return () => {
          stateRef.current.listeners.delete(listener);
        };
      },
    }),
    [],
  );
};

export const useTopmostBlockIndex = (tracker: TopmostTracker): number => {
  const [index, setIndex] = useState(0);

  useEffect(() => tracker.subscribe(setIndex), [tracker]);

  return index;
};

const useTrackReadingPosition = (
  workId: string,
  tracker: TopmostTracker,
  currentIndexRef: RefObject<number>,
): void => {
  useEffect(() => {
    let saveTimer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = tracker.subscribe((index) => {
      currentIndexRef.current = index;
      clearTimeout(saveTimer);
      saveTimer = setTimeout(
        () => void saveReadingPosition(workId, index),
        MILLISECONDS_PER_SECOND,
      );
    });

    return () => {
      unsubscribe();
      clearTimeout(saveTimer);
      void saveReadingPosition(workId, currentIndexRef.current);
    };
  }, [currentIndexRef, tracker, workId]);
};

const useAnchorOnScaleChange = (
  articleRef: ArticleRef,
  currentIndexRef: RefObject<number>,
): void => {
  const { preferences } = usePreferences();
  const reading = useReading();
  const scaleKey = `${preferences.textScale}/${preferences.readerTextScale}/${reading.language}`;
  const previousScaleRef = useRef(scaleKey);

  useLayoutEffect(() => {
    if (previousScaleRef.current === scaleKey) {
      return;
    }

    previousScaleRef.current = scaleKey;
    scrollToBlock(articleRef, currentIndexRef.current);
  }, [articleRef, currentIndexRef, scaleKey]);
};

export const useReadingPosition = (
  identity: ReadingIdentity,
  articleRef: ArticleRef,
  initialBlockIndex: number | null,
  tracker: TopmostTracker,
): void => {
  const currentIndexRef = useRef(0);

  useRestoreReadingPosition(identity, articleRef, initialBlockIndex);
  useTrackReadingPosition(identity.storageKey, tracker, currentIndexRef);
  useAnchorOnScaleChange(articleRef, currentIndexRef);
};
