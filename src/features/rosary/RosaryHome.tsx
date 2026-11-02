import { useRef, type CSSProperties, type RefObject } from 'react';
import { resolveHeroArtAsset } from '../../assets/art.ts';
import { ArtworkCreditLine } from '../../components/art/ArtworkCreditLine.tsx';
import { contentCatalog, type ResolvedArtwork } from '../../content/catalog.ts';
import { useReading, type ReadingSnapshot } from '../../content/reading.ts';
import { classNames } from '../../shared/classNames.ts';
import {
  ACCENT_BUTTON_CLASS_NAME,
  CAPTION_CAPS_CLASS_NAME,
  CHAPTER_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  GLASS_PANEL_CLASS_NAME,
  NAV_CLASS_NAME,
  SUBTITLE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { CollectionStrip } from './CollectionStrip.tsx';
import { useDailyHeroArtwork, scheduledMysterySetId, Weekday } from './schedule.ts';
import { useMysteryColumns, useSupportHeight } from './useHomeMeasure.ts';

const SECTION_HEADING_CLASS_NAME = `${CHAPTER_CLASS_NAME} py-4`;

const WEEKDAY_ORDER: readonly Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];

const scheduleDaysFor = (
  reading: ReadingSnapshot,
  schedule: (typeof contentCatalog)['rosary']['schedule'],
  mysterySetId: string,
): string =>
  WEEKDAY_ORDER.filter((weekday) => schedule[weekday] === mysterySetId)
    .map((weekday) => reading.wording.weekdays[weekday])
    .join(' · ');

type MysteryPickerProps = {
  readonly onSelect: (mysterySetId: string) => void;
  readonly selectedSetId: string;
  readonly todaySetId: string;
};

type MysterySet = (typeof contentCatalog)['rosary']['mysterySets'][number];

const MYSTERY_ROW_CLASS_NAME = 'flex flex-col gap-0.5 px-4 py-3';

function MysteryRowText({
  mysterySet,
  selected,
  today,
}: {
  readonly mysterySet: MysterySet;
  readonly selected: boolean;
  readonly today: boolean;
}) {
  const reading = useReading();
  return (
    <>
      <span
        className={classNames(
          CAPTION_CAPS_CLASS_NAME,
          selected ? 'text-accent-current' : 'text-muted',
        )}
      >
        {scheduleDaysFor(reading, reading.catalog.rosary.schedule, mysterySet.id)}
        {today ? ` · ${reading.wording.home.today}` : ''}
      </span>
      <span className={classNames(NAV_CLASS_NAME, selected ? 'text-foreground' : 'text-secondary')}>
        {mysterySet.name}
      </span>
    </>
  );
}

const ruleOf = (index: number, columns: number): string | undefined => {
  if (index === 0) {
    return undefined;
  }

  return index < columns
    ? 'home-wide:border-t home-wide:border-hairline'
    : 'border-t border-hairline';
};

function MysteryPicker({ onSelect, selectedSetId, todaySetId }: MysteryPickerProps) {
  const reading = useReading();
  const pickerRef = useRef<HTMLElement>(null);
  const probeRef = useRef<HTMLDivElement>(null);
  const columns = useMysteryColumns(pickerRef, probeRef);
  const { mysterySets } = reading.catalog.rosary;

  return (
    <nav
      aria-label={reading.wording.home.mysterySets}
      className={classNames(
        'relative grid shrink-0',
        columns === 2 ? 'grid-cols-2 home-wide:grid-cols-1' : undefined,
      )}
      ref={pickerRef}
    >
      <div aria-hidden="true" className="invisible absolute w-max" ref={probeRef}>
        {mysterySets.map((mysterySet) => (
          <div className={MYSTERY_ROW_CLASS_NAME} key={mysterySet.id}>
            <MysteryRowText
              mysterySet={mysterySet}
              selected={false}
              today={mysterySet.id === todaySetId}
            />
          </div>
        ))}
      </div>
      {mysterySets.map((mysterySet, index) => {
        const selected = mysterySet.id === selectedSetId;

        return (
          <button
            aria-current={selected ? 'true' : undefined}
            className={classNames(
              'focus-ring relative min-h-11 text-left transition-colors',
              MYSTERY_ROW_CLASS_NAME,
              ruleOf(index, columns),
              selected
                ? 'bg-linear-to-r from-accent/10 to-transparent to-70%'
                : 'hover:bg-foreground/4',
            )}
            key={mysterySet.id}
            onClick={() => onSelect(mysterySet.id)}
            type="button"
          >
            {selected ? (
              <span
                aria-hidden="true"
                className="absolute left-0 inset-y-(--rule-lit-inset) w-(--rule-lit-width) bg-accent-current"
              />
            ) : null}
            <MysteryRowText
              mysterySet={mysterySet}
              selected={selected}
              today={mysterySet.id === todaySetId}
            />
          </button>
        );
      })}
    </nav>
  );
}
type CollectionPreviewProps = {
  readonly artworks: readonly ResolvedArtwork[];
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenGallery: () => void;
};

