import { CURRENT_LANGUAGE } from './currentLanguage.ts';
import { Language } from './language.ts';
import { ENGLISH_WORDING, type Wording } from './wording/english.ts';
import { SPANISH_WORDING } from './wording/spanish.ts';

const WORDINGS: Readonly<Record<Language, Wording>> = {
  [Language.English]: ENGLISH_WORDING,
  [Language.Spanish]: SPANISH_WORDING,
};

export const wordingOf = (language: Language): Wording => WORDINGS[language];

export const WORDING = wordingOf(CURRENT_LANGUAGE);
