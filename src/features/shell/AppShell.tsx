import { useEffect, useRef, useState } from 'react';
import { ArtFocus } from '../gallery/ArtFocus.tsx';
import { GalleryView } from '../gallery/GalleryView.tsx';
import { PrayerFocus } from '../prayer/PrayerFocus.tsx';
import { ReferenceFocus } from '../references/ReferenceFocus.tsx';
import { type ReferenceTarget } from '../references/referenceCatalog.ts';
import { ReferencesView } from '../references/ReferencesView.tsx';
import { RosaryHome } from '../rosary/RosaryHome.tsx';
import { SettingsDialog } from '../settings/SettingsDialog.tsx';
import { ApplicationView } from './model.ts';
import { DesktopRail, LanternTrigger, MobileQuickNav } from './Navigation.tsx';

type ShellRailProps = {
  readonly activeView: ApplicationView;
  readonly expanded: boolean;
  readonly hidden: boolean;
  readonly onGoHome: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
  readonly onToggleExpanded: () => void;
};

function ShellRail({ hidden, ...railProps }: ShellRailProps) {
  return hidden ? null : <DesktopRail {...railProps} />;
}

type StandardViewProps = {
  readonly activeView: ApplicationView;
  readonly onBeginRosary: (mysterySetId: string) => void;
  readonly onFocusRestored: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onSelectView: (view: ApplicationView) => void;
  readonly restoreFocusArtworkId: string | null;
};

function StandardView({
  activeView,
  onBeginRosary,
  onFocusRestored,
  onOpenArtwork,
  onOpenReference,
  onSelectView,
  restoreFocusArtworkId,
}: StandardViewProps) {
  if (activeView === ApplicationView.Gallery) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-col">
        <div className="mx-auto flex h-full min-h-0 w-full max-w-360 flex-col">
          <GalleryView
            onFocusRestored={onFocusRestored}
            onOpenArtwork={onOpenArtwork}
            restoreFocusArtworkId={restoreFocusArtworkId}
          />
        </div>
      </div>
    );
  }

  if (activeView === ApplicationView.References) {
    return (
      <div className="relative flex h-full min-h-0 w-full flex-col">
        <ReferencesView onOpenReference={onOpenReference} />
      </div>
    );
  }

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      <RosaryHome
        onBeginRosary={onBeginRosary}
        onOpenArtwork={onOpenArtwork}
        onOpenGallery={() => onSelectView(ApplicationView.Gallery)}
      />
    </div>
  );
}

type ShellContentProps = StandardViewProps & {
  readonly onExitPrayer: () => void;
  readonly onOpenSettings: () => void;
  readonly prayingSetId: string | null;
};

type ShellHeaderProps = Pick<
  ShellContentProps,
  'activeView' | 'onOpenSettings' | 'onSelectView'
> & {
  readonly hidden: boolean;
};

function ShellHeader({ activeView, hidden, onOpenSettings, onSelectView }: ShellHeaderProps) {
  return (
    <header
      className={`${hidden ? 'hidden' : 'flex'} min-h-14 shrink-0 items-center justify-between spread:hidden lg:hidden`}
    >
      <LanternTrigger onGoHome={() => onSelectView(ApplicationView.Rosary)} />
      <MobileQuickNav
        activeView={activeView}
        onOpenSettings={onOpenSettings}
        onSelectView={onSelectView}
      />
    </header>
  );
}

function ShellContent({
  activeView,
  onBeginRosary,
  onExitPrayer,
  onFocusRestored,
  onOpenArtwork,
  onOpenReference,
  onOpenSettings,
  onSelectView,
  prayingSetId,
  restoreFocusArtworkId,
}: ShellContentProps) {
  const standardView = prayingSetId === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShellHeader
        activeView={activeView}
        hidden={!standardView}
        onOpenSettings={onOpenSettings}
        onSelectView={onSelectView}
      />

      <main
        aria-label={standardView ? activeView : 'Rosary prayer'}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {prayingSetId === null ? (
          <StandardView
            activeView={activeView}
            onBeginRosary={onBeginRosary}
            onFocusRestored={onFocusRestored}
            onOpenArtwork={onOpenArtwork}
            onOpenReference={onOpenReference}
            onSelectView={onSelectView}
            restoreFocusArtworkId={restoreFocusArtworkId}
          />
        ) : (
          <PrayerFocus
            mysterySetId={prayingSetId}
            onExit={onExitPrayer}
            onOpenArtwork={onOpenArtwork}
            onOpenReference={onOpenReference}
            onOpenSettings={onOpenSettings}
          />
        )}
      </main>
    </div>
  );
}

type ReferenceOverlayState = {
  readonly closeReference: () => void;
  readonly focusedReference: ReferenceTarget | null;
  readonly openReference: (target: ReferenceTarget) => void;
};

