import { parsePreferences, type Preferences } from './model.ts';

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

const readValue = (database: IDBDatabase, key: string): Promise<unknown> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readonly');
    const request = transaction.objectStore(STORE_NAME).get(key);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(toStorageError(request.error));
    transaction.onerror = () => reject(toStorageError(transaction.error));
    transaction.onabort = () => reject(toStorageError(transaction.error));
  });

const writeValue = (database: IDBDatabase, key: string, value: unknown): Promise<void> =>
  new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, 'readwrite');

    transaction.objectStore(STORE_NAME).put(value, key);
    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(toStorageError(transaction.error));
    transaction.onabort = () => reject(toStorageError(transaction.error));
  });

export const readStoredValue = async (key: string): Promise<unknown> => {
  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    return database === null ? undefined : await readValue(database, key);
  } catch {
    return undefined;
  } finally {
    database?.close();
  }
};

export const writeStoredValue = async (key: string, value: unknown): Promise<void> => {
  let database: IDBDatabase | null = null;

  try {
    database = await openDatabase();
    if (database !== null) {
      await writeValue(database, key, value);
    }
  } catch {
    return;
  } finally {
    database?.close();
  }
};

export const loadPreferences = async (): Promise<Preferences> =>
  parsePreferences(await readStoredValue(PREFERENCES_KEY));

export const savePreferences = (preferences: Preferences): Promise<void> =>
  writeStoredValue(PREFERENCES_KEY, preferences);
