import {
  field,
  invalid,
  nonEmpty,
  recordFrom,
  refine,
  shape,
  stringFrom,
  taggedUnion,
  variant,
} from './shape.ts';

export enum SourceType {
  Apparatus = 'apparatus',
  Art = 'art',
  Bible = 'bible',
  Liturgical = 'liturgical',
  Magisterial = 'magisterial',
  Prayer = 'prayer',
  Text = 'text',
}

export const DEVOTIONAL_SCHEMA_VERSION = 1;

const DEVOTIONAL_SOURCE = shape({
  id: field.string(),
  work: field.string(),
  author: field.string(),
  approval: field.string(),
  url: field.string(),
  type: field.member(SourceType),
  path: field.optional(field.string()),
  translator: field.optional(field.string()),
  publisher: field.optional(field.string()),
  published: field.optional(field.string()),
  citationUrl: field.optional(field.string()),
  renewalSearchUrl: field.optional(field.string()),
  note: field.optional(field.string()),
});

export type DevotionalSource = ReturnType<typeof DEVOTIONAL_SOURCE>;

const PRAYER = shape({
  id: field.string(),
  title: field.string(),
  text: field.string(),
  sourceId: field.string(),
});

export type Prayer = ReturnType<typeof PRAYER>;

const ARTWORK = shape({
  id: field.string(),
  artist: field.string(),
  title: field.string(),
  date: field.string(),
  holder: field.string(),
  url: field.string(),
  file: field.string(),
  width: field.integer(1),
  height: field.integer(1),
  sourceId: field.string(),
  accession: field.optional(field.string()),
  photographer: field.optional(field.string()),
  dateSource: field.optional(field.string()),
});

export type Artwork = ReturnType<typeof ARTWORK>;

const RED_SPAN = shape({ start: field.integer(0), end: field.integer(0) });

export type ScriptureRedSpan = ReturnType<typeof RED_SPAN>;

const SCRIPTURE = shape({
  reference: field.string(),
  book: field.string(),
  bookAlias: field.optional(field.string()),
  chapter: field.integer(1),
  verseStart: field.integer(1),
  verseEnd: field.integer(1),
  sourceId: field.string(),
  selectionSourceId: field.string(),
  text: field.string(),
  red: field.optional(nonEmpty(field.array(field.nested(RED_SPAN)))),
});

export type ScripturePassage = ReturnType<typeof SCRIPTURE>;

const redSpansInside = ({ red, text }: ScripturePassage, path: string): void => {
  red?.forEach((span, index) => {
    if (span.end <= span.start || span.end > text.length) {
      invalid(`${path}.red[${index}]`);
    }
  });
};

export enum ReflectionStatus {
  Candidate = 'candidate',
  Mapped = 'mapped',
}

const REFLECTION = shape({
  status: field.member(ReflectionStatus),
  sourceId: field.string(),
  mappingType: field.string(),
  sectionId: field.string(),
  locator: field.string(),
  sourceTitle: field.string(),
  theme: field.string(),
  note: field.optional(field.string()),
  text: field.optional(field.string()),
  blockIndex: field.optional(field.integer(1)),
});

export type MysteryReflection = ReturnType<typeof REFLECTION>;

const MYSTERY = shape({
  set: field.string(),
  ordinal: field.integer(1),
  title: field.string(),
  titleSourceId: field.string(),
  fruit: field.string(),
  fruitSourceId: field.string(),
  scripture: refine(field.nested(SCRIPTURE), redSpansInside),
  reflection: field.nested(REFLECTION),
  artIds: nonEmpty(field.array(field.string())),
});

export type Mystery = ReturnType<typeof MYSTERY>;

const MYSTERY_SET = shape({
  id: field.string(),
  ordinal: field.integer(1),
  name: field.string(),
  nameSourceId: field.string(),
  mysteries: field.array(field.nested(MYSTERY)),
});

export type MysterySet = ReturnType<typeof MYSTERY_SET>;

const SOURCE_REFERENCE = shape({
  sourceId: field.string(),
  locator: field.string(),
  sections: field.optional(field.array(field.string())),
});

export type SourceReference = ReturnType<typeof SOURCE_REFERENCE>;

const GUIDANCE_STATEMENT_FIELDS = {
  text: field.string(),
  sourceId: field.string(),
  sourceRefs: field.array(field.nested(SOURCE_REFERENCE)),
};

const GUIDANCE_STATEMENT = shape(GUIDANCE_STATEMENT_FIELDS);

export type GuidanceStatement = ReturnType<typeof GUIDANCE_STATEMENT>;

const STATEMENT = field.nested(GUIDANCE_STATEMENT);

