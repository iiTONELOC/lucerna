import { useContext } from 'react';
import { PreferencesContext, type PreferencesContextValue } from './context.ts';

const CONTEXT_ERROR = 'usePreferences must be used inside PreferencesProvider';

export const usePreferences = (): PreferencesContextValue => {
  const context = useContext(PreferencesContext);

  if (context === null) {
    throw new Error(CONTEXT_ERROR);
  }

  return context;
};
