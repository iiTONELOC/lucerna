import type { ReactNode } from 'react';
import lucernaMark from '../../assets/brand/lucerna-mark.svg';
import { SettingsGlyph } from '../../components/icons/SettingsGlyph.tsx';
import { classNames } from '../../shared/classNames.ts';
import { capitalize } from '../../shared/text.ts';
import { Theme } from '../../state/preferences/model.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  CITATION_CLASS_NAME,
  GLASS_PANEL_CLASS_NAME,
  SURFACE_PANEL_CLASS_NAME,
} from '../../styles.ts';
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
  ApplicationView.Library,
  ApplicationView.Gallery,
];

const SELECTED_ITEM_CLASS_NAME = 'bg-accent/10 text-foreground';
const RESTING_ITEM_CLASS_NAME = 'text-muted hover:bg-foreground/5 hover:text-foreground';

const RAIL_ITEM_CLASS_NAME =
  'focus-ring flex min-h-9 items-center justify-center rounded-md px-3 py-2 transition-colors pointer-coarse:min-h-11';

const BAR_ITEM_CLASS_NAME = `focus-ring flex min-h-11 min-w-11 flex-1 flex-col items-center justify-center gap-1 rounded-md px-2 py-2 transition-colors ${CITATION_CLASS_NAME}`;

type NavItemProps = {
  readonly className: string;
  readonly icon: ReactNode;
  readonly label: string;
  readonly onSelect: () => void;
  readonly selected?: boolean;
  readonly showLabel: boolean;
};

function NavItem({ className, icon, label, onSelect, selected = false, showLabel }: NavItemProps) {
  return (
    <button
      aria-current={selected ? 'page' : undefined}
      aria-label={label}
      className={classNames(
        className,
        selected ? SELECTED_ITEM_CLASS_NAME : RESTING_ITEM_CLASS_NAME,
      )}
      onClick={onSelect}
      title={showLabel ? undefined : label}
      type="button"
    >
      {icon}
      {showLabel ? <span className="hidden @xs:block">{label}</span> : null}
    </button>
  );
}

function LanternButton({ onGoHome }: { readonly onGoHome: () => void }) {
  const { resolvedTheme } = usePreferences();
  const isParchment = resolvedTheme === Theme.Parchment;

  return (
    <button
      aria-label="Go to the Rosary"
      className={`focus-ring flex size-12 shrink-0 items-center justify-center text-accent transition-colors ${MARK_BACKDROP_CLASS_NAME} ${isParchment ? 'bg-accent-strong hover:bg-accent-current' : 'hover:bg-foreground/5'}`}
      onClick={onGoHome}
      title="Go to the Rosary"
      type="button"
    >
      <img alt="" aria-hidden="true" className="size-10 max-w-none" src={lucernaMark} />
    </button>
  );
}

type NavigationProps = {
  readonly activeView: ApplicationView;
  readonly onOpenSettings: () => void;
  readonly onSelectView: (view: ApplicationView) => void;
};

type ViewItemsProps = Omit<NavigationProps, 'onOpenSettings'> & {
  readonly itemClassName: string;
  readonly showLabels: boolean;
  readonly views: readonly ApplicationView[];
};

function ViewItems({ activeView, itemClassName, onSelectView, showLabels, views }: ViewItemsProps) {
  return views.map((view) => (
    <NavItem
      className={itemClassName}
      icon={VIEW_ICONS[view]}
      key={view}
      label={capitalize(view)}
      onSelect={() => onSelectView(view)}
      selected={activeView === view}
      showLabel={showLabels}
    />
  ));
}

export function BottomBar({ activeView, onOpenSettings, onSelectView }: NavigationProps) {
  return (
    <nav
      aria-label="Primary"
      className={classNames(
        '@container flex shrink-0 items-center p-1 rail:hidden',
        SURFACE_PANEL_CLASS_NAME,
      )}
    >
      <ViewItems
        activeView={activeView}
        itemClassName={BAR_ITEM_CLASS_NAME}
        onSelectView={onSelectView}
        showLabels
        views={PRIMARY_NAVIGATION_VIEWS}
      />
      <span aria-hidden="true" className="mx-1 h-4 w-px shrink-0 bg-hairline" />
      <NavItem
        className={BAR_ITEM_CLASS_NAME}
        icon={<SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />}
        label="Settings"
        onSelect={onOpenSettings}
        showLabel
      />
    </nav>
  );
}

export function DesktopRail({
  activeView,
  onGoHome,
  onOpenSettings,
  onSelectView,
}: NavigationProps & { readonly onGoHome: () => void }) {
  return (
    <aside
      className={classNames(
        'relative hidden w-16 shrink-0 flex-col p-2 rail:flex',
        GLASS_PANEL_CLASS_NAME,
      )}
    >
      <LanternButton onGoHome={onGoHome} />

      <nav aria-label="Primary" className="mt-4 flex flex-col gap-1">
        <ViewItems
          activeView={activeView}
          itemClassName={RAIL_ITEM_CLASS_NAME}
          onSelectView={onSelectView}
          showLabels={false}
          views={PRIMARY_NAVIGATION_VIEWS}
        />
      </nav>
      <div className="mt-auto flex flex-col gap-1">
        <ViewItems
          activeView={activeView}
          itemClassName={RAIL_ITEM_CLASS_NAME}
          onSelectView={onSelectView}
          showLabels={false}
          views={[ApplicationView.References]}
        />
        <NavItem
          className={RAIL_ITEM_CLASS_NAME}
          icon={<SettingsGlyph className={RAIL_ICON_SIZE_CLASS_NAME} />}
          label="Settings"
          onSelect={onOpenSettings}
          showLabel={false}
        />
      </div>
    </aside>
  );
}