const GUIDANCE = shape({
  settings: field.nested(shape({ preferenceId: field.string(), default: field.boolean() })),
  sourceIds: field.array(field.string()),
  silentSteps: field.array(field.string()),
  openingHailMarys: field.array(
    field.nested(shape({ ...GUIDANCE_STATEMENT_FIELDS, repetition: field.integer(1) })),
  ),
  mysteryAnnouncement: STATEMENT,
  decadeOurFather: STATEMENT,
  decadeHailMarys: STATEMENT,
  decadeGloryBe: STATEMENT,
  fatimaPrayer: STATEMENT,
  hailHolyQueen: STATEMENT,
  finalPrayer: STATEMENT,
  fruitLine: field.nested(
    shape({
      note: field.string(),
      sourceId: field.string(),
      sourceRefs: field.array(field.nested(SOURCE_REFERENCE)),
    }),
  ),
});

export type RosaryGuidance = ReturnType<typeof GUIDANCE>;

export const guidanceStatementsOf = (guidance: RosaryGuidance): readonly GuidanceStatement[] => [
  ...guidance.openingHailMarys,
  guidance.mysteryAnnouncement,
  guidance.decadeOurFather,
  guidance.decadeHailMarys,
  guidance.decadeGloryBe,
  guidance.fatimaPrayer,
  guidance.hailHolyQueen,
  guidance.finalPrayer,
];

export enum LiturgicalSeason {
  Advent = 'advent',
  Christmas = 'christmas',
  Lent = 'lent',
}

const SEASONAL_SUNDAY_RULE = shape({
  season: field.member(LiturgicalSeason),
  mysterySetId: field.string(),
  sourceId: field.string(),
});

export type SeasonalSundayRule = ReturnType<typeof SEASONAL_SUNDAY_RULE>;

const ROSARY = shape({
  devotion: field.string(),
  schedule: field.nested(
    shape({
      sunday: field.string(),
      monday: field.string(),
      tuesday: field.string(),
      wednesday: field.string(),
      thursday: field.string(),
      friday: field.string(),
      saturday: field.string(),
      sourceId: field.string(),
      seasonalSundays: field.array(field.nested(SEASONAL_SUNDAY_RULE)),
    }),
  ),
  prayerIds: field.array(field.string()),
  mysterySets: field.array(field.nested(MYSTERY_SET)),
  prayerStageArt: field.record(field.array(field.string())),
  guidance: field.nested(GUIDANCE),
});

export type RosaryContent = ReturnType<typeof ROSARY>;

const DEVOTIONAL_CONTENT = shape({
  schemaVersion: field.literal(DEVOTIONAL_SCHEMA_VERSION),
  sources: field.array(field.nested(DEVOTIONAL_SOURCE)),
  prayers: field.array(field.nested(PRAYER)),
  artworks: field.array(field.nested(ARTWORK)),
  rosary: field.nested(ROSARY),
});

export type DevotionalContent = ReturnType<typeof DEVOTIONAL_CONTENT>;

export const devotionalContentFrom = (value: unknown): DevotionalContent =>
  DEVOTIONAL_CONTENT(recordFrom(value, 'root'), '');

export const LIBRARY_SCHEMA_VERSION = 1;

export enum LibraryCategory {
  Scripture = 'scripture',
  Devotions = 'devotions',
}

export enum LibraryBlockKind {
  Heading = 'heading',
  Paragraph = 'paragraph',
  Verse = 'verse',
}

export enum LibraryHeadingLevel {
  Part = 1,
  Chapter = 2,
  Subheading = 3,
}

const LIBRARY_BLOCK = taggedUnion([
  variant([LibraryBlockKind.Heading], {
    level: field.member(LibraryHeadingLevel),
    text: field.string(),
    short: field.optional(field.string()),
  }),
  variant([LibraryBlockKind.Paragraph], {
    text: field.string(),
    number: field.optional(field.integer(1)),
  }),
  variant([LibraryBlockKind.Verse], { lines: field.array(field.string()) }),
]);

export type LibraryBlock = ReturnType<typeof LIBRARY_BLOCK>;

export type LibraryHeading = Extract<LibraryBlock, { readonly kind: LibraryBlockKind.Heading }>;

export type LibraryParagraph = Extract<LibraryBlock, { readonly kind: LibraryBlockKind.Paragraph }>;

export type LibraryVerse = Extract<LibraryBlock, { readonly kind: LibraryBlockKind.Verse }>;

const LIBRARY_WORK = shape({
  id: field.string(),
  title: field.string(),
  author: field.string(),
  sourceId: field.string(),
  category: field.member(LibraryCategory),
  blocks: nonEmpty(field.array(field.nested(LIBRARY_BLOCK))),
});

