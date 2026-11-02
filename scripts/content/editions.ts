import {
  BibleEditionId,
  Language,
  LATIN_EDITION_ID,
  OWN_EDITION_ID,
} from '../../src/content/language.ts';
import type { TestamentDefinition } from './bibleBooks.ts';

export type BibleEdition = {
  readonly id: BibleEditionId;
  readonly sourceId: string;
  readonly directory: string;
  readonly extension: string;
  readonly redLetterDatabase: string;
  readonly keepsNotes: boolean;
  readonly versePerParagraph: boolean;
  readonly fileMarkerOf: (code: string) => string;
};

const VULGATE_CODES: Readonly<Record<string, string>> = { JAM: 'JAS' };

export const BIBLE_EDITIONS: Readonly<Record<BibleEditionId, BibleEdition>> = {
  [BibleEditionId.DouayRheims]: {
    id: BibleEditionId.DouayRheims,
    sourceId: 'douay-rheims-challoner',
    directory: 'data/library/bibles/douay-rheims/',
    extension: '.sfm',
    redLetterDatabase: 'data/db/red-letter.json',
    keepsNotes: true,
    versePerParagraph: false,
    fileMarkerOf: (code) => `-${code}-`,
  },
  [BibleEditionId.ClementineVulgate]: {
    id: BibleEditionId.ClementineVulgate,
    sourceId: 'clementine-vulgate',
    directory: 'data/library/bibles/clementine-vulgate/',
    extension: '.usfm',
    redLetterDatabase: 'data/db/red-letter-la.json',
    keepsNotes: false,
    versePerParagraph: true,
    fileMarkerOf: (code) => `-${VULGATE_CODES[code] ?? code}latVUC.`,
  },
  [BibleEditionId.Scio]: {
    id: BibleEditionId.Scio,
    sourceId: 'scio-de-san-miguel',
    directory: 'data/library/bibles/scio/',
    extension: '.usfm',
    redLetterDatabase: 'data/db/red-letter-la.json',
    keepsNotes: false,
    versePerParagraph: true,
    fileMarkerOf: (code) => `-${code}-`,
  },
};

export const LATIN_EDITION = BIBLE_EDITIONS[LATIN_EDITION_ID];

export type ContentLanguage = {
  readonly language: Language;
  readonly ownEdition: BibleEdition;
  readonly bookNameOf: (definition: TestamentDefinition) => string;
  readonly overlayDirectory: string | null;
  readonly libraryDatabase: string | null;
  readonly aiTranslationDatabase: string | null;
  readonly generatedDirectory: string;
};

export const CONTENT_LANGUAGES: Readonly<Record<Language, ContentLanguage>> = {
  [Language.English]: {
    language: Language.English,
    ownEdition: BIBLE_EDITIONS[OWN_EDITION_ID[Language.English]],
    bookNameOf: ({ name }) => name,
    overlayDirectory: null,
    libraryDatabase: 'data/db/library.json',
    aiTranslationDatabase: null,
    generatedDirectory: 'src/generated/en/',
  },
  [Language.Spanish]: {
    language: Language.Spanish,
    ownEdition: BIBLE_EDITIONS[OWN_EDITION_ID[Language.Spanish]],
    bookNameOf: ({ spanishName }) => spanishName,
    overlayDirectory: 'data/db/es/',
    libraryDatabase: 'data/db/es/library.json',
    aiTranslationDatabase: 'data/db/es/ai-translation.json',
    generatedDirectory: 'src/generated/es/',
  },
};

export type ContentReading = ContentLanguage & {
  readonly edition: BibleEdition;
};

export const readingsOf = (contentLanguage: ContentLanguage): readonly ContentReading[] =>
  [contentLanguage.ownEdition, LATIN_EDITION].map((edition) => ({ ...contentLanguage, edition }));

export const generatedReadingDirectoryOf = ({
  edition,
  generatedDirectory,
}: ContentReading): string => `${generatedDirectory}${edition.id}/`;

export const generatedBibleDirectoryOf = (reading: ContentReading): string =>
  `${generatedReadingDirectoryOf(reading)}bible/`;
