import type { RefObject } from 'react';
import { ArtworkCreditLine } from '../../components/art/ArtworkCreditLine.tsx';
import { useReading } from '../../content/reading.ts';
import { classNames } from '../../shared/classNames.ts';
import { useLandscape } from '../../shared/useLandscape.ts';
import { decadeViewOf, strandStyleOf } from './decadeStrand.ts';
import { DecadeBand, DecadeOverlay, Drape, DrapeBandSizer } from './PrayerDrape.tsx';
import { ArtworkNotes, type AuxiliaryPlaybackNotesProps } from './PrayerNotes.tsx';
import type { DrapeProps, PrayerFocusSession } from './prayerSession.ts';
import type { NotesCollision } from './useNotesCollision.ts';
import { PENDANT_CLEARANCE_CLASS_NAME } from './usePendantOverhang.ts';

type ArtworkCreditProps = {
  readonly artwork: PrayerFocusSession['display']['artwork'];
  readonly clearPendant: boolean;
  readonly onOpenArtwork: (artworkId: string) => void;
};

function ArtworkCredit({ artwork, clearPendant, onOpenArtwork }: ArtworkCreditProps) {
  return (
    <figcaption
      className={classNames(
        'min-w-0 shrink-0 pt-2 landscape:px-0 landscape:pt-3',
        clearPendant ? PENDANT_CLEARANCE_CLASS_NAME : 'px-4 sm:px-6',
      )}
    >
      <ArtworkCreditLine artwork={artwork} onOpenArtwork={onOpenArtwork} />
    </figcaption>
  );
}

type ArtworkPageProps = {
  readonly artwork: PrayerFocusSession['display']['artwork'];
  readonly artworkRef: RefObject<HTMLDivElement | null>;
  readonly drape: DrapeProps;
  readonly drapeRef: RefObject<HTMLDivElement | null>;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly notes: AuxiliaryPlaybackNotesProps;
  readonly notesCollision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
  readonly showArtwork: boolean;
  readonly source: string;
};

export function ArtworkPage({
  artwork,
  artworkRef,
  drape,
  drapeRef,
  notes,
  notesCollision,
  notesRef,
  onOpenArtwork,
  showArtwork,
  source,
}: ArtworkPageProps) {
  const { wording } = useReading();
  const landscape = useLandscape();
  const decadeView = decadeViewOf(drape);
  const onArt = showArtwork || landscape;

  return (
    <figure
      aria-label={wording.prayer.devotionalArtwork}
      className={classNames(
        'relative isolate z-20 col-start-1 row-start-2 m-0 flex min-h-0 min-w-0 flex-col p-(--artwork-inset) [--artwork-inset:0px] @container landscape:col-start-2 landscape:row-start-1 landscape:row-span-3 landscape:border-l landscape:border-outline landscape:[--artwork-inset:1rem] lg:[--artwork-inset:1.5rem]',
        onArt ? 'drape-on-art' : undefined,
      )}
      data-layout-region="artwork"
    >
      <div
        className={classNames(
          'relative min-h-0 flex-1 flex-col',
          showArtwork ? 'flex' : 'hidden landscape:flex',
        )}
      >
        <div
          ref={artworkRef}
          className="relative min-h-0 w-full min-w-0 flex-1 overflow-hidden landscape:flex landscape:items-center landscape:justify-center"
          style={strandStyleOf(drape)}
        >
          <img
            alt={wording.artworkAlt(artwork.title, artwork.artist)}
            className="absolute inset-0 size-full object-cover object-top landscape:static landscape:h-auto landscape:max-h-full landscape:w-auto landscape:max-w-full landscape:rounded-xl spread:ring-1 spread:ring-accent/15"
            decoding="async"
            height={artwork.height}
            src={source}
            width={artwork.width}
          />
          {showArtwork ? (
            <ArtworkNotes {...notes} collision={notesCollision} notesRef={notesRef} />
          ) : null}
          {decadeView && onArt ? <DecadeOverlay drape={drape} drapeRef={drapeRef} /> : null}
        </div>

        <ArtworkCredit
          artwork={artwork}
          clearPendant={!decadeView && !landscape}
          onOpenArtwork={onOpenArtwork}
        />
      </div>

      {decadeView && !onArt ? <DecadeBand drape={drape} drapeRef={drapeRef} /> : null}
      {decadeView || onArt ? null : <DrapeBandSizer className="w-full" geometry={drape.geometry} />}
      {decadeView || landscape ? null : (
        <Drape {...drape} className="inset-x-0 -top-2" drapeRef={drapeRef} />
      )}
    </figure>
  );
}
