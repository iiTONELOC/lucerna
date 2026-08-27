import { contentCatalog, type ResolvedArtwork } from '../../content/catalog.ts';

export enum GallerySort {
  Mystery = 'mystery',
  Artist = 'artist',
  Date = 'date',
}

export const GALLERY_SORT_LABEL: Readonly<Record<GallerySort, string>> = {
  [GallerySort.Mystery]: 'Mystery',
  [GallerySort.Artist]: 'Artist',
  [GallerySort.Date]: 'Date',
};

export type GalleryGroup = {
  readonly id: string;
  readonly heading: string | null;
  readonly artworks: readonly ResolvedArtwork[];
};

const CENTURY_PATTERN = /(?<century>\d{1,2})(?:st|nd|rd|th) c\./u;
const YEAR_PATTERN = /\d{4}/u;
const UNDATED_YEAR = Number.MAX_SAFE_INTEGER;
export const GALLERY_DATE_GROUP_YEARS = 50;

const centuryStartYearOf = (date: string): number => {
  const centuryText = CENTURY_PATTERN.exec(date)?.groups?.['century'];
  const century = Number(centuryText);

  return Number.isInteger(century) && century > 0 ? (century - 1) * 100 : UNDATED_YEAR;
};

export const yearOf = (artwork: ResolvedArtwork): number => {
  const matched = YEAR_PATTERN.exec(artwork.date);

  return matched === null ? centuryStartYearOf(artwork.date) : Number(matched[0]);
};

const surnameOf = (artist: string): string => artist.split(' ').at(-1) ?? artist;

const compareArtists = (left: string, right: string): number =>
  surnameOf(left).localeCompare(surnameOf(right)) || left.localeCompare(right);

const byArtist = (left: ResolvedArtwork, right: ResolvedArtwork): number =>
  compareArtists(left.artist, right.artist) || left.title.localeCompare(right.title);

const byDate = (left: ResolvedArtwork, right: ResolvedArtwork): number =>
  yearOf(left) - yearOf(right) || left.title.localeCompare(right.title);

const unclaimedFrom = (
  artworks: readonly ResolvedArtwork[],
  claimed: Set<string>,
): readonly ResolvedArtwork[] => {
  const kept = artworks.filter((artwork) => !claimed.has(artwork.id));

  for (const artwork of kept) {
    claimed.add(artwork.id);
  }

  return kept;
};

const mysterySetsStartingWithToday = (todaySetId: string) => {
  const mysterySets = contentCatalog.rosary.mysterySets;

  return [
    ...mysterySets.filter((mysterySet) => mysterySet.id === todaySetId),
    ...mysterySets.filter((mysterySet) => mysterySet.id !== todaySetId),
  ];
};

const mysteryGroupsOf = (todaySetId: string): readonly GalleryGroup[] => {
  const claimed = new Set<string>();
  const groups: GalleryGroup[] = [];

  for (const mysterySet of mysterySetsStartingWithToday(todaySetId)) {
    const setArtworks = mysterySet.mysteries.flatMap((mystery) => mystery.artworks);

    groups.push({
      id: mysterySet.id,
      heading: mysterySet.name,
      artworks: unclaimedFrom(setArtworks, claimed),
    });
  }

  for (const [prayerId, stageArtworks] of Object.entries(contentCatalog.rosary.prayerStageArt)) {
    const kept = unclaimedFrom(stageArtworks, claimed);

    if (kept.length > 0) {
      groups.push({
        id: prayerId,
        heading: contentCatalog.prayerById(prayerId).title,
        artworks: kept,
      });
    }
  }

  return groups;
};

const artistGroupsOf = (artworks: readonly ResolvedArtwork[]): readonly GalleryGroup[] => {
  const artworksByArtist = new Map<string, ResolvedArtwork[]>();

  for (const artwork of [...artworks].sort(byArtist)) {
    const artistArtworks = artworksByArtist.get(artwork.artist);

    if (artistArtworks === undefined) {
      artworksByArtist.set(artwork.artist, [artwork]);
    } else {
      artistArtworks.push(artwork);
    }
  }

  return [...artworksByArtist].map(([artist, artistArtworks]) => ({
    id: `${GallerySort.Artist}:${artist}`,
    heading: artist,
    artworks: artistArtworks,
  }));
};

const dateGroupsOf = (artworks: readonly ResolvedArtwork[]): readonly GalleryGroup[] => {
  const artworksByPeriod = new Map<number, ResolvedArtwork[]>();
  const undatedArtworks: ResolvedArtwork[] = [];

  for (const artwork of [...artworks].sort(byDate)) {
    const year = yearOf(artwork);

    if (year === UNDATED_YEAR) {
      undatedArtworks.push(artwork);
      continue;
    }

    const periodStart = Math.floor(year / GALLERY_DATE_GROUP_YEARS) * GALLERY_DATE_GROUP_YEARS;
    const periodArtworks = artworksByPeriod.get(periodStart);

    if (periodArtworks === undefined) {
      artworksByPeriod.set(periodStart, [artwork]);
    } else {
      periodArtworks.push(artwork);
    }
  }

  const groups = [...artworksByPeriod].map<GalleryGroup>(([periodStart, periodArtworks]) => ({
    id: `${GallerySort.Date}:${String(periodStart)}`,
    heading: `${String(periodStart)}–${String(periodStart + GALLERY_DATE_GROUP_YEARS - 1)}`,
    artworks: periodArtworks,
  }));

  if (undatedArtworks.length > 0) {
    groups.push({
      id: `${GallerySort.Date}:undated`,
      heading: 'Date unknown',
      artworks: undatedArtworks,
    });
  }

  return groups;
};

export const galleryGroupsFor = (
  sort: GallerySort,
  artworks: readonly ResolvedArtwork[],
  todaySetId: string,
): readonly GalleryGroup[] => {
  if (sort === GallerySort.Mystery) {
    return mysteryGroupsOf(todaySetId);
  }

  if (sort === GallerySort.Artist) {
    return artistGroupsOf(artworks);
  }

  return dateGroupsOf(artworks);
};
