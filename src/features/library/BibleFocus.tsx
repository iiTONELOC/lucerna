import { Fragment, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { loadBibleBook } from '../../content/bibleLoader.ts';
import { contentCatalog } from '../../content/catalog.ts';
import { saveLastBibleBook } from '../../state/reading/readingPositions.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import {
  BibleBlockKind,
  BibleRunKind,
  type BibleBlock,
  type BibleBook,
  type BibleChapter,
  type BibleNoteRun,
  type BibleRun,
  type BibleVerse,
} from '../../content/schema.ts';
import {
  APPARATUS_CLASS_NAME,
  CHAPTER_CLASS_NAME,
  QUIET_BUTTON_CLASS_NAME,
  READING_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  SUPERSCRIPT_CLASS_NAME,
} from '../../styles.ts';
import { GluedTail } from '../../components/marks/MarkGlue.tsx';
import { NoteMark, RedLetterMark } from '../../components/marks/Marks.tsx';
import { runText } from '../../components/marks/runText.tsx';
import { RedLetterNotice } from '../../components/RedLetterNotice.tsx';
import { apparatusReferenceTarget, type ReferenceTarget } from '../references/referenceCatalog.ts';
import { BIBLE_TITLE, type BibleVerseLocation, type ReaderJump } from './model.ts';
import { ReaderHeader } from './ReaderHeader.tsx';
import { JumpButtons, ReaderLocationControl } from './ReaderLocation.tsx';
import { ReaderSurface } from './ReaderSurface.tsx';
import { useHeadingFocus } from './useHeadingFocus.ts';
import { blockIndexPropsOf, useReadingPosition, useTopmostTracker } from './useReadingPosition.ts';
type NoteEntry = {
  readonly key: string;
  readonly note: BibleNoteRun;
};

type RunGroup = {
  readonly baseKey: string;
  readonly runs: readonly BibleRun[];
};

const useNoteToggles = () => {
  const [openNotes, setOpenNotes] = useState<ReadonlySet<string>>(new Set());
  const toggleNote = (key: string): void => {
    setOpenNotes((current) => {
      const next = new Set(current);

      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }

      return next;
    });
  };

  return { openNotes, toggleNote };
};

const noteEntriesFrom = (
  groups: readonly RunGroup[],
  openNotes: ReadonlySet<string>,
): readonly NoteEntry[] =>
  groups.flatMap(({ baseKey, runs }) =>
    runs.flatMap((run, index) =>
      run.kind === BibleRunKind.Note && openNotes.has(`${baseKey}-${String(index)}`)
        ? [{ key: `${baseKey}-${String(index)}`, note: run }]
        : [],
    ),
  );

type RedStretchEnd = {
  readonly unit: number;
  readonly key: string;
};

const paragraphChristEnds = (
  verses: readonly BibleVerse[],
  unit: number,
  pending: RedStretchEnd | null,
  close: (end: RedStretchEnd) => void,
): RedStretchEnd | null => {
  let open = pending;

  for (const [verseIndex, verse] of verses.entries()) {
    for (const [runIndex, run] of verse.runs.entries()) {
      if (run.kind === BibleRunKind.Christ) {
        open = { unit, key: `${String(verseIndex)}-${String(runIndex)}` };
      } else if (run.kind === BibleRunKind.Text && open !== null) {
        close(open);
        open = null;
      }
    }
  }

  return open;
};

type RunRenderGroup = {
  readonly key: string;
  readonly run: BibleRun;
  readonly notes: NoteEntry[];
};

const renderGroupsFrom = (
  baseKey: string,
  runs: readonly BibleRun[],
): readonly RunRenderGroup[] => {
  const groups: RunRenderGroup[] = [];

  for (const [index, run] of runs.entries()) {
    const key = `${baseKey}-${String(index)}`;
    const previous = groups.at(-1);

    if (
      run.kind === BibleRunKind.Note &&
      previous !== undefined &&
      previous.run.kind !== BibleRunKind.Note
    ) {
      previous.notes.push({ key, note: run });
    } else {
      groups.push({ key, run, notes: [] });
    }
  }

  return groups;
};

