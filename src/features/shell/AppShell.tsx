import { Activity, Fragment, useEffect, useRef, useState, type ReactNode } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import { AmbientGround } from '../../components/art/AmbientGround.tsx';
import type { BibleEditionId } from '../../content/language.ts';
import { useReading, type ReadingSnapshot } from '../../content/reading.ts';
import { loadLastBibleBook } from '../../state/reading/readingPositions.ts';
import { CONTENT_WIDTH_CLASS_NAME } from '../../styles.ts';
import { ArtFocus } from '../gallery/ArtFocus.tsx';
import { GalleryView } from '../gallery/GalleryView.tsx';
import { BibleContents } from '../library/BibleContents.tsx';
import { BibleFocus } from '../library/BibleFocus.tsx';
import { LibraryView } from '../library/LibraryView.tsx';
import { type BibleVerseLocation } from '../library/model.ts';
import { ReaderFocus } from '../library/ReaderFocus.tsx';
import { PrayerFocus } from '../prayer/PrayerFocus.tsx';
import { type PrayerStart } from '../prayer/progression.ts';
import { cacheEdition } from '../pwa/registration.ts';
import { type ReferenceTarget } from '../references/referenceCatalog.ts';
import { ReferenceFocus, type ReferenceActions } from '../references/ReferenceFocus.tsx';
import { ReferencesView } from '../references/ReferencesView.tsx';
import { RosaryHome } from '../rosary/RosaryHome.tsx';
import { useDailyHeroArtwork, scheduledMysterySetId } from '../rosary/schedule.ts';
import { SettingsScope } from '../settings/model.ts';
import { SettingsDialog } from '../settings/SettingsDialog.tsx';
import { ApplicationView } from './model.ts';
import {
  DestinationKind,
  destinationOf,
  destinationOfRecord,
  goBack,
  INITIAL_NAVIGATION,
  openBible,
  openDestination,
  pathIn,
  pathOf,
  replaceDestination,
  selectArea,
  showArea,
  turnToBook,
  type Destination,
  type Navigation,
} from './navigation.ts';
import { BottomBar, DesktopRail } from './Navigation.tsx';

type ShellRailProps = {
  readonly activeView: ApplicationView;
  readonly hidden: boolean;
  readonly onGoHome: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
};

function ShellRail({ hidden, ...railProps }: ShellRailProps) {
  return hidden ? null : <DesktopRail {...railProps} />;
}

type ShellActions = ReturnType<typeof useAppShellState>['actions'];

type StandardViewProps = {
  readonly actions: ShellActions;
  readonly activeView: ApplicationView;
  readonly homeSetId: string;
  readonly restoreFocusArtworkId: string | null;
};

function StandardViewBody({
  actions,
  activeView,
  homeSetId,
  restoreFocusArtworkId,
}: StandardViewProps) {
  if (activeView === ApplicationView.Gallery) {
    return (
      <GalleryView
        onFocusRestored={actions.clearRestoreFocus}
        onOpenArtwork={actions.openArtwork}
        restoreFocusArtworkId={restoreFocusArtworkId}
      />
    );
  }

  if (activeView === ApplicationView.Library) {
    return <LibraryView onOpenBible={actions.openBible} onOpenWork={actions.openWork} />;
  }

  if (activeView === ApplicationView.References) {
    return <ReferencesView onOpenReference={actions.openRecord} />;
  }

  return (
    <RosaryHome
      onBeginRosary={actions.beginRosary}
      onOpenArtwork={actions.openArtwork}
      onOpenGallery={() => actions.selectView(ApplicationView.Gallery)}
      onSelectSet={actions.selectHomeSet}
      selectedSetId={homeSetId}
    />
  );
}

