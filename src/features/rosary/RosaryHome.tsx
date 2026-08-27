import { useState } from 'react';
import { resolveArtAsset } from '../../assets/art.ts';
import { contentCatalog, type ResolvedArtwork } from '../../content/catalog.ts';
import {
  ACCENT_BUTTON_CLASS_NAME,
  AMBIENT_SCRIM_CLASS_NAME,
  EYEBROW_CLASS_NAME,
  NAV_CLASS_NAME,
  SCRIPTURE_CLASS_NAME,
  TITLE_CLASS_NAME,
} from '../../styles.ts';
import { CollectionStrip } from './CollectionStrip.tsx';
import { dailyMysteryIndex, scheduledMysterySetId, Weekday } from './schedule.ts';

const PANEL_CLASS_NAME =
  'edge-lit overflow-hidden rounded-xl bg-surface/72 backdrop-blur-md backdrop-saturate-150';

function AmbientGround({ source }: { readonly source: string }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden">
      <img
        alt=""
        className="art-ambient absolute inset-0 size-full object-cover opacity-[0.52]!"
        src={source}
      />
      <div className={AMBIENT_SCRIM_CLASS_NAME} />
    </div>
  );
}
const SECTION_HEADING_CLASS_NAME = `${TITLE_CLASS_NAME} py-4`;

const WEEKDAY_ORDER: readonly Weekday[] = [
  Weekday.Sunday,
  Weekday.Monday,
  Weekday.Tuesday,
  Weekday.Wednesday,
  Weekday.Thursday,
  Weekday.Friday,
  Weekday.Saturday,
];

const capitalize = (value: string): string => `${value.charAt(0).toUpperCase()}${value.slice(1)}`;

const scheduleDaysFor = (
  schedule: (typeof contentCatalog)['rosary']['schedule'],
  mysterySetId: string,
): string =>
  WEEKDAY_ORDER.filter((weekday) => schedule[weekday] === mysterySetId)
    .map((weekday) => capitalize(weekday))
    .join(' · ');

type MysteryPickerProps = {
  readonly onSelect: (mysterySetId: string) => void;
  readonly selectedSetId: string;
  readonly todaySetId: string;
};

