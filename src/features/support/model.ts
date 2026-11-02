import { isRecord, type UnknownRecord } from '../../shared/guards.ts';
import { MILLISECONDS_PER_SECOND } from '../../shared/time.ts';

export enum SupportPhase {
  Grace = 'grace',
  Waiting = 'waiting',
  Open = 'open',
  Asking = 'asking',
  Giving = 'giving',
}

export enum SupportActivity {
  Rosary = 'rosary',
  Artwork = 'artwork',
  Chapter = 'chapter',
}

export enum SupportEventType {
  Opened = 'opened',
  Milestone = 'milestone',
  ActivityEnd = 'activity-end',
  NotNow = 'not-now',
  Give = 'give',
  Leave = 'leave',
  GiftReturn = 'gift-return',
}

export const SUPPORT_STORAGE_KEY = 'support';
export const SUPPORT_RETURN_HASH = '#support-thanks';
const SUPPORT_VERSION = 1;
const SUPPORT_CREDIT_LIMIT = 21;
const SUPPORT_COMPLETION_CREDITS = 3;
const SUPPORT_DAY = 24 * 60 * 60 * MILLISECONDS_PER_SECOND;
const SUPPORT_GRACE_DAYS = 7;
const SUPPORT_GAP_DAYS = 30;
const SUPPORT_GIFT_MONTHS = 3;
const SUPPORT_DISMISSAL_DAYS: readonly number[] = [14, 28, 56, 90];
const SUPPORT_IDENTIFIER_LIMIT = 128;
const ACTIVITY_CREDITS: Readonly<Record<SupportActivity, number>> = {
  [SupportActivity.Rosary]: SUPPORT_COMPLETION_CREDITS,
  [SupportActivity.Artwork]: 1,
  [SupportActivity.Chapter]: SUPPORT_COMPLETION_CREDITS,
};

type SupportMilestone = {
  readonly id: string;
  readonly activity: SupportActivity;
  readonly ended: boolean;
};

export type SupportState = {
  readonly version: number;
  readonly phase: SupportPhase;
  readonly installedAt: number;
  readonly clockFloor: number;
  readonly credits: number;
  readonly lastAskAt: number | null;
  readonly notNowCount: number;
  readonly notNowUntil: number | null;
  readonly giftUntil: number | null;
  readonly askId: string | null;
  readonly milestones: readonly SupportMilestone[];
};

export type SupportEvent =
  | { readonly type: SupportEventType.Opened }
  | {
      readonly type: SupportEventType.Milestone;
      readonly id: string;
      readonly activity: SupportActivity;
    }
  | {
      readonly type:
        | SupportEventType.ActivityEnd
        | SupportEventType.NotNow
        | SupportEventType.Give
        | SupportEventType.Leave;
      readonly id: string;
    }
  | { readonly type: SupportEventType.GiftReturn; readonly fromCheckout: boolean };

export const createSupportState = (now: number): SupportState => ({
  version: SUPPORT_VERSION,
  phase: SupportPhase.Grace,
  installedAt: now,
  clockFloor: now,
  credits: 0,
  lastAskAt: null,
  notNowCount: 0,
  notNowUntil: null,
  giftUntil: null,
  askId: null,
  milestones: [],
});

const validTimestamp = (value: unknown): value is number =>
  typeof value === 'number' &&
  Number.isSafeInteger(value) &&
  value >= 0 &&
  !Number.isNaN(new Date(value).getTime());

const validDeadline = (value: unknown): value is number | null =>
  value === null || validTimestamp(value);

const validIdentifier = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= SUPPORT_IDENTIFIER_LIMIT;

const supportActivityFrom = (raw: unknown): SupportActivity | undefined =>
  Object.values(SupportActivity).find((activity) => activity === raw);

const supportPhaseFrom = (raw: unknown): SupportPhase | undefined =>
  Object.values(SupportPhase).find((phase) => phase === raw);

const milestoneFrom = (raw: unknown): SupportMilestone | null => {
  if (!isRecord(raw)) return null;
  const activity = supportActivityFrom(raw.activity);
  if (!validIdentifier(raw.id) || activity === undefined || typeof raw.ended !== 'boolean')
    return null;
  if (Object.keys(raw).length !== 3) return null;
  return { id: raw.id, activity, ended: raw.ended };
};

