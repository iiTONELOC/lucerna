import { APP_NAME, APP_VERSION, SUPPORT_EMAIL } from '../../appMetadata.ts';

enum DiagnosticsStorageKey {
  LastError = 'lucerna:last-error-diagnostics:v1',
}

export type DiagnosticsEnvironment = {
  readonly capturedAt: string;
  readonly language: string;
  readonly online: boolean;
  readonly pathname: string;
  readonly serviceWorkerControlled: boolean;
  readonly standalone: boolean;
  readonly userAgent: string;
  readonly viewport: string;
};

const DIAGNOSTIC_FIELD_MAXIMUM = 8_000;
const EMAIL_REPORT_MAXIMUM = 12_000;

const limited = (value: string | null | undefined): string => {
  if (value === undefined || value === null || value.length === 0) {
    return 'Unavailable';
  }

  return value.slice(0, DIAGNOSTIC_FIELD_MAXIMUM);
};

const currentEnvironment = (): DiagnosticsEnvironment => ({
  capturedAt: new Date().toISOString(),
  language: navigator.language,
  online: navigator.onLine,
  pathname: window.location.pathname,
  serviceWorkerControlled:
    'serviceWorker' in navigator && navigator.serviceWorker.controller !== null,
  standalone: window.matchMedia('(display-mode: standalone)').matches,
  userAgent: navigator.userAgent,
  viewport: `${window.innerWidth}×${window.innerHeight} @ ${window.devicePixelRatio}×`,
});

export const errorDiagnosticsFrom = (
  error: Error,
  componentStack?: string | null,
  environment: DiagnosticsEnvironment = currentEnvironment(),
): string =>
  [
    `${APP_NAME} ${APP_VERSION} error report`,
    `Captured: ${environment.capturedAt}`,
    `Path: ${environment.pathname}`,
    `Viewport: ${environment.viewport}`,
    `Language: ${environment.language}`,
    `Online: ${environment.online ? 'yes' : 'no'}`,
    `Installed display: ${environment.standalone ? 'standalone' : 'browser'}`,
    `Service worker: ${environment.serviceWorkerControlled ? 'controlling' : 'not controlling'}`,
    `User agent: ${environment.userAgent}`,
    '',
    `${error.name}: ${error.message}`,
    '',
    'JavaScript stack:',
    limited(error.stack),
    '',
    'React component stack:',
    limited(componentStack),
  ].join('\n');

export const persistErrorDiagnostics = (diagnostics: string): boolean => {
  try {
    window.localStorage.setItem(DiagnosticsStorageKey.LastError, diagnostics);
    return true;
  } catch {
    console.warn('Lucerna could not retain the last error diagnostics');
    return false;
  }
};

export const lastErrorDiagnostics = (): string | null => {
  try {
    return window.localStorage.getItem(DiagnosticsStorageKey.LastError);
  } catch {
    console.warn('Lucerna could not read the retained error diagnostics');
    return null;
  }
};

export const clearErrorDiagnostics = (): void => {
  try {
    window.localStorage.removeItem(DiagnosticsStorageKey.LastError);
  } catch {
    console.warn('Lucerna could not clear the retained error diagnostics');
  }
};

export const diagnosticEmailHref = (diagnostics: string): string => {
  const subject = `${APP_NAME} ${APP_VERSION} error report`;
  const body = diagnostics.slice(0, EMAIL_REPORT_MAXIMUM);

  return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
};
