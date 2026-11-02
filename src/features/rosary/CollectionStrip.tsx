import { resolveArtAsset } from '../../assets/art.ts';
import { Shelf } from '../../components/layout.tsx';
import type { ResolvedArtwork } from '../../content/catalog.ts';
import { useReading } from '../../content/reading.ts';
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
  const { wording } = useReading();
  return (
    <li className="flex shrink-0">
      <button
        className="flex w-40 cursor-pointer flex-col gap-1.5 text-left home-wide:w-44 [&:active>img]:ring-2 [&:active>img]:ring-accent [&:focus-visible>img]:ring-2 [&:focus-visible>img]:ring-accent [&:hover>img]:ring-2 [&:hover>img]:ring-accent"
        onClick={() => onOpenArtwork(artwork.id)}
        type="button"
      >
        <img
          alt={wording.artworkAlt(artwork.title, artwork.artist)}
          className="aspect-square w-full rounded-xl object-cover ring-1 ring-accent/15 transition-shadow"
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
  const { wording } = useReading();
  return (
    <Shelf items={artworks} label={wording.home.collection} trackClassName="gap-2">
      {artworks.map((artwork) => (
        <ArtworkCard artwork={artwork} key={artwork.id} onOpenArtwork={onOpenArtwork} />
      ))}
    </Shelf>
  );
}
