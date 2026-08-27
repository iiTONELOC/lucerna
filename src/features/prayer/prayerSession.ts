import { useLayoutEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import {
  CatalogLookupError,
  CatalogLookupErrorCode,
  contentCatalog,
  type ResolvedArtwork,
  type ResolvedMystery,
} from '../../content/catalog.ts';
import type { MysteryReflection } from '../../content/schema.ts';
import type { Preferences } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import type { BibleVerseLocation } from '../library/model.ts';
import type { ReferenceTarget } from '../references/referenceCatalog.ts';
import { artworkPlanFor, plannedArtworkAt } from './artworkPlan.ts';
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
  type NonBeadAnchor,
  type PrayerStep,
  type Progression,
  type StepAnchorPoint,
} from './progression.ts';
import { usePrayerFit, type FitRefs, type FitResult } from './usePrayerFit.ts';
import { useGuidedPlayback, type GuidedPlayback } from './useGuidedPlayback.ts';

const ORDINAL_WORD: readonly string[] = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];

export type HeadingProps = {
  readonly rubric: string;
  readonly title: string;
};

export type DrapeProps = {
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
};

const SUMMARY_SUBPOINT_MAPPING_TYPE = 'summary-subpoint';

export const offeringLabelOf = (offering: MysteryReflection): string =>
  offering.mappingType === SUMMARY_SUBPOINT_MAPPING_TYPE ? 'Meditation' : 'Offering';

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

export const bodyFor = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement
    ? step.mystery.scripture.text
    : contentCatalog.prayerById(step.prayerId).text;

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

export type PrayerFocusProps = {
  readonly mysterySetId: string;
  readonly onExit: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenSettings: () => void;
};

export type PrayerFocusRefs = FitRefs & {
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
  mystery?.reflection.text !== undefined
    ? mystery.reflection
    : null;

const prayerDisplayOf = ({
  artworkPlan,
  mysterySetId,
  preferences,
  progression,
}: PrayerDisplayRequest): PrayerDisplay => {
  const step = currentStep(progression);
  const artwork = plannedArtworkAt(artworkPlan, progression);
  const mystery = mysteryForStep(mysterySetId, step);
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
    fruitText: fruit === null ? '' : `Fruit of the Mystery. ${fruit.text}.`,
    guidanceText:
      fit.showGuidance && display.step.guidance !== undefined
        ? `Guidance. ${display.step.guidance.text} ${contentCatalog.sourceById(display.step.guidance.sourceId).work}.`
        : '',
    offeringText:
      display.offering?.text === undefined
        ? ''
        : `${offeringLabelOf(display.offering)}. ${display.offering.text}`,
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

export type PrayerFocusSession = {
  readonly controls: ControlsBundle;
  readonly display: PrayerDisplay;
  readonly drape: DrapeProps;
  readonly fit: FitResult;
  readonly fruit: MysteryFruit | null;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly playback: GuidedPlayback;
  readonly preferences: Preferences;
  readonly refs: PrayerFocusRefs;
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

export const usePrayerFocusSession = (props: PrayerFocusProps): PrayerFocusSession => {
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
    display.mystery === null || !preferences.showMysteryFruits
      ? null
      : { text: display.mystery.fruit, sourceId: display.mystery.fruitSourceId };
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
    ...pausedHandlersOf(props, playback),
    playback,
    preferences,
    refs,
  };
};
