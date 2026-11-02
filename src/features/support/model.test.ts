import { expect, test } from 'bun:test';
import {
  createSupportState,
  parseSupportState,
  reduceSupport,
  SupportActivity,
  SupportEventType,
  SupportPhase,
  type SupportState,
} from './model.ts';

const installed = Date.UTC(2026, 0, 1);
const day = (count: number): number => installed + count * 86_400_000;
const milestone = (
  state: SupportState,
  id: string,
  now: number,
  activity = SupportActivity.Rosary,
): SupportState => reduceSupport(state, { type: SupportEventType.Milestone, id, activity }, now);
const end = (state: SupportState, id: string, now: number): SupportState =>
  reduceSupport(state, { type: SupportEventType.ActivityEnd, id }, now);
const earned = (state: SupportState, now: number): SupportState =>
  Array.from({ length: 7 }).reduce<SupportState>(
    (current, _, index) => milestone(current, String(now) + '/' + String(index), now),
    state,
  );
const asked = (state: SupportState, now: number): SupportState => {
  const full = earned(state, now);
  return end(full, String(now) + '/6', now);
};
const initial = (): SupportState => createSupportState(installed);

test('seven completed Rosaries can ask only after seven days, never merely on opening', () => {
  const full = earned(initial(), day(0));
  expect(end(full, String(day(0)) + '/6', day(6)).phase).toBe(SupportPhase.Grace);
  const opened = reduceSupport(full, { type: SupportEventType.Opened }, day(7));
  expect(opened.phase).toBe(SupportPhase.Open);
  expect(opened.lastAskAt).toBeNull();
  const last = milestone(opened, 'finish', day(7));
  const showing = end(last, 'finish', day(7));
  expect(showing.phase).toBe(SupportPhase.Asking);
  expect(showing.lastAskAt).toBe(day(7));
  expect(showing.credits).toBe(0);
});

test('mixed activities share credits and artwork waits for close', () => {
  let state = initial();
  state = milestone(state, 'rosary', day(8));
  state = milestone(state, 'chapter', day(8), SupportActivity.Chapter);
  for (let index = 0; index < 15; index += 1) {
    state = milestone(state, 'art/' + String(index), day(8), SupportActivity.Artwork);
  }
  expect(state.credits).toBe(21);
  expect(state.phase).toBe(SupportPhase.Open);
  expect(end(state, 'art/14', day(8)).phase).toBe(SupportPhase.Asking);
  expect(end(state, 'never-opened', day(8))).toEqual(state);
});

test('milestones and activity ends do not award or ask twice and retained identities are bounded', () => {
  let state = milestone(initial(), 'same', day(8), SupportActivity.Artwork);
  state = milestone(state, 'same', day(8), SupportActivity.Artwork);
  expect(state.credits).toBe(1);
  state = end(state, 'same', day(8));
  expect(end(state, 'same', day(8))).toEqual(state);
  for (let index = 0; index < 100; index += 1) {
    state = milestone(state, String(index), day(8), SupportActivity.Artwork);
  }
  expect(state.credits).toBe(21);
  expect(state.milestones.length).toBeLessThanOrEqual(21);
});

test('an unanswered ask imposes thirty days and never queues another ask', () => {
  let state = asked(initial(), day(7));
  state = reduceSupport(state, { type: SupportEventType.Leave, id: state.askId ?? '' }, day(7));
  state = asked(state, day(36));
  expect(state.phase).toBe(SupportPhase.Waiting);
  expect(state.credits).toBe(21);
  state = milestone(state, 'next', day(37));
  expect(end(state, 'next', day(37)).phase).toBe(SupportPhase.Asking);
});

test('Not now escalates to 14, 28, 56 and 90 days without permanently stopping asks', () => {
  let state = initial();
  for (const askDay of [7, 37, 67, 123, 213, 303]) {
    state = asked(state, day(askDay));
    expect(state.phase).toBe(SupportPhase.Asking);
    state = reduceSupport(
      state,
      { type: SupportEventType.NotNow, id: state.askId ?? '' },
      day(askDay),
    );
  }
  expect(state.notNowCount).toBe(4);
  expect(state.notNowUntil).toBe(day(393));
  expect(asked(state, day(392)).phase).toBe(SupportPhase.Waiting);
  expect(asked(state, day(393)).phase).toBe(SupportPhase.Asking);
});

