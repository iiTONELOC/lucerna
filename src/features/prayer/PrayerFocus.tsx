import { useState, useSyncExternalStore, type CSSProperties, type RefObject } from 'react';
import { contentCatalog } from '../../content/catalog.ts';
import type { MysteryReflection, ScriptureRedSpan } from '../../content/schema.ts';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { classNames } from '../../shared/classNames.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { AmbientGround } from '../../components/art/AmbientGround.tsx';
import { ArtworkCreditLine } from '../../components/art/ArtworkCreditLine.tsx';
import { SettingsButton } from '../../components/buttons/SettingsButton.tsx';
import { CitationLink } from '../../components/links/CitationLink.tsx';
import { RedLetterNotice } from '../../components/RedLetterNotice.tsx';
import { type BibleVerseLocation } from '../library/model.ts';
import {
  apparatusReferenceTarget,
  guidanceReferenceTarget,
  reflectionReferenceTarget,
  rosaryTextReferenceTarget,
  type ReferenceTarget,
} from '../references/referenceCatalog.ts';
import { activeTargetOf, DrapeAlignment, type DrapeGeometry } from './drape.ts';
import { guidedText, redMarkOf, scriptureRedOf, type RedMark } from './guidedText.tsx';
import {
  bodyFor,
  offeringLabelOf,
  usePrayerFocusSession,
  type ControlsBundle,
  type DrapeProps,
  type HeadingProps,
  type MysteryFruit,
  type PrayerFocusProps,
  type PrayerFocusSession,
} from './prayerSession.ts';
import { StepArchetype, type PrayerStep } from './progression.ts';
import { RosaryDrape } from './RosaryDrape.tsx';
import { GuidedPlaybackPhase } from './playbackSequence.ts';
import { loopBandBottomOf, type NotesCollision } from './useNotesCollision.ts';
import { pendantLeftOf, type PendantOverhang } from './usePendantOverhang.ts';
import { SCROLL_FALLBACK_MAXIMUM_HEIGHT } from './usePrayerFit.ts';
import type { GuidedPlayback } from './useGuidedPlayback.ts';

const ARTWORK_MINIMUM_HEIGHT = 200;
const STAGE_MAXIMUM_HEIGHT = 896;
const LANDSCAPE_STAGE_MINIMUM_HEIGHT = 516;

const FOOTER_ACTION_CLASS_NAME =
  'min-h-11 px-2 ' + SUBTITLE_CLASS_NAME + ' transition-colors focus-ring';

const NOTE_BODY_CLASS_NAME = CITATION_CLASS_NAME + ' min-w-0 text-secondary';
const NOTE_EYEBROW_ON_ART_CLASS_NAME = SUBTITLE_CLASS_NAME + ' font-semibold text-on-art-accent';
const NOTE_BODY_ON_ART_CLASS_NAME = CITATION_CLASS_NAME + ' min-w-0 text-on-art-secondary';
const DROP_CAP_CLASS_NAME =
  'first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:font-display first-letter:text-[3.5em] first-letter:leading-[0.78] first-letter:font-medium first-letter:text-accent spread:first-letter:text-[3.75em] spread:first-letter:leading-[0.76]';

type OverhangStyle = CSSProperties & {
  readonly '--pendant-overhang-width': string;
};

const overhangStyleOf = (overhang: PendantOverhang): OverhangStyle => ({
  '--pendant-overhang-width': String(overhang.width) + 'px',
});

type StageStyle = CSSProperties & {
  readonly '--drape-aspect': string;
  readonly '--prayer-stage-maximum-height': string;
  readonly '--prayer-stage-minimum-height': string;
  readonly '--prayer-artwork-minimum-height': string;
  readonly '--drape-pendant-left': string;
  readonly '--prayer-landscape-minimum-height': string;
};

