import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { SupportProvider } from './features/support/Support.tsx';
import { ErrorBoundary } from './components/error/ErrorBoundary.tsx';
import { CURRENT_LANGUAGE } from './content/currentLanguage.ts';
import './index.css';
import { PreferencesProvider } from './state/preferences/PreferencesProvider.tsx';

const ROOT_ERROR = 'Lucerna root element is missing';
const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error(ROOT_ERROR);
}

document.documentElement.lang = CURRENT_LANGUAGE;

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <PreferencesProvider>
        <SupportProvider>
          <App />
        </SupportProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  </StrictMode>,
);
