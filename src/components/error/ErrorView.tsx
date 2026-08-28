import { classNames } from '../../shared/classNames.ts';
import { ACCENT_BUTTON_CLASS_NAME } from '../../styles.ts';
import { ViewHeader } from '../layout.tsx';
import { DiagnosticDetails } from './DiagnosticDetails.tsx';
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
  return (
    <main
      className={classNames(
        'flex min-h-dvh w-full items-center justify-center bg-background pt-safe-top pb-safe-bottom text-foreground',
        className,
      )}
    >
      <section
        aria-labelledby={ERROR_TITLE_ID}
        className="edge-lit m-4 flex w-full max-w-prose flex-col gap-4 rounded-xl bg-surface p-6"
        role="alert"
      >
        <ViewHeader
          className="gap-4"
          eyebrow="Error"
          id={ERROR_TITLE_ID}
          lede={message}
          title={title}
        />

        {diagnosticDetails === undefined ? null : (
          <DiagnosticDetails details={diagnosticDetails} summary="Diagnostic details" />
        )}
        {diagnostics === undefined ? null : <ErrorReportActions diagnostics={diagnostics} />}
        <RetryButton onRetry={onRetry} />
      </section>
    </main>
  );
}