const stageStyleOf = (geometry: DrapeGeometry): StageStyle => ({
  '--drape-aspect': String(geometry.viewBox.width) + ' / ' + String(geometry.viewBox.height),
  '--prayer-stage-maximum-height': String(STAGE_MAXIMUM_HEIGHT) + 'px',
  '--prayer-stage-minimum-height': String(SCROLL_FALLBACK_MAXIMUM_HEIGHT) + 'px',
  '--prayer-artwork-minimum-height': String(ARTWORK_MINIMUM_HEIGHT) + 'px',
  '--drape-pendant-left': String(pendantLeftOf(geometry)),
  '--prayer-landscape-minimum-height': String(LANDSCAPE_STAGE_MINIMUM_HEIGHT) + 'px',
});

function PrayerHeading({
  dense,
  headingRef,
  rubric,
  title,
}: HeadingProps & {
  readonly dense: boolean;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
}) {
  return (
    <header
      className={classNames(
        'relative z-10 col-start-1 row-start-1 flex min-w-0 flex-col gap-1',
        dense
          ? 'px-4 pt-3 pb-2 landscape:px-5 landscape:pt-3 landscape:pb-1'
          : 'px-4 pt-2 pb-1 sm:px-6 sm:pt-3 landscape:px-6 landscape:pt-4 landscape:pb-2 spread:px-8 spread:pt-8 spread:pb-4',
      )}
    >
      <p className={EYEBROW_CLASS_NAME}>{rubric}</p>
      <h1
        className={TITLE_CLASS_NAME + ' wrap-break-word focus:outline-none'}
        ref={headingRef}
        tabIndex={-1}
      >
        {title}
      </h1>
    </header>
  );
}

function Drape({
  drapeRef,
  ...props
}: DrapeProps & { readonly drapeRef: RefObject<HTMLDivElement | null> }) {
  return (
    <div
      ref={drapeRef}
      className="drape-relief pointer-events-none absolute inset-x-0 -top-2 z-30 aspect-(--drape-aspect) landscape:top-0.5"
    >
      <div className="pointer-events-none size-full">
        <RosaryDrape
          alignment={DrapeAlignment.TailRight}
          anchors={props.anchors}
          geometry={props.geometry}
          onSelect={props.onSelect}
          prayedThroughBeadIndex={props.prayedThroughBeadIndex}
          target={activeTargetOf(props.geometry, props.anchor)}
        />
      </div>
    </div>
  );
}

function DrapeBandSizer({ geometry }: { readonly geometry: DrapeGeometry }) {
  const bandHeight = loopBandBottomOf(geometry) - geometry.viewBox.y;
  const viewBox = ['0', '0', String(geometry.viewBox.width), String(bandHeight)].join(' ');

  return <svg aria-hidden="true" className="block w-full landscape:hidden" viewBox={viewBox} />;
}

type ArtworkCreditProps = {
  readonly artwork: PrayerFocusSession['display']['artwork'];
  readonly onOpenArtwork: (artworkId: string) => void;
};

function ArtworkCredit({ artwork, onOpenArtwork }: ArtworkCreditProps) {
  return (
    <figcaption className="min-w-0 shrink-0 px-4 pt-2 sm:px-6 landscape:px-0 landscape:pt-3">
      <ArtworkCreditLine artwork={artwork} onOpenArtwork={onOpenArtwork} />
    </figcaption>
  );
}

type ArtworkPageProps = {
  readonly artwork: PrayerFocusSession['display']['artwork'];
  readonly artworkRef: RefObject<HTMLDivElement | null>;
  readonly drape: DrapeProps;
  readonly drapeRef: RefObject<HTMLDivElement | null>;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly notes: AuxiliaryPlaybackNotesProps;
  readonly notesCollision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
  readonly showArtwork: boolean;
  readonly source: string;
};

