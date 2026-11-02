import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
  type RefObject,
  type MouseEvent,
} from 'react';
import { useReading } from '../../content/reading.ts';
import { useDialogOpen } from '../../shared/focus.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { BODY_CLASS_NAME, TITLE_CLASS_NAME } from '../../styles.ts';

const DIALOG_ACTION_CLASS_NAME = `flex min-h-11 items-center justify-center rounded-md border border-outline px-4 ${BODY_CLASS_NAME} transition-colors focus-ring`;

type ExternalLinkDialogProps = {
  readonly onBeforeOpen?: () => Promise<boolean>;
  readonly descriptionId: string;
  readonly href: string;
  readonly onClose: () => void;
  readonly open: boolean;
  readonly triggerRef: RefObject<HTMLAnchorElement | null>;
};

function ExternalLinkDialogActions({
  href,
  onClose,
  onBeforeOpen,
}: Pick<ExternalLinkDialogProps, 'href' | 'onClose' | 'onBeforeOpen'>) {
  const { wording } = useReading();
  return (
    <div className="mt-5 flex justify-end gap-3">
      <button
        className={`${DIALOG_ACTION_CLASS_NAME} text-secondary hover:text-foreground`}
        onClick={onClose}
        type="button"
      >
        {wording.external.stay}
      </button>
      <a
        className={`${DIALOG_ACTION_CLASS_NAME} border-accent text-accent-current`}
        href={href}
        onClick={(event) => {
          followAfterSaving(event, href, onBeforeOpen);
          onClose();
        }}
        rel="noreferrer"
        target="_blank"
      >
        {wording.external.continue}
      </a>
    </div>
  );
}

function ExternalLinkDialog({
  descriptionId,
  href,
  onClose,
  onBeforeOpen,
  open,
  triggerRef,
}: ExternalLinkDialogProps) {
  const { wording } = useReading();
  const dialogRef = useRef<HTMLDialogElement>(null);
  useDialogOpen(dialogRef, open, true);

  return (
    <dialog
      aria-describedby={descriptionId}
      aria-labelledby={`${descriptionId}-title`}
      className="surface-chrome m-auto max-w-md rounded-xl border border-outline p-0 text-foreground backdrop:bg-background/80"
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
          {wording.external.title}
        </h2>
        <p className={`pt-3 ${BODY_CLASS_NAME} text-secondary`} id={descriptionId}>
          {wording.external.body}
        </p>
        <ExternalLinkDialogActions
          href={href}
          onClose={onClose}
          {...(onBeforeOpen === undefined ? {} : { onBeforeOpen })}
        />
      </div>
    </dialog>
  );
}

type ExternalLinkProps = Omit<ComponentProps<'a'>, 'children' | 'href' | 'rel' | 'target'> & {
  readonly children: ReactNode;
  readonly href: string;
  readonly onBeforeOpen?: () => Promise<boolean>;
};

export function ExternalLink({ children, href, onBeforeOpen, ...anchorProps }: ExternalLinkProps) {
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
          } else {
            followAfterSaving(event, href, onBeforeOpen);
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
        {...(onBeforeOpen === undefined ? {} : { onBeforeOpen })}
      />
    </>
  );
}

const followAfterSaving = (
  event: MouseEvent<HTMLAnchorElement>,
  href: string,
  prepare: (() => Promise<boolean>) | undefined,
): void => {
  if (prepare === undefined) return;
  event.preventDefault();
  const { rel, target } = event.currentTarget;
  const destination = window.open('', target);
  if (destination !== null) destination.opener = null;
  void prepare().then((allowed) => {
    if (!allowed) {
      destination?.close();
      return;
    }
    const link = (destination?.document ?? document).createElement('a');
    link.href = href;
    link.rel = rel;
    link.click();
  });
};
