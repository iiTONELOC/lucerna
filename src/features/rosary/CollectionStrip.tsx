import { resolveArtAsset } from '../../assets/art.ts';
import type { ResolvedArtwork } from '../../content/catalog.ts';
import { Shelf } from '../../components/layout.tsx';
import { CITATION_CLASS_NAME } from '../../styles.ts';

type CollectionStripProps = {
  readonly artworks: readonly ResolvedArtwork[];
  readonly onOpenArtwork: (artworkId: string) => void;
};

function ArtworkCard({
  artwork,
  onOpenArtwork,
}: {
  readonly artwork: ResolvedArtwork;
  readonly onOpenArtwork: (artworkId: string) => void;
}) {
  return (
    <li className="flex shrink-0">
      <button
        className="flex w-40 cursor-pointer flex-col gap-1.5 text-left sm:w-44 [&:active>img]:ring-2 [&:active>img]:ring-accent [&:focus-visible>img]:ring-2 [&:focus-visible>img]:ring-accent [&:hover>img]:ring-2 [&:hover>img]:ring-accent"
        onClick={() => onOpenArtwork(artwork.id)}
        type="button"
      >
        <img
          alt={`${artwork.title} by ${artwork.artist}`}
          className="aspect-square w-full rounded-xl object-cover ring-1 ring-accent/30 transition-shadow"
          draggable={false}
          src={resolveArtAsset(artwork.file)}
        />
        <span className={`truncate ${CITATION_CLASS_NAME} text-foreground`}>{artwork.title}</span>
        <span className={`truncate ${CITATION_CLASS_NAME} text-muted`}>
          {artwork.artist} · {artwork.date}
        </span>
      </button>
    </li>
  );
}

export function CollectionStrip({ artworks, onOpenArtwork }: CollectionStripProps) {
  return (
    <Shelf items={artworks} label="Lucerna Collection" trackClassName="gap-2">
      {artworks.map((artwork) => (
        <ArtworkCard artwork={artwork} key={artwork.id} onOpenArtwork={onOpenArtwork} />
      ))}
    </Shelf>
  );
}