function useReferenceOverlayState(): ReferenceOverlayState {
  const [focusedReference, setFocusedReference] = useState<ReferenceTarget | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const returnFocus = returnFocusRef.current;

    if (focusedReference !== null || returnFocus === null) {
      return;
    }

    returnFocusRef.current = null;
    const frame = requestAnimationFrame(() => {
      if (returnFocus.isConnected) {
        returnFocus.focus();
      }
    });

    return () => cancelAnimationFrame(frame);
  }, [focusedReference]);

  const openReference = (target: ReferenceTarget): void => {
    const activeElement = document.activeElement;
    returnFocusRef.current = activeElement instanceof HTMLElement ? activeElement : null;
    setFocusedReference(target);
  };

  return {
    closeReference: () => setFocusedReference(null),
    focusedReference,
    openReference,
  };
}

function useAppShellState() {
  const [activeView, setActiveView] = useState(ApplicationView.Rosary);
  const [railExpanded, setRailExpanded] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [focusedArtworkId, setFocusedArtworkId] = useState<string | null>(null);
  const [restoreFocusArtworkId, setRestoreFocusArtworkId] = useState<string | null>(null);
  const [prayingSetId, setPrayingSetId] = useState<string | null>(null);
  const referenceOverlay = useReferenceOverlayState();

  const goToRosary = (): void => {
    setPrayingSetId(null);
    setActiveView(ApplicationView.Rosary);
  };

  const selectView = (view: ApplicationView): void => {
    setPrayingSetId(null);
    setActiveView(view);
  };

  const closeArtwork = (artworkId: string): void => {
    setRestoreFocusArtworkId(artworkId);
    setFocusedArtworkId(null);
  };

  return {
    activeView,
    closeArtwork,
    focusedArtworkId,
    focusedReference: referenceOverlay.focusedReference,
    goToRosary,
    prayingSetId,
    railExpanded,
    restoreFocusArtworkId,
    closeReference: referenceOverlay.closeReference,
    openReference: referenceOverlay.openReference,
    selectView,
    setFocusedArtworkId,
    setPrayingSetId,
    setRailExpanded,
    setRestoreFocusArtworkId,
    setSettingsOpen,
    settingsOpen,
  };
}

type ShellFrameProps = {
  readonly hidden: boolean;
  readonly onOpenInstallGuide: () => void;
  readonly shell: ReturnType<typeof useAppShellState>;
};

function ShellFrame({ hidden, onOpenInstallGuide, shell }: ShellFrameProps) {
  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden bg-background text-foreground ${shell.prayingSetId === null ? 'gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] spread:flex-row lg:flex-row' : ''}`}
      hidden={hidden}
    >
      <ShellRail
        activeView={shell.activeView}
        expanded={shell.railExpanded}
        hidden={shell.prayingSetId !== null}
        onGoHome={shell.goToRosary}
        onOpenSettings={() => shell.setSettingsOpen(true)}
        onSelectView={shell.selectView}
        onToggleExpanded={() => shell.setRailExpanded((current) => !current)}
      />
      <ShellContent
        activeView={shell.activeView}
        onBeginRosary={shell.setPrayingSetId}
        onExitPrayer={() => shell.setPrayingSetId(null)}
        onFocusRestored={() => shell.setRestoreFocusArtworkId(null)}
        onOpenArtwork={shell.setFocusedArtworkId}
        onOpenReference={shell.openReference}
        onOpenSettings={() => shell.setSettingsOpen(true)}
        onSelectView={shell.selectView}
        prayingSetId={shell.prayingSetId}
        restoreFocusArtworkId={shell.restoreFocusArtworkId}
      />

      <SettingsDialog
        open={shell.settingsOpen}
        onClose={() => shell.setSettingsOpen(false)}
        onOpenInstallGuide={() => {
          shell.setSettingsOpen(false);
          onOpenInstallGuide();
        }}
        onOpenReferences={() => {
          shell.selectView(ApplicationView.References);
          shell.setSettingsOpen(false);
        }}
      />
    </div>
  );
}

export function AppShell({ onOpenInstallGuide }: { readonly onOpenInstallGuide: () => void }) {
  const shell = useAppShellState();
  const focusedArtworkId = shell.focusedArtworkId;
  const focusedReference = shell.focusedReference;

  return (
    <>
      <ShellFrame
        hidden={focusedArtworkId !== null || focusedReference !== null}
        onOpenInstallGuide={onOpenInstallGuide}
        shell={shell}
      />
      {focusedArtworkId === null ? null : (
        <div hidden={focusedReference !== null}>
          <ArtFocus
            artworkId={focusedArtworkId}
            onBack={() => shell.closeArtwork(focusedArtworkId)}
            onNavigate={shell.setFocusedArtworkId}
            onOpenReference={shell.openReference}
          />
        </div>
      )}
      {focusedReference === null ? null : (
        <ReferenceFocus onBack={shell.closeReference} target={focusedReference} />
      )}
    </>
  );
}
