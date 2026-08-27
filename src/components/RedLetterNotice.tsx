import { SUPPORT_EMAIL } from '../appMetadata.ts';
import type { ResolvedRedLetter } from '../content/catalog.ts';
import { APPARATUS_CLASS_NAME } from '../styles.ts';
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

export function RedLetterNotice({
  redLetter,
  onOpenSource,
}: {
  readonly redLetter: ResolvedRedLetter;
  readonly onOpenSource: (sourceId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-1 border-l-2 border-accent/35 pl-4">
      <p className={`${APPARATUS_CLASS_NAME} text-muted`}>
        <RedLetterNoticeText notice={redLetter.notice} />
      </p>
      <p className="flex flex-wrap gap-x-4">
        {[...redLetter.witnesses, ...redLetter.tools].map((source) => (
          <CitationLink
            key={source.id}
            label={source.work}
            onOpen={() => onOpenSource(source.id)}
          />
        ))}
      </p>
    </div>
  );
}
