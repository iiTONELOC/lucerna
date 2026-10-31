import type { BibleVerseLocation } from '../library/model.ts';
import type { PrayerStart } from '../prayer/progression.ts';
import { ReferenceGroup, type ReferenceTarget } from '../references/referenceCatalog.ts';
import { ApplicationView } from './model.ts';

export enum DestinationKind {
  Prayer = 'prayer',
  Artwork = 'artwork',
  Work = 'work',
  BibleContents = 'bible-contents',
  BibleBook = 'bible-book',
  Reference = 'reference',
}

export type Destination =
  | {
      readonly kind: DestinationKind.Prayer;
      readonly mysterySetId: string;
      readonly run: number;
      readonly start?: PrayerStart;
    }
  | { readonly kind: DestinationKind.Artwork; readonly artworkId: string }
  | {
      readonly kind: DestinationKind.Work;
      readonly workId: string;
      readonly blockIndex: number | null;
    }
  | { readonly kind: DestinationKind.BibleContents }
  | {
      readonly kind: DestinationKind.BibleBook;
      readonly bookId: string;
      readonly blockIndex: number | null;
      readonly verse?: BibleVerseLocation;
    }
  | { readonly kind: DestinationKind.Reference; readonly target: ReferenceTarget };

export type Navigation = {
  readonly area: ApplicationView;
  readonly paths: Readonly<Partial<Record<ApplicationView, readonly Destination[]>>>;
};

export const INITIAL_NAVIGATION: Navigation = { area: ApplicationView.Rosary, paths: {} };

const BIBLE_CONTENTS: Destination = { kind: DestinationKind.BibleContents };

export const pathIn = (navigation: Navigation, area: ApplicationView): readonly Destination[] =>
  navigation.paths[area] ?? [];

export const pathOf = (navigation: Navigation): readonly Destination[] =>
  pathIn(navigation, navigation.area);

export const destinationOf = (navigation: Navigation): Destination | undefined =>
  pathOf(navigation).at(-1);

const withPath = (
  navigation: Navigation,
  area: ApplicationView,
  path: readonly Destination[],
): Navigation => ({ ...navigation, paths: { ...navigation.paths, [area]: path } });

export const selectArea = (navigation: Navigation, area: ApplicationView): Navigation => ({
  ...navigation,
  area,
});

export const openDestination = (navigation: Navigation, destination: Destination): Navigation =>
  withPath(navigation, navigation.area, [...pathOf(navigation), destination]);

export const goBack = (navigation: Navigation): Navigation =>
  withPath(navigation, navigation.area, pathOf(navigation).slice(0, -1));

export const replaceDestination = (navigation: Navigation, destination: Destination): Navigation =>
  openDestination(goBack(navigation), destination);

export const showArea = (navigation: Navigation, area: ApplicationView): Navigation =>
  selectArea(withPath(navigation, area, []), area);

export const openBible = (navigation: Navigation, bookId: string | null): Navigation => {
  const contents = openDestination(navigation, BIBLE_CONTENTS);

  return bookId === null
    ? contents
    : openDestination(contents, { blockIndex: null, bookId, kind: DestinationKind.BibleBook });
};

export const turnToBook = (navigation: Navigation, bookId: string): Navigation => {
  const previous = goBack(navigation);
  const contents =
    destinationOf(previous)?.kind === DestinationKind.BibleContents
      ? previous
      : openDestination(previous, BIBLE_CONTENTS);

  return openDestination(contents, { blockIndex: 0, bookId, kind: DestinationKind.BibleBook });
};

export const destinationOfRecord = (target: ReferenceTarget): Destination =>
  target.group === ReferenceGroup.Artwork
    ? { artworkId: target.artworkId, kind: DestinationKind.Artwork }
    : { kind: DestinationKind.Reference, target };
