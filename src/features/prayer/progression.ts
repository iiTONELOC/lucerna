import type { ResolvedMystery, ResolvedMysterySet } from '../../content/catalog.ts';
import type { GuidanceStatement, RosaryGuidance } from '../../content/schema.ts';
import { CodedError } from '../../shared/codedError.ts';

export enum PrayerId {
  SignOfTheCross = 'sign-of-the-cross',
  ApostlesCreed = 'apostles-creed',
  OurFather = 'our-father',
  HailMary = 'hail-mary',
  GloryBe = 'glory-be',
  FatimaPrayer = 'fatima-prayer',
  HailHolyQueen = 'hail-holy-queen',
  ClosingPrayer = 'closing-prayer',
}

export enum SilentStepId {
  OpeningSignOfTheCross = 'opening-sign-of-the-cross',
  ApostlesCreed = 'apostles-creed',
  OpeningOurFather = 'opening-our-father',
  OpeningGloryBe = 'opening-glory-be',
  ClosingSignOfTheCross = 'closing-sign-of-the-cross',
}

export enum StepArchetype {
  Silent = 'silent',
  CountedRepetition = 'counted-repetition',
  MysteryAnnouncement = 'mystery-announcement',
  FramedPrayer = 'framed-prayer',
}

export enum StepAnchor {
  Crucifix = 'crucifix',
  Centerpiece = 'centerpiece',
  Bead = 'bead',
  ChainLeading = 'chain-leading',
  ChainTrailing = 'chain-trailing',
}

export enum ProgressionErrorCode {
  SilentStepMismatch = 'silent-step-mismatch',
  EmptyMysterySet = 'empty-mystery-set',
  MissingGuidancePlaceholder = 'missing-guidance-placeholder',
  StepIndexOutOfRange = 'step-index-out-of-range',
  AnchorNotFound = 'anchor-not-found',
}

const PROGRESSION_ERROR_MESSAGE: Readonly<Record<ProgressionErrorCode, string>> = {
  [ProgressionErrorCode.SilentStepMismatch]: 'Silent steps do not match the devotional content',
  [ProgressionErrorCode.EmptyMysterySet]: 'Mystery set must carry at least one mystery',
  [ProgressionErrorCode.MissingGuidancePlaceholder]:
    'Decade Hail Mary guidance must carry the mystery placeholder',
  [ProgressionErrorCode.StepIndexOutOfRange]: 'Step index is out of range',
  [ProgressionErrorCode.AnchorNotFound]: 'Step anchor does not belong to the progression',
};

export class ProgressionError extends CodedError<ProgressionErrorCode> {
  constructor(code: ProgressionErrorCode) {
    super('ProgressionError', code, PROGRESSION_ERROR_MESSAGE[code]);
  }
}

export type CrucifixAnchor = { readonly kind: StepAnchor.Crucifix };

export type CenterpieceAnchor = { readonly kind: StepAnchor.Centerpiece };

export type BeadAnchor = {
  readonly kind: StepAnchor.Bead;
  readonly beadIndex: number;
};

export type ChainAnchor = {
  readonly kind: StepAnchor.ChainLeading | StepAnchor.ChainTrailing;
  readonly fromBeadIndex: number | undefined;
  readonly toBeadIndex: number | undefined;
};

export type StepAnchorPoint = CrucifixAnchor | CenterpieceAnchor | BeadAnchor | ChainAnchor;

export type NonBeadAnchor = Exclude<StepAnchorPoint, BeadAnchor>;

type StepBase = {
  readonly anchor: StepAnchorPoint;
  readonly decade: number | undefined;
};

export type SilentStep = StepBase & {
  readonly archetype: StepArchetype.Silent;
  readonly silentStepId: SilentStepId;
  readonly prayerId: PrayerId;
  readonly guidance: undefined;
};

export type CountedRepetitionStep = StepBase & {
  readonly archetype: StepArchetype.CountedRepetition;
  readonly prayerId: PrayerId.HailMary;
  readonly repetition: number;
  readonly repetitionTotal: number;
  readonly guidance: GuidanceStatement;
};

