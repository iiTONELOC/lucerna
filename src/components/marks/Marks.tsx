import { useReading } from '../../content/reading.ts';
import type { BibleNoteRun } from '../../content/schema.ts';
import { SUPERSCRIPT_BUTTON_CLASS_NAME } from '../../styles.ts';
import { MarkingNotice } from '../RedLetterNotice.tsx';

export type MarkToggle = {
  readonly open: boolean;
  readonly onToggle: () => void;
};

function MarkingMark({ label, open, onToggle }: MarkToggle & { readonly label: string }) {
  return (
    <button
      aria-expanded={open}
      aria-label={label}
      className={SUPERSCRIPT_BUTTON_CLASS_NAME}
      onClick={onToggle}
      type="button"
    >
      *
    </button>
  );
}

export function NoteMark({
  note,
  open,
  onToggle,
}: {
  readonly note: BibleNoteRun;
  readonly open: boolean;
  readonly onToggle: () => void;
}) {
  const { wording } = useReading();
  return (
    <button
      aria-expanded={open}
      aria-label={
        note.keyword === undefined ? wording.common.note : wording.common.noteAbout(note.keyword)
      }
      className={SUPERSCRIPT_BUTTON_CLASS_NAME}
      onClick={onToggle}
      type="button"
    >
      †
    </button>
  );
}

export function RedLetterMark(props: MarkToggle) {
  const { wording } = useReading();
  return <MarkingMark {...props} label={wording.common.redLetterAbout} />;
}

export function AiTranslationMark(props: MarkToggle) {
  const { wording } = useReading();
  return <MarkingMark {...props} label={wording.settings.aiTranslated} />;
}

export function AiTranslationNotice({
  onClose,
  onOpenSource,
}: {
  readonly onClose: () => void;
  readonly onOpenSource: (sourceId: string) => void;
}) {
  const reading = useReading();
  const marking = reading.catalog.aiTranslation;

  return marking === null ? null : (
    <MarkingNotice
      notice={marking.notice}
      onClose={onClose}
      onOpenSource={onOpenSource}
      sources={marking.tools}
    />
  );
}
