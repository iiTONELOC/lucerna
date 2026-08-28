import { resolveArtAsset } from '../../assets/art.ts';
import type { ResolvedArtwork } from '../../content/catalog.ts';
import { Shelf } from '../../components/layout.tsx';
import { CITATION_CLASS_NAME } from '../../styles.ts';

const CAPTION_CLASS_NAME = `wrap-break-word ${CITATION_CLASS_NAME}`;

type ArtworkButtonRegistrar = (artworkId: string, button: HTMLButtonElement | null) => void;

type GalleryShelfProps = {
  readonly artworks: readonly ResolvedArtwork[];
  readonly heading: string | null;
  readonly label: string;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly registerButton: ArtworkButtonRegistrar;
};

type GalleryArtworkCardProps = {
  readonly artwork: ResolvedArtwork;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly registerButton: ArtworkButtonRegistrar;
};

function GalleryArtworkCard({ artwork, onOpenArtwork, registerButton }: GalleryArtworkCardProps) {
  return (
    <li className="flex aspect-4/5 w-[clamp(18rem,30cqi,40rem)] shrink-0 self-start">
      <article className="flex size-full" data-artwork-id={artwork.id}>
        <button
          className="group edge-lit relative flex size-full flex-col overflow-hidden rounded-xl bg-surface text-left hover:ring-2 hover:ring-accent focus-ring"
          onClick={() => onOpenArtwork(artwork.id)}
          ref={(button) => registerButton(artwork.id, button)}
          type="button"
        >
          <img
            alt={`${artwork.title} by ${artwork.artist}`}
            className="absolute inset-0 size-full object-cover object-top transition-opacity duration-300 group-hover:opacity-90"
            decoding="async"
            draggable={false}
            height={artwork.height}
            loading="lazy"
            src={resolveArtAsset(artwork.file)}
            width={artwork.width}
          />
          <span
            aria-hidden="true"
            className="absolute inset-x-0 bottom-0 h-3/5 bg-linear-to-t from-on-art-scrim from-15% via-on-art-scrim/80 via-45% to-transparent in-data-[theme=light]:h-2/5"
          />
          <span className="relative z-10 mt-auto flex flex-col gap-1 p-4">
            <span className={`${CAPTION_CLASS_NAME} text-on-art-accent`}>{artwork.title}</span>
            <span className={`${CAPTION_CLASS_NAME} text-on-art-secondary italic`}>
              {artwork.artist} · {artwork.date}
            </span>
            <span className={`${CAPTION_CLASS_NAME} text-on-art-muted`}>{artwork.holder}</span>
          </span>
        </button>
      </article>
    </li>
  );
}

export function GalleryShelf({
  artworks,
  heading,
  label,
  onOpenArtwork,
  registerButton,
}: GalleryShelfProps) {
  return (
    <Shelf items={artworks} label={label} {...(heading === null ? {} : { heading })}>
      {artworks.map((artwork) => (
        <GalleryArtworkCard
          artwork={artwork}
          key={artwork.id}
          onOpenArtwork={onOpenArtwork}
          registerButton={registerButton}
        />
      ))}
    </Shelf>
  );
}
