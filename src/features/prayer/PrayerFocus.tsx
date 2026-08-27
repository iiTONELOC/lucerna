import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type CSSProperties,
  type ReactNode,
  type RefObject,
} from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import {
  CatalogLookupError,
  CatalogLookupErrorCode,
  contentCatalog,
  type ResolvedArtwork,
  type ResolvedMystery,
} from '../../content/catalog.ts';
import type { Preferences } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  AMBIENT_SCRIM_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { guidanceReferenceTarget, type ReferenceTarget } from '../references/referenceCatalog.ts';
import { SettingsGlyph } from '../shell/Navigation.tsx';
import {
  activeTargetOf,
  beadSlotsOf,
  createDrapeGeometry,
  DrapeAlignment,
  PENDANT_BEAD_COUNT,
  type DrapeGeometry,
} from './drape.ts';
import {
  advance,
  createProgression,
  currentStep,
  isAtEnd,
  isAtStart,
  jumpTo,
  nonBeadAnchorsOf,
  PrayerId,
  retreat,
  StepArchetype,
  stepIndexForAnchor,
  type NonBeadAnchor,
  type PrayerStep,
  type Progression,
  type StepAnchorPoint,
} from './progression.ts';
import { RosaryDrape } from './RosaryDrape.tsx';
import { GuidedPlaybackPhase } from './playbackSequence.ts';
import { useGuidedPlayback, type GuidedPlayback } from './useGuidedPlayback.ts';

const ORDINAL_WORD: readonly string[] = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
const HEADING_CLEARANCE_RADII = 2.2;
const ARTWORK_MINIMUM_HEIGHT = 200;
const OVERFLOW_TOLERANCE = 1;
const SCROLL_FALLBACK_MAXIMUM_HEIGHT = 640;
const STAGE_MAXIMUM_HEIGHT = 896;
const LANDSCAPE_STAGE_MINIMUM_HEIGHT = 516;
const UINT32_RANGE = 2 ** 32;

const ACTION_CLASS_NAME =
  'min-h-11 px-2 ' +
  SUBTITLE_CLASS_NAME +
  ' transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

const CREDIT_CLASS_NAME = CITATION_CLASS_NAME + ' wrap-break-word text-muted italic';
const NOTE_BODY_CLASS_NAME = CITATION_CLASS_NAME + ' min-w-0 text-secondary';
const NOTE_EYEBROW_ON_ART_CLASS_NAME = SUBTITLE_CLASS_NAME + ' font-semibold text-on-art-accent';
const NOTE_BODY_ON_ART_CLASS_NAME = CITATION_CLASS_NAME + ' min-w-0 text-on-art-secondary';
const TOUCH_LINK_CLASS_NAME =
  "relative underline decoration-hairline underline-offset-4 transition-colors after:absolute after:-inset-y-3.5 after:inset-x-0 after:content-['']";

const DROP_CAP_CLASS_NAME =
  'first-letter:float-left first-letter:mt-1 first-letter:mr-2 first-letter:font-display first-letter:text-[3.5em] first-letter:leading-[0.78] first-letter:font-medium first-letter:text-accent spread:first-letter:text-[3.75em] spread:first-letter:leading-[0.76]';

type StageStyle = CSSProperties & {
  readonly '--drape-aspect': string;
  readonly '--prayer-stage-maximum-height': string;
  readonly '--prayer-stage-minimum-height': string;
  readonly '--prayer-artwork-minimum-height': string;
  readonly '--drape-pendant-size': string;
  readonly '--prayer-landscape-minimum-height': string;
};

const classNames = (...values: readonly (false | string | undefined)[]): string =>
  values.filter(Boolean).join(' ');

type FitState = {
  readonly key: string;
  readonly dense: boolean;
  readonly hideArtwork: boolean;
  readonly hideGuidance: boolean;
};

type FitRefs = {
  readonly artwork: RefObject<HTMLDivElement | null>;
  readonly reading: RefObject<HTMLElement | null>;
  readonly stage: RefObject<HTMLElement | null>;
  readonly surface: RefObject<HTMLDivElement | null>;
};

