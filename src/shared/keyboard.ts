export enum KeyName {
  Space = ' ',
  Enter = 'Enter',
  Escape = 'Escape',
  ArrowLeft = 'ArrowLeft',
  ArrowRight = 'ArrowRight',
  Plus = '+',
  Equals = '=',
  Minus = '-',
  Underscore = '_',
}

export const keyNameFrom = (key: string): KeyName | undefined =>
  Object.values(KeyName).find((name) => name === key);

const KEYBOARD_EXEMPT_TARGET_SELECTOR =
  'a, button, input, select, textarea, [contenteditable], dialog[open]';

export const isShortcutEvent = (event: KeyboardEvent): boolean =>
  !event.defaultPrevented &&
  !event.altKey &&
  !event.ctrlKey &&
  !event.metaKey &&
  !(
    event.target instanceof Element &&
    event.target.closest(KEYBOARD_EXEMPT_TARGET_SELECTOR) !== null
  );
