import { Fragment, type ReactNode } from 'react';
import { GluedTail, MarkGlue } from '../../components/marks/MarkGlue.tsx';
import { RedLetterMark } from '../../components/marks/Marks.tsx';
import type { ScriptureRedSpan } from '../../content/schema.ts';
import { classNames } from '../../shared/classNames.ts';
import type { PacedWord } from './pacing.ts';
import { StepArchetype, type PrayerStep } from './progression.ts';
import type { GuidedPlayback } from './useGuidedPlayback.ts';

const NO_RED_SPANS: readonly ScriptureRedSpan[] = [];

export const scriptureRedOf = (
  step: PrayerStep,
  showRedLetter: boolean,
): readonly ScriptureRedSpan[] =>
  showRedLetter && step.archetype === StepArchetype.MysteryAnnouncement
    ? (step.mystery.scripture.red ?? NO_RED_SPANS)
    : NO_RED_SPANS;

export type RedMark = (key: number) => ReactNode;

const redTextNodes = (text: string, red: readonly ScriptureRedSpan[], mark: RedMark): ReactNode => {
  if (red.length === 0) {
    return text;
  }

  const nodes: ReactNode[] = [];
  let cursor = 0;

  for (const span of red) {
    if (span.start > cursor) {
      nodes.push(text.slice(cursor, span.start));
    }

    nodes.push(
      <GluedTail className="text-christ" key={span.start} text={text.slice(span.start, span.end)}>
        {mark(span.start)}
      </GluedTail>,
    );
    cursor = span.end;
  }

  if (cursor < text.length) {
    nodes.push(text.slice(cursor));
  }

  return nodes;
};

const redWordFlagsFrom = (
  words: readonly PacedWord[],
  red: readonly ScriptureRedSpan[],
): readonly boolean[] => {
  const flags: boolean[] = [];
  let offset = 0;

  for (const paced of words) {
    const end = offset + paced.word.length;

    flags.push(red.some((span) => span.start < end && span.end > offset));
    offset = end + 1;
  }

  return flags;
};

const redEndWordFlagsFrom = (
  words: readonly PacedWord[],
  red: readonly ScriptureRedSpan[],
): readonly boolean[] => {
  const flags: boolean[] = [];
  let offset = 0;

  for (const paced of words) {
    const end = offset + paced.word.length;

    flags.push(red.some((span) => span.end > offset && span.end <= end));
    offset = end + 1;
  }

  return flags;
};

const playbackWordState = (
  current: boolean,
  future: boolean,
): 'complete' | 'current' | 'future' => {
  if (current) {
    return 'current';
  }

  if (future) {
    return 'future';
  }

  return 'complete';
};

export const guidedText = (
  text: string,
  playback: GuidedPlayback,
  red: readonly ScriptureRedSpan[],
  mark: RedMark,
): ReactNode => {
  if (playback.paced.words.length === 0) {
    return redTextNodes(text, red, mark);
  }

  const redFlags = redWordFlagsFrom(playback.paced.words, red);
  const redEnds = redEndWordFlagsFrom(playback.paced.words, red);

  return playback.paced.words.map((pacedWord, index) => {
    const current = playback.engaged && index === playback.activeWordIndex;
    const future = playback.engaged && index > playback.activeWordIndex;
    const word = (
      <span
        className={classNames(
          'cursor-pointer transition-colors duration-300 select-none motion-reduce:transition-none',
          redFlags[index] === true && !current && !future && 'text-christ',
          current &&
            'text-accent-current underline decoration-accent-current decoration-[0.08em] underline-offset-[0.12em] [text-shadow:0_0_0.4em_var(--theme-accent-current)] in-data-[theme=light]:text-shadow-none',
          future && 'text-muted',
        )}
        data-playback-word={playbackWordState(current, future)}
        onDoubleClick={() => playback.startAtWord(index)}
      >
        {pacedWord.word}
      </span>
    );

    return (
      <Fragment key={String(index) + '-' + pacedWord.word}>
        {index === 0 ? null : ' '}
        {redEnds[index] === true ? (
          <MarkGlue>
            {word}
            {mark(index)}
          </MarkGlue>
        ) : (
          word
        )}
      </Fragment>
    );
  });
};

export const redMarkOf =
  (open: boolean, onToggle: () => void): RedMark =>
  (key) => <RedLetterMark key={`red-mark-${String(key)}`} onToggle={onToggle} open={open} />;
