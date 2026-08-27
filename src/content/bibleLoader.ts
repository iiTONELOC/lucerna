import { bibleBookFrom, type BibleBook } from './schema.ts';

const loadedBooks = new Map<string, Promise<BibleBook>>();

export const loadBibleBook = (bookId: string): Promise<BibleBook> => {
  const loaded = loadedBooks.get(bookId);

  if (loaded !== undefined) {
    return loaded;
  }

  const loading = import(`../generated/bible/douay-rheims/${bookId}.json`).then(
    (module: { readonly default: unknown }) => bibleBookFrom(module.default),
  );
  loadedBooks.set(bookId, loading);
  loading.catch(() => loadedBooks.delete(bookId));

  return loading;
};
