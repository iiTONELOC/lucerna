import { useEffect, useRef, useState, type PropsWithChildren } from 'react';
import { SUPPORT_PAYMENT_URL } from '../../appMetadata.ts';
import { ExternalLink } from '../../components/links/ExternalLink.tsx';
import { useReading } from '../../content/reading.ts';
import {
  ACCENT_BUTTON_CLASS_NAME,
  BODY_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  QUIET_BUTTON_CLASS_NAME,
  SURFACE_PANEL_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { SupportActivity, SupportEventType, SupportPhase, SUPPORT_RETURN_HASH } from './model.ts';
import {
  SupportContext,
  useSupportController,
  useSupport,
  useSupportActivity,
} from './supportActivity.ts';

function SupportThanks({ onContinue }: { readonly onContinue: () => void }) {
  const { wording } = useReading();
  return (
    <main className="scroll-region flex h-dvh flex-col overflow-y-auto bg-background p-5 text-foreground">
      <div className="m-auto flex w-full max-w-md flex-col gap-5">
        <h1 className={TITLE_CLASS_NAME}>{wording.support.thanks}</h1>
        <button className={ACCENT_BUTTON_CLASS_NAME} onClick={onContinue} type="button">
          {wording.prayer.continue}
        </button>
      </div>
    </main>
  );
}

const useSupportReturn = (dispatch: ReturnType<typeof useSupportController>['dispatch']) => {
  const [returning, setReturning] = useState(() => window.location.hash === SUPPORT_RETURN_HASH);
  useEffect(() => {
    const changed = (): void => {
      const next = window.location.hash === SUPPORT_RETURN_HASH;
      setReturning(next);
      if (next) void dispatch([{ type: SupportEventType.GiftReturn, referrer: '' }]);
    };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, [dispatch]);
  const continueToApp = (): void => {
    window.history.replaceState(null, '', window.location.pathname + window.location.search);
    setReturning(false);
  };
  return { returning, continueToApp };
};

export function SupportProvider({ children }: Readonly<PropsWithChildren>) {
  const controller = useSupportController();
  const { returning, continueToApp } = useSupportReturn(controller.dispatch);
  return (
    <SupportContext value={controller}>
      {returning ? <SupportThanks onContinue={continueToApp} /> : children}
    </SupportContext>
  );
}

type SupportPanelProps = {
  readonly id: string;
  readonly onDone: () => void;
  readonly standalone?: boolean;
};

const useSupportResponse = (id: string, onDone: () => void) => {
  const { state, dispatch } = useSupport();
  const give = async (): Promise<boolean> => {
    const next = await dispatch([{ type: SupportEventType.Give, id }]);
    onDone();
    return next?.phase === SupportPhase.Giving && next.askId === id;
  };
  const defer = (): void => {
    void dispatch([{ type: SupportEventType.NotNow, id }]).then(onDone);
  };
  return { give, defer, showing: state?.phase === SupportPhase.Asking && state.askId === id };
};

export function SupportPanel({ id, onDone, standalone = false }: SupportPanelProps) {
  const { wording } = useReading();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const Heading = standalone ? 'h1' : 'h2';
  const response = useSupportResponse(id, onDone);
  useEffect(() => {
    if (standalone) headingRef.current?.focus();
  }, [standalone]);
  if (!response.showing) return null;
  return (
    <section
      aria-label={wording.support.link}
      className={SURFACE_PANEL_CLASS_NAME + ' flex w-full max-w-md flex-col gap-3 p-5 sm:p-6'}
    >
      <Heading
        className={EYEBROW_CLASS_NAME + ' focus:outline-none'}
        ref={headingRef}
        tabIndex={-1}
      >
        {wording.support.link}
      </Heading>
      <p className={BODY_CLASS_NAME + ' text-foreground'}>{wording.support.body}</p>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 pt-1">
        <ExternalLink
          className={ACCENT_BUTTON_CLASS_NAME}
          href={SUPPORT_PAYMENT_URL}
          onBeforeOpen={response.give}
        >
          {wording.support.give}
        </ExternalLink>
        <button className={QUIET_BUTTON_CLASS_NAME} onClick={response.defer} type="button">
          {wording.support.notNow}
        </button>
      </div>
    </section>
  );
}

export function SupportCompletion({ id, onDone }: Pick<SupportPanelProps, 'id' | 'onDone'>) {
  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-5">
      <SupportPanel id={id} onDone={onDone} standalone />
    </div>
  );
}

export function ChapterCompletion({
  bookId,
  chapter,
}: {
  readonly bookId: string;
  readonly chapter: number;
}) {
  const { id, finish, asking, abandon } = useSupportActivity(
    SupportActivity.Chapter,
    bookId + '/' + String(chapter),
  );
  const sentinel = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  useEffect(() => {
    const target = sentinel.current;
    if (target === null) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry?.isIntersecting && !finished.current) {
        finished.current = true;
        void finish();
      }
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [finish]);
  return (
    <div ref={sentinel}>
      {asking ? (
        <SupportPanel id={id} onDone={() => abandon(id)} />
      ) : (
        <div aria-hidden="true" className="h-px" />
      )}
    </div>
  );
}
