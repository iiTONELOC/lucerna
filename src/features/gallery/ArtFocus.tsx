import { useEffect, useRef, useState, type RefObject } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { contentCatalog } from '../../content/catalog.ts';
import { CITATION_CLASS_NAME, TITLE_CLASS_NAME } from '../../styles.ts';
import { artworkReferenceTarget, type ReferenceTarget } from '../references/referenceCatalog.ts';

const QUIET_ACTION_CLASS_NAME = `focus-ring flex min-h-11 items-center justify-center small-caps tracking-subtitle text-accent-current transition-colors hover:text-accent disabled:text-muted disabled:opacity-40 ${CITATION_CLASS_NAME}`;

type ArtFocusProps = {
  readonly artworkId: string;
  readonly onBack: () => void;
  readonly onNavigate: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
};

type Artwork = ReturnType<typeof contentCatalog.artworkById>;

function ArtworkProvenance({
  artwork,
  onOpenReference,
}: {
  readonly artwork: Artwork;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}) {
  return (
    <div className="flex w-full flex-col items-start gap-4 text-left">
      <dl
        className={`grid w-full grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 text-left ${CITATION_CLASS_NAME}`}
      >
        <dt className="small-caps tracking-subtitle text-muted">Source</dt>
        <dd className="wrap-break-word text-secondary">{artwork.source.work}</dd>
        {artwork.photographer === undefined ? null : (
          <>
            <dt className="small-caps tracking-subtitle text-muted">Photograph</dt>
            <dd className="wrap-break-word text-secondary">{artwork.photographer}</dd>
          </>
        )}
        <dt className="small-caps tracking-subtitle text-muted">Rights</dt>
        <dd className="wrap-break-word text-secondary">{artwork.source.approval}</dd>
      </dl>

      <button
        className={`focus-ring w-fit small-caps tracking-subtitle text-accent-current underline decoration-hairline underline-offset-4 transition-colors hover:decoration-accent ${CITATION_CLASS_NAME}`}
        onClick={() => onOpenReference(artworkReferenceTarget(artwork))}
        type="button"
      >
        View reference
      </button>
    </div>
  );
}

function ArtworkDetails({
  artwork,
  onOpenReference,
}: {
  readonly artwork: Artwork;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <button
        aria-expanded={expanded}
        className={`focus-ring flex min-h-11 w-fit items-center small-caps tracking-subtitle text-accent-current lg:hidden ${CITATION_CLASS_NAME}`}
        onClick={() => setExpanded((current) => !current)}
        type="button"
      >
        {expanded ? 'Fewer details' : 'More details'}
      </button>
      <div className={expanded ? 'block' : 'hidden lg:block'}>
        <ArtworkProvenance artwork={artwork} onOpenReference={onOpenReference} />
      </div>
    </>
  );
}

type ArtworkStageProps = {
  readonly artwork: Artwork;
};

function ArtworkBackdrop({ artwork }: { readonly artwork: Artwork }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="art-ambient absolute inset-0 size-full object-cover"
        src={resolveArtAsset(artwork.file)}
      />
      <div className="art-scrim absolute inset-0" />
    </div>
  );
}

function ArtworkStage({ artwork }: ArtworkStageProps) {
  return (
    <section className="relative z-10 flex min-h-0 min-w-0 flex-col lg:col-start-1 lg:row-start-2">
      <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center p-4 lg:px-8 lg:pt-4 lg:pb-8">
        <img
          alt={`${artwork.title} by ${artwork.artist}`}
          className="h-auto max-h-full w-auto max-w-full border border-hairline bg-surface p-2"
          decoding="async"
          height={artwork.height}
          src={resolveArtAsset(artwork.file)}
          width={artwork.width}
        />
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
    <section className="relative z-10 flex min-h-0 flex-col gap-3 overflow-hidden px-6 pb-6 text-center lg:col-start-2 lg:row-start-2 lg:mr-6 lg:mb-6 lg:justify-center lg:gap-4 lg:px-0 lg:pb-0 lg:text-left">
      <div className="scroll-region flex min-h-0 flex-col items-center gap-1 overflow-y-auto lg:flex-none lg:items-start lg:gap-2">
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

        <ArtworkDetails artwork={artwork} key={artwork.id} onOpenReference={onOpenReference} />
      </div>

      <nav
        aria-label="Artwork"
        className="grid shrink-0 grid-cols-3 items-center border-t border-hairline pt-1 lg:pt-2"
      >
        <NavigationButton artwork={previousArtwork} direction="Previous" onNavigate={onNavigate} />
        <span aria-hidden="true" />
        <NavigationButton artwork={nextArtwork} direction="Next" onNavigate={onNavigate} />
      </nav>
    </section>
  );
}

type ArtworkInteractionOptions = Pick<
  ArtworkSidebarProps,
  'nextArtwork' | 'onNavigate' | 'previousArtwork'
> &
  Pick<ArtFocusProps, 'artworkId' | 'onBack'>;

const useArtworkInteraction = ({
  artworkId,
  nextArtwork,
  onBack,
  onNavigate,
  previousArtwork,
}: ArtworkInteractionOptions) => {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [artworkId]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        onBack();
        return;
      }

      if (event.key === 'ArrowLeft' && previousArtwork !== undefined) {
        onNavigate(previousArtwork.id);
      }

      if (event.key === 'ArrowRight' && nextArtwork !== undefined) {
        onNavigate(nextArtwork.id);
      }
    };

    globalThis.addEventListener('keydown', handleKeyDown);
    return () => globalThis.removeEventListener('keydown', handleKeyDown);
  }, [nextArtwork, onBack, onNavigate, previousArtwork]);

  return { headingRef };
};

export function ArtFocus({ artworkId, onBack, onNavigate, onOpenReference }: ArtFocusProps) {
  const artworkIndex = contentCatalog.artworks.findIndex((artwork) => artwork.id === artworkId);
  const artwork = contentCatalog.artworkById(artworkId);
  const previousArtwork = artworkIndex > 0 ? contentCatalog.artworks[artworkIndex - 1] : undefined;
  const nextArtwork = contentCatalog.artworks[artworkIndex + 1];
  const { headingRef } = useArtworkInteraction({
    artworkId,
    nextArtwork,
    onBack,
    onNavigate,
    previousArtwork,
  });

  return (
    <main
      aria-label="artwork"
      className="scroll-region relative isolate h-dvh overflow-x-hidden overflow-y-auto bg-background pt-safe-top pb-safe-bottom text-foreground"
    >
      <div className="relative isolate grid h-full min-h-136 grid-rows-[auto_minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_minmax(20rem,24rem)] lg:grid-rows-[auto_minmax(0,1fr)]">
        <ArtworkBackdrop artwork={artwork} />
        <header className="relative z-20 flex shrink-0 px-4 pt-4 lg:col-span-2 lg:px-8 lg:pt-6">
          <BackButton label="Back to the collection" onBack={onBack} />
        </header>
        <ArtworkStage artwork={artwork} />
        <ArtworkSidebar
          artwork={artwork}
          headingRef={headingRef}
          nextArtwork={nextArtwork}
          onNavigate={onNavigate}
          onOpenReference={onOpenReference}
          previousArtwork={previousArtwork}
        />
      </div>
    </main>
  );
}