type FitResult = {
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

const usePrayerFit = (key: string, guidanceRequested: boolean, refs: FitRefs): FitResult => {
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

const loopBandBottomOf = (geometry: DrapeGeometry): number => {
  const midline = geometry.viewBox.x + geometry.viewBox.width / 2;

  return geometry.beads
    .filter((bead) => bead.beadIndex >= PENDANT_BEAD_COUNT && bead.center.x < midline)
    .reduce(
      (lowest, bead) => Math.max(lowest, bead.center.y + bead.radius * HEADING_CLEARANCE_RADII),
      geometry.viewBox.y,
    );
};

const stageStyleOf = (geometry: DrapeGeometry): StageStyle => ({
  '--drape-aspect': String(geometry.viewBox.width) + ' / ' + String(geometry.viewBox.height),
  '--prayer-stage-maximum-height': String(STAGE_MAXIMUM_HEIGHT) + 'px',
  '--prayer-stage-minimum-height': String(SCROLL_FALLBACK_MAXIMUM_HEIGHT) + 'px',
  '--prayer-artwork-minimum-height': String(ARTWORK_MINIMUM_HEIGHT) + 'px',
  '--drape-pendant-size': String((2 * geometry.crucifix.radius) / geometry.viewBox.width),
  '--prayer-landscape-minimum-height': String(LANDSCAPE_STAGE_MINIMUM_HEIGHT) + 'px',
});

type HeadingProps = {
  readonly rubric: string;
  readonly title: string;
};

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

type DrapeProps = {
  readonly geometry: DrapeGeometry;
  readonly anchor: StepAnchorPoint;
  readonly anchors: readonly NonBeadAnchor[];
  readonly prayedThroughBeadIndex: number;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
};

function Drape(props: DrapeProps) {
  return (
    <div className="drape-relief pointer-events-none absolute inset-x-0 -top-2 z-30 aspect-(--drape-aspect) landscape:top-0.5">
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

function AmbientGround({ source }: { readonly source: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="art-ambient absolute inset-0 size-full object-cover opacity-[0.52]!"
        src={source}
      />
      <div className={AMBIENT_SCRIM_CLASS_NAME} />
    </div>
  );
}

function DrapeBandSizer({ geometry }: { readonly geometry: DrapeGeometry }) {
  const bandHeight = loopBandBottomOf(geometry) - geometry.viewBox.y;
  const viewBox = ['0', '0', String(geometry.viewBox.width), String(bandHeight)].join(' ');

  return <svg aria-hidden="true" className="block w-full landscape:hidden" viewBox={viewBox} />;
}

type ArtworkCreditProps = {
  readonly artwork: ResolvedArtwork;
  readonly onOpenArtwork: (artworkId: string) => void;
};

function ArtworkCredit({ artwork, onOpenArtwork }: ArtworkCreditProps) {
  return (
    <figcaption className="min-w-0 shrink-0 px-4 pt-2 sm:px-6 landscape:px-0 landscape:pt-3">
      <p className={CREDIT_CLASS_NAME}>
        {artwork.artist}, <cite>{artwork.title}</cite> · {artwork.holder}{' '}
        <button
          className={TOUCH_LINK_CLASS_NAME + ' text-muted hover:text-accent-current'}
          onClick={() => onOpenArtwork(artwork.id)}
          type="button"
        >
          View in gallery
        </button>
      </p>
    </figcaption>
  );
}

type ArtworkPageProps = {
  readonly artwork: ResolvedArtwork;
  readonly artworkRef: RefObject<HTMLDivElement | null>;
  readonly drape: DrapeProps;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly notes: AuxiliaryPlaybackNotesProps;
  readonly showArtwork: boolean;
  readonly source: string;
};

function ReadingNotes({
  showArtwork,
  ...notes
}: AuxiliaryPlaybackNotesProps & { readonly showArtwork: boolean }) {
  const landscape = useLandscape();

  if (showArtwork && !landscape) {
    return null;
  }

  return <AuxiliaryPlaybackNotes {...notes} />;
}

function ArtworkNotes(props: AuxiliaryPlaybackNotesProps) {
  const landscape = useLandscape();

  if (landscape || !hasAuxiliaryNotes(props)) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 bottom-0 z-10 flex px-4 sm:px-6">
      <div className={ON_ART_NOTE_CLASS_NAME}>
        <AuxiliaryPlaybackNotes {...props} onArt />
      </div>
    </div>
  );
}

function ArtworkPage({
  artwork,
  artworkRef,
  drape,
  notes,
  onOpenArtwork,
  showArtwork,
  source,
}: ArtworkPageProps) {
  return (
    <figure
      aria-label="Devotional artwork"
      className="relative isolate col-start-1 row-start-2 m-0 flex min-h-0 min-w-0 flex-col landscape:col-start-2 landscape:row-start-1 landscape:row-span-2 landscape:border-l landscape:border-hairline landscape:p-4 lg:p-6"
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
          {showArtwork ? <ArtworkNotes {...notes} /> : null}
        </div>

        <ArtworkCredit artwork={artwork} onOpenArtwork={onOpenArtwork} />
      </div>

      {showArtwork ? null : <DrapeBandSizer geometry={drape.geometry} />}
      <Drape {...drape} />
    </figure>
  );
}

type NoteLineProps = {
  readonly illuminated: boolean;
  readonly label: string;
  readonly text: string;
  readonly attribution?: string;
  readonly onArt: boolean;
  readonly onOpenAttribution?: () => void;
};

function NoteLine({
  illuminated,
  label,
  text,
  attribution,
  onArt,
  onOpenAttribution,
}: NoteLineProps) {
  const linkColors = onArt
    ? ' text-on-art-secondary italic hover:text-on-art-accent'
    : ' text-muted italic hover:text-accent-current';

  return (
    <p
      className="flex w-fit max-w-full min-w-0 self-start flex-wrap items-baseline gap-x-2 rounded-sm border-2 border-transparent border-l-accent-current/50 px-3 py-0.5 transition-colors duration-300 data-[playback-active=true]:border-accent-current motion-reduce:transition-none"
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={GuidedPlaybackPhase.Guidance}
    >
      <span className={onArt ? NOTE_EYEBROW_ON_ART_CLASS_NAME : EYEBROW_CLASS_NAME}>{label}</span>
      <span className={onArt ? NOTE_BODY_ON_ART_CLASS_NAME : NOTE_BODY_CLASS_NAME}>
        {text}
        {attribution === undefined || onOpenAttribution === undefined ? null : (
          <>
            {' '}
            <button
              className={TOUCH_LINK_CLASS_NAME + linkColors}
              onClick={onOpenAttribution}
              type="button"
            >
              {attribution}
            </button>
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
}: {
  readonly fruit: string;
  readonly illuminated: boolean;
  readonly onArt: boolean;
}) {
  return (
    <p
      className={classNames(
        SUBTITLE_CLASS_NAME +
          ' w-fit max-w-full self-start rounded-sm border-2 border-transparent px-2 py-0.5 font-semibold transition-colors duration-300 data-[playback-active=true]:border-accent-current motion-reduce:transition-none',
        onArt ? 'text-on-art-accent' : 'text-accent-current',
      )}
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={GuidedPlaybackPhase.Fruit}
    >
      <span>Fruit of the Mystery</span>
      <span>{' · ' + fruit}</span>
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

type ControlsProps = {
  readonly onExit: () => void;
  readonly onOpenSettings: () => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onTogglePlayback: () => void;
};

type ControlsState = {
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly playing: boolean;
};

type ControlsBundle = {
  readonly actions: ControlsProps;
  readonly state: ControlsState;
};

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
      className="flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-accent-current focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      data-playback-control="true"
      onClick={onToggle}
      title={label}
      type="button"
    >
      <PlaybackIcon playing={playing} />
    </button>
  );
}

function SettingsButton({ onOpen }: { readonly onOpen: () => void }) {
  return (
    <button
      aria-label="Settings"
      className="flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      onClick={onOpen}
      title="Settings"
      type="button"
    >
      <SettingsGlyph className="size-5" />
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
        className={ACTION_CLASS_NAME + ' text-muted hover:text-foreground'}
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
          ACTION_CLASS_NAME +
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
          ACTION_CLASS_NAME +
          ' border-b-2 border-accent-current text-accent-current hover:text-accent-strong'
        }
        onClick={actions.onForward}
        type="button"
      >
        {state.atEnd ? 'Finish' : 'Continue'}
      </button>
    </footer>
  );
}

const guidedText = (text: string, playback: GuidedPlayback): ReactNode => {
  if (playback.paced.words.length === 0) {
    return text;
  }

  return playback.paced.words.map((pacedWord, index) => {
    const current = playback.engaged && index === playback.activeWordIndex;
    const future = playback.engaged && index > playback.activeWordIndex;

    return (
      <span
        className={classNames(
          'cursor-pointer transition-colors duration-300 select-none motion-reduce:transition-none',
          current &&
            'text-accent-current underline decoration-accent-current decoration-[0.08em] underline-offset-[0.12em] [text-shadow:0_0_0.4em_var(--theme-accent-current)] in-data-[theme=light]:text-shadow-none',
          future && 'text-muted',
        )}
        data-playback-word={playbackWordState(current, future)}
        key={String(index) + '-' + pacedWord.word}
        onDoubleClick={() => playback.startAtWord(index)}
      >
        {index === 0 ? '' : ' '}
        {pacedWord.word}
      </span>
    );
  });
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

type ReadingPageProps = {
  readonly dense: boolean;
  readonly fruit: string | null;
  readonly guidedPlayback: GuidedPlayback;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly readingRef: RefObject<HTMLElement | null>;
  readonly showArtwork: boolean;
  readonly showDropCaps: boolean;
  readonly showGuidance: boolean;
  readonly showScriptureReading: boolean;
  readonly step: PrayerStep;
};

type PrayerBodyProps = {
  readonly dense: boolean;
  readonly guidedPlayback: GuidedPlayback;
  readonly showDropCaps: boolean;
  readonly showScriptureReading: boolean;
  readonly step: PrayerStep;
};

type AuxiliaryPlaybackNotesProps = Pick<
  ReadingPageProps,
  'fruit' | 'guidedPlayback' | 'onOpenReference' | 'showGuidance' | 'step'
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

const hasAuxiliaryNotes = ({
  fruit,
  showGuidance,
  step,
}: Pick<AuxiliaryPlaybackNotesProps, 'fruit' | 'showGuidance' | 'step'>): boolean =>
  (showGuidance && step.guidance !== undefined) || fruit !== null;

function AuxiliaryPlaybackNotes({
  fruit,
  guidedPlayback,
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
          text={guidance.text}
        />
      ) : null}
      {fruit === null ? null : (
        <FruitLine
          fruit={fruit}
          illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Fruit}
          onArt={onArt}
        />
      )}
    </>
  );
}

function PrayerBody({
  dense,
  guidedPlayback,
  showDropCaps,
  showScriptureReading,
  step,
}: PrayerBodyProps) {
  if (!showScriptureReading) {
    return null;
  }

  return (
    <>
      <p
        className={classNames(
          SCRIPTURE_CLASS_NAME + ' max-w-prose text-pretty',
          showDropCaps && !dense && DROP_CAP_CLASS_NAME,
        )}
      >
        <span
          aria-hidden="true"
          className="float-right aspect-square w-[calc(var(--drape-pendant-size)*100%)] [shape-outside:circle(50%)] landscape:hidden"
        />
        {guidedText(bodyFor(step), guidedPlayback)}
      </p>
      <p
        className={classNames(
          CITATION_CLASS_NAME + ' text-muted italic landscape:mt-auto',
          dense ? 'pt-0' : 'landscape:pt-0 spread:pt-2',
        )}
      >
        {sourceFor(step)}
      </p>
    </>
  );
}

function ReadingPage({
  dense,
  fruit,
  guidedPlayback,
  onOpenReference,
  readingRef,
  showArtwork,
  showDropCaps,
  showGuidance,
  showScriptureReading,
  step,
}: ReadingPageProps) {
  return (
    <article
      ref={readingRef}
      aria-label="Prayer text"
      className={classNames(
        'scroll-region relative z-10 col-start-1 row-start-3 flex max-h-full min-h-0 min-w-0 flex-col overflow-y-auto landscape:row-start-2',
        dense
          ? 'gap-1 px-4 pt-2 pb-3 sm:px-5 landscape:gap-1 landscape:px-5 landscape:py-2'
          : 'gap-2 px-4 pt-3 pb-4 sm:gap-3 sm:px-6 landscape:gap-2 landscape:px-6 landscape:pt-2 landscape:pb-4 spread:gap-4 spread:px-8 spread:pt-4 spread:pb-8',
        !showArtwork && 'pr-14 sm:pr-16 landscape:pr-6 spread:pr-8',
      )}
      data-layout-region="reading"
    >
      <ReadingNotes
        fruit={fruit}
        guidedPlayback={guidedPlayback}
        onOpenReference={onOpenReference}
        showArtwork={showArtwork}
        showGuidance={showGuidance}
        step={step}
      />
      <RepetitionFeedback step={step} />
      <PrayerBody
        dense={dense}
        guidedPlayback={guidedPlayback}
        showDropCaps={showDropCaps}
        showScriptureReading={showScriptureReading}
        step={step}
      />
    </article>
  );
}

const randomIndex = (length: number): number => {
  const [randomValue = 0] = crypto.getRandomValues(new Uint32Array(1));

  return Math.floor((randomValue / UINT32_RANGE) * length);
};

const shuffled = <Value,>(values: readonly Value[]): Value[] => {
  const result = [...values];

  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomIndex(index + 1);
    const current = result[index];
    const replacement = result[swapIndex];

    if (current !== undefined && replacement !== undefined) {
      result[index] = replacement;
      result[swapIndex] = current;
    }
  }

  return result;
};

const artworkPoolForStep = (
  step: PrayerStep,
  mysteryArtworkByDecade: ReadonlyMap<number, ResolvedArtwork>,
): readonly ResolvedArtwork[] => {
  if (
    step.archetype === StepArchetype.MysteryAnnouncement ||
    (step.decade !== undefined &&
      (step.prayerId === PrayerId.HailMary || step.prayerId === PrayerId.OurFather))
  ) {
    const mysteryArtwork =
      step.decade === undefined ? undefined : mysteryArtworkByDecade.get(step.decade);

    if (mysteryArtwork === undefined) {
      throw new CatalogLookupError(
        CatalogLookupErrorCode.MissingArtwork,
        'artwork',
        `decade ${String(step.decade)}`,
      );
    }

    return [mysteryArtwork];
  }

  const stageArt = contentCatalog.rosary.prayerStageArt[step.prayerId];

  if (stageArt === undefined || stageArt.length === 0) {
    throw new CatalogLookupError(CatalogLookupErrorCode.MissingArtwork, 'artwork', step.prayerId);
  }

  return stageArt;
};

type ArtworkRotation = {
  readonly pool: readonly ResolvedArtwork[];
  queue: ResolvedArtwork[];
  previousId: string | undefined;
};

type ArtworkPrayerStep = Exclude<
  PrayerStep,
  { readonly archetype: StepArchetype.MysteryAnnouncement }
>;

const refillArtworkRotation = (rotation: ArtworkRotation): void => {
  const queue = shuffled(rotation.pool);

  if (queue.length > 1 && queue[0]?.id === rotation.previousId) {
    const first = queue[0];
    const second = queue[1];

    if (first !== undefined && second !== undefined) {
      queue[0] = second;
      queue[1] = first;
    }
  }

  rotation.queue = queue;
};

const mysteryArtworkByDecadeFor = (
  progression: Progression,
): ReadonlyMap<number, ResolvedArtwork> => {
  const mysteryArtworkByDecade = new Map<number, ResolvedArtwork>();

  for (const step of progression.steps) {
    if (step.archetype === StepArchetype.MysteryAnnouncement) {
      mysteryArtworkByDecade.set(
        step.decade,
        requiredArtwork(shuffled(step.mystery.artworks), step.mystery.title),
      );
    }
  }

  return mysteryArtworkByDecade;
};

const requiredArtwork = (pool: readonly ResolvedArtwork[], lookupKey: string): ResolvedArtwork => {
  const artwork = pool[0];

  if (artwork === undefined) {
    throw new CatalogLookupError(CatalogLookupErrorCode.MissingArtwork, 'artwork', lookupKey);
  }

  return artwork;
};

const rotatedArtworkFor = (
  step: ArtworkPrayerStep,
  pool: readonly ResolvedArtwork[],
  rotations: Map<PrayerId, ArtworkRotation>,
): ResolvedArtwork => {
  let rotation = rotations.get(step.prayerId);

  if (rotation === undefined) {
    rotation = { pool, queue: [], previousId: undefined };
    rotations.set(step.prayerId, rotation);
  }

  if (rotation.queue.length === 0) {
    refillArtworkRotation(rotation);
  }

  const artwork = rotation.queue.shift();

  if (artwork === undefined) {
    throw new CatalogLookupError(CatalogLookupErrorCode.MissingArtwork, 'artwork', step.prayerId);
  }

  rotation.previousId = artwork.id;

  return artwork;
};

const plannedArtworkForStep = (
  step: PrayerStep,
  mysteryArtworkByDecade: ReadonlyMap<number, ResolvedArtwork>,
  rotations: Map<PrayerId, ArtworkRotation>,
): ResolvedArtwork => {
  const pool = artworkPoolForStep(step, mysteryArtworkByDecade);

  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return requiredArtwork(pool, step.mystery.title);
  }

  return pool.length === 1
    ? requiredArtwork(pool, step.prayerId)
    : rotatedArtworkFor(step, pool, rotations);
};

