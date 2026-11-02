import { useEffect } from 'react';
import { KeyName } from './keyboard.ts';

export const useEscape = (onEscape: (event: KeyboardEvent) => void, capture = false): void => {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === KeyName.Escape) {
        onEscape(event);
      }
    };

    globalThis.addEventListener('keydown', onKeyDown, capture);
    return () => globalThis.removeEventListener('keydown', onKeyDown, capture);
  }, [capture, onEscape]);
};