const runClassNameOf = (run: BibleRun, showRedLetter: boolean): string | undefined => {
  if (run.kind === BibleRunKind.Christ && showRedLetter) {
    return 'text-christ';
  }

  return run.kind === BibleRunKind.Reference ? 'text-muted italic' : undefined;
};

function GlueNotes({
  notes,
  onToggleNote,
  openNotes,
}: {
  readonly notes: readonly NoteEntry[];
  readonly onToggleNote: (key: string) => void;
  readonly openNotes: ReadonlySet<string>;
}) {
  return (
    <>
      {notes.map(({ key, note }) => (
        <NoteMark
          key={key}
          note={note}
          onToggle={() => onToggleNote(key)}
          open={openNotes.has(key)}
        />
      ))}
    </>
  );
}

function GluedRun({
  group,
  marked,
  markingOpen,
  onToggleMarking,
  onToggleNote,
  openNotes,
  showRedLetter,
}: {
  readonly group: RunRenderGroup;
  readonly marked: boolean;
  readonly markingOpen: boolean;
  readonly onToggleMarking: (() => void) | undefined;
  readonly onToggleNote: (key: string) => void;
  readonly openNotes: ReadonlySet<string>;
  readonly showRedLetter: boolean;
}) {
  const { key, run, notes } = group;

  if (run.kind === BibleRunKind.Note) {
    return <NoteMark note={run} onToggle={() => onToggleNote(key)} open={openNotes.has(key)} />;
  }

  const selfMarked =
    run.kind === BibleRunKind.Christ && showRedLetter && marked && onToggleMarking !== undefined;
  const className = runClassNameOf(run, showRedLetter);

  if (!selfMarked && notes.length === 0) {
    return runText(run.text, className);
  }

  return (
    <GluedTail className={className} text={run.text}>
      {selfMarked ? <RedLetterMark onToggle={onToggleMarking} open={markingOpen} /> : null}
      <GlueNotes notes={notes} onToggleNote={onToggleNote} openNotes={openNotes} />
    </GluedTail>
  );
}

function RunSpans({
  baseKey,
  markedRuns,
  markingOpen = false,
  onToggleMarking,
  onToggleNote,
  openNotes,
  runs,
}: {
  readonly baseKey: string;
  readonly markedRuns?: ReadonlySet<string> | undefined;
  readonly markingOpen?: boolean;
  readonly onToggleMarking?: () => void;
  readonly onToggleNote: (key: string) => void;
  readonly openNotes: ReadonlySet<string>;
  readonly runs: readonly BibleRun[];
}) {
  const { preferences } = usePreferences();

  return (
    <>
      {renderGroupsFrom(baseKey, runs).map((group) => (
        <GluedRun
          key={group.key}
          group={group}
          marked={markedRuns?.has(group.key) === true}
          markingOpen={markingOpen}
          onToggleMarking={onToggleMarking}
          onToggleNote={onToggleNote}
          openNotes={openNotes}
          showRedLetter={preferences.showRedLetter}
        />
      ))}
    </>
  );
}

function OpenNotes({ entries }: { readonly entries: readonly NoteEntry[] }) {
  if (entries.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(({ key, note }) => (
        <div className="border-l-2 border-accent/35 pl-4" key={key}>
          <p className={`${APPARATUS_CLASS_NAME} text-muted`}>
            {note.keyword === undefined ? null : (
              <span className="small-caps text-secondary">{note.keyword} </span>
            )}
            {note.text}
          </p>
        </div>
      ))}
    </div>
  );
}

function NotedLine({
  className,
  heading = false,
  runs,
}: {
  readonly className: string;
  readonly heading?: boolean;
  readonly runs: readonly BibleRun[];
}) {
  const { openNotes, toggleNote } = useNoteToggles();
  const Line = heading ? 'h4' : 'p';

  return (
    <div className="flex flex-col gap-2">
      <Line className={className}>
        <RunSpans baseKey="line" onToggleNote={toggleNote} openNotes={openNotes} runs={runs} />
      </Line>
      <OpenNotes entries={noteEntriesFrom([{ baseKey: 'line', runs }], openNotes)} />
    </div>
  );
}

