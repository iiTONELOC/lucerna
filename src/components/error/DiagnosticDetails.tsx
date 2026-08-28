import { classNames } from '../../shared/classNames.ts';
import { CITATION_CLASS_NAME } from '../../styles.ts';
import { Chevron } from '../icons/Chevron.tsx';
import { ChevronDirection } from '../icons/model.ts';

export function DiagnosticDetails({
  className,
  details,
  summary,
}: {
  readonly className?: string;
  readonly details: string;
  readonly summary: string;
}) {
  return (
    <details
      className={classNames('group rounded-md border border-hairline bg-background p-3', className)}
    >
      <summary
        className={`focus-ring flex cursor-pointer list-none items-center gap-2 ${CITATION_CLASS_NAME} text-secondary [&::-webkit-details-marker]:hidden`}
      >
        <Chevron
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          direction={ChevronDirection.Right}
        />
        {summary}
      </summary>
      <pre
        className={`scroll-region mt-3 max-h-56 overflow-x-hidden overflow-y-auto wrap-anywhere whitespace-pre-wrap text-muted ${CITATION_CLASS_NAME}`}
      >
        {details}
      </pre>
    </details>
  );
}