const artworkPlanFor = (progression: Progression): readonly ResolvedArtwork[] => {
  const rotations = new Map<PrayerId, ArtworkRotation>();
  const mysteryArtworkByDecade = mysteryArtworkByDecadeFor(progression);

  return progression.steps.map((step) =>
    plannedArtworkForStep(step, mysteryArtworkByDecade, rotations),
  );
};

const mysteryForStep = (mysterySetId: string, step: PrayerStep): ResolvedMystery | null => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return step.mystery;
  }

  if (step.decade === undefined) {
    return null;
  }

  const mystery = contentCatalog.mysterySetById(mysterySetId).mysteries[step.decade - 1];

  if (mystery === undefined) {
    throw new CatalogLookupError(
      CatalogLookupErrorCode.MissingMysterySet,
      'mystery set',
      mysterySetId,
    );
  }

  return mystery;
};

const setShortName = (mysterySetId: string): string =>
  contentCatalog.mysterySetById(mysterySetId).name.replace('The ', '').replace(' Mysteries', '');

const rubricFor = (mysterySetId: string, step: PrayerStep, opening: boolean): string => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return (
      (ORDINAL_WORD[step.mystery.ordinal - 1] ?? '') + ' ' + setShortName(mysterySetId) + ' Mystery'
    );
  }

  if (step.decade !== undefined) {
    return 'Decade in progress';
  }

  return opening ? 'Opening prayer' : 'Closing prayer';
};

