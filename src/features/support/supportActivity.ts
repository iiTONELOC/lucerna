import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { SUPPORT_PAYMENT_URL } from '../../appMetadata.ts';
import { updateStoredValue } from '../../state/preferences/storage.ts';
import {
  createSupportState,
  parseSupportState,
  reduceSupport,
  SupportActivity,
  SupportEventType,
  SupportPhase,
  SUPPORT_RETURN_HASH,
  SUPPORT_STORAGE_KEY,
  type SupportEvent,
  type SupportState,
} from './model.ts';

type SupportDispatch = (events: readonly SupportEvent[]) => Promise<SupportState | null>;
type SupportController = {
  readonly state: SupportState | null;
  readonly dispatch: SupportDispatch;
  readonly abandon: (id: string) => void;
};

const SUPPORT_CONTEXT_ERROR = 'Support activity requires SupportProvider';
const CHECKOUT_ORIGINS = new Set([
  new URL(SUPPORT_PAYMENT_URL).origin,
  'https://checkout.stripe.com',
]);

export const isCheckoutReferrer = (referrer: string): boolean => {
  try {
    return CHECKOUT_ORIGINS.has(new URL(referrer).origin);
  } catch {
    return false;
  }
};
export const SupportContext = createContext<SupportController | null>(null);

const transactSupport = (events: readonly SupportEvent[]): Promise<SupportState | null> => {
  const now = Date.now();
  return updateStoredValue(SUPPORT_STORAGE_KEY, (raw) =>
    events.reduce(
      (state, event) => reduceSupport(state, event, now),
      parseSupportState(raw) ?? createSupportState(now),
    ),
  );
};

const startupEvent = (): SupportEvent =>
  window.location.hash === SUPPORT_RETURN_HASH
    ? { type: SupportEventType.GiftReturn, fromCheckout: isCheckoutReferrer(document.referrer) }
    : { type: SupportEventType.Opened };

export const useSupportController = (): SupportController => {
  const [state, setState] = useState<SupportState | null>(null);
  const current = useRef(state);
  const disabled = useRef(false);
  const queue = useRef(Promise.resolve<SupportState | null>(null));
  const [startup] = useState(startupEvent);
  const dispatch = useCallback<SupportDispatch>((events) => {
    const next = queue.current.then(() => (disabled.current ? null : transactSupport(events)));
    queue.current = next;
    void next.then((result) => {
      if (result === null) disabled.current = true;
      current.current = result;
      setState(result);
    });
    return next;
  }, []);
  const abandon = useCallback(
    (id: string): void => {
      if (current.current?.phase === SupportPhase.Asking && current.current.askId === id) {
        void dispatch([{ type: SupportEventType.Leave, id }]);
      }
    },
    [dispatch],
  );
  useEffect(() => {
    void dispatch([startup]);
  }, [dispatch, startup]);
  return useMemo(() => ({ state, dispatch, abandon }), [state, dispatch, abandon]);
};

export const useSupport = (): SupportController => {
  const value = useContext(SupportContext);
  if (value === null) throw new Error(SUPPORT_CONTEXT_ERROR);
  return value;
};

export const useSupportActivity = (activity: SupportActivity, contentKey: string) => {
  const { state, dispatch, abandon } = useSupport();
  const id = useMemo(
    () => [activity, contentKey, crypto.randomUUID()].join('/'),
    [activity, contentKey],
  );
  const pending = useRef<{ readonly id: string; readonly result: Promise<boolean> } | null>(null);
  useEffect(() => {
    if (activity === SupportActivity.Artwork) {
      void dispatch([{ type: SupportEventType.Milestone, activity, id }]);
    }
    return () => abandon(id);
  }, [activity, id, dispatch, abandon]);
  const finish = useCallback((): Promise<boolean> => {
    if (pending.current?.id === id) return pending.current.result;
    const events: SupportEvent[] =
      activity === SupportActivity.Artwork
        ? []
        : [{ type: SupportEventType.Milestone, activity, id }];
    events.push({ type: SupportEventType.ActivityEnd, id });
    const result = dispatch(events).then(
      (next) => next?.phase === SupportPhase.Asking && next.askId === id,
    );
    pending.current = { id, result };
    return result;
  }, [activity, id, dispatch]);
  return {
    id,
    finish,
    asking: state?.phase === SupportPhase.Asking && state.askId === id,
    abandon,
  };
};

export const useSupportExit = (activity: SupportActivity, contentKey: string) => {
  const session = useSupportActivity(activity, contentKey);
  const [next, setNext] = useState<(() => void) | null>(null);
  const pending = useRef(false);
  const finish = (onDone: () => void): void => {
    if (pending.current) return;
    pending.current = true;
    void session.finish().then((showing) => {
      if (showing) {
        setNext(() => onDone);
      } else {
        pending.current = false;
        onDone();
      }
    });
  };
  const resume = (): void => {
    session.abandon(session.id);
    const action = next;
    setNext(null);
    pending.current = false;
    action?.();
  };
  return { id: session.id, finish, resume, completed: next !== null };
};