export type MysteryAnnouncementStep = StepBase & {
  readonly archetype: StepArchetype.MysteryAnnouncement;
  readonly mystery: ResolvedMystery;
  readonly decade: number;
  readonly guidance: GuidanceStatement;
};

export type FramedPrayerStep = StepBase & {
  readonly archetype: StepArchetype.FramedPrayer;
  readonly prayerId: PrayerId;
  readonly guidance: GuidanceStatement;
};

export type PrayerStep =
  SilentStep | CountedRepetitionStep | MysteryAnnouncementStep | FramedPrayerStep;

export type RosaryOptions = {
  readonly includeFatimaPrayer: boolean;
};

export type Progression = {
  readonly steps: readonly PrayerStep[];
  readonly stepIndexByBead: readonly number[];
  readonly index: number;
};

const DECADE_HAIL_MARY_COUNT = 10;
const MYSTERY_PLACEHOLDER = '{mystery}';
const LEADING_ARTICLE = 'The ';
const LOWERCASED_LEADING_ARTICLE = 'the ';

const CRUCIFIX_ANCHOR: CrucifixAnchor = Object.freeze({ kind: StepAnchor.Crucifix });
const CENTERPIECE_ANCHOR: CenterpieceAnchor = Object.freeze({ kind: StepAnchor.Centerpiece });

const mysteryPhrase = (title: string): string =>
  title.startsWith(LEADING_ARTICLE)
    ? `${LOWERCASED_LEADING_ARTICLE}${title.slice(LEADING_ARTICLE.length)}`
    : title;

const decadeHailMaryGuidance = (
  template: GuidanceStatement,
  mystery: ResolvedMystery,
): GuidanceStatement => {
  if (!template.text.includes(MYSTERY_PLACEHOLDER)) {
    throw new ProgressionError(ProgressionErrorCode.MissingGuidancePlaceholder);
  }

  return {
    ...template,
    text: template.text.replace(MYSTERY_PLACEHOLDER, mysteryPhrase(mystery.title)),
  };
};

const verifySilentSteps = (silentSteps: readonly string[]): void => {
  const declared = new Set<string>(Object.values(SilentStepId));

  if (silentSteps.length !== declared.size) {
    throw new ProgressionError(ProgressionErrorCode.SilentStepMismatch);
  }

  for (const silentStep of silentSteps) {
    if (!declared.has(silentStep)) {
      throw new ProgressionError(ProgressionErrorCode.SilentStepMismatch);
    }
  }
};

type ChainAnchorDraft = Omit<ChainAnchor, 'toBeadIndex'> & {
  toBeadIndex: ChainAnchor['toBeadIndex'];
};

type Sequence = {
  readonly steps: PrayerStep[];
  readonly pendingChains: ChainAnchorDraft[];
  lastBeadIndex: number | undefined;
  beadCount: number;
};

const createSequence = (): Sequence => ({
  steps: [],
  pendingChains: [],
  lastBeadIndex: undefined,
  beadCount: 0,
});

const resolvePendingChains = (sequence: Sequence, toBeadIndex: number | undefined): void => {
  for (const chain of sequence.pendingChains) {
    chain.toBeadIndex = toBeadIndex;
  }

  sequence.pendingChains.length = 0;
};

const beadAnchor = (sequence: Sequence): BeadAnchor => {
  const beadIndex = sequence.beadCount;

  resolvePendingChains(sequence, beadIndex);
  sequence.beadCount = beadIndex + 1;
  sequence.lastBeadIndex = beadIndex;

  return { kind: StepAnchor.Bead, beadIndex };
};

const stepIndexByBeadFrom = (steps: readonly PrayerStep[]): number[] => {
  const stepIndexByBead: number[] = [];

  steps.forEach((step, stepIndex) => {
    if (step.anchor.kind === StepAnchor.Bead) {
      stepIndexByBead[step.anchor.beadIndex] = stepIndex;
    }
  });

  return stepIndexByBead;
};

