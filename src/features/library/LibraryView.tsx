import { Shelf, ViewHeader } from '../../components/layout.tsx';
import type { ResolvedLibraryWork } from '../../content/catalog.ts';
import { readingEditionsOf, type BibleEditionId } from '../../content/language.ts';
import { loadLibrary, useLoaded } from '../../content/loaders.ts';
import { useReading } from '../../content/reading.ts';
import { LibraryCategory } from '../../content/schema.ts';
import { usePreferences } from '../../state/preferences/usePreferences.ts';
import { CAPTION_CAPS_CLASS_NAME, NAV_CLASS_NAME } from '../../styles.ts';
import { BIBLE_EDITION_LABEL, BIBLE_TITLE, LIBRARY_CATEGORY_LABEL } from './model.ts';

const LIBRARY_TITLE_ID = 'library-title';

type LibraryViewProps = {
  readonly onOpenBible: (edition: BibleEditionId) => void;
  readonly onOpenWork: (workId: string) => void;
};

function LibraryHeader() {
  const { wording } = useReading();
  return (
    <ViewHeader
      className="gap-2 pt-2"
      eyebrow={wording.library.eyebrow}
      id={LIBRARY_TITLE_ID}
      title={wording.library.title}
    />
  );
}

function ShelfCard({
  detail,
  onOpen,
  title,
}: {
  readonly detail: string;
  readonly onOpen: () => void;
  readonly title: string;
}) {
  return (
    <li className="flex aspect-2/3 w-[clamp(10rem,22cqi,13rem)] shrink-0 self-start">
      <button
        className="edge-lit flex size-full flex-col gap-3 overflow-hidden rounded-xl bg-surface p-4 text-left transition-colors hover:ring-2 hover:ring-accent focus-ring"
        onClick={onOpen}
        type="button"
      >
        <span aria-hidden="true" className="h-1 w-10 shrink-0 rounded-full bg-accent" />
        <span className={`${NAV_CLASS_NAME} font-medium text-foreground`}>{title}</span>
        <span className={`mt-auto ${CAPTION_CAPS_CLASS_NAME} text-muted`}>{detail}</span>
      </button>
    </li>
  );
}

type WorkCardProps = {
  readonly onOpenWork: (workId: string) => void;
  readonly work: ResolvedLibraryWork;
};

function WorkCard({ onOpenWork, work }: WorkCardProps) {
  return <ShelfCard detail={work.author} onOpen={() => onOpenWork(work.id)} title={work.title} />;
}

type LibraryShelfProps = {
  readonly label: string;
  readonly onOpenBible?: (edition: BibleEditionId) => void;
  readonly onOpenWork: (workId: string) => void;
  readonly works: readonly ResolvedLibraryWork[];
};

function LibraryShelf({ label, onOpenBible, onOpenWork, works }: LibraryShelfProps) {
  const reading = useReading();
  return (
    <Shelf heading={label} items={works} label={label}>
      {onOpenBible === undefined
        ? null
        : readingEditionsOf(reading.language).map((edition) => (
            <ShelfCard
              key={edition}
              detail={BIBLE_EDITION_LABEL(reading)[edition]}
              onOpen={() => onOpenBible(edition)}
              title={BIBLE_TITLE(reading)}
            />
          ))}
      {works.map((work) => (
        <WorkCard key={work.id} onOpenWork={onOpenWork} work={work} />
      ))}
    </Shelf>
  );
}

export function LibraryView({ onOpenBible, onOpenWork }: LibraryViewProps) {
  const reading = useReading();
  const library = useLoaded(loadLibrary(reading));
  const { preferences } = usePreferences();
  const shelves = Object.values(LibraryCategory)
    .map((category) => ({
      category,
      works: (library?.works ?? []).filter(
        (work) =>
          work.category === category &&
          (work.translation === undefined || preferences.aiTranslations),
      ),
    }))
    .filter((shelf) => shelf.works.length > 0 || shelf.category === LibraryCategory.Scripture);

  return (
    <section
      aria-labelledby={LIBRARY_TITLE_ID}
      className="scroll-region flex min-h-0 w-full flex-1 flex-col overflow-y-auto"
    >
      <div className="flex w-full flex-col gap-4 px-1 pb-4">
        <LibraryHeader />

        <div className="flex min-w-0 flex-col gap-9">
          {shelves.map((shelf) => (
            <LibraryShelf
              key={shelf.category}
              label={LIBRARY_CATEGORY_LABEL(reading)[shelf.category]}
              onOpenWork={onOpenWork}
              works={shelf.works}
              {...(shelf.category === LibraryCategory.Scripture ? { onOpenBible } : {})}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
