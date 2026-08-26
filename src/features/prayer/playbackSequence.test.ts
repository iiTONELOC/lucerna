import { expect, test } from 'bun:test';
import { ReadingSpeed } from '../../state/preferences/model.ts';
import { paceText, playbackHoldMs } from './pacing.ts';
import {
  activeWordIndexAt,
  createPlaybackPlan,
  elapsedMsForWord,
  GuidedPlaybackPhase,
  playbackPhaseAt,
} from './playbackSequence.ts';

const GUIDANCE_TEXT = 'Look upon the scene, hear the word, and pause in silence.';
const FRUIT_TEXT = 'Fruit of the Mystery. Humility.';

const prayerPlan = (hasGuidance: boolean, hasFruit: boolean) => {
  const readingSpeed = ReadingSpeed.Steady;

  return createPlaybackPlan({
    fruitText: hasFruit ? FRUIT_TEXT : '',
    guidanceText: hasGuidance ? GUIDANCE_TEXT : '',
    paced: paceText('Hail Mary, full of grace.', readingSpeed),
    readingSpeed,
    trailingHoldMs: playbackHoldMs(false, readingSpeed),
  });
};

test('orders guidance, fruit, and prayer without pacing auxiliary text word by word', () => {
  const plan = prayerPlan(true, true);

  expect(plan.phases.map(({ phase }) => phase)).toEqual([
    GuidedPlaybackPhase.Guidance,
    GuidedPlaybackPhase.Fruit,
    GuidedPlaybackPhase.Prayer,
  ]);
});

test('omits auxiliary phases that are not visible', () => {
  const plan = prayerPlan(false, true);

  expect(plan.phases.map(({ phase }) => phase)).toEqual([
    GuidedPlaybackPhase.Fruit,
    GuidedPlaybackPhase.Prayer,
  ]);
});

test('advances after the final auxiliary phase when the prayer text is hidden', () => {
  const readingSpeed = ReadingSpeed.Steady;
  const plan = createPlaybackPlan({
    fruitText: FRUIT_TEXT,
    guidanceText: GUIDANCE_TEXT,
    paced: paceText('', readingSpeed),
    readingSpeed,
    trailingHoldMs: playbackHoldMs(true, readingSpeed),
  });

  const finalPhase = plan.phases.at(-1);

  expect(finalPhase?.phase).toBe(GuidedPlaybackPhase.Fruit);
  expect(plan.totalMs).toBe(finalPhase?.endMs ?? -1);
});

test('retains the existing hold for a step with no visible content', () => {
  const readingSpeed = ReadingSpeed.Steady;
  const holdMs = playbackHoldMs(false, readingSpeed);
  const plan = createPlaybackPlan({
    fruitText: '',
    guidanceText: '',
    paced: paceText('', readingSpeed),
    readingSpeed,
    trailingHoldMs: holdMs,
  });

  expect(plan.phases).toEqual([]);
  expect(plan.totalMs).toBe(holdMs);
});

test('offsets prayer words until the auxiliary phases finish', () => {
  const plan = prayerPlan(true, true);
  const prayerStartMs = plan.phases[2]?.startMs ?? -1;

  expect(playbackPhaseAt(plan, 0)).toBe(GuidedPlaybackPhase.Guidance);
  expect(playbackPhaseAt(plan, plan.phases[0]?.endMs ?? -1)).toBe(GuidedPlaybackPhase.Fruit);
  expect(playbackPhaseAt(plan, prayerStartMs)).toBe(GuidedPlaybackPhase.Prayer);
  expect(activeWordIndexAt(plan, prayerStartMs)).toBe(0);
  expect(elapsedMsForWord(plan, 0)).toBe(prayerStartMs);
});

test('paces guidance and fruit from their visible words at the selected speed', () => {
  const unhurried = createPlaybackPlan({
    fruitText: FRUIT_TEXT,
    guidanceText: GUIDANCE_TEXT,
    paced: paceText('', ReadingSpeed.Unhurried),
    readingSpeed: ReadingSpeed.Unhurried,
    trailingHoldMs: playbackHoldMs(false, ReadingSpeed.Unhurried),
  });
  const brisk = createPlaybackPlan({
    fruitText: FRUIT_TEXT,
    guidanceText: GUIDANCE_TEXT,
    paced: paceText('', ReadingSpeed.Brisk),
    readingSpeed: ReadingSpeed.Brisk,
    trailingHoldMs: playbackHoldMs(false, ReadingSpeed.Brisk),
  });

  expect(unhurried.totalMs).toBeGreaterThan(brisk.totalMs);
  expect(unhurried.phases[0]?.endMs).toBe(paceText(GUIDANCE_TEXT, ReadingSpeed.Unhurried).totalMs);
  expect(unhurried.phases[1]?.endMs).toBe(
    paceText(GUIDANCE_TEXT, ReadingSpeed.Unhurried).totalMs +
      paceText(FRUIT_TEXT, ReadingSpeed.Unhurried).totalMs,
  );
});
