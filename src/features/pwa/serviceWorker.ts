/// <reference lib="webworker" />

import { ServiceWorkerContract } from './model.ts';

declare const __LUCERNA_BUILD_ID__: string;
declare const __LUCERNA_PRECACHE_URLS__: readonly string[];
declare const __LUCERNA_EDITION_SETS__: Readonly<Record<string, readonly string[]>>;
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `${ServiceWorkerContract.CachePrefix}${__LUCERNA_BUILD_ID__}`;
const PRECACHE_URLS = [...__LUCERNA_PRECACHE_URLS__];
const EDITION_SETS = __LUCERNA_EDITION_SETS__;
const EDITION_PREFIXES = Object.keys(EDITION_SETS);
const GATEWAY_TIMEOUT_STATUS = 504;

type ActivationCommand = {
  readonly type: typeof ServiceWorkerContract.ActivateWaitingMessage;
};

const isActivationCommand = (value: unknown): value is ActivationCommand =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === ServiceWorkerContract.ActivateWaitingMessage;

type EditionCommand = {
  readonly type: typeof ServiceWorkerContract.CacheEditionMessage;
  readonly prefix: string;
};

const isEditionCommand = (value: unknown): value is EditionCommand =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === ServiceWorkerContract.CacheEditionMessage &&
  'prefix' in value &&
  typeof value.prefix === 'string';

const editionUrlsOf = (prefix: string): readonly string[] =>
  (EDITION_SETS[prefix] ?? []).map((url) => new URL(url, self.registration.scope).href);

const EDITION_URLS: ReadonlySet<string> = new Set(EDITION_PREFIXES.flatMap(editionUrlsOf));

const cacheEdition = async (prefix: string): Promise<void> => {
  const cache = await caches.open(ServiceWorkerContract.EditionCacheName);
  const cached = new Set((await cache.keys()).map(({ url }) => url));
  const missing = editionUrlsOf(prefix).filter((url) => !cached.has(url));

  await cache.addAll(missing.map((url) => new Request(url, { cache: 'reload' })));
};

const cachedEditionPrefixes = async (): Promise<readonly string[]> => {
  const cache = await caches.open(ServiceWorkerContract.EditionCacheName);
  const names = (await cache.keys()).map(
    ({ url }) => new URL(url).pathname.split('/').at(-1) ?? '',
  );

  return EDITION_PREFIXES.filter((prefix) => names.some((name) => name.startsWith(prefix)));
};

const recacheEditions = async (): Promise<void> => {
  await Promise.all((await cachedEditionPrefixes()).map(cacheEdition));
};

const pruneEditions = async (): Promise<void> => {
  const cache = await caches.open(ServiceWorkerContract.EditionCacheName);
  const stale = (await cache.keys()).filter(({ url }) => !EDITION_URLS.has(url));

  await Promise.all(stale.map((request) => cache.delete(request)));
};

const offlineMiss = (): Response =>
  new Response('This Pray Lucerna resource is not present in the installed version.', {
    status: GATEWAY_TIMEOUT_STATUS,
    statusText: 'Offline resource unavailable',
  });

const precacheRequests = (): readonly Request[] =>
  PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }));

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(precacheRequests()))
      .then(recacheEditions),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) => key.startsWith(ServiceWorkerContract.CachePrefix) && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(recacheEditions)
      .then(pruneEditions)
      .finally(() => self.clients.claim()),
  );
});

const responseFor = async (request: Request, cacheRequest: Request | URL): Promise<Response> => {
  const options = { ignoreSearch: true };
  const cached =
    (await (await caches.open(CACHE_NAME)).match(cacheRequest, options)) ??
    (await (await caches.open(ServiceWorkerContract.EditionCacheName)).match(request, options));

  return cached ?? offlineMiss();
};

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== ServiceWorkerContract.GetMethod) {
    return;
  }

  if (!requestUrl.href.startsWith(self.registration.scope)) {
    return;
  }

  const cacheRequest =
    request.mode === ServiceWorkerContract.NavigateMode
      ? new URL('./', self.registration.scope)
      : request;

  event.respondWith(responseFor(request, cacheRequest));
});

self.addEventListener('message', (event) => {
  if (isActivationCommand(event.data)) {
    event.waitUntil(self.skipWaiting());
  }

  if (isEditionCommand(event.data)) {
    const [port] = event.ports;

    event.waitUntil(
      cacheEdition(event.data.prefix).then(
        () => port?.postMessage(true),
        () => port?.postMessage(false),
      ),
    );
  }
});
