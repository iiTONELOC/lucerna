import { createContext, useContext } from 'react';
import { contentCatalog, createContentCatalog, type ContentCatalog } from './catalog.ts';
import {
  CURRENT_EDITION,
  CURRENT_EDITION_CONTENT,
  CURRENT_LANGUAGE,
  loadEdition,
} from './currentLanguage.ts';
import type { BibleEditionId, Language } from './language.ts';
import {
  bibleIndexFrom,
  devotionalContentFrom,
  splashVersesFrom,
  type SplashVerse,
} from './schema.ts';
import { wordingOf } from './wording.ts';
import type { Wording } from './wording/english.ts';

export type ReadingSnapshot = {
  readonly language: Language;
  readonly edition: BibleEditionId;
  readonly catalog: ContentCatalog;
  readonly wording: Wording;
  readonly splashVerses: readonly SplashVerse[];
};

export const INITIAL_READING: ReadingSnapshot = {
  language: CURRENT_LANGUAGE,
  edition: CURRENT_EDITION,
  catalog: contentCatalog,
  wording: wordingOf(CURRENT_LANGUAGE),
  splashVerses: splashVersesFrom(CURRENT_EDITION_CONTENT.splashVerses),
};

export const ReadingContext = createContext(INITIAL_READING);

export const useReading = (): ReadingSnapshot => useContext(ReadingContext);

export const loadReading = async (
  language: Language,
  edition: BibleEditionId,
): Promise<ReadingSnapshot> => {
  const loaded = await loadEdition(language, edition);

  return {
    language,
    edition,
    catalog: createContentCatalog(
      devotionalContentFrom(loaded.content.devotional),
      bibleIndexFrom(loaded.content.bibleIndex),
    ),
    wording: wordingOf(language),
    splashVerses: splashVersesFrom(loaded.content.splashVerses),
  };
};
