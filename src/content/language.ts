import { capitalize } from '../shared/text.ts';

export enum Language {
  English = 'en',
  Spanish = 'es',
}

export const LANGUAGES: readonly Language[] = Object.values(Language);

export enum LanguageChoice {
  System = 'system',
  English = Language.English,
  Spanish = Language.Spanish,
}

export const LANGUAGE_CHOICES: readonly LanguageChoice[] = Object.values(LanguageChoice);

export enum BibleEditionId {
  DouayRheims = 'douay-rheims',
  ClementineVulgate = 'clementine-vulgate',
  Scio = 'scio',
}

export const LATIN_EDITION_ID = BibleEditionId.ClementineVulgate;

export const OWN_EDITION_ID: Readonly<Record<Language, BibleEditionId>> = {
  [Language.English]: BibleEditionId.DouayRheims,
  [Language.Spanish]: BibleEditionId.Scio,
};

export enum BibleChoice {
  Own = 'own',
  Latin = 'latin',
}

export const BIBLE_CHOICES: readonly BibleChoice[] = Object.values(BibleChoice);

export const editionOf = (language: Language, choice: BibleChoice): BibleEditionId =>
  choice === BibleChoice.Latin ? LATIN_EDITION_ID : OWN_EDITION_ID[language];

export const editionAssetPrefixOf = (language: Language, edition: BibleEditionId): string =>
  `${language}-${edition}-`;

export const readingEditionsOf = (language: Language): readonly BibleEditionId[] => [
  OWN_EDITION_ID[language],
  LATIN_EDITION_ID,
];

export const languageName = (language: Language): string =>
  capitalize(new Intl.DisplayNames([language], { type: 'language' }).of(language) ?? language);

const VERSE_SEPARATORS: Readonly<Record<Language, string>> = {
  [Language.English]: ':',
  [Language.Spanish]: ',',
};

const primarySubtagOf = (tag: string): string => tag.toLowerCase().split('-')[0] ?? '';

export const languageFrom = (tags: readonly string[]): Language => {
  for (const tag of tags) {
    const language = LANGUAGES.find((candidate) => candidate === primarySubtagOf(tag));

    if (language !== undefined) {
      return language;
    }
  }

  return Language.English;
};

export const verseLocatorOf = (language: Language, chapter: number, verses: string): string =>
  `${String(chapter)}${VERSE_SEPARATORS[language]}${verses}`;

export const languageOf = (choice: LanguageChoice, tags: readonly string[]): Language => {
  switch (choice) {
    case LanguageChoice.System:
      return languageFrom(tags);
    case LanguageChoice.English:
      return Language.English;
    case LanguageChoice.Spanish:
      return Language.Spanish;
  }
};

export const deviceLanguageTags = (): readonly string[] =>
  typeof navigator === 'undefined' ? [] : (navigator.languages ?? []);

export const editionInLanguage = (language: Language, edition: BibleEditionId): BibleEditionId =>
  edition === LATIN_EDITION_ID ? edition : OWN_EDITION_ID[language];
