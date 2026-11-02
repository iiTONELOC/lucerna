import { useReading } from '../../content/reading.ts';
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
  const { wording } = useReading();
  return (
    <button
      aria-label={wording.navigation.settings}
      className={classNames(SETTINGS_BUTTON_CLASS_NAME, className)}
      onClick={onOpen}
      title={wording.navigation.settings}
      type="button"
    >
      <SettingsGlyph className="size-5" />
    </button>
  );
}
