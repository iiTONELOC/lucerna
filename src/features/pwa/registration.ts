import { UpdateChecks } from '../../state/preferences/model.ts';
import { isInstalled } from './installed.ts';
import { ServiceWorkerContract } from './model.ts';

type ServiceWorkerRegistrationConfig = {
  readonly onError?: (error: unknown) => void;
  readonly onUpdate?: () => void;
  readonly updateChecks?: UpdateChecks;
};

let errorCallback: ((error: unknown) => void) | null = null;
let updateCallback: (() => void) | null = null;
let registration: ServiceWorkerRegistration | null = null;
let notifiedWorker: ServiceWorker | null = null;
let updateCheck: Promise<void> | null = null;
let registrationStarted = false;
let updateChecks: UpdateChecks = UpdateChecks.OnLoad;
let updateChecksInstalled = false;
let reloading = false;

let settleOfflineReady = (): void => {};

const offlineReady = new Promise<void>((resolve) => {
  settleOfflineReady = resolve;
});

export const whenOfflineReady = (): Promise<void> => offlineReady;

const reportError = (error: unknown): void => {
  settleOfflineReady();
  errorCallback?.(error);
};

const notifyUpdate = (): void => {
  const worker = registration?.waiting;

  if (navigator.serviceWorker.controller === null || worker === undefined || worker === null) {
    return;
  }

  if (!isInstalled() || worker === notifiedWorker) {
    return;
  }

  notifiedWorker = worker;
  updateCallback?.();
};

const checkForUpdate = (): Promise<void> => {
  if (registration === null) {
    return Promise.resolve();
  }

  if (updateCheck !== null) {
    return updateCheck;
  }

  updateCheck = registration
    .update()
    .then(() => undefined)
    .catch(reportError)
    .finally(() => {
      updateCheck = null;
    });

  return updateCheck;
};

const watchInstallingWorker = (worker: ServiceWorker): void => {
  worker.addEventListener('statechange', () => {
    if (worker.state === ServiceWorkerContract.InstalledState) {
      notifyUpdate();
      return;
    }

    if (worker.state === ServiceWorkerContract.RedundantState) {
      reportError(new Error('Lucerna could not store its offline copy.'));
    }
  });
};

const checkWhileOpen = (): void => {
  if (updateChecks === UpdateChecks.WhileOpen && isInstalled()) {
    void checkForUpdate();
  }
};

const installUpdateChecks = (): void => {
  if (updateChecksInstalled) {
    return;
  }

  updateChecksInstalled = true;
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      checkWhileOpen();
    }
  });
  window.addEventListener('online', checkWhileOpen);
  window.setInterval(checkWhileOpen, ServiceWorkerContract.UpdateCheckMilliseconds);
};

const installControllerChangeHandler = (): void => {
  let controllerEstablished = navigator.serviceWorker.controller !== null;

  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!controllerEstablished) {
      controllerEstablished = true;
      return;
    }

    if (reloading) {
      return;
    }

    reloading = true;
    window.location.reload();
  });
};

const acceptRegistration = (registered: ServiceWorkerRegistration): Promise<void> => {
  registration = registered;

  if (registered.installing !== null) {
    watchInstallingWorker(registered.installing);
  }

  registered.addEventListener('updatefound', () => {
    if (registered.installing !== null) {
      watchInstallingWorker(registered.installing);
    }
  });

  notifyUpdate();
  installUpdateChecks();
  return checkForUpdate();
};

export const registerServiceWorker = (config: ServiceWorkerRegistrationConfig): void => {
  updateCallback = config.onUpdate ?? null;
  errorCallback = config.onError ?? null;
  updateChecks = config.updateChecks ?? UpdateChecks.OnLoad;

  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) {
    settleOfflineReady();
    return;
  }

  if (registrationStarted) {
    notifyUpdate();
    return;
  }

  registrationStarted = true;
  installControllerChangeHandler();
  void navigator.serviceWorker.ready.then(() => {
    settleOfflineReady();
  });

  const scriptUrl = new URL('service-worker.js', document.baseURI);
  navigator.serviceWorker
    .register(scriptUrl, {
      scope: import.meta.env.BASE_URL,
      updateViaCache: 'none',
    })
    .then(acceptRegistration)
    .catch(reportError);
};

export const applyServiceWorkerUpdate = (): void => {
  registration?.waiting?.postMessage({
    type: ServiceWorkerContract.ActivateWaitingMessage,
  });
};