const titleFor = (step: PrayerStep): string => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return step.mystery.title;
  }

  if (step.prayerId === PrayerId.FatimaPrayer) {
    return 'O My Jesus';
  }

  return contentCatalog.prayerById(step.prayerId).title;
};

const bodyFor = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement
    ? step.mystery.scripture.text
    : contentCatalog.prayerById(step.prayerId).text;

const sourceFor = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement
    ? step.mystery.scripture.reference
    : contentCatalog.prayerById(step.prayerId).source.work;

type ViewModelRequest = {
  readonly mysterySetId: string;
  readonly progression: Progression;
  readonly setIndex: (stepIndex: number) => void;
  readonly onExit: () => void;
  readonly onOpenSettings: () => void;
};

const progressionFor = (mysterySetId: string, includeFatimaPrayer: boolean): Progression =>
  createProgression(contentCatalog.mysterySetById(mysterySetId), contentCatalog.rosary.guidance, {
    includeFatimaPrayer,
  });

const headingOf = (mysterySetId: string, progression: Progression): HeadingProps => {
  const step = currentStep(progression);
  const announced = progression.steps.findIndex(
    (candidate) => candidate.archetype === StepArchetype.MysteryAnnouncement,
  );

  return {
    rubric: rubricFor(mysterySetId, step, progression.index < announced),
    title: titleFor(step),
  };
};

