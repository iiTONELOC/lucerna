import { expect, test } from 'bun:test';
import { buildBibleContent } from './content/bible.ts';
import { buildDevotionalContent } from './content/devotional.ts';
import { CONTENT_LANGUAGES, LATIN_EDITION } from './content/editions.ts';
import { buildLibraryContent } from './content/library.ts';
import { buildSplashContent } from './build-content.ts';
import { Language } from '../src/content/language.ts';
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
  ReflectionStatus,
  Translation,
  type BibleBook,
} from '../src/content/schema.ts';

const REPOSITORY_ROOT = new URL('../', import.meta.url);
const MISSING_CONTENT = 'Expected built content is missing';

const defined = <Value>(value: Value | undefined): Value => {
  if (value === undefined) {
    throw new TypeError(MISSING_CONTENT);
  }

  return value;
};
const ENGLISH_LANGUAGE = CONTENT_LANGUAGES[Language.English];
const ENGLISH = { ...ENGLISH_LANGUAGE, edition: ENGLISH_LANGUAGE.ownEdition };
const SPANISH = { ...CONTENT_LANGUAGES[Language.Spanish], edition: LATIN_EDITION };

const verseIn = (books: readonly BibleBook[], bookId: string, chapter: number, verse: number) =>
  books
    .find((book) => book.id === bookId)
    ?.chapters.find((candidate) => candidate.number === chapter)
    ?.blocks.flatMap((block) => (block.kind === BibleBlockKind.Paragraph ? block.verses : []))
    .find((candidate) => candidate.number === verse);

