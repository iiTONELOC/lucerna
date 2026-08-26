import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { ErrorBoundary } from './components/error/ErrorBoundary.tsx';
import './index.css';
import { PreferencesProvider } from './state/preferences/PreferencesProvider.tsx';

const ROOT_ERROR = 'Lucerna root element is missing';
const rootElement = document.getElementById('root');

if (rootElement === null) {
  throw new Error(ROOT_ERROR);
}

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <PreferencesProvider>
        <App />
      </PreferencesProvider>
    </ErrorBoundary>
  </StrictMode>,
);
