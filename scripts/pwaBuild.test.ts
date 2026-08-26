import { describe, expect, test } from 'bun:test';
import {
  ASSET_FINGERPRINT_LENGTH,
  BUILD_ID_LENGTH,
  createBuildId,
  createPrecacheUrls,
  fingerprintedPathFrom,
  selectIdentityArtifacts,
  type BuildArtifact,
} from './pwaBuild.ts';
import { addIntegrityToAssetTags, integrityFrom } from './vite/subresourceIntegrity.ts';

const artifact = (path: string, contents: string): BuildArtifact => ({
  bytes: new TextEncoder().encode(contents),
  path,
});

describe('PWA build identity', () => {
  test('is deterministic for the same complete artifact set', () => {
    const artifacts = [artifact('index.html', 'shell'), artifact('assets/app.js', 'application')];
    const first = createBuildId(artifacts);
    const second = createBuildId([...artifacts].reverse());

    expect(first).toBe(second);
    expect(first).toHaveLength(BUILD_ID_LENGTH);
  });

  test('changes when a shipped artifact changes', () => {
    const first = createBuildId([artifact('assets/art.avif', 'first')]);
    const second = createBuildId([artifact('assets/art.avif', 'second')]);

    expect(second).not.toBe(first);
  });

  test('excludes generated metadata and source maps', () => {
    const artifacts = [
      artifact('assets/app.js', 'application'),
      artifact('assets/app.js.map', 'map'),
      artifact('build-meta.json', 'metadata'),
      artifact('service-worker.js', 'worker'),
    ];

    expect(selectIdentityArtifacts(artifacts).map(({ path }) => path)).toEqual(['assets/app.js']);
  });
});

describe('PWA build assets', () => {
  test('binds every shipped file into a scope-relative precache manifest', () => {
    const urls = createPrecacheUrls([
      'index.html',
      'assets/app.js',
      'assets/app.js.map',
      'icons/lucerna-192.png',
      'service-worker.js',
    ]);

    expect(urls).toContain('./');
    expect(urls).toContain('./assets/app.js');
    expect(urls).toContain('./icons/lucerna-192.png');
    expect(urls).not.toContain('./index.html');
    expect(urls).not.toContain('./assets/app.js.map');
    expect(urls).not.toContain('./service-worker.js');
  });

  test('fingerprints the final public icon bytes with sixteen hexadecimal characters', () => {
    const path = fingerprintedPathFrom(artifact('icons/lucerna-192.png', 'final icon bytes'));

    expect(path).toMatch(
      new RegExp(`^icons/lucerna-192-[0-9a-f]{${ASSET_FINGERPRINT_LENGTH}}\\.png$`),
    );
  });
});

describe('production service worker', () => {
  test('installs the complete cache atomically without a runtime network fallback', async () => {
    const source = await Bun.file(
      new URL('../src/features/pwa/serviceWorker.ts', import.meta.url),
    ).text();

    expect(source).toContain('__LUCERNA_BUILD_ID__');
    expect(source).toContain("new Request(url, { cache: 'reload' })");
    expect(source).toContain('cache.addAll(precacheRequests())');
    expect(source).not.toContain('ignoreVary');
    expect(source).toContain('offlineMiss()');
    expect(source).not.toContain('fetch(request)');
    expect(source).not.toContain('cache.put(');
    expect(source).not.toContain('Promise.allSettled');
  });

  test('activates only the waiting build through an explicit command', async () => {
    const source = await Bun.file(
      new URL('../src/features/pwa/registration.ts', import.meta.url),
    ).text();

    expect(source).toContain('registration?.waiting?.postMessage');
    expect(source).toContain('ServiceWorkerContract.ActivateWaitingMessage');
    expect(source).toContain("updateViaCache: 'none'");
    expect(source).not.toContain('controller?.postMessage');
  });
});

type ManifestIcon = {
  readonly purpose?: string;
  readonly sizes: string;
  readonly src: string;
  readonly type: string;
};

type WebManifest = {
  readonly background_color?: string;
  readonly display?: string;
  readonly icons: readonly ManifestIcon[];
  readonly lang?: string;
  readonly name?: string;
  readonly scope?: string;
  readonly short_name?: string;
  readonly start_url?: string;
  readonly theme_color?: string;
};

test('web manifest contains installable metadata and distinct maskable artwork', async () => {
  const manifest: WebManifest = await Bun.file(
    new URL('../public/manifest.webmanifest', import.meta.url),
  ).json();
  const sizes = manifest.icons.map(({ sizes }) => sizes);

  expect(manifest.name).toBe('Lucerna');
  expect(manifest.short_name).toBe('Lucerna');
  expect(manifest.lang).toBe('en-US');
  expect(manifest.start_url).toBe('./');
  expect(manifest.scope).toBe('./');
  expect(manifest.display).toBe('standalone');
  expect(manifest.theme_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(manifest.background_color).toMatch(/^#[0-9a-f]{6}$/i);
  expect(sizes).toContain('192x192');
  expect(sizes).toContain('512x512');
  expect(manifest.icons.some(({ purpose }) => purpose === 'maskable')).toBe(true);
});

test('declares U.S. English for the application document', async () => {
  const html = await Bun.file(new URL('../index.html', import.meta.url)).text();

  expect(html).toContain('<html lang="en-US">');
});

test('adds SHA-384 integrity and anonymous CORS to generated asset tags', () => {
  const integrity = integrityFrom('built application');
  const html = addIntegrityToAssetTags(
    '<script type="module" crossorigin src="./assets/index-0123456789abcdef.js"></script>',
    './assets/index-0123456789abcdef.js',
    integrity,
  );

  expect(integrity).toMatch(/^sha384-[A-Za-z0-9+/]+={0,2}$/);
  expect(html).toContain('crossorigin="anonymous"');
  expect(html).toContain(`integrity="${integrity}"`);
});
