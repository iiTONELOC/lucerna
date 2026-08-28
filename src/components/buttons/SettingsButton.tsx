import { classNames } from '../../shared/classNames.ts';
import { SettingsGlyph } from '../icons/SettingsGlyph.tsx';

const SETTINGS_BUTTON_CLASS_NAME =
  'focus-ring flex size-11 shrink-0 items-center justify-center text-muted transition-colors hover:text-foreground';

export function SettingsButton({
  className,
  onOpen,
}: {
  readonly className?: string;
  readonly onOpen: () => void;
}) {
  return (
    <button
      aria-label="Settings"
      className={classNames(SETTINGS_BUTTON_CLASS_NAME, className)}
      onClick={onOpen}
      title="Settings"
      type="button"
    >
      <SettingsGlyph className="size-5" />
    </button>
  );
}
