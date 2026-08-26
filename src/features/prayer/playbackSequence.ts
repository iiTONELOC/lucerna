import { indexAtTime, paceText, startMsAt, type PacedText } from './pacing.ts';

export enum GuidedPlaybackPhase {
  Guidance = 'guidance',
  Fruit = 'fruit',
  Prayer = 'prayer',
}

export type PlaybackPhaseWindow = {
  readonly phase: GuidedPlaybackPhase;
  readonly startMs: number;
  readonly endMs: number;
};

export type PlaybackPlan = {
  readonly paced: PacedText;
  readonly phases: readonly PlaybackPhaseWindow[];
  readonly totalMs: number;
};

type PlaybackPlanRequest = {
  readonly fruitText: string;
  readonly guidanceText: string;
  readonly paced: PacedText;
  readonly readingSpeed: number;
  readonly trailingHoldMs: number;
};

const appendPhase = (
  phases: PlaybackPhaseWindow[],
  phase: GuidedPlaybackPhase,
  durationMs: number,
): void => {
  const startMs = phases.at(-1)?.endMs ?? 0;
  phases.push({ endMs: startMs + durationMs, phase, startMs });
};

export const createPlaybackPlan = (request: PlaybackPlanRequest): PlaybackPlan => {
  const phases: PlaybackPhaseWindow[] = [];
  const guidance = paceText(request.guidanceText, request.readingSpeed);
  const fruit = paceText(request.fruitText, request.readingSpeed);

  if (guidance.words.length > 0) {
    appendPhase(phases, GuidedPlaybackPhase.Guidance, guidance.totalMs);
  }

  if (fruit.words.length > 0) {
    appendPhase(phases, GuidedPlaybackPhase.Fruit, fruit.totalMs);
  }

  if (request.paced.words.length > 0) {
    appendPhase(phases, GuidedPlaybackPhase.Prayer, request.paced.totalMs + request.trailingHoldMs);
  }

  return {
    paced: request.paced,
    phases,
    totalMs: phases.at(-1)?.endMs ?? request.trailingHoldMs,
  };
};

export const playbackPhaseAt = (
  plan: PlaybackPlan,
  elapsedMs: number,
): GuidedPlaybackPhase | null => {
  if (elapsedMs < 0) {
    return null;
  }

  return plan.phases.find(({ endMs }) => elapsedMs < endMs)?.phase ?? null;
};

export const activeWordIndexAt = (plan: PlaybackPlan, elapsedMs: number): number => {
  const prayer = plan.phases.find(({ phase }) => phase === GuidedPlaybackPhase.Prayer);

  return prayer === undefined ? -1 : indexAtTime(plan.paced, elapsedMs - prayer.startMs);
};

export const elapsedMsForWord = (plan: PlaybackPlan, wordIndex: number): number => {
  const prayer = plan.phases.find(({ phase }) => phase === GuidedPlaybackPhase.Prayer);

  return (prayer?.startMs ?? 0) + startMsAt(plan.paced, wordIndex);
};

export const phaseStartMs = (plan: PlaybackPlan, phase: GuidedPlaybackPhase | null): number =>
  plan.phases.find((window) => window.phase === phase)?.startMs ?? 0;