test('Giving requires the current ask and an exact Stripe referrer for a single three-month courtesy', () => {
  let state = asked(initial(), day(7));
  state = reduceSupport(state, { type: SupportEventType.Give, id: 'other' }, day(7));
  expect(state.phase).toBe(SupportPhase.Asking);
  state = reduceSupport(state, { type: SupportEventType.Give, id: state.askId ?? '' }, day(7));
  const returned = reduceSupport(
    state,
    {
      type: SupportEventType.GiftReturn,
      referrer: 'https://buy.stripe.com/checkout',
    },
    day(7),
  );
  expect(returned.giftUntil).toBe(Date.UTC(2026, 3, 8));
  expect(returned.notNowCount).toBe(0);
  expect(
    reduceSupport(
      returned,
      {
        type: SupportEventType.GiftReturn,
        referrer: 'https://buy.stripe.com/checkout',
      },
      day(9),
    ).giftUntil,
  ).toBe(returned.giftUntil);
  expect(asked(returned, Date.UTC(2026, 3, 8)).phase).toBe(SupportPhase.Asking);
});

test('direct, missing, insecure, lookalike and non-pending returns cannot grant courtesy', () => {
  for (const referrer of [
    '',
    'http://buy.stripe.com/',
    'https://buy.stripe.com.evil.test/',
    'not a URL',
  ]) {
    let state = asked(initial(), day(7));
    state = reduceSupport(state, { type: SupportEventType.Give, id: state.askId ?? '' }, day(7));
    expect(
      reduceSupport(state, { type: SupportEventType.GiftReturn, referrer }, day(7)).giftUntil,
    ).toBeNull();
  }
  expect(
    reduceSupport(
      initial(),
      {
        type: SupportEventType.GiftReturn,
        referrer: 'https://checkout.stripe.com/',
      },
      day(8),
    ).giftUntil,
  ).toBeNull();
});

test('calendar courtesy clamps month ends and clock rollback never shortens a pause', () => {
  const january31 = Date.UTC(2026, 0, 31);
  let state = asked(createSupportState(Date.UTC(2025, 0, 1)), january31);
  state = reduceSupport(state, { type: SupportEventType.Give, id: state.askId ?? '' }, january31);
  state = reduceSupport(
    state,
    {
      type: SupportEventType.GiftReturn,
      referrer: 'https://checkout.stripe.com/',
    },
    january31,
  );
  expect(state.giftUntil).toBe(Date.UTC(2026, 3, 30));
  const earlier = reduceSupport(state, { type: SupportEventType.Opened }, Date.UTC(2025, 0, 1));
  expect(earlier.clockFloor).toBe(january31);
  expect(earlier.phase).toBe(SupportPhase.Waiting);
});

test('reopening preserves the existing ask identity and consumes an abandoned Giving state', () => {
  const asking = asked(initial(), day(7));
  expect(reduceSupport(asking, { type: SupportEventType.Opened }, day(8)).phase).toBe(
    SupportPhase.Asking,
  );
  const giving = reduceSupport(
    asking,
    { type: SupportEventType.Give, id: asking.askId ?? '' },
    day(7),
  );
  const reopened = reduceSupport(giving, { type: SupportEventType.Opened }, day(8));
  expect(reopened.phase).toBe(SupportPhase.Waiting);
  expect(reopened.askId).toBeNull();
});

test('stored support state validates version, bounded identities, numbers, phases and unknown fields', () => {
  const valid = initial();
  expect(parseSupportState(valid)).toEqual(valid);
  for (const raw of [
    undefined,
    null,
    {},
    { ...valid, version: 99 },
    { ...valid, credits: 22 },
    { ...valid, clockFloor: NaN },
    { ...valid, phase: 'stopped' },
    { ...valid, extra: true },
    { ...valid, milestones: [{ id: '', activity: 'artwork', ended: false }] },
  ]) {
    expect(parseSupportState(raw)).toBeNull();
  }
});

test('continuing after Give without a gift return resumes the monthly schedule', () => {
  let state = asked(initial(), day(7));
  state = reduceSupport(state, { type: SupportEventType.Give, id: state.askId ?? '' }, day(7));
  state = milestone(state, 'later', day(8), SupportActivity.Artwork);
  state = end(state, 'later', day(8));
  expect(state.phase).toBe(SupportPhase.Waiting);
  expect(state.giftUntil).toBeNull();
  expect(asked(state, day(37)).phase).toBe(SupportPhase.Asking);
});

test('opening another window does not invalidate the active ask or stop future activity-based asks', () => {
  const asking = asked(initial(), day(7));
  const opened = reduceSupport(asking, { type: SupportEventType.Opened }, day(8));
  const deferred = reduceSupport(
    opened,
    { type: SupportEventType.NotNow, id: asking.askId ?? '' },
    day(8),
  );
  expect(deferred.notNowCount).toBe(1);
  expect(asked(opened, day(37)).phase).toBe(SupportPhase.Asking);
  expect(asked(opened, day(37)).askId).not.toBe(asking.askId);
});
