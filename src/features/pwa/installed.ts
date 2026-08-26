const STANDALONE_QUERY = '(display-mode: standalone)';

type IosNavigator = Navigator & { readonly standalone?: boolean };

export const isInstalled = (): boolean => {
  if (typeof window === 'undefined') {
    return false;
  }

  const iosStandalone = (navigator as IosNavigator).standalone === true;

  return iosStandalone || window.matchMedia(STANDALONE_QUERY).matches;
};

export const watchInstalled = (listener: () => void): (() => void) => {
  const query = window.matchMedia(STANDALONE_QUERY);

  query.addEventListener('change', listener);

  return () => query.removeEventListener('change', listener);
};
