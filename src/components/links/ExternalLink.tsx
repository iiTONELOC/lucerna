import { BODY_CLASS_NAME, TITLE_CLASS_NAME } from '../../styles.ts';
import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
} from 'react';
import { useDialogOpen } from '../../shared/focus.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';

const DIALOG_ACTION_CLASS_NAME = `flex min-h-11 items-center justify-center rounded-md border border-hairline px-4 ${BODY_CLASS_NAME} transition-colors focus-ring`;

type ExternalLinkDialogProps = {
  readonly descriptionId: string;
  readonly href: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly triggerRef: RefObject<HTMLAnchorElement | null>;
};

function ExternalLinkDialogActions({
  href,
  onClose,
}: Pick<ExternalLinkDialogProps, 'href' | 'onClose'>) {
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        className={`${DIALOG_ACTION_CLASS_NAME} text-secondary hover:text-foreground`}
        onClick={onClose}
        type="button"
      >
        Stay here
      </button>
      <a
        className={`${DIALOG_ACTION_CLASS_NAME} border-accent text-accent-current`}
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
  useDialogOpen(dialogRef, open, true);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={`${descriptionId}-title`}
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
        <h2 className={TITLE_CLASS_NAME} id={`${descriptionId}-title`}>
          Open an external website?
        </h2>
        <p className={`pt-3 ${BODY_CLASS_NAME} text-secondary`} id={descriptionId}>
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
