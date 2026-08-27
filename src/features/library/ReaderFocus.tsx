import { useRef } from 'react';
import { contentCatalog, type ResolvedLibraryWork } from '../../content/catalog.ts';
import {
  LibraryBlockKind,
  LibraryHeadingLevel,
  type LibraryBlock,
  type LibraryHeading,
  type LibraryParagraph,
  type LibraryVerse,
} from '../../content/schema.ts';
import {
  CHAPTER_CLASS_NAME,
  READING_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { LIBRARY_CATEGORY_LABEL } from './model.ts';
import { ReaderHeader } from './ReaderHeader.tsx';
import { ReaderLocationControl, type ReaderJump } from './ReaderLocation.tsx';
import { ReaderColophon, ReaderSurface } from './ReaderSurface.tsx';
import { useHeadingFocus } from './useHeadingFocus.ts';
import { blockIndexPropsOf, useReadingPosition, useTopmostTracker } from './useReadingPosition.ts';

const DEDICATION_BAR_CLASS_NAME: Readonly<Record<string, string>> = {
  'A White Rose': 'bg-rose-white',
  'A Red Rose': 'bg-rose-red',
  'A Mystical Rose Tree': 'bg-rose-tree',
  'A Rosebud': 'bg-rose-bud',
};

function PartHeading({ block }: { readonly block: LibraryHeading }) {
  return (
    <div className="flex flex-col gap-3 pt-8">
      <span
        aria-hidden="true"
        className={`h-1 w-12 rounded-full ring-1 ring-border ${DEDICATION_BAR_CLASS_NAME[block.text] ?? 'bg-accent'}`}
      />
      <h2 className={TITLE_CLASS_NAME}>{block.text}</h2>
    </div>
  );
}

function ReaderHeading({ block }: { readonly block: LibraryHeading }) {
  if (block.level === LibraryHeadingLevel.Part) {
    return <PartHeading block={block} />;
  }

  if (block.level === LibraryHeadingLevel.Chapter) {
    return <h3 className={`pt-6 ${CHAPTER_CLASS_NAME}`}>{block.text}</h3>;
  }

  return <h4 className={`${SUBTITLE_CLASS_NAME} text-muted`}>{block.text}</h4>;
}

function ReaderParagraph({ block }: { readonly block: LibraryParagraph }) {
  return (
    <p className={READING_CLASS_NAME}>
      {block.number === undefined ? null : (
        <span className="pr-2 text-accent-current">{block.number}.</span>
      )}
      {block.text}
    </p>
  );
}

function ReaderVerse({ block }: { readonly block: LibraryVerse }) {
  return (
    <div className={`flex flex-col border-l-2 border-accent/35 pl-4 italic ${READING_CLASS_NAME}`}>
      {block.lines.map((line, index) => (
        <span key={`${index}-${line}`}>{line}</span>
      ))}
    </div>
  );
}

function ReaderBlock({ block }: { readonly block: LibraryBlock }) {
  if (block.kind === LibraryBlockKind.Heading) {
    return <ReaderHeading block={block} />;
  }

  if (block.kind === LibraryBlockKind.Verse) {
    return <ReaderVerse block={block} />;
  }

  return <ReaderParagraph block={block} />;
}

const isShortChapter = (block: LibraryBlock): block is LibraryHeading & { short: string } =>
  block.kind === LibraryBlockKind.Heading &&
  block.level === LibraryHeadingLevel.Chapter &&
  block.short !== undefined;

const sectionJumpsFrom = (work: ResolvedLibraryWork): readonly ReaderJump[] =>
  work.blocks.flatMap((block, index) => {
    if (isShortChapter(block)) {
      return [{ blockIndex: index, label: block.short }];
    }

    if (block.kind === LibraryBlockKind.Heading && block.level === LibraryHeadingLevel.Part) {
      return [{ blockIndex: index, label: block.text, part: true }];
    }

    return [];
  });

const workLocationOf = (work: ResolvedLibraryWork, blockIndex: number): string => {
  let label = work.title;

  for (const [index, block] of work.blocks.entries()) {
    if (index > blockIndex) {
      break;
    }

    if (isShortChapter(block)) {
      label = block.short;
    } else if (
      block.kind === LibraryBlockKind.Heading &&
      block.level === LibraryHeadingLevel.Part
    ) {
      label = block.text;
    }
  }

  return label;
};

export function ReaderFocus({
  initialBlockIndex,
  onBack,
  onOpenSettings,
  workId,
}: {
  readonly initialBlockIndex: number | null;
  readonly onBack: () => void;
  readonly onOpenSettings: () => void;
  readonly workId: string;
}) {
  const work = contentCatalog.libraryWorkById(workId);
  const headingRef = useHeadingFocus(workId);
  const articleRef = useRef<HTMLElement>(null);
  const tracker = useTopmostTracker(articleRef, work);
  const jumps = sectionJumpsFrom(work);
  useReadingPosition(workId, articleRef, initialBlockIndex, tracker);

  return (
    <ReaderSurface
      articleRef={articleRef}
      location={
        jumps.length < 2 ? undefined : (
          <ReaderLocationControl
            articleRef={articleRef}
            headingRef={headingRef}
            jumps={jumps}
            labelOf={(blockIndex) => workLocationOf(work, blockIndex)}
            tracker={tracker}
          />
        )
      }
      onBack={onBack}
      onOpenSettings={onOpenSettings}
    >
      <ReaderHeader
        eyebrow={LIBRARY_CATEGORY_LABEL[work.category]}
        headingRef={headingRef}
        subtitle={work.author}
        title={work.title}
      />
      {work.blocks.map((block, index) => (
        <div key={`${block.kind}-${index}`} {...blockIndexPropsOf(index)}>
          <ReaderBlock block={block} />
        </div>
      ))}
      <ReaderColophon source={work.source} />
    </ReaderSurface>
  );
}