function StandardView(props: StandardViewProps) {
  const centered =
    props.activeView === ApplicationView.Library || props.activeView === ApplicationView.References;

  return (
    <div className="relative flex h-full min-h-0 w-full flex-col">
      {centered ? (
        <div className={`flex h-full min-h-0 flex-col ${CONTENT_WIDTH_CLASS_NAME}`}>
          <StandardViewBody {...props} />
        </div>
      ) : (
        <StandardViewBody {...props} />
      )}
    </div>
  );
}

const READING_KINDS: ReadonlySet<DestinationKind> = new Set([
  DestinationKind.Work,
  DestinationKind.BibleContents,
  DestinationKind.BibleBook,
]);

const OVERLAY_KINDS: ReadonlySet<DestinationKind> = new Set([
  DestinationKind.Artwork,
  DestinationKind.Reference,
]);

const isOverlay = (destination: Destination | undefined): boolean =>
  destination !== undefined && OVERLAY_KINDS.has(destination.kind);

const pageKeyOf = (destination: Destination, index: number): string =>
  destination.kind === DestinationKind.Prayer
    ? `${String(index)}-${destination.kind}-${String(destination.run)}`
    : `${String(index)}-${destination.kind}`;

type BibleDestination = Extract<
  Destination,
  { readonly kind: DestinationKind.BibleBook | DestinationKind.BibleContents }
>;

function BibleFramePage({
  actions,
  destination,
}: {
  readonly actions: ShellActions;
  readonly destination: BibleDestination;
}) {
  return destination.kind === DestinationKind.BibleBook ? (
    <BibleFocus
      bookId={destination.bookId}
      edition={destination.edition}
      initialBlockIndex={destination.blockIndex}
      initialVerse={destination.verse ?? null}
      onBack={actions.back}
      onOpenBook={(bookId) => actions.turnToBook(destination.edition, bookId)}
      onOpenReference={actions.openReference}
      onOpenSettings={actions.toggleSettings}
    />
  ) : (
    <BibleContents
      edition={destination.edition}
      onBack={actions.back}
      onOpenBook={(bookId) => actions.openBibleBook(destination.edition, bookId, null)}
      onOpenSettings={actions.toggleSettings}
    />
  );
}

function FramePage({
  actions,
  destination,
}: {
  readonly actions: ShellActions;
  readonly destination: Destination;
}) {
  switch (destination.kind) {
    case DestinationKind.Prayer:
      return (
        <PrayerFocus
          mysterySetId={destination.mysterySetId}
          {...(destination.start === undefined ? {} : { start: destination.start })}
          onExit={actions.back}
          onOpenArtwork={actions.openArtwork}
          onOpenBibleVerse={actions.openBibleVerse}
          onOpenReference={actions.openReference}
          onOpenSettings={actions.toggleSettings}
        />
      );
    case DestinationKind.Work:
      return (
        <ReaderFocus
          initialBlockIndex={destination.blockIndex}
          onBack={actions.back}
          onOpenReference={actions.openReference}
          onOpenSettings={actions.toggleSettings}
          workId={destination.workId}
        />
      );
    case DestinationKind.BibleBook:
    case DestinationKind.BibleContents:
      return <BibleFramePage actions={actions} destination={destination} />;
    default:
      return null;
  }
}

function OverlayPage({
  actions,
  destination,
}: {
  readonly actions: ShellActions;
  readonly destination: Destination;
}) {
  if (destination.kind === DestinationKind.Artwork) {
    return (
      <ArtFocus
        artworkId={destination.artworkId}
        onBack={actions.back}
        onNavigate={actions.stepArtwork}
        onOpenReference={actions.openReference}
      />
    );
  }

  return destination.kind === DestinationKind.Reference ? (
    <ReferenceFocus onBack={actions.back} {...actions.reference} target={destination.target} />
  ) : null;
}

type StackProps = {
  readonly active: boolean;
  readonly path: readonly Destination[];
  readonly overlay: boolean;
  readonly render: (destination: Destination) => ReactNode;
};

