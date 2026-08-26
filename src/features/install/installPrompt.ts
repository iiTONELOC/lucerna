import { useSyncExternalStore } from 'react';

type BeforeInstallPromptEvent = Event & {
  readonly prompt: () => Promise<void>;
};

const listeners = new Set<() => void>();
let deferredPrompt: BeforeInstallPromptEvent | null = null;

const publish = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const capture = (event: Event): void => {
  event.preventDefault();
  deferredPrompt = event as BeforeInstallPromptEvent;
  publish();
};

const release = (): void => {
  deferredPrompt = null;
  publish();
};

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', capture);
  window.addEventListener('appinstalled', release);
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener);

  return () => {
    listeners.delete(listener);
  };
};

const promptAvailable = (): boolean => deferredPrompt !== null;

export const useInstallPrompt = (): boolean =>
  useSyncExternalStore(subscribe, promptAvailable, () => false);

export const showInstallPrompt = async (): Promise<void> => {
  const pending = deferredPrompt;

  if (pending === null) {
    return;
  }

  release();
  await pending.prompt();
};
