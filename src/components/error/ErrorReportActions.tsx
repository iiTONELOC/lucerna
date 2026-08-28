import { useState } from 'react';
import { ACCENT_BUTTON_CLASS_NAME, QUIET_BUTTON_CLASS_NAME } from '../../styles.ts';
import { diagnosticEmailHref, persistErrorDiagnostics } from './diagnostics.ts';

enum CopyStatus {
  Failed = 'Copy failed',
  Idle = 'Copy diagnostics',
  Succeeded = 'Copied',
}

export function ErrorReportActions({ diagnostics }: { readonly diagnostics: string }) {
  const [copyStatus, setCopyStatus] = useState(CopyStatus.Idle);

  const copyDiagnostics = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(diagnostics);
      setCopyStatus(CopyStatus.Succeeded);
    } catch {
      setCopyStatus(CopyStatus.Failed);
    }
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <a
        className={`inline-flex items-center justify-center ${ACCENT_BUTTON_CLASS_NAME}`}
        href={diagnosticEmailHref(diagnostics)}
        onClick={() => persistErrorDiagnostics(diagnostics)}
      >
        Email diagnostics
      </a>
      <button
        className={`${QUIET_BUTTON_CLASS_NAME} px-4`}
        onClick={() => void copyDiagnostics()}
        type="button"
      >
        {copyStatus}
      </button>
    </div>
  );
}
