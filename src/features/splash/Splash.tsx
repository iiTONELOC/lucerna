import { useEffect, useState } from 'react';
import { COPYRIGHT_NOTICE } from '../../appMetadata.ts';
import lucernaMark from '../../assets/brand/lucerna-mark.svg';
import { OpeningDuration } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { ACCENT_BUTTON_CLASS_NAME, MARK_CLASS_NAME, SUBTITLE_CLASS_NAME } from '../../styles.ts';
import { useInstalled } from '../install/useInstalled.ts';
import { selectOpeningVerse, type SplashVerse } from './splashModel.ts';

const SPLASH_TITLE_ID = 'splash-title';
const MILLISECONDS_PER_SECOND = 1_000;

type SplashProps = {
  readonly applicationReady: boolean;
  readonly onDismiss: () => void;
  readonly onOpenInstallGuide: () => void;
};

type DismissProps = Pick<SplashProps, 'applicationReady' | 'onDismiss'>;

const INSTALL_LINK_CLASS_NAME = `min-h-11 text-accent-current underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${SUBTITLE_CLASS_NAME}`;

const automaticHoldMilliseconds = (openingDuration: OpeningDuration): number | null =>
  openingDuration === OpeningDuration.Manual
    ? null
    : Number(openingDuration) * MILLISECONDS_PER_SECOND;

const useAutomaticDismiss = ({ applicationReady, onDismiss }: DismissProps): boolean => {
  const [minimumElapsed, setMinimumElapsed] = useState(false);
  const { preferences } = usePreferences();
  const holdMilliseconds = automaticHoldMilliseconds(preferences.openingDuration);

  useEffect(() => {
    if (holdMilliseconds === null) {
      return undefined;
    }

    const timer = setTimeout(() => setMinimumElapsed(true), holdMilliseconds);

    return () => clearTimeout(timer);
  }, [holdMilliseconds]);

  useEffect(() => {
    if (applicationReady && minimumElapsed && holdMilliseconds !== null) {
      onDismiss();
    }
  }, [applicationReady, holdMilliseconds, minimumElapsed, onDismiss]);

  return holdMilliseconds === null;
};

function OpeningVerse({ verse }: { readonly verse: SplashVerse }) {
  return (
    <figure className="flex w-full max-w-2xl shrink-0 flex-col gap-4">
      <blockquote className="text-balance font-reading text-scripture leading-scripture">
        {verse.text}
      </blockquote>
      <figcaption className="flex flex-col gap-2">
        <p className="small-caps text-subtitle leading-subtitle tracking-subtitle text-accent-current">
          {verse.reference}
        </p>
        <cite className="text-citation leading-citation text-muted">{verse.sourceLabel}</cite>
      </figcaption>
    </figure>
  );
}

function ContinueButton({ applicationReady, onDismiss }: DismissProps) {
  return (
    <button
      aria-live="polite"
      className={`shrink-0 ${ACCENT_BUTTON_CLASS_NAME} disabled:border-hairline disabled:text-muted disabled:hover:bg-transparent disabled:hover:text-muted`}
      disabled={!applicationReady}
      onClick={onDismiss}
      type="button"
    >
      {applicationReady ? 'Continue' : 'Preparing Lucerna'}
    </button>
  );
}

export function Splash({ applicationReady, onDismiss, onOpenInstallGuide }: SplashProps) {
  const [verse] = useState(selectOpeningVerse);
  const isManual = useAutomaticDismiss({ applicationReady, onDismiss });
  const installed = useInstalled();

  return (
    <main className="flex h-dvh flex-col overflow-hidden pt-safe-top pb-safe-bottom bg-background text-foreground">
      <section
        aria-labelledby={SPLASH_TITLE_ID}
        className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[clamp(0.75rem,2.5dvh,2.5rem)] px-6 py-[clamp(1rem,3dvh,2.5rem)] text-center"
      >
        <h1 className={`shrink-0 ${MARK_CLASS_NAME} text-accent`} id={SPLASH_TITLE_ID}>
          <span className="mr-[-0.125em]">Lucerna</span>
          <sup
            aria-hidden="true"
            className="align-super font-display text-subtitle leading-subtitle tracking-subtitle"
          >
            ™
          </sup>
        </h1>

        <div className="flex w-full min-h-0 flex-1 basis-0 items-center justify-center">
          <img alt="" className="h-full w-auto max-w-full object-contain" src={lucernaMark} />
        </div>

        <OpeningVerse verse={verse} />

        {isManual ? (
          <ContinueButton applicationReady={applicationReady} onDismiss={onDismiss} />
        ) : null}
      </section>
      <footer className="flex shrink-0 flex-col items-center gap-2 px-6 pb-3 text-center font-display text-legal leading-legal tracking-legal text-muted">
        {installed ? null : (
          <button
            className={INSTALL_LINK_CLASS_NAME}
            onClick={onOpenInstallGuide}
            title="How to Add Lucerna to your device"
            type="button"
          >
            How to Add Lucerna to your device
          </button>
        )}
        {COPYRIGHT_NOTICE}
      </footer>
    </main>
  );
}
