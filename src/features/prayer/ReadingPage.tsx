import { useState, type CSSProperties, type RefObject } from 'react';
import { CitationLink } from '../../components/links/CitationLink.tsx';
import { AiTranslationNotice, type MarkToggle } from '../../components/marks/Marks.tsx';
import { RedLetterNotice } from '../../components/RedLetterNotice.tsx';
import { useReading } from '../../content/reading.ts';
import type { ScriptureRedSpan } from '../../content/schema.ts';
import { classNames } from '../../shared/classNames.ts';
import { useLandscape } from '../../shared/useLandscape.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { CITATION_CLASS_NAME, EYEBROW_CLASS_NAME, SCRIPTURE_CLASS_NAME } from '../../styles.ts';
import { scriptureLocationOf, type BibleVerseLocation } from '../library/model.ts';
import {
  apparatusReferenceTarget,
  rosaryTextReferenceTarget,
} from '../references/referenceCatalog.ts';
import { guidedText, redMarkOf, scriptureRedOf, type RedMark } from './guidedText.tsx';
import { GuidedPlaybackPhase } from './playbackSequence.ts';
import { FruitLine, ReadingNotes, type AuxiliaryPlaybackNotesProps } from './PrayerNotes.tsx';
import { bodyFor, type MysteryFruit, type PrayerFocusSession } from './prayerSession.ts';
import { StepArchetype, type PrayerStep } from './progression.ts';
import type { PendantOverhang } from './usePendantOverhang.ts';

const DROP_CAP_CLASS_NAME =
  'first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:font-display first-letter:text-[3.5em] first-letter:leading-[0.78] first-letter:font-medium first-letter:text-accent spread:first-letter:text-[3.75em] spread:first-letter:leading-[0.76]';

type OverhangStyle = CSSProperties & {
  readonly '--pendant-overhang-width': string;
};

const overhangStyleOf = (overhang: PendantOverhang): OverhangStyle => ({
  '--pendant-overhang-width': String(overhang.width) + 'px',
});

export const TAIL_CLEARANCE_CLASS_NAME =
  'landscape:pr-(--tail-clearance) spread:pr-(--tail-clearance)';