const chainAnchor = (
  sequence: Sequence,
  kind: StepAnchor.ChainLeading | StepAnchor.ChainTrailing,
): ChainAnchor => {
  const anchor: ChainAnchorDraft = {
    kind,
    fromBeadIndex: sequence.lastBeadIndex,
    toBeadIndex: undefined,
  };

  sequence.pendingChains.push(anchor);

  return anchor;
};

const crossCenterpiece = (sequence: Sequence): void => {
  resolvePendingChains(sequence, undefined);
  sequence.lastBeadIndex = undefined;
};

const silentStep = (
  silentStepId: SilentStepId,
  prayerId: PrayerId,
  anchor: StepAnchorPoint,
): SilentStep => ({
  archetype: StepArchetype.Silent,
  anchor,
  silentStepId,
  prayerId,
  guidance: undefined,
  decade: undefined,
});

const appendOpening = (sequence: Sequence, guidance: RosaryGuidance): void => {
  const repetitionTotal = guidance.openingHailMarys.length;

  sequence.steps.push(
    silentStep(SilentStepId.OpeningSignOfTheCross, PrayerId.SignOfTheCross, CRUCIFIX_ANCHOR),
    silentStep(SilentStepId.ApostlesCreed, PrayerId.ApostlesCreed, CRUCIFIX_ANCHOR),
    silentStep(SilentStepId.OpeningOurFather, PrayerId.OurFather, beadAnchor(sequence)),
  );

  for (const openingHailMary of guidance.openingHailMarys) {
    sequence.steps.push({
      archetype: StepArchetype.CountedRepetition,
      anchor: beadAnchor(sequence),
      prayerId: PrayerId.HailMary,
      repetition: openingHailMary.repetition,
      repetitionTotal,
      guidance: openingHailMary,
      decade: undefined,
    });
  }

  sequence.steps.push(
    silentStep(
      SilentStepId.OpeningGloryBe,
      PrayerId.GloryBe,
      chainAnchor(sequence, StepAnchor.ChainTrailing),
    ),
  );
};

const appendDecadeHailMarys = (
  sequence: Sequence,
  guidance: GuidanceStatement,
  decade: number,
): void => {
  for (let repetition = 1; repetition <= DECADE_HAIL_MARY_COUNT; repetition += 1) {
    sequence.steps.push({
      archetype: StepArchetype.CountedRepetition,
      anchor: beadAnchor(sequence),
      prayerId: PrayerId.HailMary,
      repetition,
      repetitionTotal: DECADE_HAIL_MARY_COUNT,
      guidance,
      decade,
    });
  }
};

const appendDecade = (
  sequence: Sequence,
  guidance: RosaryGuidance,
  mystery: ResolvedMystery,
  options: RosaryOptions,
): void => {
  const decade = mystery.ordinal;
  const hailMaryGuidance = decadeHailMaryGuidance(guidance.decadeHailMarys, mystery);
  const ourFatherAnchor = beadAnchor(sequence);

  sequence.steps.push(
    {
      archetype: StepArchetype.MysteryAnnouncement,
      anchor: ourFatherAnchor,
      mystery,
      guidance: guidance.mysteryAnnouncement,
      decade,
    },
    {
      archetype: StepArchetype.FramedPrayer,
      anchor: ourFatherAnchor,
      prayerId: PrayerId.OurFather,
      guidance: guidance.decadeOurFather,
      decade,
    },
  );

  appendDecadeHailMarys(sequence, hailMaryGuidance, decade);

  sequence.steps.push({
    archetype: StepArchetype.FramedPrayer,
    anchor: chainAnchor(sequence, StepAnchor.ChainTrailing),
    prayerId: PrayerId.GloryBe,
    guidance: guidance.decadeGloryBe,
    decade,
  });

  if (options.includeFatimaPrayer) {
    sequence.steps.push({
      archetype: StepArchetype.FramedPrayer,
      anchor: chainAnchor(sequence, StepAnchor.ChainTrailing),
      prayerId: PrayerId.FatimaPrayer,
      guidance: guidance.fatimaPrayer,
      decade,
    });
  }
};