function ReadingNotes({
  showArtwork,
  ...notes
}: AuxiliaryPlaybackNotesProps & { readonly showArtwork: boolean }) {
  const landscape = useLandscape();

  if ((showArtwork && !landscape) || !hasAuxiliaryNotes(notes)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <AuxiliaryPlaybackNotes {...notes} />
    </div>
  );
}

type CollapsedNotesStyle = CSSProperties & {
  readonly '--notes-collapsed-height': string;
};

const collapsedNotesStyleOf = (collision: NotesCollision): CollapsedNotesStyle => ({
  '--notes-collapsed-height': String(collision.collapsedHeight) + 'px',
});

const scrolledToEnd = (element: HTMLElement): boolean =>
  element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

function CollapsedNotesBox({
  collision,
  notesRef,
  ...props
}: AuxiliaryPlaybackNotesProps & {
  readonly collision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
}) {
  const [atEnd, setAtEnd] = useState(false);

  return (
    <div className="relative max-w-full min-w-0">
      <div
        ref={notesRef}
        className={classNames(
          ON_ART_NOTE_CLASS_NAME,
          'scroll-region max-h-(--notes-collapsed-height) overflow-y-auto',
        )}
        onScroll={(event) => setAtEnd(scrolledToEnd(event.currentTarget))}
        style={collapsedNotesStyleOf(collision)}
      >
        <AuxiliaryPlaybackNotes {...props} onArt />
      </div>
      <Chevron
        className="pointer-events-none absolute right-1.5 bottom-1.5 size-4 text-on-art-muted"
        direction={atEnd ? ChevronDirection.Up : ChevronDirection.Down}
      />
    </div>
  );
}

function ArtworkNotes({
  collision,
  notesRef,
  ...props
}: AuxiliaryPlaybackNotesProps & {
  readonly collision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
}) {
  const landscape = useLandscape();
  const single = auxiliaryNoteCountOf(props) === 1;
  const collapsed = collision.collides && !single;

  if (landscape || !hasAuxiliaryNotes(props)) {
    return null;
  }

  return (
    <div
      className={classNames(
        collision.collides && single && 'invisible',
        collapsed ? 'z-40' : 'z-10',
        'absolute inset-x-0 bottom-0 flex pl-4 pr-[max(1rem,calc(100cqw*(1-var(--drape-pendant-left))-var(--artwork-inset)+0.5rem))] sm:pl-6 sm:pr-[max(1.5rem,calc(100cqw*(1-var(--drape-pendant-left))-var(--artwork-inset)+0.5rem))]',
      )}
    >
      {collapsed ? (
        <CollapsedNotesBox {...props} collision={collision} notesRef={notesRef} />
      ) : (
        <div ref={notesRef} className={ON_ART_NOTE_CLASS_NAME}>
          <AuxiliaryPlaybackNotes {...props} onArt />
        </div>
      )}
    </div>
  );
}

function ArtworkPage({
  artwork,
  artworkRef,
  drape,
  drapeRef,
  notes,
  notesCollision,
  notesRef,
  onOpenArtwork,
  showArtwork,
  source,
}: ArtworkPageProps) {
  return (
    <figure
      aria-label="Devotional artwork"
      className="relative isolate z-20 col-start-1 row-start-2 m-0 flex min-h-0 min-w-0 flex-col p-(--artwork-inset) [--artwork-inset:0px] @container landscape:col-start-2 landscape:row-start-1 landscape:row-span-2 landscape:border-l landscape:border-hairline landscape:[--artwork-inset:1rem] lg:[--artwork-inset:1.5rem]"
      data-layout-region="artwork"
    >
      <div
        className={classNames(
          'relative min-h-0 flex-1 flex-col',
          showArtwork ? 'flex' : 'hidden landscape:flex',
        )}
      >
        <div
          ref={artworkRef}
          className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden landscape:rounded-xl spread:ring-1 spread:ring-accent/30 spread:ring-inset"
        >
          <img
            alt={artwork.title + ' by ' + artwork.artist}
            className="absolute inset-0 size-full object-cover object-top"
            decoding="async"
            height={artwork.height}
            src={source}
            width={artwork.width}
          />
          {showArtwork ? (
            <ArtworkNotes {...notes} collision={notesCollision} notesRef={notesRef} />
          ) : null}
        </div>

        <ArtworkCredit artwork={artwork} onOpenArtwork={onOpenArtwork} />
      </div>

      {showArtwork ? null : <DrapeBandSizer geometry={drape.geometry} />}
      <Drape {...drape} drapeRef={drapeRef} />
    </figure>
  );
}

