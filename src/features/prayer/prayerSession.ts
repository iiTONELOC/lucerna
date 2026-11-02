import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import type { MarkToggle } from '../../components/marks/Marks.tsx';
import {
  CatalogLookupError,
  CatalogLookupErrorCode,
  type ResolvedArtwork,
  type ResolvedMystery,
} from '../../content/catalog.ts';
import { useReading, type ReadingSnapshot } from '../../content/reading.ts';
import type { MysteryReflection } from '../../content/schema.ts';
import { isShortcutEvent, KeyName, keyNameFrom } from '../../shared/keyboard.ts';
import type { SetPreference } from '../../state/preferences/context.ts';
import {
  READING_SPEED_MAXIMUM,
  READING_SPEED_MINIMUM,
  READING_SPEED_STEP,
  type Preferences,
  type RosaryDisplay,
} from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import type { BibleVerseLocation } from '../library/model.ts';
import type { ReferenceTarget } from '../references/referenceCatalog.ts';
import { artworkPlanFor, featuring, plannedArtworkAt } from './artworkPlan.ts';
import { beadSlotsOf, createDrapeGeometry, type DrapeGeometry } from './drape.ts';
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
  stepIndexForStart,
  type NonBeadAnchor,
  type PrayerStart,
  type PrayerStep,
  type Progression,
  type StepAnchorPoint,
} from './progression.ts';
import { useGuidedPlayback, type GuidedPlayback } from './useGuidedPlayback.ts';
import {
  useNotesCollision,
  type NotesCollision,
  type NotesCollisionRefs,
} from './useNotesCollision.ts';
import {
  usePendantOverhang,
  type PendantOverhang,
  type PendantOverhangRefs,
} from './usePendantOverhang.ts';
import { usePrayerFit, type FitRefs, type FitResult } from './usePrayerFit.ts';

export type HeadingProps = {
  readonly rubric: string;
  readonly title: string;
};

export type DrapeProps = {
  readonly decade: number | undefined;
  readonly display: RosaryDisplay;
  readonly geometry: DrapeGeometry;
  readonly anchor: StepAnchorPoint;
  readonly anchors: readonly NonBeadAnchor[];
  readonly prayedThroughBeadIndex: number;
  readonly onSelect: (anchor: StepAnchorPoint) => void;
};

export type ControlsProps = {
  readonly onExit: () => void;
  readonly onOpenSettings: () => void;
  readonly onBack: () => void;
  readonly onForward: () => void;
  readonly onTogglePlayback: () => void;
};

export type ControlsState = {
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly playing: boolean;
};

export type ControlsBundle = {
  readonly actions: ControlsProps;
  readonly state: ControlsState;
};

export type MysteryFruit = {
  readonly text: string;
  readonly sourceId: string;
  readonly translated: boolean;
};

export const GUIDANCE_TRANSLATED = (reading: ReadingSnapshot) =>
  reading.catalog.rosary.guidance.translation !== undefined;

const SUMMARY_SUBPOINT_MAPPING_TYPE = 'summary-subpoint';

export const offeringLabelOf = (reading: ReadingSnapshot, offering: MysteryReflection): string =>
  offering.mappingType === SUMMARY_SUBPOINT_MAPPING_TYPE
    ? reading.wording.prayer.meditation
    : reading.wording.prayer.offering;

const mysteryForStep = (
  reading: ReadingSnapshot,
  mysterySetId: string,
  step: PrayerStep,
): ResolvedMystery | null => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return step.mystery;
  }

  if (step.decade === undefined) {
    return null;
  }

  const mystery = reading.catalog.mysterySetById(mysterySetId).mysteries[step.decade - 1];

  if (mystery === undefined) {
    throw new CatalogLookupError(
      CatalogLookupErrorCode.MissingMysterySet,
      'mystery set',
      mysterySetId,
    );
  }

  return mystery;
};

