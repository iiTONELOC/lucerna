import { useState } from 'react';
import { clearErrorDiagnostics, lastErrorDiagnostics } from '../../components/error/diagnostics.ts';
import { DiagnosticDetails } from '../../components/error/DiagnosticDetails.tsx';
import { ErrorReportActions } from '../../components/error/ErrorReportActions.tsx';
import { CITATION_CLASS_NAME, EYEBROW_CLASS_NAME, INLINE_LINK_CLASS_NAME } from '../../styles.ts';

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
      <DiagnosticDetails className="mt-3" details={diagnostics} summary="Last error report" />
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
      <h3 className={EYEBROW_CLASS_NAME} id={DIAGNOSTICS_TITLE_ID}>
        Diagnostics
      </h3>
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>
        Lucerna keeps the last error on this device. Nothing is sent unless you send it.
      </p>
      {diagnostics === null ? (
        <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>No error has been recorded.</p>
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