const drapeOf = (geometry: DrapeGeometry, request: ViewModelRequest): DrapeProps => {
  const { progression, setIndex } = request;

  return {
    anchor: currentStep(progression).anchor,
    anchors: nonBeadAnchorsOf(progression),
    geometry,
    onSelect: (anchor: StepAnchorPoint) => setIndex(stepIndexForAnchor(progression, anchor)),
    prayedThroughBeadIndex:
      progression.stepIndexByBead.filter((stepIndex) => stepIndex <= progression.index).length - 1,
  };
};

const controlsOf = (
  request: ViewModelRequest,
  playback: Pick<GuidedPlayback, 'playing' | 'toggle'>,
): ControlsBundle => {
  const { progression, setIndex, onExit, onOpenSettings } = request;

  return {
    actions: {
      onBack: () => setIndex(retreat(progression).index),
      onExit,
      onForward: () => {
        if (isAtEnd(progression)) {
          onExit();
          return;
        }

        setIndex(advance(progression).index);
      },
      onOpenSettings,
      onTogglePlayback: playback.toggle,
    },
    state: {
      atEnd: isAtEnd(progression),
      atStart: isAtStart(progression),
      playing: playback.playing,
    },
  };
};

type PrayerFocusProps = {
  readonly mysterySetId: string;
  readonly onExit: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenSettings: () => void;
};