type NoteLineProps = {
  readonly illuminated: boolean;
  readonly label: string;
  readonly phase: GuidedPlaybackPhase;
  readonly text: string;
  readonly attribution?: string;
  readonly onArt: boolean;
  readonly onOpenAttribution?: () => void;
};

function NoteLine({
  illuminated,
  label,
  phase,
  text,
  attribution,
  onArt,
  onOpenAttribution,
}: NoteLineProps) {
  return (
    <p
      className="flex w-fit max-w-full min-w-0 self-start flex-wrap items-baseline gap-x-2 rounded-sm border-2 border-transparent border-l-accent-current/50 px-3 py-0.5 transition-colors duration-300 data-[playback-active=true]:border-accent-current motion-reduce:transition-none"
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={phase}
    >
      <span className={onArt ? NOTE_EYEBROW_ON_ART_CLASS_NAME : EYEBROW_CLASS_NAME}>{label}</span>
      <span className={onArt ? NOTE_BODY_ON_ART_CLASS_NAME : NOTE_BODY_CLASS_NAME}>
        {text}
        {attribution === undefined || onOpenAttribution === undefined ? null : (
          <>
            {' '}
            <CitationLink label={attribution} onArt={onArt} onOpen={onOpenAttribution} />
          </>
        )}
      </span>
    </p>
  );
}

function FruitLine({
  fruit,
  illuminated,
  onArt,
  onOpenReference,
}: {
  readonly fruit: MysteryFruit;
  readonly illuminated: boolean;
  readonly onArt: boolean;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}) {
  return (
    <p
      className={classNames(
        SUBTITLE_CLASS_NAME +
          ' w-fit max-w-full rounded-sm border-2 border-transparent px-2 py-0.5 text-center font-semibold transition-colors duration-300 landscape:mt-1 data-[playback-active=true]:border-accent-current motion-reduce:transition-none',
        onArt ? 'text-on-art-accent' : 'text-accent-current',
      )}
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={GuidedPlaybackPhase.Fruit}
    >
      <span>Fruit of the Mystery</span>
      <span>{' · ' + fruit.text}</span>{' '}
      <CitationLink
        label={contentCatalog.sourceById(fruit.sourceId).work}
        onArt={onArt}
        onOpen={() => onOpenReference(rosaryTextReferenceTarget(fruit.sourceId))}
      />
    </p>
  );
}

