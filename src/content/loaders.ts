import { useEffect, useState } from 'react';
import {
  resolvedBibleFrom,
  resolveLibrary,
  type ResolvedBible,
  type ResolvedLibrary,
} from './catalog.ts';
import { bibleIndexOf } from './currentLanguage.ts';
import { BibleEditionId, editionInLanguage, type Language } from './language.ts';
import type { ReadingSnapshot } from './reading.ts';
import {
  bibleBookFrom,
  bibleIndexFrom,
  libraryContentFrom,
  type BibleBook,
  type JsonModule,
} from './schema.ts';

type LoadedContent<Value> = {
  readonly promise: Promise<Value>;
  value?: Value;
};

const LIBRARY_KEY = 'library';
const loadedBibles = new Map<string, LoadedContent<ResolvedBible>>();
const loadedBooks = new Map<string, LoadedContent<BibleBook>>();
const loadedLibrary = new Map<string, LoadedContent<ResolvedLibrary>>();

const cachedLoad = <Value>(
  cache: Map<string, LoadedContent<Value>>,
  key: string,
  load: () => Promise<Value>,
): LoadedContent<Value> => {
  const loaded = cache.get(key);

  if (loaded !== undefined) {
    return loaded;
  }

  const resource: LoadedContent<Value> = {
    promise: load().then((value) => {
      resource.value = value;
      return value;
    }),
  };
  cache.set(key, resource);
  resource.promise.catch(() => cache.delete(key));
  return resource;
};

export const loadBible = (
  reading: ReadingSnapshot,
  requestedEdition: BibleEditionId,
): LoadedContent<ResolvedBible> => {
  const edition = editionInLanguage(reading.language, requestedEdition);
  return cachedLoad(loadedBibles, reading.language + '/' + edition, () =>
    edition === reading.catalog.bible.directory
      ? Promise.resolve(reading.catalog.bible)
      : bibleIndexOf(reading.language, edition).then((index) =>
          resolvedBibleFrom(bibleIndexFrom(index), reading.catalog.sourceById),
        ),
  );
};

export const loadBibleBook = (
  reading: ReadingSnapshot,
  requestedEdition: BibleEditionId,
  bookId: string,
): LoadedContent<BibleBook> => {
  const edition = editionInLanguage(reading.language, requestedEdition);
  return cachedLoad(loadedBooks, `${reading.language}/${edition}/${bookId}`, () =>
    import(`../generated/${reading.language}/${edition}/bible/books/${bookId}.json`).then(
      (module: JsonModule) => bibleBookFrom(module.default),
    ),
  );
};

export const loadLibrary = (reading: ReadingSnapshot): LoadedContent<ResolvedLibrary> =>
  cachedLoad(loadedLibrary, reading.language + '/' + LIBRARY_KEY, () =>
    import(`../generated/${reading.language}/library-content.json`).then((module: JsonModule) =>
      resolveLibrary(libraryContentFrom(module.default), reading.catalog.sourceById),
    ),
  );

export const prepareLoadedContent = async (
  previous: ReadingSnapshot,
  next: ReadingSnapshot,
  prepareEdition: (language: Language, edition: BibleEditionId) => Promise<boolean>,
): Promise<boolean> => {
  const editions = Object.values(BibleEditionId).filter(
    (edition) =>
      loadedBibles.has(previous.language + '/' + edition) ||
      [...loadedBooks.keys()].some((key) =>
        key.startsWith(previous.language + '/' + edition + '/'),
      ),
  );
  const pending: Promise<unknown>[] = [];
  for (const edition of editions) {
    if (!(await prepareEdition(next.language, editionInLanguage(next.language, edition))))
      return false;
    pending.push(loadBible(next, edition).promise);
  }
  if (loadedLibrary.has(previous.language + '/' + LIBRARY_KEY)) {
    pending.push(loadLibrary(next).promise);
  }
  for (const key of [...loadedBooks.keys()]) {
    const [language, id, bookId] = key.split('/');
    const edition = Object.values(BibleEditionId).find((candidate) => candidate === id);
    if (language === previous.language && edition !== undefined && bookId !== undefined) {
      pending.push(loadBibleBook(next, edition, bookId).promise);
    }
  }
  await Promise.all(pending);
  return true;
};

export const useLoaded = <Value>(resource: LoadedContent<Value>): Value | null => {
  const [loaded, setLoaded] = useState<{
    readonly resource: LoadedContent<Value>;
    readonly value: Value;
  } | null>(null);
  useEffect(() => {
    let active = true;
    void resource.promise.then((value) => {
      if (active) setLoaded({ resource, value });
    });
    return () => {
      active = false;
    };
  }, [resource]);

  return resource.value ?? (loaded?.resource === resource ? loaded.value : null);
};
