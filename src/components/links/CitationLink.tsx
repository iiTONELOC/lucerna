import { CITATION_CLASS_NAME, TOUCH_LINK_CLASS_NAME } from '../../styles.ts';

export function CitationLink({
  label,
  onArt = false,
  onOpen,
}: {
  readonly label: string;
  readonly onArt?: boolean;
  readonly onOpen: () => void;
}) {
  return (
    <button
      className={`${TOUCH_LINK_CLASS_NAME} ${CITATION_CLASS_NAME} normal-caps font-normal tracking-normal italic ${
        onArt
          ? 'text-on-art-secondary hover:text-on-art-accent'
          : 'text-muted hover:text-accent-current'
      }`}
      onClick={onOpen}
      type="button"
    >
      {label}
    </button>
  );
}
