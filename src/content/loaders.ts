import { useEffect, useState } from 'react';
import { contentCatalog, resolveLibrary, type ResolvedLibrary } from './catalog.ts';
import { bibleBookFrom, libraryContentFrom, type BibleBook } from './schema.ts';

type JsonModule = { readonly default: unknown };

const LIBRARY_KEY = 'library';
const loadedBooks = new Map<string, Promise<BibleBook>>();
const loadedLibrary = new Map<string, Promise<ResolvedLibrary>>();

const cachedLoad = <Value>(
  cache: Map<string, Promise<Value>>,
  key: string,
  load: () => Promise<Value>,
): Promise<Value> => {
  const loaded = cache.get(key);

  if (loaded !== undefined) {
    return loaded;
  }

  const loading = load();
  cache.set(key, loading);
  loading.catch(() => cache.delete(key));

  return loading;
};

export const loadBibleBook = (bookId: string): Promise<BibleBook> =>
  cachedLoad(loadedBooks, bookId, () =>
    import(`../generated/bible/douay-rheims/books/${bookId}.json`).then((module: JsonModule) =>
      bibleBookFrom(module.default),
    ),
  );

export const loadLibrary = (): Promise<ResolvedLibrary> =>
  cachedLoad(loadedLibrary, LIBRARY_KEY, () =>
    import('../generated/library-content.json').then((module: JsonModule) =>
      resolveLibrary(libraryContentFrom(module.default), contentCatalog.sourceById),
    ),
  );

export const useLoaded = <Value>(loading: Promise<Value>): Value | null => {
  const [value, setValue] = useState<Value | null>(null);

  useEffect(() => {
    let active = true;
    setValue(null);
    void loading.then((loaded) => {
      if (active) {
        setValue(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [loading]);

  return value;
};
