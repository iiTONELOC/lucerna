import type { ReactNode, RefObject } from 'react';
import { useEscape } from '../../shared/useEscape.ts';
import { ReaderGround, Theme, type Preferences } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { CITATION_CLASS_NAME } from '../../styles.ts';
import type { DevotionalSource } from '../../content/schema.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { SettingsButton } from '../../components/buttons/SettingsButton.tsx';

const readerSurfacePropsOf = (preferences: Preferences) => ({
  'data-reader-face': preferences.readerFace,
  'data-reader-scale': preferences.readerTextScale,
  ...(preferences.readerGround === ReaderGround.Parchment ? { 'data-theme': Theme.Parchment } : {}),
});

const useReaderEscape = (onBack: () => void): void => {
  useEscape((event) => {
    const insideDialog = event.target instanceof Element && event.target.closest('dialog') !== null;

    if (!insideDialog && !event.defaultPrevented) {
      onBack();
    }
  });
};

function ReaderTopBar({
  location,
  onBack,
  onOpenSettings,
}: {
  readonly location?: ReactNode;
  readonly onBack: () => void;
  readonly onOpenSettings: () => void;
}) {
  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center">
      <BackButton className="justify-self-start" onBack={onBack} />
      <div className="min-w-0">{location}</div>
      <SettingsButton className="justify-self-end" onOpen={onOpenSettings} />
    </div>
  );
}

export function ReaderColophon({ source }: { readonly source: DevotionalSource }) {
  const publication = [source.publisher, source.published].filter((part) => part !== undefined);

  return (
    <footer className="flex flex-col gap-1 border-t border-hairline pt-6">
      {source.translator === undefined ? null : (
        <p className={`${CITATION_CLASS_NAME} text-muted`}>Translated by {source.translator}.</p>
      )}
      {publication.length === 0 ? null : (
        <p className={`${CITATION_CLASS_NAME} text-muted`}>{publication.join(', ')}.</p>
      )}
      <p className={`${CITATION_CLASS_NAME} text-muted`}>{source.approval}</p>
    </footer>
  );
}

export function ReaderSurface({
  articleRef,
  children,
  location,
  onBack,
  onOpenSettings,
}: {
  readonly articleRef?: RefObject<HTMLElement | null>;
  readonly children: ReactNode;
  readonly location?: ReactNode;
  readonly onBack: () => void;
  readonly onOpenSettings: () => void;
}) {
  const { preferences } = usePreferences();
  useReaderEscape(onBack);

  return (
    <div
      aria-label="Reader"
      className="flex h-full min-h-0 flex-col bg-background pt-safe-top text-foreground"
      {...readerSurfacePropsOf(preferences)}
    >
      <div className="mx-auto w-full max-w-prose shrink-0 px-4 pt-2 text-reading sm:px-6">
        <ReaderTopBar location={location} onBack={onBack} onOpenSettings={onOpenSettings} />
      </div>
      <div className="scroll-region min-h-0 flex-1 overflow-x-hidden overflow-y-auto pb-safe-bottom">
        <article
          className="mx-auto flex min-h-full w-full max-w-prose flex-col gap-5 px-4 py-5 text-reading sm:px-6 lg:py-10"
          ref={articleRef}
        >
          {children}
        </article>
      </div>
    </div>
  );
}