function CollectionPreview({ artworks, onOpenArtwork, onOpenGallery }: CollectionPreviewProps) {
  const { wording } = useReading();
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className={SECTION_HEADING_CLASS_NAME}>{wording.home.collection}</h2>
        <button
          className={`focus-ring min-h-9 ${SUBTITLE_CLASS_NAME} text-muted transition-colors hover:text-accent`}
          onClick={onOpenGallery}
          type="button"
        >
          {wording.home.openGallery}
        </button>
      </div>

      <CollectionStrip artworks={artworks} onOpenArtwork={onOpenArtwork} />
    </div>
  );
}

type RosaryHomeProps = {
  readonly onBeginRosary: (mysterySetId: string) => void;
  readonly onOpenArtwork: (artworkId: string) => void;
  readonly onOpenGallery: () => void;
  readonly onSelectSet: (mysterySetId: string) => void;
  readonly selectedSetId: string;
};

type RosaryMystery = (typeof contentCatalog)['rosary']['mysterySets'][number]['mysteries'][number];

type MysteryHero = {
  readonly artwork: RosaryMystery['artworks'][number];
  readonly isToday: boolean;
  readonly mysterySetName: string;
  readonly onBegin: () => void;
  readonly onOpenArtwork: (artworkId: string) => void;
};

function MysteryHeroCopy({ hero }: { readonly hero: MysteryHero }) {
  const { wording } = useReading();
  return (
    <div className="relative z-10 mt-auto flex flex-col gap-2 px-5 pt-5 pb-2 text-shadow-lg text-shadow-black/80 home-wide:max-w-lg home-wide:px-8 home-wide:pt-8 home-wide:pb-3">
      {hero.isToday ? (
        <p className={`${EYEBROW_CLASS_NAME} text-on-art-accent!`}>
          {wording.home.selectedForToday}
        </p>
      ) : null}
      <h1 className={`${TITLE_CLASS_NAME} text-on-art-foreground!`}>{hero.mysterySetName}</h1>
      <ArtworkCreditLine
        artwork={hero.artwork}
        className="home-wide:hidden"
        onArt
        onOpenArtwork={hero.onOpenArtwork}
      />
      <button
        className={`mt-1 border-on-art-accent! text-on-art-accent! hover:bg-on-art-accent! hover:text-on-art-accent-foreground! ${ACCENT_BUTTON_CLASS_NAME}`}
        onClick={hero.onBegin}
        type="button"
      >
        {wording.home.begin}
      </button>
    </div>
  );
}

function MysteryHeroArt({ hero }: { readonly hero: MysteryHero }) {
  const { wording } = useReading();
  return (
    <section
      aria-label={wording.home.mysteryArtwork}
      className="relative flex min-h-[max(var(--hero-floor),60cqh)] min-w-0 flex-1 overflow-hidden rounded-xl [--hero-floor:--spacing(72)] sm:[--hero-floor:--spacing(60)] lg:flex-auto lg:[--hero-floor:--spacing(64)] home-wide:min-h-[max(var(--hero-floor),calc(var(--support-height)*1.5))] home-wide:short:min-h-[max(var(--hero-floor),60cqh)]"
      data-layout-region="hero"
    >
      <img
        alt={wording.artworkAlt(hero.artwork.title, hero.artwork.artist)}
        className="absolute inset-0 size-full object-cover object-[50%_25%]"
        src={resolveHeroArtAsset(hero.artwork.file)}
      />
      <div className="absolute inset-x-0 bottom-0 h-4/5 bg-linear-to-t from-on-art-scrim via-on-art-scrim/85 via-35% to-transparent in-data-[theme=light]:h-[70%] home-wide:h-[55%] home-wide:via-on-art-scrim/50 home-wide:via-50% home-wide:in-data-[theme=light]:h-[46%]" />
      <MysteryHeroCopy hero={hero} />
      <div className="absolute right-8 bottom-4 z-10 hidden max-w-md text-right home-wide:block">
        <ArtworkCreditLine artwork={hero.artwork} onArt onOpenArtwork={hero.onOpenArtwork} />
      </div>
    </section>
  );
}

