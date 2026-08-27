import {
  ACCENT_BUTTON_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { Chevron } from '../icons/Chevron.tsx';
import { ChevronDirection } from '../icons/model.ts';
import { ErrorReportActions } from './ErrorReportActions.tsx';

type ErrorViewProps = {
  readonly title?: string;
  readonly message?: string;
  readonly details?: string;
  readonly diagnostics?: string;
  readonly onRetry?: () => void;
  readonly className?: string;
};

const ERROR_TITLE_ID = 'error-title';

function DiagnosticDetails({ details }: { readonly details: string | undefined }) {
  if (details === undefined) {
    return null;
  }

  return (
    <details className="group rounded-md border border-hairline bg-background p-3">
      <summary
        className={`flex cursor-pointer list-none items-center gap-2 ${CITATION_CLASS_NAME} text-secondary [&::-webkit-details-marker]:hidden`}
      >
        <Chevron
          className="size-4 shrink-0 transition-transform group-open:rotate-90"
          direction={ChevronDirection.Right}
        />
        Diagnostic details
      </summary>
      <pre
        className={`scroll-region mt-3 max-h-56 overflow-x-hidden overflow-y-auto wrap-anywhere whitespace-pre-wrap text-muted ${CITATION_CLASS_NAME}`}
      >
        {details}
      </pre>
    </details>
  );
}

function RetryButton({ onRetry }: { readonly onRetry: (() => void) | undefined }) {
  return onRetry === undefined ? null : (
    <button className={ACCENT_BUTTON_CLASS_NAME} onClick={onRetry} type="button">
      Try again
    </button>
  );
}

export function ErrorView({
  title = 'Something went wrong',
  message = 'Lucerna could not finish this view.',
  details,
  diagnostics,
  onRetry,
  className,
}: ErrorViewProps) {
  const diagnosticDetails = diagnostics ?? details;
  const rootClassName = [
    'flex min-h-dvh w-full items-center justify-center bg-background pt-safe-top pb-safe-bottom text-foreground',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <main className={rootClassName}>
      <section
        aria-labelledby={ERROR_TITLE_ID}
        className="edge-lit m-4 flex w-full max-w-prose flex-col gap-4 rounded-xl bg-surface p-6"
        role="alert"
      >
        <p className={EYEBROW_CLASS_NAME}>Error</p>
        <h1 className={TITLE_CLASS_NAME} id={ERROR_TITLE_ID}>
          {title}
        </h1>
        <p className={SCRIPTURE_CLASS_NAME}>{message}</p>

        <DiagnosticDetails details={diagnosticDetails} />
        {diagnostics === undefined ? null : <ErrorReportActions diagnostics={diagnostics} />}
        <RetryButton onRetry={onRetry} />
      </section>
    </main>
  );
}
