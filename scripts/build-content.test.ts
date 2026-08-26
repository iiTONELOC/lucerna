import { expect, test } from 'bun:test';
import { buildDevotionalContent } from './content/devotional.ts';
import { buildSplashContent } from './build-content.ts';
import { CatalogLookupError, createContentCatalog } from '../src/content/catalog.ts';
import { devotionalContentFrom } from '../src/content/schema.ts';

test('builds the nine approved splash verses from canonical sources', async () => {
  const verses = await buildSplashContent(new URL('../', import.meta.url));
  const generated = await Bun.file(
    new URL('../src/generated/splash-verses.json', import.meta.url),
  ).json();

  expect(verses).toHaveLength(9);
  expect(verses).toEqual(generated);
  expect(verses[0]).toEqual({
    reference: '2 Samuel 22:29',
    text: 'For thou art my lamp O Lord: and thou, O Lord, wilt enlighten my darkness.',
    sourceId: 'douay-rheims-challoner',
    sourceLabel: 'Douay-Rheims Bible, Challoner Revision (DRC 1750)',
  });
  expect(verses[8]?.text).toBe(
    'Thou shalt no more have the sun for thy light by day, neither shall the brightness of the moon enlighten thee: but the Lord shall be unto thee for an everlasting light, and thy God for thy glory.',
  );
});

test('compiles the complete devotional catalog from canonical records', async () => {
  const repositoryRoot = new URL('../', import.meta.url);
  const content = await buildDevotionalContent(repositoryRoot);
  const generated = devotionalContentFrom(
    await Bun.file(new URL('../src/generated/devotional-content.json', import.meta.url)).json(),
  );
  const catalog = createContentCatalog(content);
  const mysteries = catalog.rosary.mysterySets.flatMap((mysterySet) => mysterySet.mysteries);
  const annunciation = catalog.mysterySetById('joyful').mysteries[0];

  expect(content).toEqual(generated);
  expect(catalog.sources).toHaveLength(16);
  expect(catalog.prayers).toHaveLength(8);
  expect(catalog.artworks).toHaveLength(74);
  expect(catalog.rosary.mysterySets).toHaveLength(4);
  expect(mysteries).toHaveLength(20);
  expect(annunciation?.artwork.id).toBe('hans-memling--the-annunciation');
  expect(annunciation?.provenance.scripture.id).toBe('douay-rheims-challoner');
  expect(catalog.rosary.prayerStageArt['hail-mary']).toHaveLength(10);

  for (const lookup of [
    catalog.sourceById,
    catalog.prayerById,
    catalog.artworkById,
    catalog.mysterySetById,
  ]) {
    expect(() => lookup('missing-record')).toThrow(CatalogLookupError);
  }
});
