import { useCallback, useEffect, useRef, useState } from 'react';
import { contentCatalog } from '../../content/catalog.ts';
import { scheduledMysterySetId } from '../rosary/schedule.ts';
import {
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import {
  GALLERY_SORT_LABEL,
  galleryGroupsFor,
  GallerySort,
  type GalleryGroup,
} from './gallerySort.ts';
import { GalleryShelf } from './GalleryShelf.tsx';

const GALLERY_TITLE_ID = 'gallery-title';
const LEDE_CLASS_NAME = `max-w-prose ${SCRIPTURE_CLASS_NAME}`;

type GalleryViewProps = {
  readonly onFocusRestored: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly restoreFocusArtworkId: string | null;
};

function GalleryHeader() {
  return (
    <header className="flex flex-col gap-2 pt-2">
      <p className={EYEBROW_CLASS_NAME}>Art for contemplation</p>
      <h1 className={TITLE_CLASS_NAME} id={GALLERY_TITLE_ID}>
        The Lucerna Collection
      </h1>
      <p className={LEDE_CLASS_NAME}>Works gathered for prayer and contemplation.</p>
    </header>
  );
}

type SortControlProps = {
  readonly sort: GallerySort;
  readonly onSelectSort: (sort: GallerySort) => void;
};

function SortControl({ sort, onSelectSort }: SortControlProps) {
  return (
    <fieldset className="m-0 min-w-0 border-0 p-0">
      <legend className="sr-only">View by</legend>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-6 gap-y-1">
        <span aria-hidden="true" className={`${CITATION_CLASS_NAME} shrink-0 text-muted italic`}>
          View by
        </span>
        {Object.values(GallerySort).map((candidate) => {
          const selected = candidate === sort;

          return (
            <button
              aria-pressed={selected}
              className={`min-h-11 ${SUBTITLE_CLASS_NAME} transition-colors focus-ring ${selected ? 'text-accent-current underline decoration-accent-current underline-offset-8' : 'text-muted hover:text-accent'}`}
              key={candidate}
              onClick={() => onSelectSort(candidate)}
              type="button"
            >
              {GALLERY_SORT_LABEL[candidate]}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

type GallerySectionProps = {
  readonly group: GalleryGroup;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly registerButton: ArtworkButtonRegistrar;
};

type ArtworkButtonRegistrar = (artworkId: string, button: HTMLButtonElement | null) => void;

function GallerySection({ group, onOpenArtwork, registerButton }: GallerySectionProps) {
  return (
    <section className="flex min-w-0 flex-col gap-3">
      {group.heading === null ? null : (
        <h2 className={`${TITLE_CLASS_NAME} border-b border-hairline pb-2`}>{group.heading}</h2>
      )}

      <GalleryShelf
        artworks={group.artworks}
        label={group.heading ?? 'The Lucerna Collection'}
        onOpenArtwork={onOpenArtwork}
        registerButton={registerButton}
      />
    </section>
  );
}

const useGalleryOrganization = () => {
  const [sort, setSort] = useState(GallerySort.Mystery);
  const todaySetId = scheduledMysterySetId(new Date(), contentCatalog.rosary.schedule);
  const groups = galleryGroupsFor(sort, contentCatalog.artworks, todaySetId);

  return { groups, setSort, sort };
};

const useArtworkFocus = (
  onFocusRestored: () => void,
  restoreFocusArtworkId: string | null,
): ArtworkButtonRegistrar => {
  const artworkButtons = useRef(new Map<string, HTMLButtonElement>());
  const registerButton = useCallback(
    (artworkId: string, button: HTMLButtonElement | null): void => {
      if (button === null) {
        artworkButtons.current.delete(artworkId);
      } else {
        artworkButtons.current.set(artworkId, button);
      }
    },
    [],
  );

  useEffect(() => {
    if (restoreFocusArtworkId === null) {
      return;
    }

    artworkButtons.current.get(restoreFocusArtworkId)?.focus();
    onFocusRestored();
  }, [onFocusRestored, restoreFocusArtworkId]);

  return registerButton;
};

export function GalleryView({
  onFocusRestored,
  onOpenArtwork,
  restoreFocusArtworkId,
}: GalleryViewProps) {
  const { groups, setSort, sort } = useGalleryOrganization();
  const registerButton = useArtworkFocus(onFocusRestored, restoreFocusArtworkId);

  return (
    <section
      aria-labelledby={GALLERY_TITLE_ID}
      className="scroll-region flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
    >
      <div className="flex w-full flex-col gap-4 px-1 pb-4">
        <GalleryHeader />
        <SortControl onSelectSort={setSort} sort={sort} />

        <div className="flex min-w-0 flex-col gap-9">
          {groups.map((group) => (
            <GallerySection
              group={group}
              key={group.id}
              onOpenArtwork={onOpenArtwork}
              registerButton={registerButton}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