function RepetitionFeedback({ step }: { readonly step: PrayerStep }) {
  if (step.archetype !== StepArchetype.CountedRepetition) {
    return null;
  }

  const label = 'Hail Mary ' + String(step.repetition) + ' of ' + String(step.repetitionTotal);

  return (
    <section aria-label={label} className="flex flex-col gap-2">
      <p className={EYEBROW_CLASS_NAME}>{label}</p>
      <ol aria-label="Hail Mary repetition progress" className="flex flex-wrap gap-2">
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
              <span className="sr-only">
                {'Hail Mary ' + String(repetition) + (complete ? ' complete' : ' upcoming')}
              </span>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function PlaybackIcon({ playing }: { readonly playing: boolean }) {
  return playing ? (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <rect height="12" rx="1" width="3.4" x="3" y="2" />
      <rect height="12" rx="1" width="3.4" x="9.6" y="2" />
    </svg>
  ) : (
    <svg aria-hidden="true" className="size-4" fill="currentColor" viewBox="0 0 16 16">
      <path d="M4.5 2.5v11l9-5.5z" />
    </svg>
  );
}

function PlaybackButton({
  onToggle,
  playing,
}: {
  readonly onToggle: () => void;
  readonly playing: boolean;
}) {
  const label = playing ? 'Pause guided prayer' : 'Begin guided prayer';

  return (
    <button
      aria-label={label}
      aria-pressed={playing}
      className="flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-accent-current focus-ring"
      data-playback-control="true"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <PlaybackIcon playing={playing} />
    </button>
  );
}

function PrayerControls({ actions, state }: ControlsBundle) {
  return (
    <footer
      className="relative z-20 flex min-h-11 shrink-0 items-center gap-1 px-2 sm:min-h-12 sm:px-0 sm:pt-2"
      data-layout-region="controls"
    >
      <button
        className={FOOTER_ACTION_CLASS_NAME + ' text-muted hover:text-foreground'}
        onClick={actions.onExit}
        type="button"
      >
        Exit
      </button>

      <PlaybackButton onToggle={actions.onTogglePlayback} playing={state.playing} />
      <SettingsButton onOpen={actions.onOpenSettings} />

      <span className="min-w-0 flex-1" />

      <button
        className={
          FOOTER_ACTION_CLASS_NAME +
          ' text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-30'
        }
        disabled={state.atStart}
        onClick={actions.onBack}
        type="button"
      >
        Back
      </button>
      <button
        className={
          FOOTER_ACTION_CLASS_NAME +
          ' text-accent-current underline decoration-accent-current underline-offset-8 hover:text-accent-strong'
        }
        onClick={actions.onForward}
        type="button"
      >
        {state.atEnd ? 'Finish' : 'Continue'}
      </button>
    </footer>
  );
}

type ReadingPageProps = {
  readonly dense: boolean;
  readonly fruit: MysteryFruit | null;
  readonly guidedPlayback: GuidedPlayback;
  readonly offering: MysteryReflection | null;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly pendantOverhang: PendantOverhang;
  readonly readingRef: RefObject<HTMLElement | null>;
  readonly scriptureRef: RefObject<HTMLParagraphElement | null>;
  readonly showArtwork: boolean;
  readonly showDropCaps: boolean;
  readonly showGuidance: boolean;
  readonly showScriptureReading: boolean;
  readonly step: PrayerStep;
};

type PrayerBodyProps = {
  readonly dense: boolean;
  readonly guidedPlayback: GuidedPlayback;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly scriptureRef: RefObject<HTMLParagraphElement | null>;
  readonly showDropCaps: boolean;
  readonly showScriptureReading: boolean;
  readonly step: PrayerStep;
};

type AuxiliaryPlaybackNotesProps = Pick<
  ReadingPageProps,
  'guidedPlayback' | 'offering' | 'onOpenReference' | 'showGuidance' | 'step'
> & { readonly onArt?: boolean | undefined };

const ON_ART_NOTE_CLASS_NAME =
  'flex w-fit max-w-prose flex-col rounded-lg bg-black/55 p-0.5 text-shadow-lg text-shadow-black/80 backdrop-blur-xs';

const LANDSCAPE_QUERY = '(orientation: landscape)';

const subscribeToLandscape = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(LANDSCAPE_QUERY);

  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

const useLandscape = (): boolean =>
  useSyncExternalStore(
    subscribeToLandscape,
    () => window.matchMedia(LANDSCAPE_QUERY).matches,
    () => false,
  );

type AuxiliaryNoteSelection = Pick<
  AuxiliaryPlaybackNotesProps,
  'offering' | 'showGuidance' | 'step'
>;

const auxiliaryNoteCountOf = ({ offering, showGuidance, step }: AuxiliaryNoteSelection): number =>
  Number(showGuidance && step.guidance !== undefined) + Number(offering !== null);

const hasAuxiliaryNotes = (selection: AuxiliaryNoteSelection): boolean =>
  auxiliaryNoteCountOf(selection) > 0;

function AuxiliaryPlaybackNotes({
  guidedPlayback,
  offering,
  onArt = false,
  onOpenReference,
  showGuidance,
  step,
}: AuxiliaryPlaybackNotesProps) {
  const guidance = step.guidance;

  return (
    <>
      {showGuidance && guidance !== undefined ? (
        <NoteLine
          attribution={contentCatalog.sourceById(guidance.sourceId).work}
          illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Guidance}
          label="Guidance"
          onArt={onArt}
          onOpenAttribution={() => onOpenReference(guidanceReferenceTarget(guidance))}
          phase={GuidedPlaybackPhase.Guidance}
          text={guidance.text}
        />
      ) : null}
      {offering?.text === undefined ? null : (
        <NoteLine
          attribution={contentCatalog.sourceById(offering.sourceId).work}
          illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Offering}
          label={offeringLabelOf(offering)}
          onArt={onArt}
          onOpenAttribution={() => onOpenReference(reflectionReferenceTarget(offering))}
          phase={GuidedPlaybackPhase.Offering}
          text={offering.text}
        />
      )}
    </>
  );
}