function Stack({ active, overlay, path, render }: StackProps) {
  return path.map((destination, index) =>
    isOverlay(destination) === overlay ? (
      <Activity
        key={pageKeyOf(destination, index)}
        mode={active && index === path.length - 1 ? 'visible' : 'hidden'}
      >
        {render(destination)}
      </Activity>
    ) : null,
  );
}

const shellMainLabel = (reading: ReadingSnapshot, navigation: Navigation): string => {
  const top = destinationOf(navigation);

  if (top === undefined) {
    return reading.wording.views[navigation.area];
  }

  return top.kind === DestinationKind.Prayer
    ? reading.wording.navigation.rosaryPrayer
    : reading.wording.navigation.reading;
};

type ShellContentProps = Omit<StandardViewProps, 'activeView'> & {
  readonly areas: readonly ApplicationView[];
  readonly navigation: Navigation;
};

function ShellContent({ areas, navigation, ...props }: ShellContentProps) {
  const reading = useReading();
  const path = pathOf(navigation);

  return (
    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
      <main
        aria-label={shellMainLabel(reading, navigation)}
        className="flex min-h-0 flex-1 flex-col overflow-hidden"
      >
        {areas.map((area) => {
          const active = area === navigation.area;
          const areaPath = pathIn(navigation, area);

          return (
            <Fragment key={area}>
              <Activity mode={active && areaPath.length === 0 ? 'visible' : 'hidden'}>
                <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <StandardView {...props} activeView={area} />
                </div>
              </Activity>
              <Stack
                active={active}
                overlay={false}
                path={areaPath}
                render={(destination) => (
                  <FramePage actions={props.actions} destination={destination} />
                )}
              />
            </Fragment>
          );
        })}
      </main>
      {path.length > 0 ? null : (
        <BottomBar
          activeView={navigation.area}
          onOpenSettings={props.actions.toggleSettings}
          onSelectView={props.actions.selectView}
        />
      )}
    </div>
  );
}

const knownBookOf = (reading: ReadingSnapshot, lastBookId: string | null): string | null =>
  lastBookId !== null && reading.catalog.bible.books.some((book) => book.id === lastBookId)
    ? lastBookId
    : null;

const depthKeyOf = (navigation: Navigation): string =>
  `${navigation.area}-${String(pathOf(navigation).length)}`;

const useFocusTrail = () => {
  const openers = useRef(new Map<string, HTMLElement>());

  return {
    remember: (navigation: Navigation): void => {
      const active = document.activeElement;

      if (active instanceof HTMLElement) {
        openers.current.set(depthKeyOf(navigation), active);
      }
    },
    restore: (navigation: Navigation): void => {
      const key = depthKeyOf(navigation);
      const opener = openers.current.get(key);

      openers.current.delete(key);
      requestAnimationFrame(() => {
        if (opener?.isConnected === true) {
          opener.focus();
        }
      });
    },
  };
};

function useShellNavigation() {
  const [navigation, setNavigation] = useState(INITIAL_NAVIGATION);
  const [restoreFocusArtworkId, setRestoreFocusArtworkId] = useState<string | null>(null);
  const focusTrail = useFocusTrail();

  const open = (destination: Destination): void => {
    focusTrail.remember(navigation);
    setNavigation((current) => openDestination(current, destination));
  };

  const back = (): void => {
    const top = destinationOf(navigation);

    if (top?.kind === DestinationKind.Artwork) {
      setRestoreFocusArtworkId(top.artworkId);
    }

    const previous = goBack(navigation);

    setNavigation(previous);
    focusTrail.restore(previous);
  };

  return {
    back,
    clearRestoreFocus: () => setRestoreFocusArtworkId(null),
    focusTrail,
    navigation,
    open,
    restoreFocusArtworkId,
    setNavigation,
  };
}

type ShellNavigation = ReturnType<typeof useShellNavigation>;

function useVisitedAreas(area: ApplicationView): readonly ApplicationView[] {
  const [visited, setVisited] = useState<readonly ApplicationView[]>([area]);

  useEffect(() => {
    if (!visited.includes(area)) {
      setVisited([...visited, area]);
    }
  }, [area, visited]);

  return Object.values(ApplicationView).filter((view) => view === area || visited.includes(view));
}