test('builds the nine approved splash verses from canonical sources', async () => {
  const verses = await buildSplashContent(REPOSITORY_ROOT, ENGLISH);
  const generated = await Bun.file(
    new URL('../src/generated/en/douay-rheims/splash-verses.json', import.meta.url),
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
  const library = await buildLibraryContent(REPOSITORY_ROOT, ENGLISH);
  const content = await buildDevotionalContent(REPOSITORY_ROOT, library, ENGLISH);
  const generated = devotionalContentFrom(
    await Bun.file(
      new URL('../src/generated/en/douay-rheims/devotional-content.json', import.meta.url),
    ).json(),
  );
  const bible = await buildBibleContent(REPOSITORY_ROOT, ENGLISH);
  const catalog = createContentCatalog(content, bible.index);
  const resolvedLibrary = resolveLibrary(library, catalog.sourceById);
  const mysteries = catalog.rosary.mysterySets.flatMap((mysterySet) => mysterySet.mysteries);
  const annunciation = catalog.mysterySetById('joyful').mysteries[0];

  expect(content).toEqual(generated);
  expect(catalog.sources).toHaveLength(34);
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
  const content = await buildLibraryContent(REPOSITORY_ROOT, ENGLISH);
  const generated = libraryContentFrom(
    await Bun.file(new URL('../src/generated/en/library-content.json', import.meta.url)).json(),
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
  expect(numbered).toHaveLength(536);
});

test('compiles the full Douay-Rheims canon under traditional names', async () => {
  const bible = await buildBibleContent(REPOSITORY_ROOT, ENGLISH);
  const generatedIndex = bibleIndexFrom(
    await Bun.file(
      new URL('../src/generated/en/douay-rheims/bible/index.json', import.meta.url),
    ).json(),
  );
  const generatedMatthew = bibleBookFrom(
    await Bun.file(
      new URL('../src/generated/en/douay-rheims/bible/books/matthew.json', import.meta.url),
    ).json(),
  );
  const names = bible.index.books.map((book) => book.name);

  expect(bible.index).toEqual(generatedIndex);
  expect(bible.index.redLetter).toEqual({
    notice:
      'These markings are a Pray Lucerna aid and do not come directly from the source text. They were prepared with an AI assistant and have not been fully reviewed. Report any errors to lucerna@wedefendit.com.',
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
  const bible = await buildBibleContent(REPOSITORY_ROOT, ENGLISH);
  const bookOf = (id: string) => defined(bible.books.find((book) => book.id === id));
  const firstChapterOf = (id: string) => defined(bookOf(id).chapters[0]);
  const matthew = bookOf('matthew');
  const chapter = firstChapterOf('matthew');
  const verses = chapter.blocks.flatMap((block) =>
    block.kind === BibleBlockKind.Paragraph ? block.verses : [],
  );
  const note = defined(verses.find((verse) => verse.number === 16)).runs.find(
    (run) => run.kind === BibleRunKind.Note,
  );

  expect(matthew.title).toBe('The Holy Gospel of Jesus Christ According to Saint Matthew');
  expect(matthew.chapters).toHaveLength(28);
  expect(chapter.label).toBe('Matthew 1');
  expect(chapter.summary?.[0]?.text).toContain('The genealogy of Christ');
  expect(verses).toHaveLength(25);
  expect(note?.keyword).toBe('The husband of Mary:');
  expect(firstChapterOf('lamentations').number).toBe(0);
  expect(firstChapterOf('lamentations').label).toBe('Preface');
  expect(firstChapterOf('ecclesiasticus').label).toBe('The Prologue.');
  expect(bookOf('psalms').chapters).toHaveLength(150);
});

test('applies the red letter marking to the words of Christ', async () => {
  const bible = await buildBibleContent(REPOSITORY_ROOT, ENGLISH);
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

test('builds the opening verses from the Latin Vulgate under Spanish references', async () => {
  const verses = await buildSplashContent(REPOSITORY_ROOT, SPANISH);
  const generated = await Bun.file(
    new URL('../src/generated/es/clementine-vulgate/splash-verses.json', import.meta.url),
  ).json();

  expect(verses).toHaveLength(9);
  expect(verses).toEqual(generated);
  expect(verses[0]?.reference).toBe('2 Reyes 22,29');
  expect(verses[0]?.text).toBe(
    'Quia tu lucerna mea, Domine, et tu, Domine, illuminabis tenebras meas.',
  );
  expect(verses[0]?.sourceId).toBe('clementine-vulgate');
});

test('starts every quoted passage with a capital letter in both languages', async () => {
  for (const language of [ENGLISH, SPANISH]) {
    const library = await buildLibraryContent(REPOSITORY_ROOT, language);
    const content = await buildDevotionalContent(REPOSITORY_ROOT, library, language);
    const passages = [
      ...(await buildSplashContent(REPOSITORY_ROOT, language)).map(({ text }) => text),
      ...content.rosary.mysterySets.flatMap(({ mysteries }) =>
        mysteries.map(({ scripture }) => scripture.text),
      ),
    ];

    for (const passage of passages) {
      expect(passage.charAt(0)).toBe(passage.charAt(0).toUpperCase());
    }
  }
});

test('compiles the Spanish Rosary over the English structure', async () => {
  const library = await buildLibraryContent(REPOSITORY_ROOT, SPANISH);
  const content = await buildDevotionalContent(REPOSITORY_ROOT, library, SPANISH);
  const english = await buildDevotionalContent(
    REPOSITORY_ROOT,
    await buildLibraryContent(REPOSITORY_ROOT, ENGLISH),
    ENGLISH,
  );
  const generated = devotionalContentFrom(
    await Bun.file(
      new URL('../src/generated/es/clementine-vulgate/devotional-content.json', import.meta.url),
    ).json(),
  );
  const annunciation = defined(content.rosary.mysterySets[0]?.mysteries[0]);

  expect(content).toEqual(generated);
  expect(content.prayers.map((prayer) => prayer.id)).toEqual(
    english.prayers.map((prayer) => prayer.id),
  );
  expect(content.prayers.find((prayer) => prayer.id === 'our-father')?.text).toStartWith(
    'Padre nuestro que estás en el cielo',
  );
  expect(content.rosary.mysterySets[0]?.name).toBe('Misterios Gozosos');
  expect(annunciation.title).toBe('La Encarnación del Hijo de Dios');
  expect(annunciation.fruit).toBe('Humildad');
  expect(annunciation.fruitTranslation).toBe(Translation.Ai);
  expect(annunciation.scripture.reference).toBe('Lucas 1,26-27');
  expect(annunciation.scripture.sourceId).toBe('clementine-vulgate');
  expect(annunciation.scripture.text).toStartWith('In mense autem sexto');
  expect(annunciation.reflection.status).toBe(ReflectionStatus.Mapped);
  expect(annunciation.reflection.translation).toBe(Translation.Ai);
  expect(annunciation.reflection.text).toStartWith(
    'Te ofrecemos, Señor Jesús, esta primera decena',
  );
  expect(annunciation.artIds).toEqual(defined(english.rosary.mysterySets[0]?.mysteries[0]).artIds);
  expect(content.rosary.guidance.translation).toBe(Translation.Ai);
  expect(content.rosary.guidance.decadeHailMarys.text).toContain('{mystery}');
  expect(content.rosary.schedule).toEqual(english.rosary.schedule);
});

test('gives every Latin verse its own block as the English does', async () => {
  const bible = await buildBibleContent(REPOSITORY_ROOT, SPANISH);
  const genesis = bible.books.find((book) => book.id === 'genesis');
  const paragraphs = genesis?.chapters.flatMap((chapter) =>
    chapter.blocks.filter((block) => block.kind === BibleBlockKind.Paragraph),
  );

  expect(paragraphs?.length).toBeGreaterThan(1000);
  for (const paragraph of paragraphs ?? []) {
    expect(paragraph.kind === BibleBlockKind.Paragraph ? paragraph.verses : []).toHaveLength(1);
  }
});

test('titles the Latin books in mixed case as the English does', async () => {
  const bible = await buildBibleContent(REPOSITORY_ROOT, SPANISH);
  const titleOf = (id: string): string | undefined =>
    bible.books.find((book) => book.id === id)?.title;

  expect(titleOf('genesis')).toBe('Incipit Liber Beresit id est Genesis');
  expect(titleOf('1-corinthians')).toBe('Incipit ad Corinthios I');
  expect(titleOf('matthew')).toBe('Incipit Evangelium secundum Mattheum');
  expect(bible.books.filter((book) => book.title === book.title.toUpperCase())).toEqual([]);
});

test('gives every source record in the reader language', async () => {
  const englishLatin = { ...ENGLISH_LANGUAGE, edition: LATIN_EDITION };
  const sourceOf = async (language: typeof SPANISH, sourceId: string) => {
    const library = await buildLibraryContent(REPOSITORY_ROOT, language);
    const content = await buildDevotionalContent(REPOSITORY_ROOT, library, language);

    return content.sources.find(({ id }) => id === sourceId);
  };

  expect((await sourceOf(englishLatin, 'clementine-vulgate'))?.approval).toBe('public domain');
  expect((await sourceOf(englishLatin, 'holy-see-compendium-es'))?.work).toBe(
    'Compendium of the Catechism of the Catholic Church (Spanish edition)',
  );
  expect((await sourceOf(SPANISH, 'douay-rheims-challoner'))?.approval).toBe('dominio público');
  expect((await buildSplashContent(REPOSITORY_ROOT, englishLatin))[0]?.sourceLabel).toBe(
    'Clementine Vulgate (1598), with the Glossa Ordinaria (Migne edition, 1880)',
  );
  expect((await buildSplashContent(REPOSITORY_ROOT, SPANISH))[0]?.sourceLabel).toBe(
    'Biblia Vulgata Clementina (1598), con la Glosa ordinaria (edición Migne, 1880)',
  );
});

test('compiles the Spanish Secret of the Rosary over the English structure', async () => {
  const english = (await buildLibraryContent(REPOSITORY_ROOT, ENGLISH)).works[0];
  const spanish = (await buildLibraryContent(REPOSITORY_ROOT, SPANISH)).works[0];

  expect(spanish?.title).toBe('El secreto admirable del Santísimo Rosario');
  expect(spanish?.translation).toBe(Translation.Ai);
  expect(spanish?.sourceId).toBe(english?.sourceId);
  expect(spanish?.blocks.map((block) => block.kind)).toEqual(
    english?.blocks.map((block) => block.kind),
  );
  expect(spanish?.blocks[0]).toEqual({
    kind: LibraryBlockKind.Heading,
    level: LibraryHeadingLevel.Part,
    text: 'Rosa blanca',
  });
});

test('compiles the Clementine Vulgate under Spanish names without the Glossa', async () => {
  const bible = await buildBibleContent(REPOSITORY_ROOT, SPANISH);
  const english = await buildBibleContent(REPOSITORY_ROOT, ENGLISH);
  const names = bible.index.books.map((book) => book.name);
  const runs = bible.books.flatMap((book) =>
    book.chapters.flatMap((chapter) =>
      chapter.blocks.flatMap((block) =>
        block.kind === BibleBlockKind.Paragraph ? block.verses.flatMap((verse) => verse.runs) : [],
      ),
    ),
  );

  expect(bible.index.sourceId).toBe('clementine-vulgate');
  expect(bible.index.books.map((book) => book.id)).toEqual(
    english.index.books.map((book) => book.id),
  );
  expect(names).toContain('Apocalipsis');
  expect(names).toContain('Santiago');
  expect(runs.some((run) => run.kind === BibleRunKind.Note)).toBe(false);
  expect(verseIn(bible.books, 'matthew', 5, 3)?.runs.map((run) => run.kind)).toEqual([
    BibleRunKind.Christ,
  ]);
  expect(
    verseIn(bible.books, 'matthew', 3, 15)?.runs.every((run) => run.kind !== BibleRunKind.Christ),
  ).toBe(true);
  expect(bible.index.redLetter.notice).toStartWith('Estas marcas son una ayuda de Pray Lucerna');
});
