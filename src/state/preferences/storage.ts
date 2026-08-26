import { DEFAULT_PREFERENCES, parsePreferences, type Preferences } from './model.ts';

const DATABASE_NAME = 'lucerna';
const DATABASE_VERSION = 1;
const STORE_NAME = 'preferences';
const PREFERENCES_KEY = 'user';
const STORAGE_ERROR = 'Preference storage operation failed';

const toStorageError = (error: DOMException | null): Error => error ?? new Error(STORAGE_ERROR);

const openDatabase = (): Promise<IDBDatabase | null> => {
  if (typeof indexedDB === 'undefined') {
    return Promise.resolve(null);
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);

    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error));
    request.onblocked = () => reject(toStorageError(request.error));
  });
};

const readPreferences = (database: IDBDatabase): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(PREFERENCES_KEY);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error));
    transaction.onerror = () => reject(toStorageError(transaction.error));
    transaction.onabort = () => reject(toStorageError(transaction.error));
  });

const writePreferences = (database: IDBDatabase, preferences: Preferences): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');

    transaction.objectStore(STORE_NAME).put(preferences, PREFERENCES_KEY);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(toStorageError(transaction.error));
    transaction.onabort = () => reject(toStorageError(transaction.error));
  });

export const loadPreferences = async (): Promise<Preferences> => {
  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    if (database === null) {
      return DEFAULT_PREFERENCES;
    }

    return parsePreferences(await readPreferences(database));
  } catch {
    return DEFAULT_PREFERENCES;
  } finally {
    database?.close();
  }
};

export const savePreferences = async (preferences: Preferences): Promise<void> => {
  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    if (database !== null) {
      await writePreferences(database, preferences);
    }
  } catch {
    // Preferences should never block the app from rendering.
  } finally {
    database?.close();
  }
};
