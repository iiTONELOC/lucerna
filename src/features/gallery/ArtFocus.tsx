import { useCallback, useEffect, useState, type RefObject } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import { AmbientGround } from '../../components/art/AmbientGround.tsx';
import { AmbientScrim } from '../../components/art/model.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { FocusPage } from '../../components/layout.tsx';
import { contentCatalog } from '../../content/catalog.ts';
import { classNames } from '../../shared/classNames.ts';
import { useFocusPage } from '../../shared/focus.ts';
import {
  CAPTION_CAPS_CLASS_NAME,
  CITATION_CLASS_NAME,
  TITLE_CLASS_NAME,
  UNDERLINE_LINK_CLASS_NAME,
} from '../../styles.ts';
import { artworkReferenceTarget, type ReferenceTarget } from '../references/referenceCatalog.ts';
import { ArtworkViewer, FITTED_ARTWORK_CLASS_NAME, FramedArtwork } from './ArtworkViewer.tsx';

const QUIET_ACTION_CLASS_NAME = `focus-ring flex min-h-11 items-center justify-center text-accent-current transition-colors hover:text-accent disabled:text-muted disabled:opacity-40 ${CAPTION_CAPS_CLASS_NAME}`;

type ArtFocusProps = {
  readonly artworkId: string;
  readonly onBack: () => void;
  readonly onNavigate: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
};

type Artwork = ReturnType<typeof contentCatalog.artworkById>;

type ArtworkStageProps = {
  readonly artwork: Artwork;
  readonly onExpand: () => void;
};

function ArtworkStage({ artwork, onExpand }: ArtworkStageProps) {
  return (
    <section className="relative z-10 flex min-h-0 min-w-0 flex-col landscape:col-start-1 landscape:row-start-2">
      <div className="flex min-h-0 min-w-0 flex-1 p-4 lg:px-8 lg:pt-4 lg:pb-8">
        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center @container-size">
          <FramedArtwork
            artwork={artwork}
            className={FITTED_ARTWORK_CLASS_NAME}
            onExpand={onExpand}
          />
        </div>
      </div>
    </section>
  );
}

type NavigationButtonProps = {
  readonly artwork: Artwork | undefined;
  readonly direction: 'Next' | 'Previous';
  readonly onNavigate: (artworkId: string) => void;
};

function NavigationButton({ artwork, direction, onNavigate }: NavigationButtonProps) {
  return (
    <button
      aria-label={
        artwork === undefined
          ? `${direction} artwork unavailable`
          : `${direction} artwork: ${artwork.title}`
      }
      className={QUIET_ACTION_CLASS_NAME}
      disabled={artwork === undefined}
      onClick={() => {
        if (artwork !== undefined) {
          onNavigate(artwork.id);
        }
      }}
      type="button"
    >
      {direction}
    </button>
  );
}

type ArtworkSidebarProps = {
  readonly artwork: Artwork;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly nextArtwork: Artwork | undefined;
  readonly onNavigate: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly previousArtwork: Artwork | undefined;
};

function ArtworkSidebar({
  artwork,
  headingRef,
  nextArtwork,
  onNavigate,
  onOpenReference,
  previousArtwork,
}: ArtworkSidebarProps) {
  return (
    <section className="relative z-10 flex min-h-0 w-full max-w-prose flex-col gap-3 justify-self-center overflow-hidden px-6 pb-6 text-center landscape:w-auto landscape:max-w-none landscape:justify-self-stretch landscape:col-start-2 landscape:row-start-2 landscape:mr-6 landscape:mb-6 landscape:justify-center landscape:gap-4 landscape:px-0 landscape:pb-0 landscape:text-left">
      <div className="relative flex min-h-0 flex-col items-center gap-1 landscape:flex-none landscape:items-start landscape:gap-2">
        <h1 className={`${TITLE_CLASS_NAME} focus:outline-none`} ref={headingRef} tabIndex={-1}>
          {artwork.title}
        </h1>
        <p className={`${CITATION_CLASS_NAME} text-secondary italic`}>
          {artwork.artist} · {artwork.date}
        </p>
        <p className={`${CITATION_CLASS_NAME} text-muted`}>
          {artwork.holder}
          {artwork.accession === undefined ? '' : ` · ${artwork.accession}`}
        </p>
        <button
          className={classNames(
            "w-fit pt-2 after:absolute after:inset-0 after:content-['']",
            UNDERLINE_LINK_CLASS_NAME,
            CAPTION_CAPS_CLASS_NAME,
          )}
          onClick={() => onOpenReference(artworkReferenceTarget(artwork))}
          type="button"
        >
          View reference
        </button>
      </div>

      <nav
        aria-label="Artwork"
        className="grid shrink-0 grid-cols-3 items-center border-t border-hairline pt-1 landscape:pt-2"
      >
        <NavigationButton artwork={previousArtwork} direction="Previous" onNavigate={onNavigate} />
        <span aria-hidden="true" />
        <NavigationButton artwork={nextArtwork} direction="Next" onNavigate={onNavigate} />
      </nav>
    </section>
  );
}

type ArrowNavigationOptions = Pick<
  ArtworkSidebarProps,
  'nextArtwork' | 'onNavigate' | 'previousArtwork'
>;

const useArrowNavigation = ({
  nextArtwork,
  onNavigate,
  previousArtwork,
}: ArrowNavigationOptions): void => {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'ArrowLeft' && previousArtwork !== undefined) {
        onNavigate(previousArtwork.id);
      }

      if (event.key === 'ArrowRight' && nextArtwork !== undefined) {
        onNavigate(nextArtwork.id);
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [nextArtwork, onNavigate, previousArtwork]);
};

export function ArtFocus({ artworkId, onBack, onNavigate, onOpenReference }: ArtFocusProps) {
  const artworkIndex = contentCatalog.artworks.findIndex((artwork) => artwork.id === artworkId);
  const artwork = contentCatalog.artworkById(artworkId);
  const previousArtwork = artworkIndex > 0 ? contentCatalog.artworks[artworkIndex - 1] : undefined;
  const nextArtwork = contentCatalog.artworks[artworkIndex + 1];
  const [fullSize, setFullSize] = useState(false);
  const closeViewer = useCallback(() => setFullSize(false), []);
  const headingRef = useFocusPage(fullSize ? closeViewer : onBack, artworkId);

  useArrowNavigation(
    fullSize
      ? { nextArtwork: undefined, onNavigate, previousArtwork: undefined }
      : { nextArtwork, onNavigate, previousArtwork },
  );

  return (
    <FocusPage className="relative isolate" label="artwork">
      <div className="relative isolate grid h-full min-h-136 grid-rows-[auto_minmax(0,1fr)_auto] landscape:min-h-0 landscape:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] landscape:grid-rows-[auto_minmax(0,1fr)]">
        <AmbientGround scrim={AmbientScrim.Focus} source={resolveArtAsset(artwork.file)} />
        <header className="relative z-20 flex shrink-0 px-4 pt-4 landscape:col-span-2 lg:px-8 lg:pt-6">
          <BackButton label="Back to the collection" onBack={onBack} />
        </header>
        <ArtworkStage artwork={artwork} onExpand={() => setFullSize(true)} />
        <ArtworkSidebar
          artwork={artwork}
          headingRef={headingRef}
          nextArtwork={nextArtwork}
          onNavigate={onNavigate}
          onOpenReference={onOpenReference}
          previousArtwork={previousArtwork}
        />
      </div>
      <ArtworkViewer artwork={artwork} onClose={closeViewer} open={fullSize} />
    </FocusPage>
  );
}
