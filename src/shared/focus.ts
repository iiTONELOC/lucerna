import { useEffect, useMemo, useRef, type RefObject } from 'react';
import { useHeadingFocus } from '../features/library/useHeadingFocus.ts';
import { useEscape } from './useEscape.ts';

export const useDialogOpen = (
  dialogRef: RefObject<HTMLDialogElement | null>,
  open: boolean,
  modal: boolean,
  onOpen?: () => void,
): void => {
  useEffect(() => {
    const dialog = dialogRef.current;

    if (dialog === null) {
      return;
    }

    if (open && !dialog.open) {
      if (modal) {
        dialog.showModal();
      } else {
        dialog.show();
      }

      onOpen?.();
      return;
    }

    if (!open && dialog.open) {
      dialog.close();
    }
  }, [dialogRef, modal, onOpen, open]);
};

export const useFocusPage = (
  onBack: () => void,
  focusKey: string,
): RefObject<HTMLHeadingElement | null> => {
  useEscape(onBack);

  return useHeadingFocus(focusKey);
};

export type ReturnFocus = {
  readonly remember: () => void;
  readonly restore: () => void;
};

export const useReturnFocus = (): ReturnFocus => {
  const targetRef = useRef<HTMLElement | null>(null);

  return useMemo(
    () => ({
      remember: (): void => {
        const active = document.activeElement;

        targetRef.current = active instanceof HTMLElement ? active : null;
      },
      restore: (): void => {
        const target = targetRef.current;

        targetRef.current = null;

        if (target !== null) {
          requestAnimationFrame(() => {
            if (target.isConnected) {
              target.focus();
            }
          });
        }
      },
    }),
    [],
  );
};