function useOpeners({ focusTrail, navigation, open, setNavigation }: ShellNavigation) {
  const reading = useReading();
  const runRef = useRef(0);

  const beginRosary = (mysterySetId: string, start?: PrayerStart): void => {
    runRef.current += 1;
    open({
      kind: DestinationKind.Prayer,
      mysterySetId,
      run: runRef.current,
      ...(start === undefined ? {} : { start }),
    });
  };

  const openBibleVerse = (bookId: string, verse: BibleVerseLocation): void =>
    open({
      blockIndex: null,
      bookId,
      edition: reading.edition,
      kind: DestinationKind.BibleBook,
      verse,
    });

  const openLastBook = (edition: BibleEditionId): void => {
    focusTrail.remember(navigation);
    void Promise.all([cacheEdition(reading.language, edition), loadLastBibleBook(edition)]).then(
      ([cached, lastBookId]) => {
        if (cached) {
          setNavigation((current) =>
            current === navigation
              ? openBible(current, edition, knownBookOf(reading, lastBookId))
              : current,
          );
        }
      },
    );
  };

  return { beginRosary, openBibleVerse, openLastBook };
}

type Openers = ReturnType<typeof useOpeners>;

const referenceActionsOf = (
  reading: ReadingSnapshot,
  { open, setNavigation }: ShellNavigation,
  { beginRosary, openBibleVerse, openLastBook }: Openers,
  setHomeSetId: (mysterySetId: string) => void,
): ReferenceActions => ({
  onOpenBible: () => openLastBook(reading.edition),
  onOpenBibleVerse: openBibleVerse,
  onOpenReading: ({ blockIndex, workId }) =>
    open({ blockIndex, kind: DestinationKind.Work, workId }),
  onOpenReference: (target: ReferenceTarget) => open({ kind: DestinationKind.Reference, target }),
  onPray: (mysterySetId, start) =>
    beginRosary(
      mysterySetId ?? scheduledMysterySetId(new Date(), reading.catalog.rosary.schedule),
      start,
    ),
  onShowSet: (mysterySetId) => {
    setHomeSetId(mysterySetId);
    setNavigation((current) => showArea(current, ApplicationView.Rosary));
  },
});

const shellActionsOf = (
  { back, clearRestoreFocus, open, setNavigation }: ShellNavigation,
  { beginRosary, openBibleVerse, openLastBook }: Openers,
  reference: ReferenceActions,
  setHomeSetId: (mysterySetId: string) => void,
) => ({
  back,
  beginRosary: (mysterySetId: string) => beginRosary(mysterySetId),
  clearRestoreFocus,
  goToRosary: () => setNavigation((current) => selectArea(current, ApplicationView.Rosary)),
  openArtwork: (artworkId: string) => open({ artworkId, kind: DestinationKind.Artwork }),
  openBible: openLastBook,
  openBibleBook: (edition: BibleEditionId, bookId: string, blockIndex: number | null) =>
    open({ blockIndex, bookId, edition, kind: DestinationKind.BibleBook }),
  openBibleVerse,
  openRecord: (target: ReferenceTarget) => open(destinationOfRecord(target)),
  openReference: reference.onOpenReference,
  openWork: (workId: string) => open({ blockIndex: null, kind: DestinationKind.Work, workId }),
  reference,
  selectHomeSet: setHomeSetId,
  selectView: (view: ApplicationView) => setNavigation((current) => selectArea(current, view)),
  stepArtwork: (artworkId: string) =>
    setNavigation((current) =>
      replaceDestination(current, { artworkId, kind: DestinationKind.Artwork }),
    ),
  turnToBook: (edition: BibleEditionId, bookId: string) =>
    setNavigation((current) => turnToBook(current, edition, bookId)),
});