export type LibraryWork = ReturnType<typeof LIBRARY_WORK>;

const LIBRARY_CONTENT = shape({
  schemaVersion: field.literal(LIBRARY_SCHEMA_VERSION),
  works: field.array(field.nested(LIBRARY_WORK)),
});

export type LibraryContent = ReturnType<typeof LIBRARY_CONTENT>;

export const libraryContentFrom = (value: unknown): LibraryContent =>
  LIBRARY_CONTENT(recordFrom(value, 'root'), '');

export const BIBLE_SCHEMA_VERSION = 1;

export enum BibleTestament {
  Old = 'old',
  New = 'new',
}

export enum BibleRunKind {
  Text = 'text',
  Christ = 'christ',
  Note = 'note',
  Reference = 'reference',
}

const TEXT_RUN = { text: field.string() };

const BIBLE_RUN = taggedUnion([
  variant([BibleRunKind.Text, BibleRunKind.Christ], TEXT_RUN),
  variant([BibleRunKind.Note], { ...TEXT_RUN, keyword: field.optional(field.string()) }),
  variant([BibleRunKind.Reference], TEXT_RUN),
]);

export type BibleRun = ReturnType<typeof BIBLE_RUN>;

export type BibleNoteRun = Extract<BibleRun, { readonly kind: BibleRunKind.Note }>;

const RUNS = nonEmpty(field.array(field.nested(BIBLE_RUN)));

export enum BibleBlockKind {
  SectionHeading = 'section-heading',
  PsalmTitle = 'psalm-title',
  Acrostic = 'acrostic',
  Paragraph = 'paragraph',
}

const BIBLE_VERSE = shape({
  runs: RUNS,
  number: field.optional(field.integer(1)),
  label: field.optional(field.string()),
});

export type BibleVerse = ReturnType<typeof BIBLE_VERSE>;

const BIBLE_BLOCK = taggedUnion([
  variant([BibleBlockKind.SectionHeading, BibleBlockKind.PsalmTitle, BibleBlockKind.Acrostic], {
    runs: RUNS,
  }),
  variant([BibleBlockKind.Paragraph], {
    verses: nonEmpty(field.array(field.nested(BIBLE_VERSE))),
  }),
]);

export type BibleBlock = ReturnType<typeof BIBLE_BLOCK>;

const BIBLE_CHAPTER = shape({
  number: field.integer(0),
  label: field.string(),
  blocks: nonEmpty(field.array(field.nested(BIBLE_BLOCK))),
  summary: field.optional(RUNS),
});

export type BibleChapter = ReturnType<typeof BIBLE_CHAPTER>;

const BIBLE_BOOK = shape({
  schemaVersion: field.literal(BIBLE_SCHEMA_VERSION),
  id: field.string(),
  name: field.string(),
  title: field.string(),
  chapters: nonEmpty(field.array(field.nested(BIBLE_CHAPTER))),
  introduction: field.optional(RUNS),
});

export type BibleBook = ReturnType<typeof BIBLE_BOOK>;

export const bibleBookFrom = (value: unknown): BibleBook =>
  BIBLE_BOOK(value, `bibleBook(${stringFrom(recordFrom(value, 'bibleBook'), 'id', 'bibleBook')})`);

const BIBLE_BOOK_SUMMARY = shape({
  id: field.string(),
  name: field.string(),
  testament: field.member(BibleTestament),
  chapterCount: field.integer(1),
});

export type BibleBookSummary = ReturnType<typeof BIBLE_BOOK_SUMMARY>;

const BIBLE_RED_LETTER = shape({
  notice: field.string(),
  witnessSourceIds: nonEmpty(field.array(field.string())),
  toolSourceIds: nonEmpty(field.array(field.string())),
});

export type BibleRedLetter = ReturnType<typeof BIBLE_RED_LETTER>;

const uniqueBookIds = (books: readonly BibleBookSummary[], path: string): void => {
  if (new Set(books.map((book) => book.id)).size !== books.length) {
    invalid(path);
  }
};

const BIBLE_INDEX = shape({
  schemaVersion: field.literal(BIBLE_SCHEMA_VERSION),
  sourceId: field.string(),
  redLetter: field.nested(BIBLE_RED_LETTER),
  books: refine(nonEmpty(field.array(field.nested(BIBLE_BOOK_SUMMARY))), uniqueBookIds),
});

export type BibleIndex = ReturnType<typeof BIBLE_INDEX>;

export const bibleIndexFrom = (value: unknown): BibleIndex => BIBLE_INDEX(value, 'bibleIndex');