const bibleBookIdForName = (name: string): string | null =>
  contentCatalog.bible.books.find((book) => book.name === name || book.name.startsWith(`${name} `))
    ?.id ?? null;

function SourceCitation({
  onOpenBibleVerse,
  onOpenReference,
  step,
}: Pick<PrayerBodyProps, 'onOpenBibleVerse' | 'onOpenReference' | 'step'>) {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    const scripture = step.mystery.scripture;
    const bookId = bibleBookIdForName(scripture.book);

    if (bookId === null) {
      return scripture.reference;
    }

    return (
      <CitationLink
        label={scripture.reference}
        onArt={false}
        onOpen={() =>
          onOpenBibleVerse(bookId, { chapter: scripture.chapter, verse: scripture.verseStart })
        }
      />
    );
  }

  const prayer = contentCatalog.prayerById(step.prayerId);

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
  return (
    <p
      ref={scriptureRef}
      className={classNames(
        SCRIPTURE_CLASS_NAME + ' max-w-prose text-pretty pr-(--pendant-overhang-width)',
        showDropCaps && !dense && DROP_CAP_CLASS_NAME,
      )}
    >
      {guidedText(bodyFor(step), guidedPlayback, red, mark)}
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
        CITATION_CLASS_NAME + ' text-muted italic landscape:mt-auto',
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
          onOpenSource={(sourceId) => onOpenReference(apparatusReferenceTarget(sourceId))}
          redLetter={contentCatalog.bible.redLetter}
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
  fruit,
  guidedPlayback,
  onOpenReference,
  showArtwork,
}: Pick<ReadingPageProps, 'fruit' | 'guidedPlayback' | 'onOpenReference' | 'showArtwork'>) {
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
        fruit={fruit}
        illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Fruit}
        onArt={false}
        onOpenReference={onOpenReference}
      />
    </div>
  );
}

