/// <reference lib="webworker" />

import { ServiceWorkerContract } from './model.ts';

declare const __LUCERNA_BUILD_ID__: string;
declare const __LUCERNA_PRECACHE_URLS__: readonly string[];
declare const self: ServiceWorkerGlobalScope;

const CACHE_NAME = `${ServiceWorkerContract.CachePrefix}${__LUCERNA_BUILD_ID__}`;
const PRECACHE_URLS = [...__LUCERNA_PRECACHE_URLS__];

type ActivationCommand = {
  readonly type: typeof ServiceWorkerContract.ActivateWaitingMessage;
};

const isActivationCommand = (value: unknown): value is ActivationCommand =>
  typeof value === 'object' &&
  value !== null &&
  'type' in value &&
  value.type === ServiceWorkerContract.ActivateWaitingMessage;

const offlineMiss = (): Response =>
  new Response('This Lucerna resource is not present in the installed version.', {
    status: 504,
    statusText: 'Offline resource unavailable',
  });

const precacheRequests = (): readonly Request[] =>
  PRECACHE_URLS.map((url) => new Request(url, { cache: 'reload' }));

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(precacheRequests())));
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
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const requestUrl = new URL(request.url);

  if (request.method !== ServiceWorkerContract.GetMethod) {
    return;
  }

  if (!requestUrl.href.startsWith(self.registration.scope)) {
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cacheRequest =
        request.mode === ServiceWorkerContract.NavigateMode
          ? new URL('./', self.registration.scope)
          : request;
      const cached = await cache.match(cacheRequest, { ignoreSearch: true });

      return cached ?? offlineMiss();
    }),
  );
});

self.addEventListener('message', (event) => {
  if (isActivationCommand(event.data)) {
    event.waitUntil(self.skipWaiting());
  }
});
