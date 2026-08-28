import { ViewHeader } from '../../components/layout.tsx';
import {
  BODY_CLASS_NAME,
  CITATION_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
} from '../../styles.ts';
import {
  referenceSections,
  type ReferenceRecord,
  type ReferenceSection,
  type ReferenceTarget,
} from './referenceCatalog.ts';

type ReferencesViewProps = {
  readonly onOpenReference: (target: ReferenceTarget) => void;
};

function ReferenceCard({
  record,
  onOpen,
}: {
  readonly record: ReferenceRecord;
  readonly onOpen: (target: ReferenceTarget) => void;
}) {
  return (
    <li>
      <button
        className="flex h-full min-h-16 w-full flex-col justify-center rounded-lg border border-hairline bg-surface px-4 py-3 text-left transition-colors hover:border-accent/60 hover:bg-accent/5 focus-ring"
        onClick={() => onOpen(record.target)}
        type="button"
      >
        <span className={`${BODY_CLASS_NAME} text-foreground`}>{record.title}</span>
        <span className={`${CITATION_CLASS_NAME} pt-1 text-muted`}>{record.subtitle}</span>
      </button>
    </li>
  );
}

function ReferenceSectionView({
  section,
  onOpen,
}: {
  readonly section: ReferenceSection;
  readonly onOpen: (target: ReferenceTarget) => void;
}) {
  return (
    <section
      aria-labelledby={`references-${section.group}`}
      className="border-t border-hairline pt-6"
    >
      <p className={EYEBROW_CLASS_NAME}>{section.label}</p>
      <h2
        className={`pt-1 ${SUBTITLE_CLASS_NAME} font-semibold text-foreground`}
        id={`references-${section.group}`}
      >
        {section.records.length === 1
          ? '1 reference'
          : `${String(section.records.length)} references`}
      </h2>
      <p className={`max-w-prose pt-2 ${BODY_CLASS_NAME} text-secondary`}>{section.description}</p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {section.records.map((record) => (
          <ReferenceCard key={record.id} onOpen={onOpen} record={record} />
        ))}
      </ul>
    </section>
  );
}

export function ReferencesView({ onOpenReference }: ReferencesViewProps) {
  return (
    <section
      className="scroll-region h-full overflow-x-hidden overflow-y-auto"
      aria-labelledby="references-title"
    >
      <div className="flex w-full flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
        <ViewHeader
          eyebrow="Sources and provenance"
          id="references-title"
          lede="These records identify the texts, guidance, Scripture, and artwork used in Lucerna. Every record is available offline."
          ledeClassName={`${BODY_CLASS_NAME} text-secondary`}
          title="References"
        />

        {referenceSections.map((section) => (
          <ReferenceSectionView key={section.group} onOpen={onOpenReference} section={section} />
        ))}
      </div>
    </section>
  );
}