const rubricFor = (
  reading: ReadingSnapshot,
  mysterySetId: string,
  step: PrayerStep,
  opening: boolean,
): string => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return reading.wording.prayer.mysteryHeading(step.mystery.ordinal, mysterySetId);
  }

  if (step.decade !== undefined) {
    return reading.wording.prayer.decadeInProgress;
  }

  return opening ? reading.wording.prayer.openingPrayer : reading.wording.prayer.closingPrayer;
};

const titleFor = (reading: ReadingSnapshot, step: PrayerStep): string => {
  if (step.archetype === StepArchetype.MysteryAnnouncement) {
    return step.mystery.title;
  }

  if (step.prayerId === PrayerId.FatimaPrayer) {
    return reading.wording.prayer.fatimaTitle;
  }

  return reading.catalog.prayerById(step.prayerId).title;
};

export const bodyFor = (reading: ReadingSnapshot, step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement
    ? step.mystery.scripture.text
    : reading.catalog.prayerById(step.prayerId).text;

type ViewModelRequest = {
  readonly onComplete: () => void;
  readonly mysterySetId: string;
  readonly progression: Progression;
  readonly setIndex: (stepIndex: number) => void;
  readonly onExit: () => void;
  readonly onOpenSettings: () => void;
};

const progressionFor = (
  reading: ReadingSnapshot,
  mysterySetId: string,
  includeFatimaPrayer: boolean,
): Progression =>
  createProgression(
    reading,
    reading.catalog.mysterySetById(mysterySetId),
    reading.catalog.rosary.guidance,
    {
      includeFatimaPrayer,
    },
  );

const headingOf = (
  reading: ReadingSnapshot,
  mysterySetId: string,
  progression: Progression,
): HeadingProps => {
  const step = currentStep(progression);
  const announced = progression.steps.findIndex(
    (candidate) => candidate.archetype === StepArchetype.MysteryAnnouncement,
  );

  return {
    rubric: rubricFor(reading, mysterySetId, step, progression.index < announced),
    title: titleFor(reading, step),
  };
};

const drapeOf = (
  geometry: DrapeGeometry,
  request: ViewModelRequest,
  display: RosaryDisplay,
): DrapeProps => {
  const { progression, setIndex } = request;
  const step = currentStep(progression);

  return {
    anchor: step.anchor,
    decade: step.decade,
    display,
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
  const { progression, setIndex, onExit, onComplete, onOpenSettings } = request;

  return {
    actions: {
      onBack: () => setIndex(retreat(progression).index),
      onExit,
      onForward: () => {
        if (isAtEnd(progression)) {
          onComplete();
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

export type PrayerFocusProps = {
  readonly onComplete: () => void;
  readonly mysterySetId: string;
  readonly start?: PrayerStart;
  readonly onExit: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenSettings: () => void;
};

export type PrayerFocusRefs = FitRefs &
  NotesCollisionRefs &
  PendantOverhangRefs & {
    readonly heading: RefObject<HTMLHeadingElement | null>;
  };

const usePrayerFocusRefs = (): PrayerFocusRefs => ({
  artwork: useRef<HTMLDivElement>(null),
  drape: useRef<HTMLDivElement>(null),
  heading: useRef<HTMLHeadingElement>(null),
  notes: useRef<HTMLDivElement>(null),
  reading: useRef<HTMLElement>(null),
  scripture: useRef<HTMLParagraphElement>(null),
  stage: useRef<HTMLElement>(null),
  surface: useRef<HTMLDivElement>(null),
});

type PrayerPlan = {
  readonly artworkPlan: readonly ResolvedArtwork[];
  readonly geometry: DrapeGeometry;
  readonly progression: Progression;
};

const sessionArtworkPlan = (
  reading: ReadingSnapshot,
  mysterySetId: string,
  includeFatimaPrayer: boolean,
  start: PrayerStart | undefined,
): readonly ResolvedArtwork[] => {
  const progression = progressionFor(reading, mysterySetId, includeFatimaPrayer);
  return featuring(reading, artworkPlanFor(reading, progression), progression, start);
};

const usePrayerPlan = (
  mysterySetId: string,
  includeFatimaPrayer: boolean,
  index: number,
  start: PrayerStart | undefined,
): PrayerPlan => {
  const reading = useReading();
  const [sessionReading] = useState(reading);
  const base = useMemo(
    () => progressionFor(reading, mysterySetId, includeFatimaPrayer),
    [includeFatimaPrayer, mysterySetId, reading],
  );
  const geometry = useMemo(() => createDrapeGeometry(beadSlotsOf(base)), [base]);
  const artPlan = useMemo(
    () => sessionArtworkPlan(sessionReading, mysterySetId, includeFatimaPrayer, start),
    [includeFatimaPrayer, mysterySetId, sessionReading, start],
  );
  const artworkPlan = artPlan.map((artwork) => reading.catalog.artworkById(artwork.id));

  return { artworkPlan, geometry, progression: jumpTo(base, index) };
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
    String(preferences.showDecadeOfferings),
    String(preferences.showMysteryFruits),
    String(preferences.aiTranslations),
    String(preferences.showScriptureReadings),
  ].join(':');

export type PrayerDisplay = {
  readonly artwork: ResolvedArtwork;
  readonly fitKey: string;
  readonly heading: HeadingProps;
  readonly mystery: ResolvedMystery | null;
  readonly offering: MysteryReflection | null;
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

const offeringFor = (
  step: PrayerStep,
  mystery: ResolvedMystery | null,
  preferences: Preferences,
): MysteryReflection | null =>
  step.archetype === StepArchetype.MysteryAnnouncement &&
  preferences.showDecadeOfferings &&
  (mystery?.reflection.translation === undefined || preferences.aiTranslations) &&
  mystery?.reflection.text !== undefined
    ? mystery.reflection
    : null;

const prayerDisplayOf = (
  reading: ReadingSnapshot,
  { artworkPlan, mysterySetId, preferences, progression }: PrayerDisplayRequest,
): PrayerDisplay => {
  const step = currentStep(progression);
  const artwork = plannedArtworkAt(artworkPlan, progression);
  const mystery = mysteryForStep(reading, mysterySetId, step);
  const showScriptureReading =
    step.archetype !== StepArchetype.MysteryAnnouncement || preferences.showScriptureReadings;
  const showGuidance =
    preferences.showGuidance &&
    (!GUIDANCE_TRANSLATED(reading) || preferences.aiTranslations) &&
    !repeatsDecadeGuidance(step) &&
    (step.archetype !== StepArchetype.MysteryAnnouncement || showScriptureReading);

  return {
    artwork,
    fitKey: fitKeyOf(mysterySetId, progression.index, preferences),
    heading: headingOf(reading, mysterySetId, progression),
    mystery,
    offering: offeringFor(step, mystery, preferences),
    showGuidance,
    showScriptureReading,
    source: resolveArtAsset(artwork.file),
    step,
  };
};

type PrayerPlaybackRequest = {
  readonly display: PrayerDisplay;
  readonly fit: FitResult;
  readonly fruit: MysteryFruit | null;
  readonly playing: boolean;
  readonly progression: Progression;
  readonly read: Pick<Preferences, 'readDecadeOfferings' | 'readGuidance' | 'readMysteryFruits'>;
  readonly readingSpeed: number;
  readonly setIndex: (index: number) => void;
  readonly setPlaying: (playing: boolean) => void;
};

const readKeyOf = (read: PrayerPlaybackRequest['read']): string =>
  [read.readGuidance, read.readDecadeOfferings, read.readMysteryFruits].map(String).join(':');

const usePrayerPlayback = ({
  display,
  fit,
  fruit,
  playing,
  progression,
  read,
  readingSpeed,
  setIndex,
  setPlaying,
}: PrayerPlaybackRequest): GuidedPlayback => {
  const reading = useReading();
  return useGuidedPlayback({
    announcement: display.step.archetype === StepArchetype.MysteryAnnouncement,
    fruitText:
      fruit === null || !read.readMysteryFruits
        ? ''
        : reading.wording.prayer.spokenFruit(fruit.text),
    guidanceText:
      fit.showGuidance && read.readGuidance && display.step.guidance !== undefined
        ? reading.wording.prayer.spokenGuidance(
            display.step.guidance.text,
            reading.catalog.sourceById(display.step.guidance.sourceId).work,
          )
        : '',
    offeringText:
      display.offering?.text === undefined || !read.readDecadeOfferings
        ? ''
        : reading.wording.prayer.spokenOffering(
            offeringLabelOf(reading, display.offering),
            display.offering.text,
          ),
    isLastStep: isAtEnd(progression),
    onAdvance: () => setIndex(advance(progression).index),
    onPlayingChange: setPlaying,
    playing,
    readingSpeed,
    stepKey: `${display.fitKey}:${String(fit.showGuidance)}:${readKeyOf(read)}`,
    text: display.showScriptureReading ? bodyFor(reading, display.step) : '',
  });
};

const viewModelRequestOf = (
  props: PrayerFocusProps,
  progression: Progression,
  setIndex: (index: number) => void,
  playback: Pick<GuidedPlayback, 'pause'>,
): ViewModelRequest => ({
  mysterySetId: props.mysterySetId,
  onExit: props.onExit,
  onComplete: () => {
    playback.pause();
    props.onComplete();
  },
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

export type PrayerFocusSession = {
  readonly controls: ControlsBundle;
  readonly display: PrayerDisplay;
  readonly drape: DrapeProps;
  readonly fit: FitResult;
  readonly fruit: MysteryFruit | null;
  readonly notesCollision: NotesCollision;
  readonly pendantOverhang: PendantOverhang;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly playback: GuidedPlayback;
  readonly preferences: Preferences;
  readonly refs: PrayerFocusRefs;
};

const CURRENT_WORD_SELECTOR = '[data-playback-word="current"]';
const ACTIVE_NOTE_SELECTOR = '[data-playback-active="true"]';

const steppedReadingSpeed = (readingSpeed: number, direction: 1 | -1): number =>
  Number(
    Math.min(
      READING_SPEED_MAXIMUM,
      Math.max(READING_SPEED_MINIMUM, readingSpeed + direction * READING_SPEED_STEP),
    ).toFixed(2),
  );

type KeyboardRequest = {
  readonly controls: ControlsBundle;
  readonly readingSpeed: number;
  readonly setPreference: SetPreference;
};

const keyActionsOf = ({
  controls,
  readingSpeed,
  setPreference,
}: KeyboardRequest): Readonly<Partial<Record<KeyName, () => void>>> => {
  const stepSpeed = (direction: 1 | -1): void =>
    setPreference('readingSpeed', steppedReadingSpeed(readingSpeed, direction));

  return {
    [KeyName.Space]: controls.actions.onTogglePlayback,
    [KeyName.Enter]: controls.actions.onForward,
    [KeyName.Plus]: () => stepSpeed(1),
    [KeyName.Equals]: () => stepSpeed(1),
    [KeyName.Minus]: () => stepSpeed(-1),
    [KeyName.Underscore]: () => stepSpeed(-1),
  };
};

const usePrayerKeyboard = (request: KeyboardRequest): void => {
  useEffect(() => {
    const actions = keyActionsOf(request);
    const onKeyDown = (event: KeyboardEvent): void => {
      const keyName = keyNameFrom(event.key);
      const action = keyName === undefined ? undefined : actions[keyName];
      if (!isShortcutEvent(event) || action === undefined) {
        return;
      }

      event.preventDefault();
      action();
    };

    globalThis.addEventListener('keydown', onKeyDown);
    return () => globalThis.removeEventListener('keydown', onKeyDown);
  }, [request]);
};

const useFollowPlaybackWord = (
  refs: Pick<PrayerFocusRefs, 'notes' | 'reading'>,
  playback: Pick<GuidedPlayback, 'activePhase' | 'activeWordIndex' | 'engaged'>,
): void => {
  const { notes, reading } = refs;

  useEffect(() => {
    if (!playback.engaged) {
      return;
    }

    const current = reading.current?.querySelector(CURRENT_WORD_SELECTOR);

    current?.scrollIntoView({ block: 'nearest' });
  }, [playback.activeWordIndex, playback.engaged, reading]);

  useEffect(() => {
    if (!playback.engaged) {
      return;
    }

    const line = notes.current?.querySelector(ACTIVE_NOTE_SELECTOR);

    line?.scrollIntoView({ block: 'nearest' });
  }, [notes, playback.activePhase, playback.engaged]);
};

const pausedHandlersOf = (props: PrayerFocusProps, playback: Pick<GuidedPlayback, 'pause'>) => ({
  onOpenArtwork: (artworkId: string): void => {
    playback.pause();
    props.onOpenArtwork(artworkId);
  },
  onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation): void => {
    playback.pause();
    props.onOpenBibleVerse(bookId, verse);
  },
  onOpenReference: (target: ReferenceTarget): void => {
    playback.pause();
    props.onOpenReference(target);
  },
});

type DrapeLayout = {
  readonly notesCollision: NotesCollision;
  readonly pendantOverhang: PendantOverhang;
};

const useDrapeLayout = (
  geometry: DrapeGeometry,
  key: string,
  refs: PrayerFocusRefs,
): DrapeLayout => ({
  notesCollision: useNotesCollision(geometry, key, refs),
  pendantOverhang: usePendantOverhang(geometry, key, refs),
});

export const usePrayerFocusSession = (props: PrayerFocusProps): PrayerFocusSession => {
  const reading = useReading();
  const { preferences, setPreference } = usePreferences();
  const [index, setIndex] = useState(() =>
    props.start === undefined
      ? 0
      : stepIndexForStart(
          progressionFor(reading, props.mysterySetId, preferences.includeFatimaPrayer),
          props.start,
        ),
  );
  const [playing, setPlaying] = useState(false);

  useEffect(() => () => setPlaying(false), []);
  const refs = usePrayerFocusRefs();
  const plan = usePrayerPlan(
    props.mysterySetId,
    preferences.includeFatimaPrayer,
    index,
    props.start,
  );
  const display = prayerDisplayOf(reading, {
    artworkPlan: plan.artworkPlan,
    mysterySetId: props.mysterySetId,
    preferences,
    progression: plan.progression,
  });
  const fit = usePrayerFit(display.fitKey, display.showGuidance, refs);
  const translatedFruit = display.mystery?.fruitTranslation !== undefined;
  const fruit =
    display.mystery === null ||
    !preferences.showMysteryFruits ||
    (translatedFruit && !preferences.aiTranslations)
      ? null
      : {
          text: display.mystery.fruit,
          sourceId: display.mystery.fruitSourceId,
          translated: translatedFruit,
        };
  const playback = usePrayerPlayback({
    display,
    fit,
    fruit: repeatsDecadeGuidance(display.step) ? null : fruit,
    playing,
    progression: plan.progression,
    read: preferences,
    readingSpeed: preferences.readingSpeed,
    setIndex,
    setPlaying,
  });
  const request = viewModelRequestOf(props, plan.progression, setIndex, playback);
  const controls = controlsOf(request, playback);

  usePrayerFocusReset(display.fitKey, refs);
  usePrayerKeyboard({ controls, readingSpeed: preferences.readingSpeed, setPreference });
  useFollowPlaybackWord(refs, playback);

  return {
    controls,
    display,
    drape: drapeOf(plan.geometry, request, preferences.rosaryDisplay),
    fit,
    fruit,
    ...useDrapeLayout(plan.geometry, display.fitKey, refs),
    ...pausedHandlersOf(props, playback),
    playback,
    preferences,
    refs,
  };
};

export const useStepNotice = (step: PrayerStep): MarkToggle => {
  const [openStep, setOpenStep] = useState<PrayerStep | null>(null);

  return {
    open: openStep === step,
    onToggle: () => setOpenStep((current) => (current === step ? null : step)),
  };
};