function ReadingPage(props: ReadingPageProps) {
  return (
    <article
      ref={props.readingRef}
      aria-label="Prayer text"
      className={classNames(
        'scroll-region relative z-10 col-start-1 row-start-3 flex max-h-full min-h-0 min-w-0 flex-col overflow-y-auto landscape:row-start-2',
        props.dense
          ? 'gap-1 px-4 pt-2 pb-3 sm:px-5 landscape:gap-1 landscape:px-5 landscape:py-2'
          : 'gap-2 px-4 pt-3 pb-4 sm:gap-3 sm:px-6 landscape:gap-2 landscape:px-6 landscape:pt-0 landscape:pb-4 spread:gap-4 spread:px-8 spread:pt-1 spread:pb-8',
        !props.showArtwork && 'pr-14 sm:pr-16 landscape:pr-6 spread:pr-8',
      )}
      data-layout-region="reading"
      style={overhangStyleOf(props.pendantOverhang)}
    >
      <ReadingNotes
        guidedPlayback={props.guidedPlayback}
        offering={props.offering}
        onOpenReference={props.onOpenReference}
        showArtwork={props.showArtwork}
        showGuidance={props.showGuidance}
        step={props.step}
      />
      <RepetitionFeedback step={props.step} />
      <ReadingFruit
        fruit={props.fruit}
        guidedPlayback={props.guidedPlayback}
        onOpenReference={props.onOpenReference}
        showArtwork={props.showArtwork}
      />
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

function PrayerReadingPage({ session }: { readonly session: PrayerFocusSession }) {
  const { display, fit, fruit, onOpenBibleVerse, onOpenReference, playback, preferences, refs } =
    session;

  return (
    <ReadingPage
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

function PrayerBook({ session }: { readonly session: PrayerFocusSession }) {
  const { display, drape, fit, onOpenArtwork, refs } = session;

  return (
    <div
      ref={refs.surface}
      className={classNames(
        'relative grid max-h-full min-h-0 flex-1 grid-cols-1 overflow-hidden rounded-xl border border-hairline bg-background/45 shadow-2xl backdrop-blur-sm landscape:grid-cols-[minmax(0,1fr)_minmax(0,0.92fr)] landscape:grid-rows-[max-content_minmax(0,1fr)]',
        fit.showArtwork
          ? 'grid-rows-[max-content_minmax(var(--prayer-artwork-minimum-height),1fr)_minmax(0,max-content)]'
          : 'grid-rows-[max-content_max-content_minmax(0,1fr)]',
      )}
      data-layout-region="surface"
    >
      <PrayerHeading
        dense={fit.dense}
        headingRef={refs.heading}
        rubric={display.heading.rubric}
        title={display.heading.title}
      />
      <ArtworkPage
        artwork={display.artwork}
        artworkRef={refs.artwork}
        drape={drape}
        drapeRef={refs.drape}
        notes={{
          guidedPlayback: session.playback,
          offering: display.offering,
          onOpenReference: session.onOpenReference,
          showGuidance: fit.showGuidance,
          step: display.step,
        }}
        notesCollision={session.notesCollision}
        notesRef={refs.notes}
        onOpenArtwork={onOpenArtwork}
        showArtwork={fit.showArtwork}
        source={display.source}
      />
      <PrayerReadingPage session={session} />
    </div>
  );
}

function PrayerFocusStage({ session }: { readonly session: PrayerFocusSession }) {
  const { controls, display, drape, fit, preferences, refs } = session;

  return (
    <section
      ref={refs.stage}
      aria-label="Rosary prayer"
      className="scroll-region relative h-full min-h-0 overflow-hidden text-foreground landscape:overflow-y-auto"
      data-bead-material={preferences.beadMaterial}
      style={stageStyleOf(drape.geometry)}
    >
      <AmbientGround source={display.source} />

      <div
        className={classNames(
          'relative z-10 mx-auto flex h-full w-full max-w-160 flex-col pt-safe-top pb-safe-bottom landscape:max-w-360',
          fit.dense ? 'py-2 sm:p-2' : 'py-2 sm:p-3 landscape:p-2 spread:p-5',
        )}
      >
        <div className="flex min-h-0 flex-1 flex-col landscape:my-auto landscape:h-full landscape:max-h-(--prayer-stage-maximum-height) landscape:min-h-(--prayer-landscape-minimum-height)">
          <PrayerBook session={session} />
          <PrayerControls actions={controls.actions} state={controls.state} />
        </div>
      </div>
    </section>
  );
}

export function PrayerFocus(props: PrayerFocusProps) {
  const session = usePrayerFocusSession(props);

  return <PrayerFocusStage session={session} />;
}
