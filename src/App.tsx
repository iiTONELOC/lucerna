import { useState } from 'react';
import { InstallGuide } from './features/install/InstallGuide.tsx';
import { showInstallPrompt, useInstallPrompt } from './features/install/installPrompt.ts';
import { PwaUpdate } from './features/pwa/PwaUpdate.tsx';
import { Splash } from './features/splash/Splash.tsx';
import { AppShell } from './features/shell/AppShell.tsx';

function App() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [installGuideOpen, setInstallGuideOpen] = useState(false);
  const promptAvailable = useInstallPrompt();

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
        {isSplashVisible ? (
          <Splash
            applicationReady
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
