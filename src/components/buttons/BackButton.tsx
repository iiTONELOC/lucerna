import { classNames } from '../../shared/classNames.ts';
import { QUIET_BUTTON_CLASS_NAME } from '../../styles.ts';

export function BackButton({
  className,
  label,
  onBack,
}: {
  readonly className?: string;
  readonly label?: string;
  readonly onBack: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={classNames(QUIET_BUTTON_CLASS_NAME, 'w-fit', className)}
      onClick={onBack}
      type="button"
    >
      Back
    </button>
  );
}
