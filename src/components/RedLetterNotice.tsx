import { SUPPORT_EMAIL } from '../appMetadata.ts';
import type { ResolvedRedLetter } from '../content/catalog.ts';
import { useReading } from '../content/reading.ts';
import type { DevotionalSource } from '../content/schema.ts';
import { useEscape } from '../shared/useEscape.ts';
import { APPARATUS_CLASS_NAME, CLOSE_BUTTON_CLASS_NAME } from '../styles.ts';
import { CitationLink } from './links/CitationLink.tsx';
import { SupportEmailLink } from './links/SupportEmailLink.tsx';

export function RedLetterNoticeText({ notice }: { readonly notice: string }) {
  const [head, tail] = notice.split(SUPPORT_EMAIL);

  if (tail === undefined) {
    return notice;
  }

  return (
    <>
      {head}
      <SupportEmailLink />
      {tail}
    </>
  );
}

type NoticeActions = {
  readonly onClose: () => void;
  readonly onOpenSource: (sourceId: string) => void;
};

export function MarkingNotice({
  notice,
  sources,
  onClose,
  onOpenSource,
}: NoticeActions & {
  readonly notice: string;
  readonly sources: readonly DevotionalSource[];
}) {
  const { wording } = useReading();
  useEscape((event) => {
    event.preventDefault();
    onClose();
  }, true);

  return (
    <div className="flex items-start gap-2 border-l-2 border-accent/35 pl-4">
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <p className={`${APPARATUS_CLASS_NAME} text-muted`}>
          <RedLetterNoticeText notice={notice} />
        </p>
        <p className="flex flex-wrap gap-x-4">
          {sources.map((source) => (
            <CitationLink
              key={source.id}
              label={source.work}
              onOpen={() => onOpenSource(source.id)}
            />
          ))}
        </p>
      </div>
      <button
        aria-label={wording.common.close}
        className={CLOSE_BUTTON_CLASS_NAME}
        onClick={onClose}
        title={wording.common.close}
        type="button"
      >
        ×
      </button>
    </div>
  );
}

export function RedLetterNotice({
  redLetter,
  onClose,
  onOpenSource,
}: NoticeActions & {
  readonly redLetter: ResolvedRedLetter;
}) {
  return (
    <MarkingNotice
      notice={redLetter.notice}
      onClose={onClose}
      onOpenSource={onOpenSource}
      sources={[...redLetter.witnesses, ...redLetter.tools]}
    />
  );
}
