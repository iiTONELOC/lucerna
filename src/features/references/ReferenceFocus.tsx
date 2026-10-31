import { useCallback, useState, type RefObject } from 'react';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { DetailList, FocusPage, type DetailRow } from '../../components/layout.tsx';
import { ExternalLink } from '../../components/links/ExternalLink.tsx';
import { contentCatalog, type ResolvedArtwork } from '../../content/catalog.ts';
import type { DevotionalSource, SourceReference } from '../../content/schema.ts';
import { classNames } from '../../shared/classNames.ts';
import { useFocusPage } from '../../shared/focus.ts';
import {
  ACCENT_BUTTON_CLASS_NAME,
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  INLINE_LINK_CLASS_NAME,
  NAV_CLASS_NAME,
  READING_CLASS_NAME,
  SURFACE_PANEL_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { ArtworkViewer, FramedArtwork } from '../gallery/ArtworkViewer.tsx';
import type { BibleVerseLocation } from '../library/model.ts';
import type { PrayerStart } from '../prayer/progression.ts';
import {
  ReferenceGroup,
  referenceGroupLabel,
  referenceTargetKey,
  type ReadingLocation,
  type ReferenceTarget,
} from './referenceCatalog.ts';
import {
  COMPACT_USE_KINDS,
  ReferenceUseActionKind,
  sectionsLabel,
  usesOfArtwork,
  usesOfSource,
  type ReferenceUseAction,
  type ReferenceUseGroup,
  type ReferenceUseRow,
  type ReferenceUseSection,
} from './referenceUses.ts';

export type ReferenceActions = {
  readonly onOpenBible: () => void;
  readonly onOpenBibleVerse: (bookId: string, verse: BibleVerseLocation) => void;
  readonly onOpenReading: (location: ReadingLocation) => void;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly onPray: (mysterySetId: string | undefined, start: PrayerStart) => void;
  readonly onShowSet: (mysterySetId: string) => void;
};

type Link = readonly [label: string, href: string | undefined];

const NOTE_CLASS_NAME = `${CITATION_CLASS_NAME} text-muted`;
const CAPS_NOTE_CLASS_NAME = `${NOTE_CLASS_NAME} small-caps`;
const ROW_CLASS_NAME = 'flex w-full items-baseline gap-4 border-b border-hairline py-2 text-left';
const CHIP_CLASS_NAME =
  'focus-ring flex min-h-11 flex-col justify-center rounded-lg border border-outline px-4 py-1 text-left transition-colors hover:border-accent/60 disabled:cursor-default';

const runAction = (action: ReferenceUseAction, actions: ReferenceActions): void => {
  switch (action.kind) {
    case ReferenceUseActionKind.Pray:
      actions.onPray(action.mysterySetId, action.start);
      return;
    case ReferenceUseActionKind.ShowSet:
      actions.onShowSet(action.mysterySetId);
      return;
    case ReferenceUseActionKind.OpenReference:
      actions.onOpenReference(action.target);
      return;
    case ReferenceUseActionKind.OpenBible:
      actions.onOpenBible();
      return;
    case ReferenceUseActionKind.Read:
      actions.onOpenReading(action.location);
      return;
    case ReferenceUseActionKind.OpenScripture:
      actions.onOpenBibleVerse(action.bookId, action.verse);
  }
};

const artworkOf = (target: ReferenceTarget): ResolvedArtwork | undefined =>
  target.group === ReferenceGroup.Artwork
    ? contentCatalog.artworkById(target.artworkId)
    : undefined;

const sourceRows = (source: DevotionalSource): readonly DetailRow[] => [
  ['Author', source.author],
  ['Purpose', source.note],
  ['Translator', source.translator],
  ['Publisher', source.publisher],
  ['Published', source.published],
];

const sourceLinks = (source: DevotionalSource): readonly Link[] => [
  ['Open original source', source.url],
  ['Open alternate text', source.citationUrl],
  ['Open renewal search', source.renewalSearchUrl],
];

const artworkLinks = (artwork: ResolvedArtwork): readonly Link[] => [
  ['Open original source', artwork.url],
  ['Open rights policy', artwork.source.url],
  ['Open dating source', artwork.dateSource],
];

function SourceLinks({ links }: { readonly links: readonly Link[] }) {
  const present = links.filter((link): link is readonly [string, string] => link[1] !== undefined);

  return (
    <nav aria-label="External source links" className="flex flex-wrap items-center gap-x-6 gap-y-2">
      {present.map(([label, href], index) => (
        <ExternalLink
          className={index === 0 ? ACCENT_BUTTON_CLASS_NAME : INLINE_LINK_CLASS_NAME}
          href={href}
          key={label}
        >
          {label}
        </ExternalLink>
      ))}
    </nav>
  );
}

function RecordPlate({
  headingRef,
  source,
  target,
}: {
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly source: DevotionalSource;
  readonly target: ReferenceTarget;
}) {
  return (
    <header
      className={classNames(
        SURFACE_PANEL_CLASS_NAME,
        'relative isolate overflow-hidden bg-radial-[at_0%_0%] from-accent/15 to-surface to-70% p-7',
      )}
    >
      <span
        aria-hidden="true"
        className="absolute inset-y-0 right-7 -z-10 flex items-center font-display text-[calc(var(--text-title)*4)] leading-none text-accent/15 italic"
      >
        {source.work.charAt(0)}
      </span>
      <p className={EYEBROW_CLASS_NAME}>{referenceGroupLabel(target.group)}</p>
      <h1 className={`${TITLE_CLASS_NAME} pt-2 focus:outline-none`} ref={headingRef} tabIndex={-1}>
        {source.work}
      </h1>
      <p className={`${BODY_CLASS_NAME} pt-1 text-secondary italic`}>{source.author}</p>
    </header>
  );
}

function ArtworkHeader({
  artwork,
  headingRef,
  onExpand,
}: {
  readonly artwork: ResolvedArtwork;
  readonly headingRef: RefObject<HTMLHeadingElement | null>;
  readonly onExpand: () => void;
}) {
  const placard: readonly DetailRow[] = [
    ['Date', artwork.date],
    ['Collection', artwork.holder],
    ['Accession', artwork.accession],
    ['Photograph', artwork.photographer],
    ['Rights', artwork.source.approval],
  ];

  return (
    <header
      className={classNames(
        SURFACE_PANEL_CLASS_NAME,
        'flex flex-col gap-6 p-4 @3xl:flex-row @3xl:items-center @3xl:gap-12 @3xl:p-7',
      )}
    >
      <div className="flex flex-1 justify-center rounded-lg bg-background/50 p-4 @3xl:p-6">
        <FramedArtwork
          artwork={artwork}
          className="aspect-(--artwork-aspect) w-[min(100%,calc(var(--spacing)*136*var(--artwork-aspect)))]"
          onExpand={onExpand}
        />
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-6">
        <div>
          <p className={EYEBROW_CLASS_NAME}>{referenceGroupLabel(ReferenceGroup.Artwork)}</p>
          <h1
            className={`${TITLE_CLASS_NAME} pt-2 focus:outline-none`}
            ref={headingRef}
            tabIndex={-1}
          >
            {artwork.title}
          </h1>
          <p className={`${BODY_CLASS_NAME} pt-1 text-secondary italic`}>{artwork.artist}</p>
        </div>
        <DetailList
          className="gap-x-0! gap-y-0! border-t border-hairline *:border-b *:border-hairline *:py-3 [&>dd]:pl-5 [&>dd]:text-body [&>dd]:leading-body [&>dd]:text-foreground"
          rows={placard}
        />
        <SourceLinks links={artworkLinks(artwork)} />
      </div>
    </header>
  );
}

function CitedLocation({
  onOpenReading,
  target,
}: {
  readonly onOpenReading: (location: ReadingLocation) => void;
  readonly target: ReferenceTarget;
}) {
  if (target.group === ReferenceGroup.Artwork || target.locator === undefined) {
    return null;
  }

  const { quote, reading, sections } = target;

  return (
    <section className="flex flex-col gap-2">
      <h2 className={EYEBROW_CLASS_NAME}>Cited location</h2>
      <div className="flex flex-col gap-2 border-l-2 border-accent-current pl-4">
        {quote === undefined ? null : <p className={READING_CLASS_NAME}>{quote}</p>}
        <div className="flex flex-wrap items-baseline gap-x-4">
          <span className={CAPS_NOTE_CLASS_NAME}>{target.locator}</span>
          {sections === undefined ? null : (
            <span className={NOTE_CLASS_NAME}>{sectionsLabel(sections)}</span>
          )}
          {reading === undefined ? null : (
            <button
              className={INLINE_LINK_CLASS_NAME}
              onClick={() => onOpenReading(reading)}
              type="button"
            >
              View in the Library
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

const supportingKey = (reference: SourceReference): string =>
  `${reference.sourceId}:${reference.locator}:${reference.sections?.join(',') ?? ''}`;

function SupportingCitations({ target }: { readonly target: ReferenceTarget }) {
  if (target.group === ReferenceGroup.Artwork || (target.supportingReferences?.length ?? 0) < 2) {
    return null;
  }

  return (
    <section className="flex flex-col gap-3">
      <h2 className={EYEBROW_CLASS_NAME}>Supporting citations</h2>
      {target.supportingReferences?.map((reference) => (
        <div className="border-l border-hairline pl-3" key={supportingKey(reference)}>
          <p className={`${CITATION_CLASS_NAME} text-secondary`}>
            {contentCatalog.sourceById(reference.sourceId).work}
          </p>
          <p className={NOTE_CLASS_NAME}>{reference.locator}</p>
        </div>
      ))}
    </section>
  );
}

function UseRowFace({ group, row }: { readonly group?: string; readonly row: ReferenceUseRow }) {
  return (
    <>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        {group === undefined ? null : <span className={CAPS_NOTE_CLASS_NAME}>{group}</span>}
        <span className={`${NAV_CLASS_NAME} text-foreground`}>{row.title}</span>
        {row.detail === undefined ? null : <span className={NOTE_CLASS_NAME}>{row.detail}</span>}
      </span>
      {row.trailing === undefined ? null : (
        <span className={`${NOTE_CLASS_NAME} shrink-0`}>{row.trailing}</span>
      )}
      {group === undefined ? null : (
        <Chevron
          className="size-4 shrink-0 self-center text-muted"
          direction={ChevronDirection.Right}
        />
      )}
    </>
  );
}

function UseRowItem({
  actions,
  current,
  group,
  row,
}: {
  readonly actions: ReferenceActions;
  readonly current: boolean;
  readonly group?: string;
  readonly row: ReferenceUseRow;
}) {
  const { action } = row;
  const className = classNames(ROW_CLASS_NAME, current && 'rounded-md bg-accent/15 px-2');

  return (
    <li>
      {action === undefined ? (
        <div className={className}>
          <UseRowFace row={row} {...(group === undefined ? {} : { group })} />
        </div>
      ) : (
        <button
          className={classNames(className, 'focus-ring transition-colors hover:text-accent')}
          onClick={() => runAction(action, actions)}
          type="button"
        >
          <UseRowFace row={row} {...(group === undefined ? {} : { group })} />
        </button>
      )}
    </li>
  );
}

function UseRows({
  actions,
  currentLocator,
  rows,
}: {
  readonly actions: ReferenceActions;
  readonly currentLocator: string | undefined;
  readonly rows: readonly ReferenceUseRow[];
}) {
  return (
    <ul className="flex flex-col">
      {rows.map((row) => (
        <UseRowItem
          actions={actions}
          current={row.locator !== undefined && row.locator === currentLocator}
          key={row.key}
          row={row}
        />
      ))}
    </ul>
  );
}

function UseChips({
  actions,
  rows,
}: {
  readonly actions: ReferenceActions;
  readonly rows: readonly ReferenceUseRow[];
}) {
  return (
    <ul className="flex flex-wrap gap-2">
      {rows.map((row) => (
        <li key={row.key}>
          <button
            className={CHIP_CLASS_NAME}
            disabled={row.action === undefined}
            onClick={() => {
              if (row.action !== undefined) {
                runAction(row.action, actions);
              }
            }}
            type="button"
          >
            <span className={`${NAV_CLASS_NAME} text-foreground`}>{row.title}</span>
            {row.detail === undefined ? null : (
              <span className={NOTE_CLASS_NAME}>{row.detail}</span>
            )}
          </button>
        </li>
      ))}
    </ul>
  );
}

function UseFold({
  actions,
  currentLocator,
  group,
  initiallyOpen,
}: {
  readonly actions: ReferenceActions;
  readonly currentLocator: string | undefined;
  readonly group: ReferenceUseGroup;
  readonly initiallyOpen: boolean;
}) {
  const [open, setOpen] = useState(initiallyOpen);

  return (
    <div className="rounded-lg border border-outline px-4">
      <button
        aria-expanded={open}
        className={classNames(
          'focus-ring flex min-h-11 w-full items-center justify-between gap-4 text-left',
          NAV_CLASS_NAME,
          open ? 'text-accent-current' : 'text-foreground',
        )}
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        {group.label}
        <Chevron
          className="size-4 shrink-0 text-muted"
          direction={open ? ChevronDirection.Down : ChevronDirection.Right}
        />
      </button>
      {open ? (
        <UseRows actions={actions} currentLocator={currentLocator} rows={group.rows} />
      ) : null}
    </div>
  );
}

const openGroupKeyOf = (
  section: ReferenceUseSection,
  currentLocator: string | undefined,
): string | undefined =>
  (
    section.groups.find((group) => group.rows.some(({ locator }) => locator === currentLocator)) ??
    section.groups[0]
  )?.mysterySetId;

function UseSection({
  actions,
  currentLocator,
  labelled,
  section,
}: {
  readonly actions: ReferenceActions;
  readonly currentLocator: string | undefined;
  readonly labelled: boolean;
  readonly section: ReferenceUseSection;
}) {
  const openKey = openGroupKeyOf(section, currentLocator);

  return (
    <section className="flex flex-col gap-2">
      {labelled ? <h3 className={CAPS_NOTE_CLASS_NAME}>{section.kind}</h3> : null}
      {section.groups.map((group) => {
        if (group.mysterySetId !== undefined) {
          return (
            <UseFold
              actions={actions}
              currentLocator={currentLocator}
              group={group}
              initiallyOpen={group.mysterySetId === openKey}
              key={group.mysterySetId}
            />
          );
        }

        return COMPACT_USE_KINDS.has(section.kind) ? (
          <UseChips actions={actions} key={section.kind} rows={group.rows} />
        ) : (
          <UseRows
            actions={actions}
            currentLocator={currentLocator}
            key={section.kind}
            rows={group.rows}
          />
        );
      })}
    </section>
  );
}

function ArtworkUses({
  actions,
  sections,
}: {
  readonly actions: ReferenceActions;
  readonly sections: readonly ReferenceUseSection[];
}) {
  const rows = sections.flatMap((section) =>
    section.groups.flatMap((group) =>
      group.rows.map((row) => ({ group: group.label ?? 'Prayer', row })),
    ),
  );

  return (
    <ul className="flex flex-col border-t border-hairline">
      {rows.map(({ group, row }) => (
        <UseRowItem
          actions={actions}
          current={false}
          group={group}
          key={`${group}:${row.key}`}
          row={row}
        />
      ))}
    </ul>
  );
}

function ReferenceUses({
  actions,
  target,
}: {
  readonly actions: ReferenceActions;
  readonly target: ReferenceTarget;
}) {
  const artwork = target.group === ReferenceGroup.Artwork;
  const sections = artwork ? usesOfArtwork(target.artworkId) : usesOfSource(target.sourceId);
  const currentLocator = artwork ? undefined : target.locator;

  if (sections.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-col gap-4">
      <h2 className={EYEBROW_CLASS_NAME}>Where Lucerna uses it</h2>
      {artwork ? (
        <ArtworkUses actions={actions} sections={sections} />
      ) : (
        sections.map((section) => (
          <UseSection
            actions={actions}
            currentLocator={currentLocator}
            key={section.kind}
            labelled={sections.length > 1}
            section={section}
          />
        ))
      )}
    </section>
  );
}

function RecordPanel({ source }: { readonly source: DevotionalSource }) {
  return (
    <aside
      aria-label="Record"
      className={`${SURFACE_PANEL_CLASS_NAME} flex flex-col gap-4 p-5 @3xl:w-80 @3xl:shrink-0`}
    >
      <h2 className={EYEBROW_CLASS_NAME}>Record</h2>
      <DetailList rows={sourceRows(source)} />
      {source.approval === undefined ? null : (
        <p className={`${CITATION_CLASS_NAME} rounded-lg border border-outline p-3 text-secondary`}>
          {source.approval}
        </p>
      )}
      <SourceLinks links={sourceLinks(source)} />
    </aside>
  );
}

function RecordMain({
  actions,
  target,
}: {
  readonly actions: ReferenceActions;
  readonly target: ReferenceTarget;
}) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-8">
      <CitedLocation onOpenReading={actions.onOpenReading} target={target} />
      <SupportingCitations target={target} />
      <ReferenceUses actions={actions} target={target} />
    </div>
  );
}

export function ReferenceFocus({
  onBack,
  target,
  ...actions
}: ReferenceActions & {
  readonly onBack: () => void;
  readonly target: ReferenceTarget;
}) {
  const source = contentCatalog.sourceById(target.sourceId);
  const artwork = artworkOf(target);
  const targetKey = referenceTargetKey(target);
  const [fullSize, setFullSize] = useState(false);
  const closeViewer = useCallback(() => setFullSize(false), []);
  const headingRef = useFocusPage(fullSize ? closeViewer : onBack, targetKey);
  const columnClassName = classNames(
    'mx-auto w-full px-4 sm:px-6 lg:px-8',
    artwork === undefined ? 'max-w-4xl' : 'max-w-360',
  );

  return (
    <FocusPage key={targetKey} label="Reference">
      <div className="sticky top-0 z-20 bg-background pt-3">
        <div className={columnClassName}>
          <BackButton onBack={onBack} />
        </div>
      </div>
      <article className={classNames(columnClassName, '@container flex flex-col gap-8 pt-4 pb-10')}>
        {artwork === undefined ? (
          <>
            <RecordPlate headingRef={headingRef} source={source} target={target} />
            <div className="flex flex-col gap-8 @3xl:flex-row @3xl:items-start">
              <RecordMain actions={actions} target={target} />
              <RecordPanel source={source} />
            </div>
          </>
        ) : (
          <>
            <ArtworkHeader
              artwork={artwork}
              headingRef={headingRef}
              onExpand={() => setFullSize(true)}
            />
            <RecordMain actions={actions} target={target} />
          </>
        )}
      </article>
      {artwork === undefined ? null : (
        <ArtworkViewer artwork={artwork} onClose={closeViewer} open={fullSize} />
      )}
    </FocusPage>
  );
}