function MysteryPicker({ onSelect, selectedSetId, todaySetId }: MysteryPickerProps) {
  return (
    <nav aria-label="Mystery sets" className="flex shrink-0 flex-col">
      {contentCatalog.rosary.mysterySets.map((mysterySet, index) => {
        const selected = mysterySet.id === selectedSetId;

        return (
          <button
            aria-current={selected ? 'true' : undefined}
            className={`relative flex min-h-11 flex-col gap-0.5 px-4 py-3 text-left transition-colors ${index === 0 ? '' : 'border-t border-hairline'} ${selected ? 'bg-linear-to-r from-accent/10 to-transparent to-70%' : 'hover:bg-foreground/4'}`}
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
            <span
              className={`small-caps font-display text-subtitle leading-subtitle tracking-subtitle ${selected ? 'text-accent-current' : 'text-muted'}`}
            >
              {scheduleDaysFor(contentCatalog.rosary.schedule, mysterySet.id)}
              {mysterySet.id === todaySetId ? ' · today' : ''}
            </span>
            <span
              className={`${NAV_CLASS_NAME} ${selected ? 'text-foreground' : 'text-secondary'}`}
            >
              {mysterySet.name}
            </span>
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
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex items-center justify-between">
        <h2 className={SECTION_HEADING_CLASS_NAME}>Lucerna Collection</h2>
        <button
          className="min-h-9 small-caps font-display text-subtitle leading-subtitle tracking-subtitle text-muted transition-colors hover:text-accent"
          onClick={onOpenGallery}
          type="button"
        >
          Open gallery
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
};

type RosaryMystery = (typeof contentCatalog)['rosary']['mysterySets'][number]['mysteries'][number];

type MysteryHero = {
  readonly artwork: RosaryMystery['artworks'][number];
  readonly isToday: boolean;
  readonly mysterySetName: string;
  readonly onBegin: () => void;
};

function MysteryHeroCopy({
  compact,
  hero,
}: {
  readonly compact: boolean;
  readonly hero: MysteryHero;
}) {
  return (
    <div
      className={`relative z-10 mt-auto flex flex-col gap-2 ${compact ? 'p-5' : 'max-w-lg p-8'}`}
    >
      {hero.isToday ? (
        <p className={`${EYEBROW_CLASS_NAME} text-on-art-accent!`}>Selected for today</p>
      ) : null}
      <h1 className={`${TITLE_CLASS_NAME} text-on-art-foreground!`}>{hero.mysterySetName}</h1>
      <p className={`${SCRIPTURE_CLASS_NAME} text-on-art-secondary!`}>
        {compact
          ? 'Enter a quiet prayer space shaped by devotional art.'
          : 'Enter a quiet prayer space shaped by devotional art. The interface withdraws once the Rosary begins.'}
      </p>
      <button
        className={`mt-1 border-on-art-accent! text-on-art-accent! hover:bg-on-art-accent! hover:text-on-art-accent-foreground! ${ACCENT_BUTTON_CLASS_NAME}`}
        onClick={hero.onBegin}
        type="button"
      >
        Begin
      </button>
    </div>
  );
}

function DesktopMysteryHero({ hero }: { readonly hero: MysteryHero }) {
  return (
    <section
      aria-label="Mystery artwork"
      className="relative hidden min-h-64 w-full flex-auto overflow-hidden rounded-xl lg:flex"
      data-layout-region="hero"
    >
      <img
        alt={`${hero.artwork.title} by ${hero.artwork.artist}`}
        className="absolute inset-0 size-full object-cover object-top"
        src={resolveArtAsset(hero.artwork.file)}
      />
      <div className="absolute inset-x-0 bottom-0 h-[45%] bg-linear-to-t from-on-art-scrim to-transparent in-data-[theme=light]:h-[38%]" />
      <MysteryHeroCopy compact={false} hero={hero} />
    </section>
  );
}

type CompactMysteryHeroProps = CollectionPreviewProps &
  MysteryPickerProps & {
    readonly hero: MysteryHero;
  };

function CompactMysteryHero({
  artworks,
  hero,
  onOpenArtwork,
  onOpenGallery,
  onSelect,
  selectedSetId,
  todaySetId,
}: CompactMysteryHeroProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 lg:hidden">
      <section
        aria-label="Mystery artwork"
        className="relative flex min-h-72 min-w-0 flex-1 overflow-hidden rounded-xl sm:min-h-60"
      >
        <img
          alt={`${hero.artwork.title} by ${hero.artwork.artist}`}
          className="absolute inset-0 size-full object-cover object-top"
          src={resolveArtAsset(hero.artwork.file)}
        />
        <div className="absolute inset-x-0 bottom-0 h-2/3 bg-linear-to-t from-on-art-scrim via-on-art-scrim/85 via-35% to-transparent in-data-[theme=light]:h-[58%]" />
        <MysteryHeroCopy compact hero={hero} />
      </section>

      <div className={`shrink-0 ${PANEL_CLASS_NAME}`}>
        <MysteryPicker onSelect={onSelect} selectedSetId={selectedSetId} todaySetId={todaySetId} />
      </div>

      <section
        aria-label="The Lucerna Collection"
        className={`flex min-w-0 shrink-0 flex-col p-2 ${PANEL_CLASS_NAME}`}
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

type DesktopSupportProps = CollectionPreviewProps & MysteryPickerProps;

function DesktopSupport({
  artworks,
  onOpenArtwork,
  onOpenGallery,
  onSelect,
  selectedSetId,
  todaySetId,
}: DesktopSupportProps) {
  return (
    <div className="hidden shrink-0 gap-2 lg:flex">
      <section
        aria-label="Mystery sets"
        className={`flex shrink basis-[clamp(14rem,22vw,24rem)] flex-col ${PANEL_CLASS_NAME}`}
        data-layout-region="mysteries"
      >
        <h2 className={`${SECTION_HEADING_CLASS_NAME} px-4`}>Mysteries</h2>
        <MysteryPicker onSelect={onSelect} selectedSetId={selectedSetId} todaySetId={todaySetId} />
      </section>

      <section
        aria-label="The Lucerna Collection"
        className={`flex min-w-0 flex-1 flex-col p-2 ${PANEL_CLASS_NAME}`}
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
  mysteries: readonly RosaryMystery[],
  heroArtworkId: string,
): readonly ResolvedArtwork[] => {
  const stageArtworks = Object.values(contentCatalog.rosary.prayerStageArt).flat();
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

const dailyHeroArtworkFor = (today: Date, selectedSetId: string): ResolvedArtwork => {
  const selectedSet = contentCatalog.mysterySetById(selectedSetId);
  const heroMysteryIndex = dailyMysteryIndex(today, selectedSetId, selectedSet.mysteries.length);
  const heroMystery = selectedSet.mysteries[heroMysteryIndex];

  if (heroMystery === undefined) {
    throw new RangeError('Mystery set must not be empty');
  }

  const heroArtwork =
    heroMystery.artworks[dailyMysteryIndex(today, heroMystery.title, heroMystery.artworks.length)];

  if (heroArtwork === undefined) {
    throw new RangeError('Mystery must carry at least one artwork');
  }

  return heroArtwork;
};

export function RosaryHome({ onBeginRosary, onOpenArtwork, onOpenGallery }: RosaryHomeProps) {
  const today = new Date();
  const todaySetId = scheduledMysterySetId(today, contentCatalog.rosary.schedule);
  const [selectedSetId, setSelectedSetId] = useState(todaySetId);
  const selectedSet = contentCatalog.mysterySetById(selectedSetId);
  const heroArtwork = dailyHeroArtworkFor(today, selectedSetId);
  const dailyArtworks = dailyArtworksFor(selectedSet.mysteries, heroArtwork.id);
  const hero: MysteryHero = {
    artwork: heroArtwork,
    isToday: selectedSetId === todaySetId,
    mysterySetName: selectedSet.name,
    onBegin: () => onBeginRosary(selectedSetId),
  };

  return (
    <section className="relative flex min-h-0 w-full flex-1 flex-col overflow-hidden">
      <AmbientGround source={resolveArtAsset(heroArtwork.file)} />

      <div className="scroll-region relative z-10 mx-auto flex min-h-0 w-full max-w-360 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto">
        <DesktopMysteryHero hero={hero} />
        <CompactMysteryHero
          artworks={dailyArtworks}
          hero={hero}
          onOpenArtwork={onOpenArtwork}
          onOpenGallery={onOpenGallery}
          onSelect={setSelectedSetId}
          selectedSetId={selectedSetId}
          todaySetId={todaySetId}
        />
        <DesktopSupport
          artworks={dailyArtworks}
          onOpenArtwork={onOpenArtwork}
          onOpenGallery={onOpenGallery}
          onSelect={setSelectedSetId}
          selectedSetId={selectedSetId}
          todaySetId={todaySetId}
        />
      </div>
    </section>
  );
}
