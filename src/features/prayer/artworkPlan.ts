import {
  CatalogLookupError,
  CatalogLookupErrorCode,
  contentCatalog,
  type ResolvedArtwork,
} from '../../content/catalog.ts';
import { randomIndex } from '../../shared/random.ts';
import {
  currentStep,
  PrayerId,
  StepArchetype,
  type PrayerStep,
  type Progression,
} from './progression.ts';

const shuffled = <Value>(values: readonly Value[]): Value[] => {
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

export const artworkPlanFor = (progression: Progression): readonly ResolvedArtwork[] => {
  const rotations = new Map<PrayerId, ArtworkRotation>();
  const mysteryArtworkByDecade = mysteryArtworkByDecadeFor(progression);

  return progression.steps.map((step) =>
    plannedArtworkForStep(step, mysteryArtworkByDecade, rotations),
  );
};

const artworkLookupKeyFor = (step: PrayerStep): string =>
  step.archetype === StepArchetype.MysteryAnnouncement ? step.mystery.title : step.prayerId;

export const plannedArtworkAt = (
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
