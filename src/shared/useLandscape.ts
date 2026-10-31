import { useSyncExternalStore } from 'react';

const LANDSCAPE_QUERY = '(orientation: landscape)';

const subscribeToLandscape = (onChange: () => void): (() => void) => {
  const query = window.matchMedia(LANDSCAPE_QUERY);

  query.addEventListener('change', onChange);
  return () => query.removeEventListener('change', onChange);
};

export const useLandscape = (): boolean =>
  useSyncExternalStore(
    subscribeToLandscape,
    () => window.matchMedia(LANDSCAPE_QUERY).matches,
    () => false,
  );
