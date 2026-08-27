import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import { paceText, playbackHoldMs, type PacedText } from './pacing.ts';
import {
  activeWordIndexAt,
  createPlaybackPlan,
  elapsedMsForWord,
  GuidedPlaybackPhase,
  phaseStartMs,
  playbackPhaseAt,
  type PlaybackPlan,
} from './playbackSequence.ts';

export type GuidedPlayback = {
  readonly activePhase: GuidedPlaybackPhase | null;
  readonly activeWordIndex: number;
  readonly engaged: boolean;
  readonly paced: PacedText;
  readonly pause: () => void;
  readonly playing: boolean;
  readonly startAtWord: (wordIndex: number) => void;
  readonly toggle: () => void;
};

type GuidedPlaybackRequest = {
  readonly announcement: boolean;
  readonly fruitText: string;
  readonly guidanceText: string;
  readonly offeringText: string;
  readonly isLastStep: boolean;
  readonly onAdvance: () => void;
  readonly onPlayingChange: (playing: boolean) => void;
  readonly playing: boolean;
  readonly readingSpeed: number;
  readonly stepKey: string;
  readonly text: string;
};

type ValueRef<Value> = { current: Value };

type PlaybackCallbacks = {
  readonly isLastStepRef: ValueRef<boolean>;
  readonly onAdvanceRef: ValueRef<() => void>;
  readonly onPlayingChangeRef: ValueRef<(playing: boolean) => void>;
};

type PlaybackTimeline = {
  readonly completedRef: ValueRef<boolean>;
  readonly elapsedRef: ValueRef<number>;
  readonly phaseRef: ValueRef<GuidedPlaybackPhase | null>;
  readonly wordIndexRef: ValueRef<number>;
  readonly startedAtRef: ValueRef<number | null>;
  readonly setActivePhase: Dispatch<SetStateAction<GuidedPlaybackPhase | null>>;
  readonly setActiveWordIndex: Dispatch<SetStateAction<number>>;
};

type PlaybackClockRequest = {
  readonly callbacks: PlaybackCallbacks;
  readonly plan: PlaybackPlan;
  readonly timeline: PlaybackTimeline;
};

const usePlaybackCallbacks = (
  request: Pick<GuidedPlaybackRequest, 'isLastStep' | 'onAdvance' | 'onPlayingChange'>,
): PlaybackCallbacks => {
  const isLastStepRef = useRef(request.isLastStep);
  const onAdvanceRef = useRef(request.onAdvance);
  const onPlayingChangeRef = useRef(request.onPlayingChange);

  useEffect(() => {
    isLastStepRef.current = request.isLastStep;
    onAdvanceRef.current = request.onAdvance;
    onPlayingChangeRef.current = request.onPlayingChange;
  }, [request.isLastStep, request.onAdvance, request.onPlayingChange]);

  return useMemo(
    () => ({ isLastStepRef, onAdvanceRef, onPlayingChangeRef }),
    [isLastStepRef, onAdvanceRef, onPlayingChangeRef],
  );
};

const usePlaybackTimeline = (plan: PlaybackPlan, stepKey: string) => {
  const [activePhase, setActivePhase] = useState<GuidedPlaybackPhase | null>(null);
  const [activeWordIndex, setActiveWordIndex] = useState(-1);
  const completedRef = useRef(false);
  const elapsedRef = useRef(0);
  const phaseRef = useRef<GuidedPlaybackPhase | null>(null);
  const wordIndexRef = useRef(-1);
  const startedAtRef = useRef<number | null>(null);

  useEffect(() => {
    elapsedRef.current = 0;
    completedRef.current = false;
    phaseRef.current = null;
    wordIndexRef.current = -1;
    startedAtRef.current = null;
    setActivePhase(null);
    setActiveWordIndex(-1);
  }, [stepKey]);

  useEffect(() => {
    elapsedRef.current =
      phaseRef.current === GuidedPlaybackPhase.Prayer
        ? elapsedMsForWord(plan, wordIndexRef.current)
        : phaseStartMs(plan, phaseRef.current);
    startedAtRef.current = null;
  }, [plan]);

  const timeline = useMemo(
    () => ({
      completedRef,
      elapsedRef,
      phaseRef,
      setActivePhase,
      setActiveWordIndex,
      startedAtRef,
      wordIndexRef,
    }),
    [completedRef, elapsedRef, phaseRef, startedAtRef, wordIndexRef],
  );

  return { activePhase, activeWordIndex, timeline };
};

const completePlayback = (request: PlaybackClockRequest): void => {
  if (request.timeline.completedRef.current) {
    return;
  }

  request.timeline.completedRef.current = true;
  if (request.callbacks.isLastStepRef.current) {
    request.callbacks.onPlayingChangeRef.current(false);
  } else {
    request.callbacks.onAdvanceRef.current();
  }
};

