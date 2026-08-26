import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import { GALLERY_DATE_GROUP_YEARS, galleryGroupsFor, GallerySort, yearOf } from './gallerySort.ts';

const artworks = contentCatalog.artworks;

const flatten = (sort: GallerySort) =>
  galleryGroupsFor(sort, artworks).flatMap((group) => group.artworks);

describe('mystery grouping', () => {
  test('opens one group for each mystery set in schedule order', () => {
    const groups = galleryGroupsFor(GallerySort.Mystery, artworks);
    const setNames = contentCatalog.rosary.mysterySets.map((mysterySet) => mysterySet.name);

    expect(groups.slice(0, setNames.length).map((group) => group.heading)).toEqual(setNames);
  });

  test('places every declared mystery artwork under its own set', () => {
    const groups = galleryGroupsFor(GallerySort.Mystery, artworks);

    for (const mysterySet of contentCatalog.rosary.mysterySets) {
      const group = groups.find((candidate) => candidate.heading === mysterySet.name);

      expect(group?.artworks.map((artwork) => artwork.id)).toEqual(
        mysterySet.mysteries.map((mystery) => mystery.artwork.id),
      );
    }
  });

  test('opens one named group for each prayer artwork pool', () => {
    const groups = galleryGroupsFor(GallerySort.Mystery, artworks);

    for (const prayerId of Object.keys(contentCatalog.rosary.prayerStageArt)) {
      const group = groups.find((candidate) => candidate.id === prayerId);

      expect(group?.heading).toBe(contentCatalog.prayerById(prayerId).title);
      expect(group?.artworks.length).toBeGreaterThan(0);
    }
  });

  test('gives every category a stable identity', () => {
    const groups = galleryGroupsFor(GallerySort.Mystery, artworks);
    const ids = groups.map((group) => group.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  test('shows every work in the collection exactly once', () => {
    const shown = flatten(GallerySort.Mystery).map((artwork) => artwork.id);

    expect(new Set(shown).size).toBe(shown.length);
    expect(shown).toHaveLength(artworks.length);
  });
});

describe('artist grouping', () => {
  test('opens one named row for each artist in surname order', () => {
    const groups = galleryGroupsFor(GallerySort.Artist, artworks);
    const expectedArtists = [...new Set(artworks.map((artwork) => artwork.artist))].sort(
      (left, right) =>
        (left.split(' ').at(-1) ?? left).localeCompare(right.split(' ').at(-1) ?? right) ||
        left.localeCompare(right),
    );

    expect(groups.map((group) => group.heading)).toEqual(expectedArtists);
  });

  test('keeps only that artist works in each row', () => {
    const groups = galleryGroupsFor(GallerySort.Artist, artworks);

    for (const group of groups) {
      expect(group.artworks.every((artwork) => artwork.artist === group.heading)).toBe(true);
    }
  });

  test('shows every work exactly once', () => {
    const shown = flatten(GallerySort.Artist).map((artwork) => artwork.id);

    expect(new Set(shown).size).toBe(shown.length);
    expect(shown).toHaveLength(artworks.length);
  });
});

describe('date grouping', () => {
  test('opens one named row for each nonempty fifty-year period', () => {
    const groups = galleryGroupsFor(GallerySort.Date, artworks);

    for (const group of groups) {
      const firstArtwork = group.artworks[0];

      expect(firstArtwork).toBeDefined();

      if (firstArtwork === undefined) {
        continue;
      }

      const periodStart =
        Math.floor(yearOf(firstArtwork) / GALLERY_DATE_GROUP_YEARS) * GALLERY_DATE_GROUP_YEARS;
      const periodEnd = periodStart + GALLERY_DATE_GROUP_YEARS - 1;

      expect(group.heading).toBe(`${String(periodStart)}–${String(periodEnd)}`);
      expect(
        group.artworks.every((artwork) => {
          const year = yearOf(artwork);

          return year >= periodStart && year <= periodEnd;
        }),
      ).toBe(true);
    }
  });

  test('orders the rows and their works by earliest year', () => {
    const ordered = flatten(GallerySort.Date).map(yearOf);

    expect(ordered).toEqual([...ordered].sort((a, b) => a - b));
  });

  test('shows every work exactly once', () => {
    const shown = flatten(GallerySort.Date).map((artwork) => artwork.id);

    expect(new Set(shown).size).toBe(shown.length);
    expect(shown).toHaveLength(artworks.length);
  });
});

describe('date parsing', () => {
  test('reads the year out of an approximate date range', () => {
    const sample = artworks.find((artwork) => artwork.date.includes('c. '));

    expect(sample === undefined ? 1 : yearOf(sample)).toBeGreaterThan(1000);
  });

  test('reads the earliest year represented by a century date', () => {
    const sample = artworks.find((artwork) => artwork.date === '17th c.');

    expect(sample === undefined ? 1 : yearOf(sample)).toBe(1600);
  });
});
