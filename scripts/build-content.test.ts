import { expect, test } from 'bun:test';
import { buildBibleContent } from './content/bible.ts';
import { buildDevotionalContent } from './content/devotional.ts';
import { buildLibraryContent } from './content/library.ts';
import { buildSplashContent } from './build-content.ts';
import {
  CatalogLookupError,
  createContentCatalog,
  resolveLibrary,
} from '../src/content/catalog.ts';
import {
  BibleBlockKind,
  bibleBookFrom,
  bibleIndexFrom,
  BibleRunKind,
  BibleTestament,
  devotionalContentFrom,
  LibraryBlockKind,
  LibraryCategory,
  LibraryHeadingLevel,
  libraryContentFrom,
} from '../src/content/schema.ts';

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
  const library = await buildLibraryContent(repositoryRoot);
  const content = await buildDevotionalContent(repositoryRoot, library);
  const generated = devotionalContentFrom(
    await Bun.file(new URL('../src/generated/devotional-content.json', import.meta.url)).json(),
  );
  const bible = await buildBibleContent(repositoryRoot);
  const catalog = createContentCatalog(content, bible.index);
  const resolvedLibrary = resolveLibrary(library, catalog.sourceById);
  const mysteries = catalog.rosary.mysterySets.flatMap((mysterySet) => mysterySet.mysteries);
  const annunciation = catalog.mysterySetById('joyful').mysteries[0];

  expect(content).toEqual(generated);
  expect(catalog.sources).toHaveLength(23);
  expect(catalog.prayers).toHaveLength(8);
  expect(catalog.artworks).toHaveLength(120);
  expect(catalog.rosary.mysterySets).toHaveLength(4);
  expect(mysteries).toHaveLength(20);
  expect(annunciation?.artworks[0]?.id).toBe('hans-memling--the-annunciation');
  expect(annunciation?.provenance.scripture.id).toBe('douay-rheims-challoner');
  expect(catalog.rosary.prayerStageArt['hail-mary']).toHaveLength(13);
  expect(resolvedLibrary.works).toHaveLength(1);
  expect(resolvedLibrary.workById('de-montfort-secret').source.work).toBe(
    'The Secret of the Rosary',
  );
  expect(catalog.bible.books).toHaveLength(73);
  expect(catalog.bible.source.id).toBe('douay-rheims-challoner');

  for (const lookup of [
    catalog.sourceById,
    catalog.prayerById,
    catalog.artworkById,
    catalog.mysterySetById,
    resolvedLibrary.workById,
  ]) {
    expect(() => lookup('missing-record')).toThrow(CatalogLookupError);
  }
});

test('compiles The Secret of the Rosary into the library reading model', async () => {
  const content = await buildLibraryContent(new URL('../', import.meta.url));
  const generated = libraryContentFrom(
    await Bun.file(new URL('../src/generated/library-content.json', import.meta.url)).json(),
  );
  const work = content.works[0];
  const blocks = work?.blocks ?? [];
  const headings = blocks.filter((block) => block.kind === LibraryBlockKind.Heading);
  const numbered = blocks.filter(
    (block) => block.kind === LibraryBlockKind.Paragraph && block.number !== undefined,
  );

  expect(content).toEqual(generated);
  expect(content.works).toHaveLength(1);
  expect(work?.id).toBe('de-montfort-secret');
  expect(work?.title).toBe('The Secret of the Rosary');
  expect(work?.category).toBe(LibraryCategory.Devotions);
  expect(blocks).toHaveLength(1521);
  expect(blocks[0]).toEqual({
    kind: LibraryBlockKind.Heading,
    level: LibraryHeadingLevel.Part,
    text: 'A White Rose',
  });
  expect(blocks[1]).toEqual({
    kind: LibraryBlockKind.Heading,
    level: LibraryHeadingLevel.Subheading,
    text: 'For Priests',
  });
  expect(headings.filter((heading) => heading.level === LibraryHeadingLevel.Part)).toHaveLength(10);
  expect(headings.filter((heading) => heading.level === LibraryHeadingLevel.Chapter)).toHaveLength(
    55,
  );
  expect(headings.map((heading) => heading.text)).toContain('Third Method (Book of Sermons)');
  expect(blocks.filter((block) => block.kind === LibraryBlockKind.Verse)).toHaveLength(3);
  expect(numbered).toHaveLength(534);
});

