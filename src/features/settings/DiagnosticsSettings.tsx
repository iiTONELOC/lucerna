import { useState } from 'react';
import { DiagnosticDetails } from '../../components/error/DiagnosticDetails.tsx';
import { clearErrorDiagnostics, lastErrorDiagnostics } from '../../components/error/diagnostics.ts';
import { ErrorReportActions } from '../../components/error/ErrorReportActions.tsx';
import { useReading } from '../../content/reading.ts';
import { CITATION_CLASS_NAME, EYEBROW_CLASS_NAME, INLINE_LINK_CLASS_NAME } from '../../styles.ts';

const DIAGNOSTICS_TITLE_ID = 'settings-diagnostics-title';

function RetainedReport({
  diagnostics,
  onClear,
}: {
  readonly diagnostics: string;
  readonly onClear: () => void;
}) {
  const { wording } = useReading();
  return (
    <>
      <DiagnosticDetails
        className="mt-3"
        details={diagnostics}
        summary={wording.errors.lastReport}
      />
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <ErrorReportActions diagnostics={diagnostics} />
        <button className={INLINE_LINK_CLASS_NAME} onClick={onClear} type="button">
          {wording.errors.clearReport}
        </button>
      </div>
    </>
  );
}

export function DiagnosticsSettings() {
  const { wording } = useReading();
  const [diagnostics, setDiagnostics] = useState(lastErrorDiagnostics);

  return (
    <section aria-labelledby={DIAGNOSTICS_TITLE_ID} className="border-t border-hairline pt-4">
      <h3 className={EYEBROW_CLASS_NAME} id={DIAGNOSTICS_TITLE_ID}>
        {wording.errors.diagnostics}
      </h3>
      <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>
        <span className="block">{wording.errors.keepsLastError}</span>
        <span className="block">{wording.errors.nothingSent}</span>
      </p>
      {diagnostics === null ? (
        <p className={`pt-3 ${CITATION_CLASS_NAME} text-muted`}>{wording.errors.noError}</p>
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
