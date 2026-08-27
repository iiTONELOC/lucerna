import { SUBTITLE_CLASS_NAME } from '../../styles.ts';

const BACK_BUTTON_CLASS_NAME = `focus-ring min-h-11 w-fit text-muted transition-colors hover:text-foreground ${SUBTITLE_CLASS_NAME}`;

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
      className={
        className === undefined ? BACK_BUTTON_CLASS_NAME : `${BACK_BUTTON_CLASS_NAME} ${className}`
      }
      onClick={onBack}
      type="button"
    >
      Back
    </button>
  );
}
