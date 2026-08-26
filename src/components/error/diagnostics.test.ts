import { describe, expect, test } from 'bun:test';
import { APP_VERSION, SUPPORT_EMAIL } from '../../appMetadata.ts';
import {
  diagnosticEmailHref,
  errorDiagnosticsFrom,
  type DiagnosticsEnvironment,
} from './diagnostics.ts';

const ENVIRONMENT: DiagnosticsEnvironment = {
  capturedAt: '2026-08-25T00:00:00.000Z',
  language: 'en-US',
  online: false,
  pathname: '/lucerna/',
  serviceWorkerControlled: true,
  standalone: true,
  userAgent: 'Lucerna test browser',
  viewport: '390×844 @ 3×',
};

describe('error diagnostics', () => {
  test('retains technical context and both available stacks', () => {
    const error = new Error('Rendered prayer failed');
    error.stack = 'Error: Rendered prayer failed\n at PrayerFocus';
    const diagnostics = errorDiagnosticsFrom(error, 'at PrayerFocus component', ENVIRONMENT);

    expect(diagnostics).toContain(`Lucerna ${APP_VERSION} error report`);
    expect(diagnostics).toContain('Captured: 2026-08-25T00:00:00.000Z');
    expect(diagnostics).toContain('Online: no');
    expect(diagnostics).toContain('Service worker: controlling');
    expect(diagnostics).toContain(error.stack);
    expect(diagnostics).toContain('at PrayerFocus component');
  });

  test('creates an email draft containing the complete report', () => {
    const diagnostics = 'Lucerna diagnostic\nretained details';
    const href = diagnosticEmailHref(diagnostics);
    const body = new URL(href).searchParams.get('body');

    expect(href).toStartWith(`mailto:${SUPPORT_EMAIL}?`);
    expect(body).toBe(diagnostics);
  });
});