const runPlayback = (request: PlaybackClockRequest): (() => void) => {
  const { startedAtRef } = request.timeline;
  let animationFrame = 0;

  const tick = (now: number): void => {
    startedAtRef.current ??= now - request.timeline.elapsedRef.current;

    const elapsed = now - startedAtRef.current;
    const nextPhase = playbackPhaseAt(request.plan, elapsed);
    const nextWordIndex = activeWordIndexAt(request.plan, elapsed);
    request.timeline.elapsedRef.current = elapsed;
    request.timeline.phaseRef.current = nextPhase;
    request.timeline.wordIndexRef.current = nextWordIndex;
    request.timeline.setActivePhase((current) => (current === nextPhase ? current : nextPhase));
    request.timeline.setActiveWordIndex((current) =>
      current === nextWordIndex ? current : nextWordIndex,
    );

    if (elapsed >= request.plan.totalMs) {
      completePlayback(request);
      return;
    }

    animationFrame = requestAnimationFrame(tick);
  };

  animationFrame = requestAnimationFrame(tick);

  return () => {
    startedAtRef.current = null;
    cancelAnimationFrame(animationFrame);
  };
};

const usePlaybackClock = (
  request: PlaybackClockRequest,
  playing: boolean,
  stepKey: string,
): void => {
  useEffect(() => {
    if (!playing) {
      return;
    }

    return runPlayback(request);
  }, [playing, request, stepKey]);
};

const usePauseWhenHidden = (callbacks: PlaybackCallbacks): void => {
  useEffect(() => {
    const pauseWhenHidden = (): void => {
      if (document.visibilityState === 'hidden') {
        callbacks.onPlayingChangeRef.current(false);
      }
    };

    document.addEventListener('visibilitychange', pauseWhenHidden);
    return () => document.removeEventListener('visibilitychange', pauseWhenHidden);
  }, [callbacks]);
};

const usePlaybackControls = (
  playing: boolean,
  callbacks: PlaybackCallbacks,
  timeline: PlaybackTimeline,
  plan: PlaybackPlan,
): Pick<GuidedPlayback, 'pause' | 'toggle' | 'startAtWord'> => {
  const pause = useCallback((): void => callbacks.onPlayingChangeRef.current(false), [callbacks]);
  const rewind = useCallback(
    (elapsedMs: number, phase: GuidedPlaybackPhase | null, wordIndex: number): void => {
      timeline.elapsedRef.current = elapsedMs;
      timeline.completedRef.current = false;
      timeline.phaseRef.current = phase;
      timeline.wordIndexRef.current = wordIndex;
      timeline.startedAtRef.current = null;
      timeline.setActivePhase(phase);
      timeline.setActiveWordIndex(wordIndex);
    },
    [timeline],
  );
  const toggle = useCallback((): void => {
    if (playing) {
      callbacks.onPlayingChangeRef.current(false);
      return;
    }

    if (timeline.completedRef.current) {
      rewind(0, null, -1);
    }

    callbacks.onPlayingChangeRef.current(true);
  }, [callbacks, playing, rewind, timeline]);
  const startAtWord = useCallback(
    (wordIndex: number): void => {
      rewind(elapsedMsForWord(plan, wordIndex), GuidedPlaybackPhase.Prayer, wordIndex);
      callbacks.onPlayingChangeRef.current(true);
    },
    [callbacks, plan, rewind],
  );

  return { pause, startAtWord, toggle };
};

export const useGuidedPlayback = ({
  announcement,
  fruitText,
  guidanceText,
  offeringText,
  isLastStep,
  onAdvance,
  onPlayingChange,
  playing,
  readingSpeed,
  stepKey,
  text,
}: GuidedPlaybackRequest): GuidedPlayback => {
  const paced = useMemo(() => paceText(text, readingSpeed), [readingSpeed, text]);
  const plan = useMemo(
    () =>
      createPlaybackPlan({
        fruitText,
        guidanceText,
        offeringText,
        paced,
        readingSpeed,
        trailingHoldMs: playbackHoldMs(announcement, readingSpeed),
      }),
    [announcement, fruitText, guidanceText, offeringText, paced, readingSpeed],
  );
  const callbacks = usePlaybackCallbacks({ isLastStep, onAdvance, onPlayingChange });
  const { activePhase, activeWordIndex, timeline } = usePlaybackTimeline(plan, stepKey);
  const clockRequest = useMemo<PlaybackClockRequest>(
    () => ({ callbacks, plan, timeline }),
    [callbacks, plan, timeline],
  );
  const { pause, startAtWord, toggle } = usePlaybackControls(playing, callbacks, timeline, plan);

  usePlaybackClock(clockRequest, playing, stepKey);
  usePauseWhenHidden(callbacks);

  return {
    activePhase,
    activeWordIndex,
    engaged: playing || activePhase !== null || activeWordIndex >= 0,
    paced,
    pause,
    playing,
    startAtWord,
    toggle,
  };
};
