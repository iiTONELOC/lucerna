import { useEffect, useRef, useState } from 'react';
import { contentCatalog } from '../../content/catalog.ts';
import { loadLastBibleBook } from '../../state/reading/readingPositions.ts';
import { ArtFocus } from '../gallery/ArtFocus.tsx';
import { GalleryView } from '../gallery/GalleryView.tsx';
import { BibleContents } from '../library/BibleContents.tsx';
import { BibleFocus } from '../library/BibleFocus.tsx';
import { LibraryView } from '../library/LibraryView.tsx';
import { type BibleVerseLocation } from '../library/model.ts';
import { ReaderFocus } from '../library/ReaderFocus.tsx';
import { PrayerFocus } from '../prayer/PrayerFocus.tsx';
import { ReferenceFocus } from '../references/ReferenceFocus.tsx';
import { type ReferenceTarget } from '../references/referenceCatalog.ts';
import { ReferencesView } from '../references/ReferencesView.tsx';
import { RosaryHome } from '../rosary/RosaryHome.tsx';
import { SettingsScope } from '../settings/model.ts';
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
  readonly onOpenBible: () => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenWork: (workId: string) => void;
  readonly onSelectView: (view: ApplicationView) => void;
  readonly restoreFocusArtworkId: string | null;
};

function StandardViewBody({
  activeView,
  onBeginRosary,
  onFocusRestored,
  onOpenArtwork,
  onOpenBible,
  onOpenReference,
  onOpenWork,
  onSelectView,
  restoreFocusArtworkId,
}: StandardViewProps) {
  if (activeView === ApplicationView.Gallery) {
    return (
      <GalleryView
        onFocusRestored={onFocusRestored}
        onOpenArtwork={onOpenArtwork}
        restoreFocusArtworkId={restoreFocusArtworkId}
      />
    );
  }

  if (activeView === ApplicationView.Library) {
    return <LibraryView onOpenBible={onOpenBible} onOpenWork={onOpenWork} />;
  }

  if (activeView === ApplicationView.References) {
    return <ReferencesView onOpenReference={onOpenReference} />;
  }

  return (
    <RosaryHome
      onBeginRosary={onBeginRosary}
      onOpenArtwork={onOpenArtwork}
      onOpenGallery={() => onSelectView(ApplicationView.Gallery)}
    />
  );
}

const CENTERED_VIEWS: ReadonlySet<ApplicationView> = new Set([
  ApplicationView.Gallery,
  ApplicationView.Library,
]);

function StandardView(props: StandardViewProps) {
  const centered = CENTERED_VIEWS.has(props.activeView);

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {centered ? (
        <div className="mx-auto flex h-full min-h-0 w-full max-w-360 flex-col">
          <StandardViewBody {...props} />
        </div>
      ) : (
        <StandardViewBody {...props} />
      )}
    </div>
  );
}

enum ReadingTargetKind {
  Work = 'work',
  BibleContents = 'bible-contents',
  BibleBook = 'bible-book',
}

type ReadingTarget =
  | {
      readonly kind: ReadingTargetKind.Work;
      readonly workId: string;
      readonly blockIndex: number | null;
    }
  | { readonly kind: ReadingTargetKind.BibleContents }
  | {
      readonly kind: ReadingTargetKind.BibleBook;
      readonly bookId: string;
      readonly blockIndex: number | null;
      readonly verse?: BibleVerseLocation;
    };

