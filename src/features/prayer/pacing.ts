export type PacedWord = {
  readonly word: string;
  readonly startMs: number;
  readonly durationMs: number;
};

export type PacedText = {
  readonly words: readonly PacedWord[];
  readonly totalMs: number;
};

const BASE_WORD_MS = 320;
const PER_CHARACTER_MS = 24;
const CLAUSE_PAUSE_MS = 260;
const SENTENCE_PAUSE_MS = 620;
const PRAYER_HOLD_MS = 1100;
const ANNOUNCEMENT_HOLD_MS = 3200;
const SENTENCE_ENDS = new Set(['.', '!', '?', ':']);
const CLAUSE_ENDS = new Set([',', ';']);

const trailingPauseMs = (word: string): number => {
  const last = word.at(-1) ?? '';

  if (SENTENCE_ENDS.has(last)) {
    return SENTENCE_PAUSE_MS;
  }

  if (CLAUSE_ENDS.has(last)) {
    return CLAUSE_PAUSE_MS;
  }

  return 0;
};

export const paceText = (text: string, speed: number): PacedText => {
  const multiplier = speed;
  const tokens = text.trim().split(/\s+/u).filter(Boolean);
  const words: PacedWord[] = [];
  let cursor = 0;

  for (const word of tokens) {
    const durationMs = (BASE_WORD_MS + word.length * PER_CHARACTER_MS) / multiplier;

    words.push({ word, startMs: cursor, durationMs });
    cursor += durationMs + trailingPauseMs(word) / multiplier;
  }

  return { words, totalMs: cursor };
};

export const startMsAt = (paced: PacedText, index: number): number =>
  paced.words[index]?.startMs ?? 0;

export const indexAtTime = (paced: PacedText, elapsedMs: number): number => {
  let activeIndex = -1;

  for (const [index, word] of paced.words.entries()) {
    if (word.startMs > elapsedMs) {
      break;
    }

    activeIndex = index;
  }

  return activeIndex;
};

export const playbackHoldMs = (announcement: boolean, speed: number): number =>
  (announcement ? ANNOUNCEMENT_HOLD_MS : PRAYER_HOLD_MS) / speed;
