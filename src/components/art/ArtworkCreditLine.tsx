import type { ResolvedArtwork } from '../../content/catalog.ts';
import { CITATION_CLASS_NAME, TOUCH_LINK_CLASS_NAME } from '../../styles.ts';

export function ArtworkCreditLine({
  artwork,
  className,
  onArt = false,
  onOpenArtwork,
}: {
  readonly artwork: ResolvedArtwork;
  readonly className?: string;
  readonly onArt?: boolean;
  readonly onOpenArtwork: (artworkId: string) => void;
}) {
  return (
    <p
      className={`${CITATION_CLASS_NAME} wrap-break-word italic ${onArt ? 'text-on-art-muted' : 'text-muted'} ${className ?? ''}`}
    >
      {artwork.artist}, <cite>{artwork.title}</cite> · {artwork.holder}{' '}
      <button
        className={`${TOUCH_LINK_CLASS_NAME} ${onArt ? 'text-on-art-secondary hover:text-on-art-accent' : 'text-muted hover:text-accent-current'}`}
        onClick={() => onOpenArtwork(artwork.id)}
        type="button"
      >
        View in gallery
      </button>
    </p>
  );
}
