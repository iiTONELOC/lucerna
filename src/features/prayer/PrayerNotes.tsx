import { useState, type CSSProperties, type RefObject } from 'react';
import { contentCatalog } from '../../content/catalog.ts';
import { Chevron } from '../../components/icons/Chevron.tsx';
import { ChevronDirection } from '../../components/icons/model.ts';
import { classNames } from '../../shared/classNames.ts';
import { CITATION_CLASS_NAME, EYEBROW_CLASS_NAME, SUBTITLE_CLASS_NAME } from '../../styles.ts';
import { CitationLink } from '../../components/links/CitationLink.tsx';
import {
  guidanceReferenceTarget,
  reflectionReferenceTarget,
  rosaryTextReferenceTarget,
  type ReferenceTarget,
} from '../references/referenceCatalog.ts';
import { offeringLabelOf, type MysteryFruit } from './prayerSession.ts';
import { FRUIT_LABEL } from './progression.ts';
import { GuidedPlaybackPhase } from './playbackSequence.ts';
import type { NotesCollision } from './useNotesCollision.ts';
import type { MysteryReflection } from '../../content/schema.ts';
import type { PrayerStep } from './progression.ts';
import type { GuidedPlayback } from './useGuidedPlayback.ts';
import { useLandscape } from '../../shared/useLandscape.ts';

const NOTE_BODY_CLASS_NAME = `${CITATION_CLASS_NAME} min-w-0 text-secondary`;

const NOTE_EYEBROW_ON_ART_CLASS_NAME = `${SUBTITLE_CLASS_NAME} font-semibold text-on-art-accent`;

const NOTE_BODY_ON_ART_CLASS_NAME = `${CITATION_CLASS_NAME} min-w-0 text-on-art-secondary`;

const ON_ART_NOTE_CLASS_NAME =
  'flex w-fit max-w-prose flex-col rounded-lg bg-black/55 p-0.5 text-shadow-lg text-shadow-black/80 backdrop-blur-xs';

export type AuxiliaryPlaybackNotesProps = {
  readonly guidedPlayback: GuidedPlayback;
  readonly offering: MysteryReflection | null;
  readonly onArt?: boolean | undefined;
  readonly onOpenReference: (target: ReferenceTarget) => void;
  readonly showGuidance: boolean;
  readonly step: PrayerStep;
};

type AuxiliaryNoteSelection = Pick<
  AuxiliaryPlaybackNotesProps,
  'offering' | 'showGuidance' | 'step'
>;

const auxiliaryNoteCountOf = ({ offering, showGuidance, step }: AuxiliaryNoteSelection): number =>
  Number(showGuidance && step.guidance !== undefined) + Number(offering !== null);

const hasAuxiliaryNotes = (selection: AuxiliaryNoteSelection): boolean =>
  auxiliaryNoteCountOf(selection) > 0;

type NoteLineProps = {
  readonly illuminated: boolean;
  readonly label: string;
  readonly phase: GuidedPlaybackPhase;
  readonly text: string;
  readonly attribution?: string;
  readonly onArt: boolean;
  readonly onOpenAttribution?: () => void;
};

function NoteLine({
  illuminated,
  label,
  phase,
  text,
  attribution,
  onArt,
  onOpenAttribution,
}: NoteLineProps) {
  return (
    <p
      className="flex w-fit max-w-full min-w-0 self-start flex-wrap items-baseline gap-x-2 rounded-sm border-2 border-transparent border-l-accent-current/50 px-3 py-0.5 transition-colors duration-300 data-[playback-active=true]:border-accent-current motion-reduce:transition-none"
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={phase}
    >
      <span className={onArt ? NOTE_EYEBROW_ON_ART_CLASS_NAME : EYEBROW_CLASS_NAME}>{label}</span>
      <span className={onArt ? NOTE_BODY_ON_ART_CLASS_NAME : NOTE_BODY_CLASS_NAME}>
        {text}
        {attribution === undefined || onOpenAttribution === undefined ? null : (
          <>
            {' '}
            <CitationLink label={attribution} onArt={onArt} onOpen={onOpenAttribution} />
          </>
        )}
      </span>
    </p>
  );
}

export function FruitLine({
  fruit,
  illuminated,
  onArt,
  onOpenReference,
}: {
  readonly fruit: MysteryFruit;
  readonly illuminated: boolean;
  readonly onArt: boolean;
  readonly onOpenReference: (target: ReferenceTarget) => void;
}) {
  return (
    <p
      className={classNames(
        SUBTITLE_CLASS_NAME +
          ' w-fit max-w-full rounded-sm border-2 border-transparent px-2 py-0.5 text-center font-semibold transition-colors duration-300 landscape:mt-1 data-[playback-active=true]:border-accent-current motion-reduce:transition-none',
        onArt ? 'text-on-art-accent' : 'text-accent-current',
      )}
      data-playback-active={illuminated ? 'true' : 'false'}
      data-playback-phase={GuidedPlaybackPhase.Fruit}
    >
      <span>{FRUIT_LABEL}</span>
      <span>{' · ' + fruit.text}</span>{' '}
      <CitationLink
        label={contentCatalog.sourceById(fruit.sourceId).work}
        onArt={onArt}
        onOpen={() => onOpenReference(rosaryTextReferenceTarget(fruit.sourceId))}
      />
    </p>
  );
}