function useAppShellState() {
  const reading = useReading();
  const shell = useShellNavigation();
  const openers = useOpeners(shell);
  const areas = useVisitedAreas(shell.navigation.area);
  const [homeSetId, setHomeSetId] = useState(() =>
    scheduledMysterySetId(new Date(), reading.catalog.rosary.schedule),
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const reference = referenceActionsOf(reading, shell, openers, setHomeSetId);

  return {
    actions: {
      ...shellActionsOf(shell, openers, reference, setHomeSetId),
      toggleSettings: () => setSettingsOpen((current) => !current),
    },
    areas,
    closeSettings: () => setSettingsOpen(false),
    homeSetId,
    navigation: shell.navigation,
    restoreFocusArtworkId: shell.restoreFocusArtworkId,
    settingsOpen,
  };
}

type ShellState = ReturnType<typeof useAppShellState>;

type ShellFrameProps = {
  readonly hidden: boolean;
  readonly onOpenInstallGuide: () => void;
  readonly onOpenPrivacy: () => void;
  readonly shell: ShellState;
};

const settingsScopeOf = ({ navigation }: ShellState): SettingsScope => {
  const top = destinationOf(navigation);
  const reading = top !== undefined && READING_KINDS.has(top.kind);

  return reading || navigation.area === ApplicationView.Library
    ? SettingsScope.Reader
    : SettingsScope.Application;
};

function ShellFrame({ hidden, onOpenInstallGuide, onOpenPrivacy, shell }: ShellFrameProps) {
  const { actions, navigation } = shell;
  const chromeVisible = pathOf(navigation).length === 0;
  const heroArtwork = useDailyHeroArtwork(shell.homeSetId);
  const homeAmbient = chromeVisible && navigation.area === ApplicationView.Rosary;

  return (
    <div
      className={`relative flex h-dvh flex-col overflow-hidden bg-background text-foreground ${chromeVisible ? 'gap-2 p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.5rem,env(safe-area-inset-bottom))] rail:flex-row' : ''}`}
      hidden={hidden}
    >
      {homeAmbient ? <AmbientGround source={resolveArtAsset(heroArtwork.file)} /> : null}
      <ShellRail
        activeView={navigation.area}
        hidden={!chromeVisible}
        onGoHome={actions.goToRosary}
        onOpenSettings={actions.toggleSettings}
        onSelectView={actions.selectView}
      />
      <ShellContent
        actions={actions}
        areas={shell.areas}
        homeSetId={shell.homeSetId}
        navigation={navigation}
        restoreFocusArtworkId={shell.restoreFocusArtworkId}
      />

      <SettingsDialog
        open={shell.settingsOpen}
        scope={settingsScopeOf(shell)}
        onClose={shell.closeSettings}
        onOpenInstallGuide={() => {
          shell.closeSettings();
          onOpenInstallGuide();
        }}
        onOpenPrivacy={() => {
          shell.closeSettings();
          onOpenPrivacy();
        }}
        onOpenReferences={() => {
          actions.selectView(ApplicationView.References);
          shell.closeSettings();
        }}
      />
    </div>
  );
}

export function AppShell({
  onOpenInstallGuide,
  onOpenPrivacy,
}: {
  readonly onOpenInstallGuide: () => void;
  readonly onOpenPrivacy: () => void;
}) {
  const shell = useAppShellState();
  const path = pathOf(shell.navigation);

  return (
    <>
      <ShellFrame
        hidden={isOverlay(path.at(-1))}
        onOpenInstallGuide={onOpenInstallGuide}
        onOpenPrivacy={onOpenPrivacy}
        shell={shell}
      />
      {shell.areas.map((area) => (
        <Stack
          active={area === shell.navigation.area}
          key={area}
          overlay
          path={pathIn(shell.navigation, area)}
          render={(destination) => (
            <OverlayPage actions={shell.actions} destination={destination} />
          )}
        />
      ))}
    </>
  );
}
