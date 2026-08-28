import { contentCatalog } from '../../content/catalog.ts';
import type { DevotionalSource, SourceReference } from '../../content/schema.ts';
import { BackButton } from '../../components/buttons/BackButton.tsx';
import { DetailList, FocusPage, ViewHeader } from '../../components/layout.tsx';
import { ExternalLink } from '../../components/links/ExternalLink.tsx';
import { useFocusPage } from '../../shared/focus.ts';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  INLINE_LINK_CLASS_NAME,
} from '../../styles.ts';
import {
  ReferenceGroup,
  referenceGroupLabel,
  referenceTargetKey,
  type ReadingLocation,
  type ReferenceTarget,
} from './referenceCatalog.ts';

function SourceDetails({ source }: { readonly source: DevotionalSource }) {
  return (
    <DetailList
      rows={[
        ['Author', source.author],
        ['Purpose', source.note],
        ['Translator', source.translator],
        ['Publisher', source.publisher],
        ['Published', source.published],
        ['Rights', source.approval],
      ]}
    />
  );
}

function ArtworkRecordDetails({ artworkId }: { readonly artworkId: string }) {
  const artwork = contentCatalog.artworkById(artworkId);

  return (
    <DetailList
      rows={[
        ['Artist', artwork.artist],
        ['Date', artwork.date],
        ['Collection', artwork.holder],
        ['Accession', artwork.accession],
        ['Photograph', artwork.photographer],
        ['Rights', artwork.source.approval],
      ]}
    />
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
  const targetKey = referenceTargetKey(target);
  const headingRef = useFocusPage(onBack, targetKey);

  return (
    <FocusPage key={targetKey} label="Reference">
      <article className="mx-auto flex min-h-full w-full max-w-4xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8 lg:py-10">
        <BackButton onBack={onBack} />
        <ViewHeader
          eyebrow={referenceGroupLabel(target.group)}
          headingRef={headingRef}
          title={titleFor(target, source)}
        />
        {target.group === ReferenceGroup.Artwork ? (
          <ArtworkRecordDetails artworkId={target.artworkId} />
        ) : (
          <SourceDetails source={source} />
        )}
        <ExactLocation onOpenReading={onOpenReading} target={target} />
        <SupportingReferences target={target} />
        <SourceLinks source={source} target={target} />
      </article>
    </FocusPage>
  );
}