function AuxiliaryPlaybackNotes({
  guidedPlayback,
  offering,
  onArt = false,
  onOpenReference,
  showGuidance,
  step,
}: AuxiliaryPlaybackNotesProps) {
  const guidance = step.guidance;

  return (
    <>
      {showGuidance && guidance !== undefined ? (
        <NoteLine
          attribution={contentCatalog.sourceById(guidance.sourceId).work}
          illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Guidance}
          label="Guidance"
          onArt={onArt}
          onOpenAttribution={() => onOpenReference(guidanceReferenceTarget(guidance))}
          phase={GuidedPlaybackPhase.Guidance}
          text={guidance.text}
        />
      ) : null}
      {offering?.text === undefined ? null : (
        <NoteLine
          attribution={contentCatalog.sourceById(offering.sourceId).work}
          illuminated={guidedPlayback.activePhase === GuidedPlaybackPhase.Offering}
          label={offeringLabelOf(offering)}
          onArt={onArt}
          onOpenAttribution={() => onOpenReference(reflectionReferenceTarget(offering))}
          phase={GuidedPlaybackPhase.Offering}
          text={offering.text}
        />
      )}
    </>
  );
}

export function ReadingNotes({
  showArtwork,
  ...notes
}: AuxiliaryPlaybackNotesProps & { readonly showArtwork: boolean }) {
  const landscape = useLandscape();

  if ((showArtwork && !landscape) || !hasAuxiliaryNotes(notes)) {
    return null;
  }

  return (
    <div className="flex flex-col gap-1">
      <AuxiliaryPlaybackNotes {...notes} />
    </div>
  );
}

type CollapsedNotesStyle = CSSProperties & {
  readonly '--notes-collapsed-height': string;
};

const collapsedNotesStyleOf = (collision: NotesCollision): CollapsedNotesStyle => ({
  '--notes-collapsed-height': String(collision.collapsedHeight) + 'px',
});

const scrolledToEnd = (element: HTMLElement): boolean =>
  element.scrollTop + element.clientHeight >= element.scrollHeight - 1;

function CollapsedNotesBox({
  collision,
  notesRef,
  ...props
}: AuxiliaryPlaybackNotesProps & {
  readonly collision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
}) {
  const [atEnd, setAtEnd] = useState(false);

  return (
    <div className="relative max-w-full min-w-0">
      <div
        ref={notesRef}
        className={classNames(
          ON_ART_NOTE_CLASS_NAME,
          'scroll-region max-h-(--notes-collapsed-height) overflow-y-auto',
        )}
        onScroll={(event) => setAtEnd(scrolledToEnd(event.currentTarget))}
        style={collapsedNotesStyleOf(collision)}
      >
        <AuxiliaryPlaybackNotes {...props} onArt />
      </div>
      <Chevron
        className="pointer-events-none absolute right-1.5 bottom-1.5 size-4 text-on-art-muted"
        direction={atEnd ? ChevronDirection.Up : ChevronDirection.Down}
      />
    </div>
  );
}

export function ArtworkNotes({
  collision,
  notesRef,
  ...props
}: AuxiliaryPlaybackNotesProps & {
  readonly collision: NotesCollision;
  readonly notesRef: RefObject<HTMLDivElement | null>;
}) {
  const landscape = useLandscape();
  const single = auxiliaryNoteCountOf(props) === 1;
  const collapsed = collision.collides && !single;

  if (landscape || !hasAuxiliaryNotes(props)) {
    return null;
  }

  return (
    <div
      className={classNames(
        collision.collides && single && 'invisible',
        collapsed ? 'z-40' : 'z-10',
        'absolute inset-x-0 bottom-(--strand-clearance) flex pl-4 pr-[max(1rem,calc(100cqw*(1-var(--drape-pendant-left))-var(--artwork-inset)+0.5rem))] sm:pl-6 sm:pr-[max(1.5rem,calc(100cqw*(1-var(--drape-pendant-left))-var(--artwork-inset)+0.5rem))]',
      )}
    >
      {collapsed ? (
        <CollapsedNotesBox {...props} collision={collision} notesRef={notesRef} />
      ) : (
        <div ref={notesRef} className={ON_ART_NOTE_CLASS_NAME}>
          <AuxiliaryPlaybackNotes {...props} onArt />
        </div>
      )}
    </div>
  );
}