type StoredTimes = Pick<
  SupportState,
  'installedAt' | 'clockFloor' | 'lastAskAt' | 'notNowUntil' | 'giftUntil'
>;
const validTimes = (raw: UnknownRecord): raw is UnknownRecord & StoredTimes =>
  validTimestamp(raw.installedAt) &&
  validTimestamp(raw.clockFloor) &&
  validDeadline(raw.lastAskAt) &&
  validDeadline(raw.notNowUntil) &&
  validDeadline(raw.giftUntil);

type StoredCounts = Pick<SupportState, 'version' | 'credits' | 'notNowCount'>;
const validCounts = (raw: UnknownRecord): raw is UnknownRecord & StoredCounts =>
  raw.version === SUPPORT_VERSION &&
  typeof raw.credits === 'number' &&
  Number.isInteger(raw.credits) &&
  raw.credits >= 0 &&
  raw.credits <= SUPPORT_CREDIT_LIMIT &&
  typeof raw.notNowCount === 'number' &&
  Number.isInteger(raw.notNowCount) &&
  raw.notNowCount >= 0 &&
  raw.notNowCount <= SUPPORT_DISMISSAL_DAYS.length;

const validAskId = (value: unknown): value is string | null =>
  value === null || validIdentifier(value);

const validClaim = (phase: SupportPhase, id: string | null, lastAskAt: number | null): boolean => {
  const pending = phase === SupportPhase.Asking || phase === SupportPhase.Giving;
  return pending === (id !== null) && (!pending || lastAskAt !== null);
};

const parseMilestones = (raw: unknown): readonly SupportMilestone[] | null => {
  if (!Array.isArray(raw) || raw.length > SUPPORT_CREDIT_LIMIT) return null;
  const parsed = raw.map(milestoneFrom).filter((entry) => entry !== null);
  if (parsed.length !== raw.length || new Set(parsed.map(({ id }) => id)).size !== parsed.length)
    return null;
  return parsed;
};

export const parseSupportState = (raw: unknown): SupportState | null => {
  if (!isRecord(raw) || !validTimes(raw) || !validCounts(raw)) return null;
  const phase = supportPhaseFrom(raw.phase);
  if (phase === undefined || !validAskId(raw.askId)) return null;
  const milestones = parseMilestones(raw.milestones);
  if (milestones === null) return null;
  if (Object.keys(raw).length !== Object.keys(createSupportState(0)).length) return null;
  if (raw.clockFloor < raw.installedAt) return null;
  if (!validClaim(phase, raw.askId, raw.lastAskAt)) return null;
  return {
    version: SUPPORT_VERSION,
    phase,
    installedAt: raw.installedAt,
    clockFloor: raw.clockFloor,
    credits: raw.credits,
    lastAskAt: raw.lastAskAt,
    notNowCount: raw.notNowCount,
    notNowUntil: raw.notNowUntil,
    giftUntil: raw.giftUntil,
    askId: raw.askId,
    milestones,
  };
};

const availableAt = (state: SupportState): number =>
  Math.max(
    state.installedAt + SUPPORT_GRACE_DAYS * SUPPORT_DAY,
    state.lastAskAt === null ? 0 : state.lastAskAt + SUPPORT_GAP_DAYS * SUPPORT_DAY,
    state.notNowUntil ?? 0,
    state.giftUntil ?? 0,
  );

const phaseAt = (state: SupportState): SupportPhase => {
  if (state.clockFloor < state.installedAt + SUPPORT_GRACE_DAYS * SUPPORT_DAY)
    return SupportPhase.Grace;
  return state.clockFloor < availableAt(state) ? SupportPhase.Waiting : SupportPhase.Open;
};

const released = (state: SupportState): SupportState => ({
  ...state,
  phase: phaseAt(state),
  askId: null,
});

const ownsAsk = (state: SupportState, id: string): boolean =>
  state.phase === SupportPhase.Asking && state.askId === id;