type SupportPanelsProps = CollectionPreviewProps &
  MysteryPickerProps & { readonly supportRef: RefObject<HTMLDivElement | null> };

function SupportPanels({
  artworks,
  onOpenArtwork,
  onOpenGallery,
  onSelect,
  selectedSetId,
  supportRef,
  todaySetId,
}: SupportPanelsProps) {
  const { wording } = useReading();
  return (
    <div className="flex shrink-0 flex-col gap-2 home-wide:flex-row" ref={supportRef}>
      <section
        aria-label={wording.home.mysterySets}
        className={`flex shrink-0 flex-col ${GLASS_PANEL_CLASS_NAME} home-wide:shrink home-wide:basis-[clamp(14rem,22vw,24rem)]`}
        data-layout-region="mysteries"
      >
        <h2 className={`${SECTION_HEADING_CLASS_NAME} hidden px-4 home-wide:block`}>
          {wording.home.mysteries}
        </h2>
        <MysteryPicker onSelect={onSelect} selectedSetId={selectedSetId} todaySetId={todaySetId} />
      </section>

      <section
        aria-label={wording.gallery.title}
        className={`flex min-w-0 shrink-0 flex-col p-2 ${GLASS_PANEL_CLASS_NAME} home-wide:flex-1`}
        data-layout-region="collection"
      >
        <CollectionPreview
          artworks={artworks}
          onOpenArtwork={onOpenArtwork}
          onOpenGallery={onOpenGallery}
        />
      </section>
    </div>
  );
}

const dailyArtworksFor = (
  reading: ReadingSnapshot,
  mysteries: readonly RosaryMystery[],
  heroArtworkId: string,
): readonly ResolvedArtwork[] => {
  const stageArtworks = Object.values(reading.catalog.rosary.prayerStageArt).flat();
  const seen = new Set<string>([heroArtworkId]);
  const daily: ResolvedArtwork[] = [];

  for (const artwork of [...mysteries.flatMap((mystery) => mystery.artworks), ...stageArtworks]) {
    if (!seen.has(artwork.id)) {
      seen.add(artwork.id);
      daily.push(artwork);
    }
  }

  return daily;
};

type HomeStyle = CSSProperties & { readonly '--support-height': string };

export function RosaryHome({
  onBeginRosary,
  onOpenArtwork,
  onOpenGallery,
  onSelectSet,
  selectedSetId,
}: RosaryHomeProps) {
  const reading = useReading();
  const supportRef = useRef<HTMLDivElement>(null);
  const supportHeight = useSupportHeight(supportRef);
  const today = new Date();
  const todaySetId = scheduledMysterySetId(today, reading.catalog.rosary.schedule);
  const selectedSet = reading.catalog.mysterySetById(selectedSetId);
  const heroArtwork = useDailyHeroArtwork(selectedSetId);
  const dailyArtworks = dailyArtworksFor(reading, selectedSet.mysteries, heroArtwork.id);
  const hero: MysteryHero = {
    artwork: heroArtwork,
    isToday: selectedSetId === todaySetId,
    mysterySetName: selectedSet.name,
    onBegin: () => onBeginRosary(selectedSetId),
    onOpenArtwork,
  };
  const homeStyle: HomeStyle = { '--support-height': `${String(supportHeight)}px` };

  return (
    <section className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <div
        className="scroll-region relative z-10 flex min-h-0 w-full flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto @container-size/home"
        style={homeStyle}
      >
        <MysteryHeroArt hero={hero} />
        <SupportPanels
          artworks={dailyArtworks}
          onOpenArtwork={onOpenArtwork}
          onOpenGallery={onOpenGallery}
          onSelect={onSelectSet}
          selectedSetId={selectedSetId}
          supportRef={supportRef}
          todaySetId={todaySetId}
        />
      </div>
    </section>
  );
}