type PrayerFocusRefs = FitRefs & {
  readonly heading: RefObject<HTMLHeadingElement | null>;
};

const usePrayerFocusRefs = (): PrayerFocusRefs => ({
  artwork: useRef<HTMLDivElement>(null),
  heading: useRef<HTMLHeadingElement>(null),
  reading: useRef<HTMLElement>(null),
  stage: useRef<HTMLElement>(null),
  surface: useRef<HTMLDivElement>(null),
});

type PrayerPlan = {
  readonly artworkPlan: readonly ResolvedArtwork[];
  readonly geometry: DrapeGeometry;
  readonly progression: Progression;
};

const usePrayerPlan = (
  mysterySetId: string,
  includeFatimaPrayer: boolean,
  index: number,
): PrayerPlan => {
  const base = useMemo(
    () => progressionFor(mysterySetId, includeFatimaPrayer),
    [includeFatimaPrayer, mysterySetId],
  );
  const geometry = useMemo(() => createDrapeGeometry(beadSlotsOf(base)), [base]);
  const artworkPlan = useMemo(() => artworkPlanFor(base), [base]);

  return { artworkPlan, geometry, progression: jumpTo(base, index) };
};

const artworkLookupKeyFor = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement ? step.mystery.title : step.prayerId;

const plannedArtworkAt = (
  artworkPlan: readonly ResolvedArtwork[],
  progression: Progression,
): ResolvedArtwork => {
  const step = currentStep(progression);
  const artwork = artworkPlan[progression.index];

  if (artwork === undefined) {
    throw new CatalogLookupError(
      CatalogLookupErrorCode.MissingArtwork,
      'artwork',
      artworkLookupKeyFor(step),
    );
  }

  return artwork;
};

