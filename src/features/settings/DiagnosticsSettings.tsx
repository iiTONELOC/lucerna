import { useState } from 'react';
import { clearErrorDiagnostics, lastErrorDiagnostics } from '../../components/error/diagnostics.ts';
import { ErrorReportActions } from '../../components/error/ErrorReportActions.tsx';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { CITATION_CLASS_NAME, INLINE_LINK_CLASS_NAME } from '../../styles.ts';

const DIAGNOSTICS_TITLE_ID = 'settings-diagnostics-title';

function RetainedReport({
  diagnostics,
  onClear,
}: {
  readonly diagnostics: string;
  readonly onClear: () => void;
}) {
  return (
    <>
      <details className="group mt-3 rounded-md border border-hairline bg-background p-3">
        <summary className="flex cursor-pointer list-none items-center gap-2 font-display text-citation leading-citation text-secondary [&::-webkit-details-marker]:hidden">
          <Chevron
            className="size-4 shrink-0 transition-transform group-open:rotate-90"
            direction={ChevronDirection.Right}
          />
          Last error report
        </summary>
        <pre
          className={`scroll-region mt-3 max-h-56 overflow-x-hidden overflow-y-auto wrap-anywhere whitespace-pre-wrap text-muted ${CITATION_CLASS_NAME}`}
        >
          {diagnostics}
        </pre>
      </details>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <ErrorReportActions diagnostics={diagnostics} />
        <button className={INLINE_LINK_CLASS_NAME} onClick={onClear} type="button">
          Clear this report
        </button>
      </div>
    </>
  );
}

export function DiagnosticsSettings() {
  const [diagnostics, setDiagnostics] = useState(lastErrorDiagnostics);

  return (
    <section aria-labelledby={DIAGNOSTICS_TITLE_ID} className="border-t border-hairline pt-4">
      <h3
        className="small-caps font-display text-subtitle leading-subtitle font-semibold tracking-subtitle text-accent-current"
        id={DIAGNOSTICS_TITLE_ID}
      >
        Diagnostics
      </h3>
      <p className="pt-3 font-display text-citation leading-citation text-muted">
        Lucerna keeps the last error on this device. Nothing is sent unless you send it.
      </p>
      {diagnostics === null ? (
        <p className="pt-3 font-display text-citation leading-citation text-muted">
          No error has been recorded.
        </p>
      ) : (
        <RetainedReport
          diagnostics={diagnostics}
          onClear={() => {
            clearErrorDiagnostics();
            setDiagnostics(null);
          }}
        />
      )}
    </section>
  );
}