function VerseParagraph({
  markedRuns,
  onOpenSource,
  verses,
}: {
  readonly markedRuns: ReadonlySet<string> | undefined;
  readonly onOpenSource: (sourceId: string) => void;
  readonly verses: readonly BibleVerse[];
}) {
  const { openNotes, toggleNote } = useNoteToggles();
  const [noticeOpen, setNoticeOpen] = useState(false);
  const groups = verses.map((verse, index) => ({ baseKey: String(index), runs: verse.runs }));

  return (
    <div className="flex flex-col gap-2">
      <p className={READING_CLASS_NAME}>
        {verses.map((verse, index) => (
          <Fragment key={`verse-${String(index)}`}>
            {index > 0 ? ' ' : null}
            {verse.number === undefined ? null : (
              <span className={`${SUPERSCRIPT_CLASS_NAME} pr-1.5 text-accent-current`}>
                {verse.label ?? String(verse.number)}
              </span>
            )}
            <RunSpans
              baseKey={String(index)}
              markedRuns={markedRuns}
              markingOpen={noticeOpen}
              onToggleMarking={() => setNoticeOpen((current) => !current)}
              onToggleNote={toggleNote}
              openNotes={openNotes}
              runs={verse.runs}
            />
          </Fragment>
        ))}
      </p>
      <OpenNotes entries={noteEntriesFrom(groups, openNotes)} />
      {noticeOpen ? (
        <RedLetterNotice onOpenSource={onOpenSource} redLetter={contentCatalog.bible.redLetter} />
      ) : null}
    </div>
  );
}

const LINE_BLOCK_CLASS_NAME: Readonly<
  Record<Exclude<BibleBlockKind, BibleBlockKind.Paragraph>, string>
> = {
  [BibleBlockKind.SectionHeading]: `${SUBTITLE_CLASS_NAME} pt-2 text-muted`,
  [BibleBlockKind.PsalmTitle]: `${READING_CLASS_NAME} italic`,
  [BibleBlockKind.Acrostic]: `${SUBTITLE_CLASS_NAME} pt-2 text-accent-current`,
};

function BibleBlockView({
  block,
  markedRuns,
  onOpenSource,
}: {
  readonly block: BibleBlock;
  readonly markedRuns: ReadonlySet<string> | undefined;
  readonly onOpenSource: (sourceId: string) => void;
}) {
  if (block.kind === BibleBlockKind.Paragraph) {
    return (
      <VerseParagraph markedRuns={markedRuns} onOpenSource={onOpenSource} verses={block.verses} />
    );
  }

  return (
    <NotedLine
      className={LINE_BLOCK_CLASS_NAME[block.kind]}
      heading={block.kind === BibleBlockKind.SectionHeading}
      runs={block.runs}
    />
  );
}

function ChapterHead({ chapter }: { readonly chapter: BibleChapter }) {
  return (
    <div className="flex flex-col gap-2 pt-6">
      <h3 className={CHAPTER_CLASS_NAME}>{chapter.label}</h3>
      {chapter.summary === undefined ? null : (
        <NotedLine className={`${APPARATUS_CLASS_NAME} text-muted italic`} runs={chapter.summary} />
      )}
    </div>
  );
}

enum BookUnitKind {
  Chapter = 'chapter',
  Block = 'block',
}

type BookUnit =
  | { readonly kind: BookUnitKind.Chapter; readonly chapter: BibleChapter }
  | { readonly kind: BookUnitKind.Block; readonly block: BibleBlock };

const bookUnitsFrom = (book: BibleBook): readonly BookUnit[] =>
  book.chapters.flatMap((chapter): readonly BookUnit[] => [
    { kind: BookUnitKind.Chapter, chapter },
    ...chapter.blocks.map((block): BookUnit => ({ kind: BookUnitKind.Block, block })),
  ]);

const blockHoldsVerse = (block: BibleBlock, verse: number): boolean =>
  block.kind === BibleBlockKind.Paragraph &&
  block.verses.some((candidate) => candidate.number === verse);

const blockIndexForVerse = (
  units: readonly BookUnit[],
  location: BibleVerseLocation,
): number | null => {
  let chapterNumber: number | null = null;

  for (const [index, unit] of units.entries()) {
    if (unit.kind === BookUnitKind.Chapter) {
      chapterNumber = unit.chapter.number;
      continue;
    }

    if (chapterNumber === location.chapter && blockHoldsVerse(unit.block, location.verse)) {
      return index;
    }
  }

  return null;
};