const fitKeyOf = (
  mysterySetId: string,
  progressionIndex: number,
  preferences: Preferences,
): string =>
  [
    mysterySetId,
    String(progressionIndex),
    String(preferences.textScale),
    String(preferences.showDropCaps),
    String(preferences.showGuidance),
    String(preferences.showMysteryFruits),
    String(preferences.showScriptureReadings),
  ].join(':');

type PrayerDisplay = {
  readonly artwork: ResolvedArtwork;
  readonly fitKey: string;
  readonly heading: HeadingProps;
  readonly mystery: ResolvedMystery | null;
  readonly showGuidance: boolean;
  readonly showScriptureReading: boolean;
  readonly source: string;
  readonly step: PrayerStep;
};

type PrayerDisplayRequest = {
  readonly artworkPlan: readonly ResolvedArtwork[];
  readonly mysterySetId: string;
  readonly preferences: Preferences;
  readonly progression: Progression;
};

const repeatsDecadeGuidance = (step: PrayerStep): boolean =>
  step.archetype === StepArchetype.CountedRepetition &&
  step.decade !== undefined &&
  step.repetition > 1;

const prayerDisplayOf = ({
  artworkPlan,
  mysterySetId,
  preferences,
  progression,
}: PrayerDisplayRequest): PrayerDisplay => {
  const step = currentStep(progression);
  const artwork = plannedArtworkAt(artworkPlan, progression);
  const showScriptureReading =
    step.archetype !== StepArchetype.MysteryAnnouncement || preferences.showScriptureReadings;
  const showGuidance =
    preferences.showGuidance &&
    !repeatsDecadeGuidance(step) &&
    (step.archetype !== StepArchetype.MysteryAnnouncement || showScriptureReading);

  return {
    artwork,
    fitKey: fitKeyOf(mysterySetId, progression.index, preferences),
    heading: headingOf(mysterySetId, progression),
    mystery: mysteryForStep(mysterySetId, step),
    showGuidance,
    showScriptureReading,
    source: resolveArtAsset(artwork.file),
    step,
  };
};

