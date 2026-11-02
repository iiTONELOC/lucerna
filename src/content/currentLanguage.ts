import { loadPreferences } from '../state/preferences/storage.ts';
import {
  deviceLanguageTags,
  editionOf,
  languageOf,
  OWN_EDITION_ID,
  type BibleEditionId,
  type Language,
} from './language.ts';
import type { JsonModule } from './schema.ts';

const STORED_PREFERENCES = await loadPreferences();

export const CURRENT_LANGUAGE = languageOf(STORED_PREFERENCES.language, deviceLanguageTags());

type EditionContent = {
  readonly splashVerses: unknown;
  readonly devotional: unknown;
  readonly bibleIndex: unknown;
};

type LoadedEdition = {
  readonly edition: BibleEditionId;
  readonly content: EditionContent;
};

const defaultOf = (module: JsonModule): unknown => module.default;

export const bibleIndexOf = (language: Language, edition: BibleEditionId): Promise<unknown> =>
  import(`../generated/${language}/${edition}/bible/index.json`).then(defaultOf);

export const loadEdition = async (
  language: Language,
  edition: BibleEditionId,
): Promise<LoadedEdition> => {
  const [splashVerses, devotional, bibleIndex] = await Promise.all([
    import(`../generated/${language}/${edition}/splash-verses.json`).then(defaultOf),
    import(`../generated/${language}/${edition}/devotional-content.json`).then(defaultOf),
    bibleIndexOf(language, edition),
  ]);

  return { edition, content: { splashVerses, devotional, bibleIndex } };
};

const LOADED_EDITION = await loadEdition(
  CURRENT_LANGUAGE,
  editionOf(CURRENT_LANGUAGE, STORED_PREFERENCES.bibleChoice),
).catch(() => loadEdition(CURRENT_LANGUAGE, OWN_EDITION_ID[CURRENT_LANGUAGE]));

export const CURRENT_EDITION = LOADED_EDITION.edition;

export const CURRENT_EDITION_CONTENT = LOADED_EDITION.content;
