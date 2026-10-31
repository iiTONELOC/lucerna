import { describe, expect, test } from 'bun:test';
import { ReferenceGroup, type ArtworkReferenceTarget } from '../references/referenceCatalog.ts';
import { ApplicationView } from './model.ts';
import {
  destinationOf,
  DestinationKind,
  destinationOfRecord,
  goBack,
  INITIAL_NAVIGATION,
  openBible,
  openDestination,
  replaceDestination,
  selectArea,
  showArea,
  turnToBook,
  type Destination,
} from './navigation.ts';

const artwork = (artworkId: string): Destination => ({ artworkId, kind: DestinationKind.Artwork });
const ARTWORK_TARGET: ArtworkReferenceTarget = {
  artworkId: 'a',
  group: ReferenceGroup.Artwork,
  sourceId: 'met',
};
const prayer: Destination = { kind: DestinationKind.Prayer, mysterySetId: 'joyful', run: 1 };

describe('navigation', () => {
  test('back returns to the page that opened the current one', () => {
    const record = openDestination(openDestination(INITIAL_NAVIGATION, artwork('a')), {
      kind: DestinationKind.Reference,
      target: ARTWORK_TARGET,
    });
    const prayed = openDestination(record, prayer);

    expect(destinationOf(goBack(prayed))?.kind).toBe(DestinationKind.Reference);
    expect(destinationOf(goBack(goBack(prayed)))).toEqual(artwork('a'));
    expect(destinationOf(goBack(goBack(goBack(prayed))))).toBeUndefined();
  });

  test('each area keeps its own path', () => {
    const gallery = openDestination(
      selectArea(INITIAL_NAVIGATION, ApplicationView.Gallery),
      artwork('a'),
    );
    const references = selectArea(gallery, ApplicationView.References);

    expect(destinationOf(references)).toBeUndefined();
    expect(destinationOf(selectArea(references, ApplicationView.Gallery))).toEqual(artwork('a'));
  });

  test('stepping between artworks replaces the page', () => {
    const stepped = replaceDestination(
      openDestination(INITIAL_NAVIGATION, artwork('a')),
      artwork('b'),
    );

    expect(destinationOf(stepped)).toEqual(artwork('b'));
    expect(destinationOf(goBack(stepped))).toBeUndefined();
  });

  test('an artwork record from the list opens the artwork page', () => {
    expect(destinationOfRecord(ARTWORK_TARGET)).toEqual(artwork('a'));
  });

  test('show set clears the rosary path and selects it', () => {
    const praying = openDestination(INITIAL_NAVIGATION, prayer);
    const shown = showArea(selectArea(praying, ApplicationView.References), ApplicationView.Rosary);

    expect(shown.area).toBe(ApplicationView.Rosary);
    expect(destinationOf(shown)).toBeUndefined();
  });

  test('the Bible opens over its contents and turning keeps the contents beneath', () => {
    const resumed = openBible(INITIAL_NAVIGATION, 'genesis');
    const turned = turnToBook(resumed, 'exodus');

    expect(destinationOf(resumed)).toEqual({
      blockIndex: null,
      bookId: 'genesis',
      kind: DestinationKind.BibleBook,
    });
    expect(destinationOf(turned)).toEqual({
      blockIndex: 0,
      bookId: 'exodus',
      kind: DestinationKind.BibleBook,
    });
    expect(destinationOf(goBack(turned))).toEqual({ kind: DestinationKind.BibleContents });
  });
});
