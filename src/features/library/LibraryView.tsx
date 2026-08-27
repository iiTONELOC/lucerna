import { contentCatalog, type ResolvedLibraryWork } from '../../content/catalog.ts';
import { LibraryCategory } from '../../content/schema.ts';
import { TrackEdgeControls } from '../../components/TrackEdgeControls.tsx';
import { useHorizontalTrack } from '../../shared/useHorizontalTrack.ts';
import {
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  HORIZONTAL_TRACK_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { BIBLE_EDITION, BIBLE_TITLE, LIBRARY_CATEGORY_LABEL } from './model.ts';

const LIBRARY_TITLE_ID = 'library-title';
const TRACK_CLASS_NAME = `${HORIZONTAL_TRACK_CLASS_NAME} list-none items-start gap-4`;

type LibraryViewProps = {
  readonly onOpenBible: () => void;
  readonly onOpenWork: (workId: string) => void;
};

function LibraryHeader() {
  return (
    <header className="flex flex-col gap-2 pt-2">
      <p className={EYEBROW_CLASS_NAME}>Texts for prayer and study</p>
      <h1 className={TITLE_CLASS_NAME} id={LIBRARY_TITLE_ID}>
        The Library
      </h1>
    </header>
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
        <span className="font-display text-nav leading-nav font-medium text-foreground">
          {title}
        </span>
        <span className={`small-caps mt-auto ${CITATION_CLASS_NAME} text-muted`}>{detail}</span>
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
  readonly onOpenBible?: () => void;
  readonly onOpenWork: (workId: string) => void;
  readonly works: readonly ResolvedLibraryWork[];
};

function LibraryShelf({ label, onOpenBible, onOpenWork, works }: LibraryShelfProps) {
  const { edges, handlers, scrollByPage, trackRef } = useHorizontalTrack<HTMLUListElement>(works);

  return (
    <section className="@container/library group relative flex min-w-0 flex-col gap-3">
      <h2 className={`${TITLE_CLASS_NAME} border-b border-hairline pb-2`}>{label}</h2>
      <ul aria-label={label} className={TRACK_CLASS_NAME} ref={trackRef} {...handlers}>
        {onOpenBible === undefined ? null : (
          <ShelfCard detail={BIBLE_EDITION} onOpen={onOpenBible} title={BIBLE_TITLE} />
        )}
        {works.map((work) => (
          <WorkCard key={work.id} onOpenWork={onOpenWork} work={work} />
        ))}
      </ul>

      <TrackEdgeControls edges={edges} onStep={scrollByPage} />
    </section>
  );
}

export function LibraryView({ onOpenBible, onOpenWork }: LibraryViewProps) {
  const shelves = Object.values(LibraryCategory)
    .map((category) => ({
      category,
      works: contentCatalog.libraryWorks.filter((work) => work.category === category),
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
              label={LIBRARY_CATEGORY_LABEL[shelf.category]}
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