const addMilestone = (
  state: SupportState,
  event: Extract<SupportEvent, { readonly type: SupportEventType.Milestone }>,
): SupportState => {
  if (!validIdentifier(event.id) || state.milestones.some(({ id }) => id === event.id))
    return state;
  return {
    ...state,
    credits: Math.min(SUPPORT_CREDIT_LIMIT, state.credits + ACTIVITY_CREDITS[event.activity]),
    milestones: [
      ...state.milestones,
      { id: event.id, activity: event.activity, ended: false },
    ].slice(-SUPPORT_CREDIT_LIMIT),
  };
};

const finishActivity = (state: SupportState, id: string): SupportState => {
  const milestone = state.milestones.find((entry) => entry.id === id);
  if (milestone === undefined || milestone.ended) return state;
  const milestones = state.milestones.map((entry) =>
    entry.id === id ? { ...entry, ended: true } : entry,
  );
  const closed = { ...state, milestones };
  if (state.phase !== SupportPhase.Open || state.credits < SUPPORT_CREDIT_LIMIT) return closed;
  return {
    ...closed,
    phase: SupportPhase.Asking,
    askId: id,
    lastAskAt: state.clockFloor,
    credits: 0,
  };
};

const deferSupport = (state: SupportState, id: string): SupportState => {
  if (!ownsAsk(state, id)) return state;
  const notNowCount = Math.min(state.notNowCount + 1, SUPPORT_DISMISSAL_DAYS.length);
  const days = SUPPORT_DISMISSAL_DAYS[notNowCount - 1] ?? SUPPORT_GAP_DAYS;
  return released({
    ...state,
    notNowCount,
    notNowUntil: state.clockFloor + days * SUPPORT_DAY,
  });
};

const giftDeadline = (now: number): number => {
  const date = new Date(now);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + SUPPORT_GIFT_MONTHS);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
};

const receiveGift = (state: SupportState, fromCheckout: boolean): SupportState => {
  if (state.phase !== SupportPhase.Giving) return state;
  if (!fromCheckout) return released(state);
  return released({
    ...state,
    giftUntil: giftDeadline(state.clockFloor),
    notNowCount: 0,
    notNowUntil: null,
  });
};

const clockSupport = (previous: SupportState, deviceTime: number): SupportState => {
  const now = validTimestamp(deviceTime)
    ? Math.max(deviceTime, previous.clockFloor)
    : previous.clockFloor;
  const clocked = { ...previous, clockFloor: now };
  const pending = previous.phase === SupportPhase.Asking || previous.phase === SupportPhase.Giving;
  return pending ? clocked : { ...clocked, phase: phaseAt(clocked) };
};

const finishBoundary = (state: SupportState, id: string): SupportState => {
  const abandoned = state.phase === SupportPhase.Asking && state.clockFloor >= availableAt(state);
  const current = state.phase === SupportPhase.Giving || abandoned ? released(state) : state;
  return finishActivity(current, id);
};

const beginGiving = (state: SupportState, id: string): SupportState =>
  ownsAsk(state, id) ? { ...state, phase: SupportPhase.Giving } : state;

const abandonAsk = (state: SupportState, id: string): SupportState =>
  ownsAsk(state, id) ? released(state) : state;

const openSupport = (state: SupportState): SupportState =>
  state.phase === SupportPhase.Giving ? released(state) : state;

export const reduceSupport = (
  previous: SupportState,
  event: SupportEvent,
  deviceTime: number,
): SupportState => {
  const state = clockSupport(previous, deviceTime);
  switch (event.type) {
    case SupportEventType.Opened:
      return openSupport(state);
    case SupportEventType.Milestone:
      return addMilestone(state, event);
    case SupportEventType.ActivityEnd:
      return finishBoundary(state, event.id);
    case SupportEventType.NotNow:
      return deferSupport(state, event.id);
    case SupportEventType.Give:
      return beginGiving(state, event.id);
    case SupportEventType.Leave:
      return abandonAsk(state, event.id);
    case SupportEventType.GiftReturn:
      return receiveGift(state, event.fromCheckout);
  }
};