const appendClosing = (sequence: Sequence, guidance: RosaryGuidance): void => {
  sequence.steps.push(
    {
      archetype: StepArchetype.FramedPrayer,
      anchor: CENTERPIECE_ANCHOR,
      prayerId: PrayerId.HailHolyQueen,
      guidance: guidance.hailHolyQueen,
      decade: undefined,
    },
    {
      archetype: StepArchetype.FramedPrayer,
      anchor: CRUCIFIX_ANCHOR,
      prayerId: PrayerId.ClosingPrayer,
      guidance: guidance.finalPrayer,
      decade: undefined,
    },
    silentStep(SilentStepId.ClosingSignOfTheCross, PrayerId.SignOfTheCross, CRUCIFIX_ANCHOR),
  );
};

export const createProgression = (
  mysterySet: ResolvedMysterySet,
  guidance: RosaryGuidance,
  options: RosaryOptions,
): Progression => {
  verifySilentSteps(guidance.silentSteps);

  if (mysterySet.mysteries.length === 0) {
    throw new ProgressionError(ProgressionErrorCode.EmptyMysterySet);
  }

  const sequence = createSequence();

  appendOpening(sequence, guidance);

  for (const mystery of mysterySet.mysteries) {
    appendDecade(sequence, guidance, mystery, options);
  }

  crossCenterpiece(sequence);
  appendClosing(sequence, guidance);

  return {
    steps: sequence.steps,
    stepIndexByBead: stepIndexByBeadFrom(sequence.steps),
    index: 0,
  };
};

const clampIndex = (index: number, length: number): number => {
  if (index < 0) {
    return 0;
  }

  if (index > length - 1) {
    return length - 1;
  }

  return index;
};

export const stepAt = (progression: Progression, index: number): PrayerStep => {
  const step = progression.steps[index];

  if (step === undefined) {
    throw new ProgressionError(ProgressionErrorCode.StepIndexOutOfRange);
  }

  return step;
};

export const currentStep = (progression: Progression): PrayerStep =>
  stepAt(progression, progression.index);

export const advance = (progression: Progression): Progression => ({
  ...progression,
  index: clampIndex(progression.index + 1, progression.steps.length),
});

export const retreat = (progression: Progression): Progression => ({
  ...progression,
  index: clampIndex(progression.index - 1, progression.steps.length),
});

export const jumpTo = (progression: Progression, index: number): Progression => ({
  ...progression,
  index: clampIndex(index, progression.steps.length),
});

export const isAtStart = (progression: Progression): boolean => progression.index === 0;

export const isAtEnd = (progression: Progression): boolean =>
  progression.index === progression.steps.length - 1;

const chainAnchorsMatch = (left: ChainAnchor, right: StepAnchorPoint): boolean =>
  right.kind === left.kind &&
  right.fromBeadIndex === left.fromBeadIndex &&
  right.toBeadIndex === left.toBeadIndex;

const anchorsMatch = (left: StepAnchorPoint, right: StepAnchorPoint): boolean => {
  switch (left.kind) {
    case StepAnchor.Crucifix:
    case StepAnchor.Centerpiece:
      return right.kind === left.kind;
    case StepAnchor.Bead:
      return right.kind === StepAnchor.Bead && right.beadIndex === left.beadIndex;
    case StepAnchor.ChainLeading:
    case StepAnchor.ChainTrailing:
      return chainAnchorsMatch(left, right);
  }
};

export const nonBeadAnchorsOf = (progression: Progression): readonly NonBeadAnchor[] => {
  const anchors: NonBeadAnchor[] = [];

  for (const step of progression.steps) {
    const anchor = step.anchor;

    if (
      anchor.kind !== StepAnchor.Bead &&
      !anchors.some((candidate) => anchorsMatch(candidate, anchor))
    ) {
      anchors.push(anchor);
    }
  }

  return anchors;
};

export const stepIndexForAnchor = (progression: Progression, anchor: StepAnchorPoint): number => {
  const total = progression.steps.length;

  for (let offset = 1; offset <= total; offset += 1) {
    const stepIndex = (progression.index + offset) % total;

    if (anchorsMatch(stepAt(progression, stepIndex).anchor, anchor)) {
      return stepIndex;
    }
  }

  throw new ProgressionError(ProgressionErrorCode.AnchorNotFound);
};
