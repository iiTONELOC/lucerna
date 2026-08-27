import { useEffect, useState } from 'react';
import { InstallGuide } from './features/install/InstallGuide.tsx';
import { showInstallPrompt, useInstallPrompt } from './features/install/installPrompt.ts';
import { PwaUpdate } from './features/pwa/PwaUpdate.tsx';
import { useOfflineReady } from './features/pwa/useOfflineReady.ts';
import { Splash } from './features/splash/Splash.tsx';

const shellImport = import('./features/shell/AppShell.tsx');

type AppShellComponent = Awaited<typeof shellImport>['AppShell'];

const useAppShell = (): AppShellComponent | null => {
  const [shell, setShell] = useState<AppShellComponent | null>(null);

  useEffect(() => {
    let active = true;

    void shellImport.then((module) => {
      if (active) {
        setShell(() => module.AppShell);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return shell;
};

function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const promptAvailable = useInstallPrompt();
  const offlineReady = useOfflineReady();
  const AppShell = useAppShell();
  const applicationReady = offlineReady && AppShell !== null;

  const addToDevice = (): void => {
    if (promptAvailable) {
      void showInstallPrompt();
      return;
    }

    setInstallGuideOpen(true);
  };

  return (
    <div className="h-dvh w-full overflow-hidden pl-safe-left pr-safe-right">
      {installGuideOpen ? <InstallGuide onBack={() => setInstallGuideOpen(false)} /> : null}
      <div className="h-full" hidden={installGuideOpen}>
        {isSplashVisible || AppShell === null ? (
          <Splash
            applicationReady={applicationReady}
            onDismiss={() => setIsSplashVisible(false)}
            onOpenInstallGuide={addToDevice}
          />
        ) : (
          <AppShell onOpenInstallGuide={addToDevice} />
        )}
      </div>
      <PwaUpdate />
    </div>
  );
}

export default App;