const redStretchEndsFrom = (
  units: readonly BookUnit[],
): ReadonlyMap<number, ReadonlySet<string>> => {
  const ends = new Map<number, Set<string>>();
  const close = (end: RedStretchEnd): void => {
    const bucket = ends.get(end.unit) ?? new Set<string>();
    bucket.add(end.key);
    ends.set(end.unit, bucket);
  };
  let pending: RedStretchEnd | null = null;

  for (const [index, unit] of units.entries()) {
    if (unit.kind === BookUnitKind.Chapter) {
      if (pending !== null) {
        close(pending);
        pending = null;
      }
    } else if (unit.block.kind === BibleBlockKind.Paragraph) {
      pending = paragraphChristEnds(unit.block.verses, index, pending, close);
    }
  }

  if (pending !== null) {
    close(pending);
  }

  return ends;
};

const chapterJumpsFrom = (units: readonly BookUnit[]): readonly ReaderJump[] =>
  units.flatMap((unit, index) =>
    unit.kind === BookUnitKind.Chapter && unit.chapter.number > 0
      ? [{ blockIndex: index, label: String(unit.chapter.number) }]
      : [],
  );

const bibleLocationOf = (
  units: readonly BookUnit[],
  bookName: string,
  blockIndex: number,
): string => {
  let chapter = 0;

  for (const [index, unit] of units.entries()) {
    if (index > blockIndex) {
      break;
    }

    if (unit.kind === BookUnitKind.Chapter) {
      chapter = unit.chapter.number;
    }
  }

  if (chapter <= 0) {
    return bookName;
  }

  const unit = units[blockIndex];
  const verse =
    unit?.kind === BookUnitKind.Block && unit.block.kind === BibleBlockKind.Paragraph
      ? unit.block.verses.find((entry) => entry.number !== undefined)?.number
      : undefined;

  return verse === undefined
    ? `${bookName} ${String(chapter)}`
    : `${bookName} ${String(chapter)}:${String(verse)}`;
};

function ChapterNav({
  articleRef,
  jumps,
}: {
  readonly articleRef: RefObject<HTMLElement | null>;
  readonly jumps: readonly ReaderJump[];
}) {
  if (jumps.length < 2) {
    return null;
  }

  return (
    <nav aria-label="Chapters" className="flex flex-wrap justify-center gap-x-1 pb-8">
      <JumpButtons
        ariaLabelOf={(jump) => `Chapter ${jump.label}`}
        articleRef={articleRef}
        jumps={jumps}
      />
    </nav>
  );
}