type PrayerPlaybackRequest = {
  readonly display: PrayerDisplay;
  readonly fit: FitResult;
  readonly fruit: string | null;
  readonly playing: boolean;
  readonly progression: Progression;
  readonly readingSpeed: number;
  readonly setIndex: (index: number) => void;
  readonly setPlaying: (playing: boolean) => void;
};

const usePrayerPlayback = ({
  display,
  fit,
  fruit,
  playing,
  progression,
  readingSpeed,
  setIndex,
  setPlaying,
}: PrayerPlaybackRequest): GuidedPlayback =>
  useGuidedPlayback({
    announcement: display.step.archetype === StepArchetype.MysteryAnnouncement,
    fruitText: fruit === null ? '' : `Fruit of the Mystery. ${fruit}.`,
    guidanceText:
      fit.showGuidance && display.step.guidance !== undefined
        ? `Guidance. ${display.step.guidance.text} ${contentCatalog.sourceById(display.step.guidance.sourceId).work}.`
        : '',
    isLastStep: isAtEnd(progression),
    onAdvance: () => setIndex(advance(progression).index),
    onPlayingChange: setPlaying,
    playing,
    readingSpeed,
    stepKey: `${display.fitKey}:${String(fit.showGuidance)}`,
    text: display.showScriptureReading ? bodyFor(display.step) : '',
  });

const viewModelRequestOf = (
  props: PrayerFocusProps,
  progression: Progression,
  setIndex: (index: number) => void,
  playback: Pick<GuidedPlayback, 'pause'>,
): ViewModelRequest => ({
  mysterySetId: props.mysterySetId,
  onExit: props.onExit,
  onOpenSettings: () => {
    playback.pause();
    props.onOpenSettings();
  },
  progression,
  setIndex,
});

const usePrayerFocusReset = (fitKey: string, refs: PrayerFocusRefs): void => {
  useLayoutEffect(() => {
    refs.stage.current?.scrollTo({ top: 0 });
    refs.heading.current?.focus({ preventScroll: true });
  }, [fitKey, refs.heading, refs.stage]);
};

type PrayerFocusSession = {
  readonly controls: ControlsBundle;
  readonly display: PrayerDisplay;
  readonly drape: DrapeProps;
  readonly fit: FitResult;
  readonly fruit: string | null;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly playback: GuidedPlayback;
  readonly preferences: Preferences;
  readonly refs: PrayerFocusRefs;
};

const usePrayerFocusSession = (props: PrayerFocusProps): PrayerFocusSession => {
  const { preferences } = usePreferences();
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const refs = usePrayerFocusRefs();
  const plan = usePrayerPlan(props.mysterySetId, preferences.includeFatimaPrayer, index);
  const display = prayerDisplayOf({
    artworkPlan: plan.artworkPlan,
    mysterySetId: props.mysterySetId,
    preferences,
    progression: plan.progression,
  });
  const fit = usePrayerFit(display.fitKey, display.showGuidance, refs);
  const fruit =
    display.mystery === null || !preferences.showMysteryFruits ? null : display.mystery.fruit;
  const playback = usePrayerPlayback({
    display,
    fit,
    fruit: repeatsDecadeGuidance(display.step) ? null : fruit,
    playing,
    progression: plan.progression,
    readingSpeed: preferences.readingSpeed,
    setIndex,
    setPlaying,
  });
  const request = viewModelRequestOf(props, plan.progression, setIndex, playback);

  usePrayerFocusReset(display.fitKey, refs);

  return {
    controls: controlsOf(request, playback),
    display,
    drape: drapeOf(plan.geometry, request),
    fit,
    fruit,
    onOpenArtwork: (artworkId) => {
      playback.pause();
      props.onOpenArtwork(artworkId);
    },
    onOpenReference: (target) => {
      playback.pause();
      props.onOpenReference(target);
    },
    playback,
    preferences,
    refs,
  };
};

function PrayerReadingPage({ session }: { readonly session: PrayerFocusSession }) {
  const { display, fit, fruit, onOpenReference, playback, preferences, refs } = session;

  return (
    <ReadingPage
      dense={fit.dense}
      fruit={fruit}
      guidedPlayback={playback}
      onOpenReference={onOpenReference}
      readingRef={refs.reading}
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
        notes={{
          fruit: session.fruit,
          guidedPlayback: session.playback,
          onOpenReference: session.onOpenReference,
          showGuidance: fit.showGuidance,
          step: display.step,
        }}
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
