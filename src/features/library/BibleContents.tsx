import { useState } from 'react';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { contentCatalog } from '../../content/catalog.ts';
import { BibleTestament, LibraryCategory, type BibleBookSummary } from '../../content/schema.ts';
import { CHAPTER_CLASS_NAME, CITATION_CLASS_NAME, READING_CLASS_NAME } from '../../styles.ts';
import { BIBLE_EDITION, BIBLE_TITLE, LIBRARY_CATEGORY_LABEL, TESTAMENT_LABEL } from './model.ts';
import { ReaderHeader } from './ReaderHeader.tsx';
import { ReaderColophon, ReaderSurface } from './ReaderSurface.tsx';
import { useHeadingFocus } from './useHeadingFocus.ts';

function BookRow({
  book,
  onOpenBook,
}: {
  readonly book: BibleBookSummary;
  readonly onOpenBook: (bookId: string) => void;
}) {
  return (
    <li>
      <button
        className="flex min-h-11 w-full items-baseline justify-between gap-4 border-b border-hairline py-2 text-left transition-colors hover:text-accent-current focus-ring"
        onClick={() => onOpenBook(book.id)}
        type="button"
      >
        <span className={READING_CLASS_NAME}>{book.name}</span>
        <span className={`${CITATION_CLASS_NAME} shrink-0 text-muted`}>
          {book.chapterCount === 1 ? '1 chapter' : `${String(book.chapterCount)} chapters`}
        </span>
      </button>
    </li>
  );
}

function TestamentSection({
  onOpenBook,
  testament,
}: {
  readonly onOpenBook: (bookId: string) => void;
  readonly testament: BibleTestament;
}) {
  const [open, setOpen] = useState(true);
  const books = contentCatalog.bible.books.filter((book) => book.testament === testament);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="pt-4">
        <button
          aria-expanded={open}
          className={`focus-ring flex min-h-11 w-full items-center justify-between gap-4 transition-colors hover:text-accent-current ${CHAPTER_CLASS_NAME}`}
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          {TESTAMENT_LABEL[testament]}
          <Chevron
            className="size-5 shrink-0 text-muted"
            direction={open ? ChevronDirection.Down : ChevronDirection.Right}
          />
        </button>
      </h2>
      {open ? (
        <ul className="flex list-none flex-col">
          {books.map((book) => (
            <BookRow book={book} key={book.id} onOpenBook={onOpenBook} />
          ))}
        </ul>
      ) : null}
    </section>
  );
}

export function BibleContents({
  onBack,
  onOpenBook,
  onOpenSettings,
}: {
  readonly onBack: () => void;
  readonly onOpenBook: (bookId: string) => void;
  readonly onOpenSettings: () => void;
}) {
  const headingRef = useHeadingFocus(BIBLE_TITLE);

  return (
    <ReaderSurface onBack={onBack} onOpenSettings={onOpenSettings}>
      <ReaderHeader
        eyebrow={LIBRARY_CATEGORY_LABEL[LibraryCategory.Scripture]}
        headingRef={headingRef}
        subtitle={BIBLE_EDITION}
        tight
        title={BIBLE_TITLE}
      />
      {Object.values(BibleTestament).map((testament) => (
        <TestamentSection key={testament} onOpenBook={onOpenBook} testament={testament} />
      ))}
      <ReaderColophon source={contentCatalog.bible.source} />
    </ReaderSurface>
  );
}