const useBibleBook = (bookId: string): BibleBook | null => {
  const [book, setBook] = useState<BibleBook | null>(null);

  useEffect(() => {
    let active = true;
    setBook(null);
    void saveLastBibleBook(bookId);
    void loadBibleBook(bookId).then((loaded) => {
      if (active) {
        setBook(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, [bookId]);

  return book;
};

function BookPager({
  book,
  onOpenBook,
}: {
  readonly book: BibleBook;
  readonly onOpenBook: (bookId: string) => void;
}) {
  const books = contentCatalog.bible.books;
  const position = books.findIndex((entry) => entry.id === book.id);
  const previous = position > 0 ? books[position - 1] : undefined;
  const next = position < 0 ? undefined : books[position + 1];

  return (
    <nav
      aria-label="Neighboring books"
      className="flex items-baseline justify-between gap-4 border-t border-hairline pt-6"
    >
      {previous === undefined ? (
        <span aria-hidden="true" />
      ) : (
        <button
          className={`${QUIET_BUTTON_CLASS_NAME} text-left`}
          onClick={() => onOpenBook(previous.id)}
          type="button"
        >
          Previous: {previous.name}
        </button>
      )}
      {next === undefined ? null : (
        <button
          className={`${QUIET_BUTTON_CLASS_NAME} text-right`}
          onClick={() => onOpenBook(next.id)}
          type="button"
        >
          Next: {next.name}
        </button>
      )}
    </nav>
  );
}

function BookUnitList({
  onOpenSource,
  units,
}: {
  readonly onOpenSource: (sourceId: string) => void;
  readonly units: readonly BookUnit[];
}) {
  const markEnds = useMemo(() => redStretchEndsFrom(units), [units]);

  return (
    <>
      {units.map((unit, index) => (
        <div key={`unit-${String(index)}`} {...blockIndexPropsOf(index)}>
          {unit.kind === BookUnitKind.Chapter ? (
            <ChapterHead chapter={unit.chapter} />
          ) : (
            <BibleBlockView
              block={unit.block}
              markedRuns={markEnds.get(index)}
              onOpenSource={onOpenSource}
            />
          )}
        </div>
      ))}
    </>
  );
}

function BookBody({
  book,
  initialBlockIndex,
  model,
  onOpenBook,
  onOpenSource,
}: {
  readonly book: BibleBook;
  readonly initialBlockIndex: number | null;
  readonly model: BibleBookModel;
  readonly onOpenBook: (bookId: string) => void;
  readonly onOpenSource: (sourceId: string) => void;
}) {
  const { articleRef, tracker, units } = model;

  useReadingPosition(
    `${contentCatalog.bible.source.id}/${book.id}`,
    articleRef,
    initialBlockIndex,
    tracker,
  );

  return (
    <>
      {book.introduction === undefined ? null : (
        <NotedLine
          className={`${APPARATUS_CLASS_NAME} text-muted italic`}
          runs={book.introduction}
        />
      )}
      <BookUnitList onOpenSource={onOpenSource} units={units} />
      <BookPager book={book} onOpenBook={onOpenBook} />
    </>
  );
}

type BibleFocusProps = {
  readonly bookId: string;
  readonly initialBlockIndex: number | null;
  readonly initialVerse: BibleVerseLocation | null;
  readonly onBack: () => void;
  readonly onOpenBook: (bookId: string) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onOpenSettings: () => void;
};

const useBibleBookModel = (bookId: string) => {
  const book = useBibleBook(bookId);
  const headingRef = useHeadingFocus(bookId);
  const articleRef = useRef<HTMLElement>(null);
  const units = useMemo(() => (book === null ? [] : bookUnitsFrom(book)), [book]);
  const jumps = useMemo(() => chapterJumpsFrom(units), [units]);
  const tracker = useTopmostTracker(articleRef, book);
  const bookSummary = contentCatalog.bible.books.find((entry) => entry.id === bookId);

  return {
    articleRef,
    book,
    bookName: bookSummary?.name ?? bookId,
    headingRef,
    jumps,
    tracker,
    units,
  };
};

type BibleBookModel = ReturnType<typeof useBibleBookModel>;

function BibleLocation({ model }: { readonly model: BibleBookModel }) {
  return (
    <ReaderLocationControl
      articleRef={model.articleRef}
      headingRef={model.headingRef}
      jumps={model.jumps}
      labelOf={(blockIndex) => bibleLocationOf(model.units, model.bookName, blockIndex)}
      tracker={model.tracker}
    />
  );
}

export function BibleFocus({
  bookId,
  initialBlockIndex,
  initialVerse,
  onBack,
  onOpenBook,
  onOpenReference,
  onOpenSettings,
}: BibleFocusProps) {
  const model = useBibleBookModel(bookId);
  const { articleRef, book, bookName, headingRef, jumps } = model;
  const onOpenSource = (sourceId: string): void =>
    onOpenReference(apparatusReferenceTarget(sourceId));
  const resolvedBlockIndex =
    initialBlockIndex ??
    (book === null || initialVerse === null ? null : blockIndexForVerse(model.units, initialVerse));

  return (
    <ReaderSurface
      articleRef={articleRef}
      location={book === null ? undefined : <BibleLocation model={model} />}
      onBack={onBack}
      onOpenSettings={onOpenSettings}
    >
      <ReaderHeader
        eyebrow={BIBLE_TITLE}
        headingRef={headingRef}
        subtitle={book?.title}
        title={bookName}
      />
      {book === null ? null : <ChapterNav articleRef={articleRef} jumps={jumps} />}
      {book === null ? null : (
        <BookBody
          book={book}
          initialBlockIndex={resolvedBlockIndex}
          model={model}
          onOpenBook={onOpenBook}
          onOpenSource={onOpenSource}
        />
      )}
    </ReaderSurface>
  );
}