test('compiles the full Douay-Rheims canon under traditional names', async () => {
  const bible = await buildBibleContent(new URL('../', import.meta.url));
  const generatedIndex = bibleIndexFrom(
    await Bun.file(
      new URL('../src/generated/bible/douay-rheims/index.json', import.meta.url),
    ).json(),
  );
  const generatedMatthew = bibleBookFrom(
    await Bun.file(
      new URL('../src/generated/bible/douay-rheims/matthew.json', import.meta.url),
    ).json(),
  );
  const names = bible.index.books.map((book) => book.name);

  expect(bible.index).toEqual(generatedIndex);
  expect(bible.index.redLetter).toEqual({
    notice:
      'These markings are a Lucerna aid and do not come directly from the source text. They were prepared with an AI assistant using public-domain tagged Bible editions and have not been fully reviewed; errors are possible. Report any to lucerna@wedefendit.com.',
    witnessSourceIds: ['world-english-bible', 'king-james-version'],
    toolSourceIds: ['claude-fable-5'],
  });
  expect(bible.books).toHaveLength(73);
  expect(bible.index.books.filter((book) => book.testament === BibleTestament.Old)).toHaveLength(
    46,
  );
  expect(bible.index.books.filter((book) => book.testament === BibleTestament.New)).toHaveLength(
    27,
  );
  expect(names).toContain('Apocalypse');
  expect(names).toContain('Canticle of Canticles');
  expect(names).toContain('1 Paralipomenon');
  expect(names).not.toContain('Revelation');
  expect(bible.books.find((book) => book.id === 'matthew')).toEqual(generatedMatthew);
});

test('parses chapters, verses, and Challoner notes faithfully', async () => {
  const bible = await buildBibleContent(new URL('../', import.meta.url));
  const bookById = new Map(bible.books.map((book) => [book.id, book]));
  const matthew = bookById.get('matthew');
  const chapter = matthew?.chapters[0];
  const verses = (chapter?.blocks ?? []).flatMap((block) =>
    block.kind === BibleBlockKind.Paragraph ? block.verses : [],
  );
  const note = verses
    .find((verse) => verse.number === 16)
    ?.runs.find((run) => run.kind === BibleRunKind.Note);

  expect(matthew?.title).toBe('The Holy Gospel of Jesus Christ According to Saint Matthew');
  expect(matthew?.chapters).toHaveLength(28);
  expect(chapter?.label).toBe('Matthew 1');
  expect(chapter?.summary?.[0]?.text).toContain('The genealogy of Christ');
  expect(verses).toHaveLength(25);
  expect(note?.keyword).toBe('The husband of Mary:');
  expect(bookById.get('lamentations')?.chapters[0]?.number).toBe(0);
  expect(bookById.get('lamentations')?.chapters[0]?.label).toBe('Preface');
  expect(bookById.get('ecclesiasticus')?.chapters[0]?.label).toBe('The Prologue.');
  expect(bookById.get('psalms')?.chapters).toHaveLength(150);
});

test('applies the red letter marking to the words of Christ', async () => {
  const bible = await buildBibleContent(new URL('../', import.meta.url));
  const bookById = new Map(bible.books.map((book) => [book.id, book]));
  const verseAt = (bookId: string, chapterNumber: number, verseNumber: number) =>
    bookById
      .get(bookId)
      ?.chapters.find((chapter) => chapter.number === chapterNumber)
      ?.blocks.flatMap((block) => (block.kind === BibleBlockKind.Paragraph ? block.verses : []))
      .find((verse) => verse.number === verseNumber);

  const baptism = verseAt('matthew', 3, 15);
  const beatitude = verseAt('matthew', 5, 3);
  const understood = verseAt('matthew', 13, 51);
  const fatherVoice = verseAt('matthew', 3, 17);
  const genesis = bookById.get('genesis');

  expect(baptism?.runs.map((run) => run.kind)).toEqual([
    BibleRunKind.Text,
    BibleRunKind.Christ,
    BibleRunKind.Text,
  ]);
  expect(baptism?.runs[1]?.text).toBe(
    'Suffer it to be so now. For so it becometh us to fulfil all justice.',
  );
  expect(beatitude?.runs[0]?.kind).toBe(BibleRunKind.Christ);
  expect(understood?.runs.map((run) => run.kind)).toEqual([BibleRunKind.Christ, BibleRunKind.Text]);
  expect(fatherVoice?.runs.every((run) => run.kind !== BibleRunKind.Christ)).toBe(true);
  expect(
    genesis?.chapters.every((chapter) =>
      chapter.blocks.every(
        (block) =>
          block.kind !== BibleBlockKind.Paragraph ||
          block.verses.every((verse) =>
            verse.runs.every((run) => run.kind !== BibleRunKind.Christ),
          ),
      ),
    ),
  ).toBe(true);
});
