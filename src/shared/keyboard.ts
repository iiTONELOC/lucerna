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
