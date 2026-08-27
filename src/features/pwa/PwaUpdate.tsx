import { useEffect, useState } from 'react';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { ACCENT_BUTTON_CLASS_NAME, BODY_CLASS_NAME, EYEBROW_CLASS_NAME } from '../../styles.ts';
import { applyServiceWorkerUpdate, registerServiceWorker } from './registration.ts';

const UPDATE_NOTICE_ID = 'pwa-update-notice';

export function PwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const { preferences } = usePreferences();
  const { updateChecks } = preferences;

  useEffect(() => {
    registerServiceWorker({
      onUpdate: () => setUpdateAvailable(true),
      onError: (error) => console.error('Lucerna update check failed', error),
      updateChecks,
    });
  }, [updateChecks]);

  if (!updateAvailable) {
    return null;
  }

  return <UpdateNotice onDismiss={() => setUpdateAvailable(false)} />;
}

function UpdateNotice({ onDismiss }: { readonly onDismiss: () => void }) {
  return (
    <aside
      aria-labelledby={UPDATE_NOTICE_ID}
      aria-live="polite"
      className="surface-chrome fixed right-[max(1rem,env(safe-area-inset-right))] bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-50 flex flex-col gap-3 rounded-xl border border-hairline p-4 text-foreground sm:left-auto sm:max-w-sm"
      role="status"
    >
      <div>
        <p className={EYEBROW_CLASS_NAME} id={UPDATE_NOTICE_ID}>
          Update ready
        </p>
        <p className={`${BODY_CLASS_NAME} text-secondary`}>
          A new version of Lucerna is cached and ready.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          className={ACCENT_BUTTON_CLASS_NAME}
          onClick={applyServiceWorkerUpdate}
          type="button"
        >
          Update now
        </button>
        <button
          className="focus-ring min-h-11 px-4 font-display text-subtitle leading-subtitle text-muted transition-colors hover:text-foreground"
          onClick={onDismiss}
          type="button"
        >
          Later
        </button>
      </div>
    </aside>
  );
}
