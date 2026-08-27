import type { BibleNoteRun } from '../../content/schema.ts';
import { SUPERSCRIPT_BUTTON_CLASS_NAME } from '../../styles.ts';

export function NoteMark({
  note,
  open,
  onToggle,
}: {
  readonly note: BibleNoteRun;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      aria-expanded={open}
      aria-label={note.keyword === undefined ? 'Note' : `Note: ${note.keyword}`}
      className={SUPERSCRIPT_BUTTON_CLASS_NAME}
      onClick={onToggle}
      type="button"
    >
      †
    </button>
  );
}

export function RedLetterMark({
  open,
  onToggle,
}: {
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  return (
    <button
      aria-expanded={open}
      aria-label="About the words of Christ marking"
      className={SUPERSCRIPT_BUTTON_CLASS_NAME}
      onClick={onToggle}
      type="button"
    >
      *
    </button>
  );
}
