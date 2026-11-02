import { useEffect, useState } from 'react';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import type { BibleEditionId } from '../../content/language.ts';
import { loadBible, useLoaded } from '../../content/loaders.ts';
import { useReading } from '../../content/reading.ts';
import { BibleTestament, LibraryCategory, type BibleBookSummary } from '../../content/schema.ts';
import {
  loadOpenTestaments,
  saveOpenTestaments,
  type OpenTestaments,
} from '../../state/reading/readingPositions.ts';
import { CHAPTER_CLASS_NAME, CITATION_CLASS_NAME, READING_CLASS_NAME } from '../../styles.ts';
import {
  BIBLE_EDITION_LABEL,
  BIBLE_TITLE,
  LIBRARY_CATEGORY_LABEL,
  OpenBibleContext,
  TESTAMENT_LABEL,
  useOpenBible,
} from './model.ts';
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
  const { wording } = useReading();
  return (
    <li>
      <button
        className="flex min-h-11 w-full items-baseline justify-between gap-4 border-b border-hairline py-2 text-left transition-colors hover:text-accent-current focus-ring"
        onClick={() => onOpenBook(book.id)}
        type="button"
      >
        <span className={READING_CLASS_NAME}>{book.name}</span>
        <span className={`${CITATION_CLASS_NAME} shrink-0 text-muted`}>
          {wording.library.chapterCount(book.chapterCount)}
        </span>
      </button>
    </li>
  );
}

function TestamentSection({
  onOpenBook,
  onToggle,
  open,
  testament,
}: {
  readonly onOpenBook: (bookId: string) => void;
  readonly onToggle: () => void;
  readonly open: boolean;
  readonly testament: BibleTestament;
}) {
  const reading = useReading();
  const books = useOpenBible().books.filter((book) => book.testament === testament);

  return (
    <section className="flex flex-col gap-2">
      <h2 className="pt-4">
        <button
          aria-expanded={open}
          className={`focus-ring flex min-h-11 w-full items-center justify-between gap-4 transition-colors hover:text-accent-current ${CHAPTER_CLASS_NAME}`}
          onClick={onToggle}
          type="button"
        >
          {TESTAMENT_LABEL(reading)[testament]}
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

const useOpenTestaments = () => {
  const [openTestaments, setOpenTestaments] = useState<OpenTestaments | null>(null);

  useEffect(() => {
    let cancelled = false;

    void loadOpenTestaments().then((stored) => {
      if (!cancelled) {
        setOpenTestaments(stored);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  const toggleTestament = (testament: BibleTestament): void => {
    if (openTestaments === null) {
      return;
    }

    const next = { ...openTestaments, [testament]: !openTestaments[testament] };

    setOpenTestaments(next);
    void saveOpenTestaments(next);
  };

  return { openTestaments, toggleTestament };
};

type BibleContentsProps = {
  readonly onBack: () => void;
  readonly onOpenBook: (bookId: string) => void;
  readonly onOpenSettings: () => void;
};

function BibleContentsPage({ onBack, onOpenBook, onOpenSettings }: BibleContentsProps) {
  const reading = useReading();
  const bible = useOpenBible();
  const headingRef = useHeadingFocus(BIBLE_TITLE(reading));
  const { openTestaments, toggleTestament } = useOpenTestaments();

  return (
    <ReaderSurface onBack={onBack} onOpenSettings={onOpenSettings}>
      <ReaderHeader
        eyebrow={LIBRARY_CATEGORY_LABEL(reading)[LibraryCategory.Scripture]}
        headingRef={headingRef}
        subtitle={BIBLE_EDITION_LABEL(reading)[bible.directory]}
        tight
        title={BIBLE_TITLE(reading)}
      />
      {openTestaments === null
        ? null
        : Object.values(BibleTestament).map((testament) => (
            <TestamentSection
              key={testament}
              onOpenBook={onOpenBook}
              onToggle={() => toggleTestament(testament)}
              open={openTestaments[testament]}
              testament={testament}
            />
          ))}
      <ReaderColophon source={bible.source} />
    </ReaderSurface>
  );
}

export function BibleContents({
  edition,
  ...props
}: BibleContentsProps & { readonly edition: BibleEditionId }) {
  const reading = useReading();
  const bible = useLoaded(loadBible(reading, edition));

  return bible === null ? null : (
    <OpenBibleContext value={bible}>
      <BibleContentsPage {...props} />
    </OpenBibleContext>
  );
}
