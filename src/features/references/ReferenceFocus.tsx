import { useEffect, useRef } from 'react';
import { contentCatalog } from '../../content/catalog.ts';
import type { DevotionalSource, SourceReference } from '../../content/schema.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { ExternalLink } from '../../components/links/ExternalLink.tsx';
import { useEscape } from '../../shared/useEscape.ts';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  INLINE_LINK_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import {
  ReferenceGroup,
  referenceGroupLabel,
  referenceTargetKey,
  type ReadingLocation,
  type ReferenceTarget,
} from './referenceCatalog.ts';

function ReferenceTerm({ children }: { readonly children: string }) {
  return <dt className="small-caps tracking-subtitle text-muted">{children}</dt>;
}

function SourceDetails({ source }: { readonly source: DevotionalSource }) {
  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 ${CITATION_CLASS_NAME}`}>
      <ReferenceTerm>Author</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{source.author}</dd>
      {source.note === undefined ? null : (
        <>
          <ReferenceTerm>Purpose</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{source.note}</dd>
        </>
      )}
      {source.translator === undefined ? null : (
        <>
          <ReferenceTerm>Translator</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{source.translator}</dd>
        </>
      )}
      {source.publisher === undefined ? null : (
        <>
          <ReferenceTerm>Publisher</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{source.publisher}</dd>
        </>
      )}
      {source.published === undefined ? null : (
        <>
          <ReferenceTerm>Published</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{source.published}</dd>
        </>
      )}
      <ReferenceTerm>Rights</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{source.approval}</dd>
    </dl>
  );
}

function ArtworkRecordDetails({ artworkId }: { readonly artworkId: string }) {
  const artwork = contentCatalog.artworkById(artworkId);

  return (
    <dl className={`grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-2 ${CITATION_CLASS_NAME}`}>
      <ReferenceTerm>Artist</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{artwork.artist}</dd>
      <ReferenceTerm>Date</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{artwork.date}</dd>
      <ReferenceTerm>Collection</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{artwork.holder}</dd>
      {artwork.accession === undefined ? null : (
        <>
          <ReferenceTerm>Accession</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{artwork.accession}</dd>
        </>
      )}
      {artwork.photographer === undefined ? null : (
        <>
          <ReferenceTerm>Photograph</ReferenceTerm>
          <dd className="wrap-break-word text-secondary">{artwork.photographer}</dd>
        </>
      )}
      <ReferenceTerm>Rights</ReferenceTerm>
      <dd className="wrap-break-word text-secondary">{artwork.source.approval}</dd>
    </dl>
  );
}

function ExactLocation({
  onOpenReading,
  target,
}: {
  readonly onOpenReading: (location: ReadingLocation) => void;
  readonly target: ReferenceTarget;
}) {
  if (target.group === ReferenceGroup.Artwork || target.locator === undefined) {
    return null;
  }

  const reading = target.reading;

  return (
    <section className="rounded-lg border border-accent/35 bg-accent/5 p-4">
      <p className={EYEBROW_CLASS_NAME}>Cited location</p>
      <p className={`pt-2 ${BODY_CLASS_NAME} text-secondary`}>{target.locator}</p>
      {target.sections === undefined ? null : (
        <p className={`${CITATION_CLASS_NAME} pt-2 text-muted`}>
          Sections {target.sections.join(', ')}
        </p>
      )}
      {reading === undefined ? null : (
        <button
          className={`${INLINE_LINK_CLASS_NAME} mt-1`}
          onClick={() => onOpenReading(reading)}
          type="button"
        >
          View in the Library
        </button>
      )}
    </section>
  );
}

const supportingKey = (reference: SourceReference): string =>
  `${reference.sourceId}:${reference.locator}:${reference.sections?.join(',') ?? ''}`;

function SupportingReferences({ target }: { readonly target: ReferenceTarget }) {
  if (
    target.group === ReferenceGroup.Artwork ||
    target.supportingReferences === undefined ||
    target.supportingReferences.length < 2
  ) {
    return null;
  }

  return (
    <section>
      <h2 className={EYEBROW_CLASS_NAME}>Supporting citations</h2>
      <ul className="mt-2 flex flex-col gap-3">
        {target.supportingReferences.map((reference) => (
          <li className="border-l border-hairline pl-3" key={supportingKey(reference)}>
            <p className={`${CITATION_CLASS_NAME} text-secondary`}>
              {contentCatalog.sourceById(reference.sourceId).work}
            </p>
            <p className={`${CITATION_CLASS_NAME} text-muted`}>{reference.locator}</p>
          </li>
        ))}
      </ul>
    </section>
  );
}

function SourceLinks({
  target,
  source,
}: {
  readonly target: ReferenceTarget;
  readonly source: DevotionalSource;
}) {
  const artwork =
    target.group === ReferenceGroup.Artwork
      ? contentCatalog.artworkById(target.artworkId)
      : undefined;
  const primaryUrl = artwork?.url ?? source.url;

  return (
    <nav aria-label="External source links" className="flex flex-wrap gap-x-6 gap-y-2">
      <ExternalLink className={INLINE_LINK_CLASS_NAME} href={primaryUrl}>
        Open original source
      </ExternalLink>
      {artwork === undefined ? null : (
        <ExternalLink className={INLINE_LINK_CLASS_NAME} href={source.url}>
          Open rights policy
        </ExternalLink>
      )}
      {artwork?.dateSource === undefined ? null : (
        <ExternalLink className={INLINE_LINK_CLASS_NAME} href={artwork.dateSource}>
          Open dating source
        </ExternalLink>
      )}
      {source.citationUrl === undefined ? null : (
        <ExternalLink className={INLINE_LINK_CLASS_NAME} href={source.citationUrl}>
          Open alternate text
        </ExternalLink>
      )}
      {source.renewalSearchUrl === undefined ? null : (
        <ExternalLink className={INLINE_LINK_CLASS_NAME} href={source.renewalSearchUrl}>
          Open renewal search
        </ExternalLink>
      )}
    </nav>
  );
}

function titleFor(target: ReferenceTarget, source: DevotionalSource): string {
  return target.group === ReferenceGroup.Artwork
    ? contentCatalog.artworkById(target.artworkId).title
    : source.work;
}

function useReferenceFocus(onBack: () => void, target: ReferenceTarget) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [target]);

  useEscape(onBack);

  return headingRef;
}

export function ReferenceFocus({
  target,
  onBack,
  onOpenReading,
}: {
  readonly target: ReferenceTarget;
  readonly onBack: () => void;
  readonly onOpenReading: (location: ReadingLocation) => void;
}) {
  const source = contentCatalog.sourceById(target.sourceId);
  const headingRef = useReferenceFocus(onBack, target);

  return (
    <main
      aria-label="Reference"
      className="scroll-region h-dvh overflow-x-hidden overflow-y-auto bg-background pt-safe-top pb-safe-bottom text-foreground"
      key={referenceTargetKey(target)}
    >
      <article className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
        <BackButton onBack={onBack} />
        <header>
          <p className={EYEBROW_CLASS_NAME}>{referenceGroupLabel(target.group)}</p>
          <h1
            className={`${TITLE_CLASS_NAME} pt-1 focus:outline-none`}
            ref={headingRef}
            tabIndex={-1}
          >
            {titleFor(target, source)}
          </h1>
        </header>
        {target.group === ReferenceGroup.Artwork ? (
          <ArtworkRecordDetails artworkId={target.artworkId} />
        ) : (
          <SourceDetails source={source} />
        )}
        <ExactLocation onOpenReading={onOpenReading} target={target} />
        <SupportingReferences target={target} />
        <SourceLinks source={source} target={target} />
      </article>
    </main>
  );
}
