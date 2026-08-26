import { useEffect, useId, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { usePreferences } from '../../state/preferences/usePreferences.ts';

const ACTION_CLASS_NAME =
  'flex min-h-11 items-center justify-center rounded-md border border-hairline px-4 font-display text-body leading-body transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent';

type ExternalLinkDialogProps = {
  readonly descriptionId: string;
  readonly href: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly triggerRef: React.RefObject<HTMLAnchorElement | null>;
};

const useDialogVisibility = (
  dialogRef: React.RefObject<HTMLDialogElement | null>,
  open: boolean,
): void => {
  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [dialogRef, open]);
};

function ExternalLinkDialogActions({
  href,
  onClose,
}: Pick<ExternalLinkDialogProps, 'href' | 'onClose'>) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        className={ACTION_CLASS_NAME + ' text-secondary hover:text-foreground'}
        onClick={onClose}
        type="button"
      >
        Stay here
      </button>
      <a
        className={ACTION_CLASS_NAME + ' border-accent text-accent-current'}
        href={href}
        onClick={onClose}
        rel="noreferrer"
        target="_blank"
      >
        Continue
      </a>
    </div>
  );
}

function ExternalLinkDialog({
  descriptionId,
  href,
  onClose,
  open,
  triggerRef,
}: ExternalLinkDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  useDialogVisibility(dialogRef, open);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={descriptionId + '-title'}
      className="surface-chrome m-auto max-w-md rounded-xl border border-hairline p-0 text-foreground backdrop:bg-background/80"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClose={() => {
        onClose();
        triggerRef.current?.focus();
      }}
      ref={dialogRef}
    >
      <div className="p-5 sm:p-6">
        <h2
          className="font-display text-title leading-title font-medium"
          id={descriptionId + '-title'}
        >
          Open an external website?
        </h2>
        <p className="pt-3 font-display text-body leading-body text-secondary" id={descriptionId}>
          This page is not part of Lucerna and may require an internet connection.
        </p>
        <ExternalLinkDialogActions href={href} onClose={onClose} />
      </div>
    </dialog>
  );
}

type ExternalLinkProps = Omit<ComponentProps<'a'>, 'children' | 'href' | 'rel' | 'target'> & {
  readonly children: ReactNode;
  readonly href: string;
};

export function ExternalLink({ children, href, ...anchorProps }: ExternalLinkProps) {
  const { preferences } = usePreferences();
  const [confirming, setConfirming] = useState(false);
  const triggerRef = useRef<HTMLAnchorElement>(null);
  const descriptionId = useId();

  return (
    <>
      <a
        {...anchorProps}
        href={href}
        onClick={(event) => {
          if (preferences.confirmExternalLinks) {
            event.preventDefault();
            setConfirming(true);
          }
        }}
        ref={triggerRef}
        rel="noreferrer"
        target="_blank"
      >
        {children}
      </a>
      <ExternalLinkDialog
        descriptionId={descriptionId}
        href={href}
        onClose={() => setConfirming(false)}
        open={confirming}
        triggerRef={triggerRef}
      />
    </>
  );
}