function RepetitionFeedback({ step }: { readonly step: PrayerStep }) {
  const { wording } = useReading();
  if (step.archetype !== StepArchetype.CountedRepetition) {
    return null;
  }

  const label = wording.prayer.hailMaryCount(step.repetition, step.repetitionTotal);

  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <p className={EYEBROW_CLASS_NAME}>{label}</p>
      <ol aria-label={wording.prayer.repetitionProgress} className="flex flex-wrap gap-2">
        {Array.from({ length: step.repetitionTotal }, (_, index) => {
          const repetition = index + 1;
          const complete = repetition <= step.repetition;
          const current = repetition === step.repetition;

          return (
            <li
              aria-current={current ? 'step' : undefined}
              className={classNames(
                'size-2.5 rounded-full border',
                complete ? 'border-accent-current bg-accent-current' : 'border-border bg-surface',
                current && 'ring-2 ring-accent/35 ring-offset-2 ring-offset-background',
              )}
              key={repetition}
            >
              <span className="sr-only">{wording.prayer.hailMaryState(repetition, complete)}</span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

type ReadingPageProps = Omit<AuxiliaryPlaybackNotesProps, 'onArt'> & {
  readonly dense: boolean;
  readonly fruit: MysteryFruit | null;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly pendantOverhang: PendantOverhang;
  readonly readingRef: RefObject<HTMLElement | null>;
  readonly scriptureRef: RefObject<HTMLParagraphElement | null>;
  readonly showArtwork: boolean;
  readonly showDropCaps: boolean;
  readonly showScriptureReading: boolean;
};

type PrayerBodyProps = Pick<
  ReadingPageProps,
  | 'dense'
  | 'guidedPlayback'
  | 'onOpenBibleVerse'
  | 'onOpenReference'
  | 'scriptureRef'
  | 'showDropCaps'
  | 'showScriptureReading'
  | 'step'
>;

function SourceCitation({
  onOpenBibleVerse,
  onOpenReference,
  step,
}: Pick<PrayerBodyProps, 'onOpenBibleVerse' | 'onOpenReference' | 'step'>) {
  const reading = useReading();
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    const scripture = step.mystery.scripture;
    const location = scriptureLocationOf(reading, scripture);

    if (location === null) {
      return scripture.reference;
    }

    return (
      <CitationLink
        label={scripture.reference}
        onArt={false}
        onOpen={() => onOpenBibleVerse(location.bookId, location.verse)}
      />
    );
  }

  const prayer = reading.catalog.prayerById(step.prayerId);

  return (
    <CitationLink
      label={prayer.source.work}
      onArt={false}
      onOpen={() => onOpenReference(rosaryTextReferenceTarget(prayer.sourceId))}
    />
  );
}

const noticeKeyOf = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement
    ? `${step.mystery.set}-${String(step.mystery.ordinal)}`
    : 'prayer';

function ScriptureText({
  dense,
  guidedPlayback,
  mark,
  red,
  scriptureRef,
  showDropCaps,
  step,
}: Pick<PrayerBodyProps, 'dense' | 'guidedPlayback' | 'scriptureRef' | 'showDropCaps' | 'step'> & {
  readonly mark: RedMark;
  readonly red: readonly ScriptureRedSpan[];
}) {
  const reading = useReading();
  return (
    <p
      ref={scriptureRef}
      className={classNames(
        `${SCRIPTURE_CLASS_NAME} max-w-prose text-pretty pr-(--pendant-overhang-width)`,
        showDropCaps && !dense && DROP_CAP_CLASS_NAME,
      )}
    >
      {guidedText(bodyFor(reading, step), guidedPlayback, red, mark)}
    </p>
  );
}

function SourceLine({
  dense,
  onOpenBibleVerse,
  onOpenReference,
  step,
}: Pick<PrayerBodyProps, 'dense' | 'onOpenBibleVerse' | 'onOpenReference' | 'step'>) {
  return (
    <p
      className={classNames(
        `${CITATION_CLASS_NAME} text-muted italic landscape:mt-auto`,
        dense ? 'pt-0' : 'landscape:pt-0 spread:pt-2',
      )}
    >
      <SourceCitation
        onOpenBibleVerse={onOpenBibleVerse}
        onOpenReference={onOpenReference}
        step={step}
      />
    </p>
  );
}

function PrayerBody({
  dense,
  guidedPlayback,
  onOpenBibleVerse,
  onOpenReference,
  scriptureRef,
  showDropCaps,
  showScriptureReading,
  step,
}: PrayerBodyProps) {
  const reading = useReading();
  const { preferences } = usePreferences();
  const [noticeOpen, setNoticeOpen] = useState(false);

  if (!showScriptureReading) {
    return null;
  }

  const red = scriptureRedOf(step, preferences.showRedLetter);

  return (
    <>
      <ScriptureText
        dense={dense}
        guidedPlayback={guidedPlayback}
        mark={redMarkOf(noticeOpen, () => setNoticeOpen((current) => !current))}
        red={red}
        scriptureRef={scriptureRef}
        showDropCaps={showDropCaps}
        step={step}
      />
      {noticeOpen && red.length > 0 ? (
        <RedLetterNotice
          onClose={() => setNoticeOpen(false)}
          onOpenSource={(sourceId) => onOpenReference(apparatusReferenceTarget(sourceId))}
          redLetter={reading.catalog.bible.redLetter}
        />
      ) : null}
      <SourceLine
        dense={dense}
        onOpenBibleVerse={onOpenBibleVerse}
        onOpenReference={onOpenReference}
        step={step}
      />
    </>
  );
}

function ReadingFruit({
  aiNotice,
  fruit,
  guidedPlayback,
  onOpenReference,
  showArtwork,
}: Pick<
  ReadingPageProps,
  'aiNotice' | 'fruit' | 'guidedPlayback' | 'onOpenReference' | 'showArtwork'
>) {
  const landscape = useLandscape();

  if (fruit === null) {
    return null;
  }

  const notesInline = !showArtwork || landscape;

  return (
    <div
      className={classNames(
        'flex w-full pr-(--pendant-overhang-width)',
        notesInline ? 'justify-start' : 'justify-center',
      )}
    >
      <FruitLine
        aiNotice={aiNotice}
        fruit={fruit}
        illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Fruit}
        onArt={false}
        onOpenReference={onOpenReference}
      />
    </div>
  );
}

function ReadingPage(props: ReadingPageProps) {
  const { wording } = useReading();
  return (
    <article
      ref={props.readingRef}
      aria-label={wording.prayer.prayerText}
      className={classNames(
        'scroll-region relative z-10 col-start-1 row-start-3 flex max-h-full min-h-0 min-w-0 flex-col overflow-y-auto',
        TAIL_CLEARANCE_CLASS_NAME,
        props.dense
          ? 'gap-1 px-4 pt-2 pb-3 sm:px-5 landscape:gap-1 landscape:px-5 landscape:py-2'
          : 'gap-2 px-4 pt-3 pb-4 sm:gap-3 sm:px-6 landscape:gap-2 landscape:px-6 landscape:pt-0 landscape:pb-4 spread:gap-4 spread:px-8 spread:pt-1 spread:pb-8',
        !props.showArtwork && 'pr-14 sm:pr-16',
      )}
      data-layout-region="reading"
      style={overhangStyleOf(props.pendantOverhang)}
    >
      <ReadingNotes
        aiNotice={props.aiNotice}
        guidedPlayback={props.guidedPlayback}
        offering={props.offering}
        onOpenReference={props.onOpenReference}
        showArtwork={props.showArtwork}
        showGuidance={props.showGuidance}
        step={props.step}
      />
      <RepetitionFeedback step={props.step} />
      <ReadingFruit
        aiNotice={props.aiNotice}
        fruit={props.fruit}
        guidedPlayback={props.guidedPlayback}
        onOpenReference={props.onOpenReference}
        showArtwork={props.showArtwork}
      />
      {props.aiNotice.open ? (
        <AiTranslationNotice
          onClose={props.aiNotice.onToggle}
          onOpenSource={(sourceId) => props.onOpenReference(apparatusReferenceTarget(sourceId))}
        />
      ) : null}
      <PrayerBody
        dense={props.dense}
        guidedPlayback={props.guidedPlayback}
        key={noticeKeyOf(props.step)}
        onOpenBibleVerse={props.onOpenBibleVerse}
        onOpenReference={props.onOpenReference}
        scriptureRef={props.scriptureRef}
        showDropCaps={props.showDropCaps}
        showScriptureReading={props.showScriptureReading}
        step={props.step}
      />
    </article>
  );
}

export function PrayerReadingPage({
  aiNotice,
  session,
}: {
  readonly aiNotice: MarkToggle;
  readonly session: PrayerFocusSession;
}) {
  const { display, fit, fruit, onOpenBibleVerse, onOpenReference, playback, preferences, refs } =
    session;

  return (
    <ReadingPage
      aiNotice={aiNotice}
      dense={fit.dense}
      fruit={fruit}
      guidedPlayback={playback}
      offering={display.offering}
      onOpenBibleVerse={onOpenBibleVerse}
      onOpenReference={onOpenReference}
      pendantOverhang={session.pendantOverhang}
      readingRef={refs.reading}
      scriptureRef={refs.scripture}
      showArtwork={fit.showArtwork}
      showDropCaps={preferences.showDropCaps}
      showGuidance={fit.showGuidance}
      showScriptureReading={display.showScriptureReading}
      step={display.step}
    />
  );
}
