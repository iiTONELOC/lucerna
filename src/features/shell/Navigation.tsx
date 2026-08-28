import type { ReactNode } from 'react';
import lucernaMark from '../../assets/brand/lucerna-mark.svg';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { SettingsGlyph } from '../../components/icons/SettingsGlyph.tsx';
import { classNames } from '../../shared/classNames.ts';
import { capitalize } from '../../shared/text.ts';
import { Theme } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { BODY_CLASS_NAME } from '../../styles.ts';
import { ApplicationView } from './model.ts';

const MARK_BACKDROP_CLASS_NAME = 'rounded-xl';

const RAIL_ICON_SIZE_CLASS_NAME = 'size-5';

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
  [ApplicationView.Library]: (
    <svg aria-hidden="true" className={RAIL_ICON_SIZE_CLASS_NAME} fill="none" viewBox="0 0 24 24">
      <path
        d="M4.5 4.5h4v15h-4zM9.5 4.5h4v15h-4zM15.2 5.6l3.9-1 3.6 14.5-3.9 1z"
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
  ApplicationView.Library,
];

const SELECTED_ITEM_CLASS_NAME = 'bg-accent/10 text-foreground';
const RESTING_ITEM_CLASS_NAME = 'text-muted hover:bg-foreground/5 hover:text-foreground';

const QUICK_NAV_ITEM_CLASS_NAME =
  'focus-ring flex size-11 items-center justify-center rounded-md transition-colors';

const RAIL_ITEM_CLASS_NAME =
  'focus-ring flex min-h-9 items-center gap-3 rounded-md px-3 py-2 transition-colors pointer-coarse:min-h-11';

const railItemClassName = (expanded: boolean): string =>
  classNames(RAIL_ITEM_CLASS_NAME, !expanded && 'justify-center');

type NavItemProps = {
  readonly ariaExpanded?: boolean;
  readonly className: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly onSelect: () => void;
  readonly selected?: boolean;
  readonly text?: string;
};

function NavItem({
  ariaExpanded,
  className,
  icon,
  label,
  onSelect,
  selected = false,
  text,
}: NavItemProps) {
  const named = text === label ? undefined : label;

  return (
    <button
      aria-current={selected ? 'page' : undefined}
      aria-expanded={ariaExpanded}
      aria-label={named}
      className={classNames(
        className,
        selected ? SELECTED_ITEM_CLASS_NAME : RESTING_ITEM_CLASS_NAME,
      )}
      onClick={onSelect}
      title={named}
      type="button"
    >
      {icon}
      {text === undefined ? null : <span className={BODY_CLASS_NAME}>{text}</span>}
    </button>
  );
}

function LanternButton({
  className,
  onGoHome,
}: {
  readonly className: string;
  readonly onGoHome: () => void;
}) {
  const { preferences } = usePreferences();
  const isParchment = preferences.theme === Theme.Parchment;

  return (
    <button
      aria-label="Go to the Rosary"
      className={`focus-ring flex shrink-0 items-center justify-center text-accent transition-colors ${MARK_BACKDROP_CLASS_NAME} ${isParchment ? 'bg-accent-strong hover:bg-accent-current' : 'hover:bg-foreground/5'} ${className}`}
      onClick={onGoHome}
      title="Go to the Rosary"
      type="button"
    >
      <img alt="" aria-hidden="true" className="size-10 max-w-none" src={lucernaMark} />
    </button>
  );
}

type LanternTriggerProps = {
  readonly onGoHome: () => void;
};

export function LanternTrigger({ onGoHome }: LanternTriggerProps) {
  return <LanternButton className="size-10" onGoHome={onGoHome} />;
}

type ViewNavigationProps = {
  readonly activeView: ApplicationView;
  readonly itemClassName: string;
  readonly onSelectView: (view: ApplicationView) => void;
  readonly showLabels: boolean;
  readonly views: readonly ApplicationView[];
};

function ViewItems({
  activeView,
  itemClassName,
  onSelectView,
  showLabels,
  views,
}: ViewNavigationProps) {
  return views.map((view) => {
    const label = capitalize(view);

    return (
      <NavItem
        className={itemClassName}
        icon={VIEW_ICONS[view]}
        key={view}
        label={label}
        onSelect={() => onSelectView(view)}
        selected={activeView === view}
        {...(showLabels ? { text: label } : {})}
      />
    );
  });
}

type MobileQuickNavProps = {
  readonly activeView: ApplicationView;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
};

export function MobileQuickNav({ activeView, onOpenSettings, onSelectView }: MobileQuickNavProps) {
  return (
    <nav aria-label="Primary" className="flex items-center gap-1">
      <ViewItems
        activeView={activeView}
        itemClassName={QUICK_NAV_ITEM_CLASS_NAME}
        onSelectView={onSelectView}
        showLabels={false}
        views={PRIMARY_NAVIGATION_VIEWS}
      />

      <span aria-hidden="true" className="mx-1 h-5 w-px shrink-0 bg-hairline" />

      <NavItem
        className={QUICK_NAV_ITEM_CLASS_NAME}
        icon={<SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />}
        label="Settings"
        onSelect={onOpenSettings}
      />
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

export function DesktopRail({
  activeView,
  expanded,
  onGoHome,
  onOpenSettings,
  onSelectView,
  onToggleExpanded,
}: DesktopRailProps) {
  return (
    <aside
      className={`hidden shrink-0 flex-col rounded-xl border border-hairline bg-surface p-2 spread:flex lg:flex ${expanded ? 'spread:w-56 lg:w-56' : 'spread:w-16 lg:w-16'}`}
    >
      <LanternButton className="size-12" onGoHome={onGoHome} />

      <nav aria-label="Primary" className="mt-4 flex flex-col gap-1">
        <ViewItems
          activeView={activeView}
          itemClassName={railItemClassName(expanded)}
          onSelectView={onSelectView}
          showLabels={expanded}
          views={PRIMARY_NAVIGATION_VIEWS}
        />
      </nav>
      <RailActions
        activeView={activeView}
        expanded={expanded}
        onOpenSettings={onOpenSettings}
        onSelectView={onSelectView}
        onToggleExpanded={onToggleExpanded}
      />
    </aside>
  );
}

function RailActions({
  activeView,
  expanded,
  onOpenSettings,
  onSelectView,
  onToggleExpanded,
}: Omit<DesktopRailProps, 'onGoHome'>) {
  const itemClassName = railItemClassName(expanded);

  return (
    <div className="mt-auto flex flex-col gap-1">
      <NavItem
        ariaExpanded={expanded}
        className={itemClassName}
        icon={
          <Chevron
            className={RAIL_ICON_SIZE_CLASS_NAME}
            direction={expanded ? ChevronDirection.Left : ChevronDirection.Right}
          />
        }
        label={expanded ? 'Collapse navigation' : 'Expand navigation'}
        onSelect={onToggleExpanded}
        {...(expanded ? { text: 'Collapse' } : {})}
      />
      <ViewItems
        activeView={activeView}
        itemClassName={itemClassName}
        onSelectView={onSelectView}
        showLabels={expanded}
        views={[ApplicationView.References]}
      />
      <NavItem
        className={itemClassName}
        icon={<SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />}
        label="Settings"
        onSelect={onOpenSettings}
        {...(expanded ? { text: 'Settings' } : {})}
      />
    </div>
  );
}