type ShellContentProps = StandardViewProps & {
  readonly onCloseBibleBook: () => void;
  readonly onCloseReader: () => void;
  readonly onExitPrayer: () => void;
  readonly onOpenBibleBook: (bookId: string, blockIndex: number | null) => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenSettings: () => void;
  readonly prayingSetId: string | null;
  readonly readingTarget: ReadingTarget | null;
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

type ShellMainProps = Omit<
  ShellContentProps,
  'onCloseBibleBook' | 'onCloseReader' | 'onOpenBibleBook' | 'readingTarget'
>;

function ShellMain(props: ShellMainProps) {
  if (props.prayingSetId !== null) {
    return (
      <PrayerFocus
        mysterySetId={props.prayingSetId}
        onExit={props.onExitPrayer}
        onOpenArtwork={props.onOpenArtwork}
        onOpenBibleVerse={props.onOpenBibleVerse}
        onOpenReference={props.onOpenReference}
        onOpenSettings={props.onOpenSettings}
      />
    );
  }

  return (
    <StandardView
      activeView={props.activeView}
      onBeginRosary={props.onBeginRosary}
      onFocusRestored={props.onFocusRestored}
      onOpenArtwork={props.onOpenArtwork}
      onOpenBible={props.onOpenBible}
      onOpenReference={props.onOpenReference}
      onOpenWork={props.onOpenWork}
      onSelectView={props.onSelectView}
      restoreFocusArtworkId={props.restoreFocusArtworkId}
    />
  );
}

type ReadingFocusProps = {
  readonly onCloseBibleBook: () => void;
  readonly onCloseReader: () => void;
  readonly onOpenBibleBook: (bookId: string, blockIndex: number | null) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenSettings: () => void;
  readonly target: ReadingTarget;
};

function ReadingFocus(props: ReadingFocusProps) {
  if (props.target.kind === ReadingTargetKind.Work) {
    return (
      <ReaderFocus
        initialBlockIndex={props.target.blockIndex}
        onBack={props.onCloseReader}
        onOpenSettings={props.onOpenSettings}
        workId={props.target.workId}
      />
    );
  }

  if (props.target.kind === ReadingTargetKind.BibleBook) {
    return (
      <BibleFocus
        bookId={props.target.bookId}
        initialBlockIndex={props.target.blockIndex}
        initialVerse={props.target.verse ?? null}
        onBack={props.target.verse === undefined ? props.onCloseBibleBook : props.onCloseReader}
        onOpenBook={(bookId) => props.onOpenBibleBook(bookId, 0)}
        onOpenReference={props.onOpenReference}
        onOpenSettings={props.onOpenSettings}
      />
    );
  }

  return (
    <BibleContents
      onBack={props.onCloseReader}
      onOpenBook={(bookId) => props.onOpenBibleBook(bookId, null)}
      onOpenSettings={props.onOpenSettings}
    />
  );
}

const shellMainLabel = (props: ShellContentProps): string => {
  if (props.readingTarget !== null) {
    return 'Reading';
  }

  return props.prayingSetId === null ? props.activeView : 'Rosary prayer';
};

function ShellContent(props: ShellContentProps) {
  const standardView = props.prayingSetId === null && props.readingTarget === null;

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <ShellHeader
        activeView={props.activeView}
        hidden={!standardView}
        onOpenSettings={props.onOpenSettings}
        onSelectView={props.onSelectView}
      />

      <main
        aria-label={shellMainLabel(props)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {props.readingTarget === null ? null : (
          <ReadingFocus
            onCloseBibleBook={props.onCloseBibleBook}
            onCloseReader={props.onCloseReader}
            onOpenBibleBook={props.onOpenBibleBook}
            onOpenReference={props.onOpenReference}
            onOpenSettings={props.onOpenSettings}
            target={props.readingTarget}
          />
        )}
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          hidden={props.readingTarget !== null}
        >
          <ShellMain {...props} />
        </div>
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
  const [readingTarget, setReadingTarget] = useState<ReadingTarget | null>(null);
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
    readingTarget,
    restoreFocusArtworkId,
    closeReference: referenceOverlay.closeReference,
    openReference: referenceOverlay.openReference,
    selectView,
    setFocusedArtworkId,
    setPrayingSetId,
    setRailExpanded,
    setReadingTarget,
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

const bibleEntryTarget = (lastBookId: string | null): ReadingTarget => {
  const known =
    lastBookId !== null && contentCatalog.bible.books.some((book) => book.id === lastBookId);

  return known
    ? { kind: ReadingTargetKind.BibleBook, bookId: lastBookId, blockIndex: null }
    : { kind: ReadingTargetKind.BibleContents };
};

const readingHandlersOf = (shell: ReturnType<typeof useAppShellState>) => ({
  onCloseBibleBook: () => shell.setReadingTarget({ kind: ReadingTargetKind.BibleContents }),
  onCloseReader: () => shell.setReadingTarget(null),
  onOpenBible: () =>
    void loadLastBibleBook().then((lastBookId) =>
      shell.setReadingTarget(bibleEntryTarget(lastBookId)),
    ),
  onOpenBibleBook: (bookId: string, blockIndex: number | null) =>
    shell.setReadingTarget({ kind: ReadingTargetKind.BibleBook, bookId, blockIndex }),
  onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) =>
    shell.setReadingTarget({ kind: ReadingTargetKind.BibleBook, bookId, blockIndex: null, verse }),
  onOpenWork: (workId: string) =>
    shell.setReadingTarget({ kind: ReadingTargetKind.Work, workId, blockIndex: null }),
});

function ShellFrame({ hidden, onOpenInstallGuide, shell }: ShellFrameProps) {
  const chromeVisible = shell.prayingSetId === null && shell.readingTarget === null;

  return (
    <div
      className={`flex h-dvh flex-col overflow-hidden bg-background text-foreground ${chromeVisible ? 'gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] spread:flex-row lg:flex-row' : ''}`}
      hidden={hidden}
    >
      <ShellRail
        activeView={shell.activeView}
        expanded={shell.railExpanded}
        hidden={!chromeVisible}
        onGoHome={shell.goToRosary}
        onOpenSettings={() => shell.setSettingsOpen((current) => !current)}
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
        onOpenSettings={() => shell.setSettingsOpen((current) => !current)}
        onSelectView={shell.selectView}
        prayingSetId={shell.prayingSetId}
        readingTarget={shell.readingTarget}
        restoreFocusArtworkId={shell.restoreFocusArtworkId}
        {...readingHandlersOf(shell)}
      />

      <SettingsDialog
        open={shell.settingsOpen}
        scope={shell.readingTarget === null ? SettingsScope.Application : SettingsScope.Reader}
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
        <ReferenceFocus
          onBack={shell.closeReference}
          onOpenReading={(location) => {
            shell.closeReference();
            shell.setReadingTarget({
              kind: ReadingTargetKind.Work,
              workId: location.workId,
              blockIndex: location.blockIndex,
            });
          }}
          target={focusedReference}
        />
      )}
    </>
  );
}
