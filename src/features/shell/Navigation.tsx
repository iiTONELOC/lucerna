import type { ReactNode } from 'react';
import lucernaMark from '../../assets/brand/lucerna-mark.svg';
import { Theme } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { ApplicationView, applicationViewLabel } from './model.ts';

const MARK_BACKDROP_CLASS_NAME = 'rounded-xl';

const RAIL_ICON_SIZE_CLASS_NAME = 'size-5';

export function SettingsGlyph({ className }: { readonly className: string }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" viewBox="0 0 24 24">
      <path
        d="M2 7h11m5 0h4M2 17h4m5 0h11M13 3v8M6 13v8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ExpandGlyph({ expanded }: { readonly expanded: boolean }) {
  const points = expanded ? '14 6 8 12 14 18' : '10 6 16 12 10 18';

  return (
    <svg aria-hidden="true" className={RAIL_ICON_SIZE_CLASS_NAME} fill="none" viewBox="0 0 24 24">
      <polyline
        points={points}
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

const VIEW_ICONS: Readonly<Record<ApplicationView, ReactNode>> = {
  [ApplicationView.Rosary]: (
    <svg
      aria-hidden="true"
      className={RAIL_ICON_SIZE_CLASS_NAME}
      fill="currentColor"
      viewBox="0 0 24 24"
    >
      <path d="M10 2H14V7H19V11H14V22H10V11H5V7H10Z" />
    </svg>
  ),
  [ApplicationView.Gallery]: (
    <svg aria-hidden="true" className={RAIL_ICON_SIZE_CLASS_NAME} fill="none" viewBox="0 0 24 24">
      <path
        d="M4 5h16v14H4zM7 15l3-3 2 2 2-2 3 3M16.5 9h.01"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  ),
  [ApplicationView.References]: (
    <svg aria-hidden="true" className={RAIL_ICON_SIZE_CLASS_NAME} fill="none" viewBox="0 0 24 24">
      <path
        d="M5 4.5h9a3 3 0 0 1 3 3v12H8a3 3 0 0 0-3 1.5V4.5Zm12 3h2v12h-2M8 9h6M8 13h6"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
    </svg>
  ),
};

const PRIMARY_NAVIGATION_VIEWS: readonly ApplicationView[] = [
  ApplicationView.Rosary,
  ApplicationView.Gallery,
];

type LanternTriggerProps = {
  readonly onGoHome: () => void;
};

export function LanternTrigger({ onGoHome }: LanternTriggerProps) {
  const { preferences } = usePreferences();
  const isParchment = preferences.theme === Theme.Parchment;

  return (
    <button
      aria-label="Go to the Rosary"
      className={`flex size-10 shrink-0 items-center justify-center text-accent transition-colors ${MARK_BACKDROP_CLASS_NAME} ${isParchment ? 'bg-accent-strong hover:bg-accent-current' : 'hover:bg-foreground/5'}`}
      onClick={onGoHome}
      title="Go to the Rosary"
      type="button"
    >
      <img alt="" aria-hidden="true" className="size-10 max-w-none" src={lucernaMark} />
    </button>
  );
}

type MobileQuickNavProps = {
  readonly activeView: ApplicationView;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
};

const QUICK_NAV_ITEM_CLASS_NAME =
  'flex size-11 items-center justify-center rounded-md transition-colors';

export function MobileQuickNav({ activeView, onOpenSettings, onSelectView }: MobileQuickNavProps) {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      {PRIMARY_NAVIGATION_VIEWS.map((view) => {
        const selected = activeView === view;
        const label = applicationViewLabel(view);

        return (
          <button
            aria-current={selected ? 'page' : undefined}
            aria-label={label}
            className={`${QUICK_NAV_ITEM_CLASS_NAME} ${selected ? 'bg-accent/10 text-foreground' : 'text-muted hover:bg-foreground/5 hover:text-foreground'}`}
            key={view}
            onClick={() => onSelectView(view)}
            title={label}
            type="button"
          >
            {VIEW_ICONS[view]}
          </button>
        );
      })}

      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-hairline" />

      <button
        aria-label="Settings"
        className={`${QUICK_NAV_ITEM_CLASS_NAME} text-muted hover:bg-foreground/5 hover:text-foreground`}
        onClick={onOpenSettings}
        title="Settings"
        type="button"
      >
        <SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />
      </button>
    </nav>
  );
}

type DesktopRailProps = {
  readonly activeView: ApplicationView;
  readonly expanded: boolean;
  readonly onGoHome: () => void;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
  readonly onToggleExpanded: () => void;
};

const RAIL_ITEM_CLASS_NAME =
  'flex min-h-9 items-center gap-3 rounded-md px-3 py-2 transition-colors pointer-coarse:min-h-11';

type DesktopViewNavigationProps = Pick<
  DesktopRailProps,
  'activeView' | 'expanded' | 'onSelectView'
>;

function DesktopViewNavigation({ activeView, expanded, onSelectView }: DesktopViewNavigationProps) {
  return (
    <nav aria-label="Primary" className="mt-4 flex flex-col gap-1">
      {PRIMARY_NAVIGATION_VIEWS.map((view) => {
        const selected = activeView === view;
        const label = applicationViewLabel(view);

        return (
          <button
            aria-current={selected ? 'page' : undefined}
            aria-label={expanded ? undefined : label}
            className={`${RAIL_ITEM_CLASS_NAME} ${expanded ? '' : 'justify-center'} ${selected ? 'bg-accent/10 text-foreground' : 'text-muted hover:bg-foreground/5 hover:text-foreground'}`}
            key={view}
            onClick={() => onSelectView(view)}
            title={expanded ? undefined : label}
            type="button"
          >
            {VIEW_ICONS[view]}
            {expanded ? <span className="font-display text-body leading-body">{label}</span> : null}
          </button>
        );
      })}
    </nav>
  );
}

type DesktopRailActionsProps = Pick<
  DesktopRailProps,
  'activeView' | 'expanded' | 'onOpenSettings' | 'onSelectView' | 'onToggleExpanded'
>;

const railActionPositionClassName = (expanded: boolean): string =>
  expanded ? '' : 'justify-center';

function DesktopExpandAction({
  expanded,
  onToggleExpanded,
}: Pick<DesktopRailProps, 'expanded' | 'onToggleExpanded'>) {
  return (
    <button
      aria-expanded={expanded}
      aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
      className={`${RAIL_ITEM_CLASS_NAME} ${railActionPositionClassName(expanded)} text-muted hover:bg-foreground/5 hover:text-foreground`}
      onClick={onToggleExpanded}
      title={expanded ? 'Collapse navigation' : 'Expand navigation'}
      type="button"
    >
      <ExpandGlyph expanded={expanded} />
      {expanded ? <span className="font-display text-body leading-body">Collapse</span> : null}
    </button>
  );
}

function DesktopReferencesAction({
  activeView,
  expanded,
  onSelectView,
}: Pick<DesktopRailProps, 'activeView' | 'expanded' | 'onSelectView'>) {
  const selected = activeView === ApplicationView.References;

  return (
    <button
      aria-current={selected ? 'page' : undefined}
      aria-label={expanded ? undefined : 'References'}
      className={`${RAIL_ITEM_CLASS_NAME} ${railActionPositionClassName(expanded)} ${selected ? 'bg-accent/10 text-foreground' : 'text-muted hover:bg-foreground/5 hover:text-foreground'}`}
      onClick={() => onSelectView(ApplicationView.References)}
      title={expanded ? undefined : 'References'}
      type="button"
    >
      {VIEW_ICONS[ApplicationView.References]}
      {expanded ? <span className="font-display text-body leading-body">References</span> : null}
    </button>
  );
}

function DesktopSettingsAction({
  expanded,
  onOpenSettings,
}: Pick<DesktopRailProps, 'expanded' | 'onOpenSettings'>) {
  return (
    <button
      aria-label={expanded ? undefined : 'Settings'}
      className={`${RAIL_ITEM_CLASS_NAME} ${railActionPositionClassName(expanded)} text-muted hover:bg-foreground/5 hover:text-foreground`}
      onClick={onOpenSettings}
      title={expanded ? undefined : 'Settings'}
      type="button"
    >
      <SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />
      {expanded ? <span className="font-display text-body leading-body">Settings</span> : null}
    </button>
  );
}

function DesktopRailActions(props: DesktopRailActionsProps) {
  return (
    <div className="mt-auto flex flex-col gap-1">
      <DesktopExpandAction expanded={props.expanded} onToggleExpanded={props.onToggleExpanded} />
      <DesktopReferencesAction
        activeView={props.activeView}
        expanded={props.expanded}
        onSelectView={props.onSelectView}
      />
      <DesktopSettingsAction expanded={props.expanded} onOpenSettings={props.onOpenSettings} />
    </div>
  );
}

export function DesktopRail({
  activeView,
  expanded,
  onGoHome,
  onOpenSettings,
  onSelectView,
  onToggleExpanded,
}: DesktopRailProps) {
  const { preferences } = usePreferences();
  const isParchment = preferences.theme === Theme.Parchment;

  return (
    <aside
      className={`hidden shrink-0 flex-col rounded-xl border border-hairline bg-surface p-2 spread:flex lg:flex ${expanded ? 'spread:w-56 lg:w-56' : 'spread:w-16 lg:w-16'}`}
    >
      <button
        aria-label="Go to the Rosary"
        className={`flex size-12 shrink-0 items-center justify-center text-accent transition-colors ${MARK_BACKDROP_CLASS_NAME} ${isParchment ? 'bg-accent-strong hover:bg-accent-current' : 'hover:bg-foreground/5'}`}
        onClick={onGoHome}
        title="Go to the Rosary"
        type="button"
      >
        <img alt="" aria-hidden="true" className="size-10 max-w-none" src={lucernaMark} />
      </button>

      <DesktopViewNavigation
        activeView={activeView}
        expanded={expanded}
        onSelectView={onSelectView}
      />
      <DesktopRailActions
        activeView={activeView}
        expanded={expanded}
        onOpenSettings={onOpenSettings}
        onSelectView={onSelectView}
        onToggleExpanded={onToggleExpanded}
      />
    </aside>
  );
}
