import { arrayFrom, positiveIntegerFrom, recordFrom, stringFrom } from '../../src/content/shape.ts';
import { isRecord } from '../../src/shared/guards.ts';
import type { ContentLanguage } from './editions.ts';
import { buildFailure, ContentBuildErrorCode, readJsonFile } from './records.ts';

type JsonRecord = Record<string, unknown>;

export type LanguageContent = {
  readonly prayers: unknown;
  readonly rosary: unknown;
};

const PRAYER_OVERLAY = 'prayers.json';
const ROSARY_OVERLAY = 'rosary.json';
const SOURCE_OVERLAY = 'sources.json';
const SOURCE_TEXT_FIELDS: readonly string[] = ['work', 'author', 'approval'];
const SOURCE_NOTE = 'note';
const OPENING_HAIL_MARYS = 'openingHailMarys';
const TRANSLATION = 'translation';

const fail = buildFailure(ContentBuildErrorCode.InvalidField);

const recordsOf = (value: unknown, path: string): readonly JsonRecord[] =>
  arrayFrom(value, path).map((record, index) => recordFrom(record, `${path}[${String(index)}]`));

const keyedBy = (
  records: readonly JsonRecord[],
  keyOf: (record: JsonRecord) => string,
  path: string,
): ReadonlyMap<string, JsonRecord> => {
  const keyed = new Map(records.map((record) => [keyOf(record), record]));

  if (keyed.size !== records.length) {
    fail(`duplicate ${path}`);
  }

  return keyed;
};

const translationOf = (
  translations: ReadonlyMap<string, JsonRecord>,
  key: string,
  path: string,
): JsonRecord => translations.get(key) ?? fail(`${path} ${key}`);

const overlaidPrayers = (english: unknown, overlay: unknown): readonly JsonRecord[] => {
  const prayers = recordsOf(english, 'prayers');
  const translations = keyedBy(
    recordsOf(overlay, 'overlay.prayers'),
    (record) => stringFrom(record, 'id', 'overlay.prayers'),
    'overlay.prayers',
  );

  if (translations.size !== prayers.length) {
    fail('overlay.prayers count');
  }

  return prayers.map((prayer) => {
    const id = stringFrom(prayer, 'id', 'prayers');
    const translation = translationOf(translations, id, 'overlay.prayers');

    return {
      ...prayer,
      title: stringFrom(translation, 'title', id),
      text: stringFrom(translation, 'text', id),
      sourceId: stringFrom(translation, 'sourceId', id),
    };
  });
};

const overlaidMystery = (
  mystery: JsonRecord,
  translation: JsonRecord,
  path: string,
): JsonRecord => ({
  ...mystery,
  title: stringFrom(translation, 'title', path),
  titleSourceId: stringFrom(translation, 'titleSourceId', path),
  fruit: stringFrom(translation, 'fruit', path),
  fruitTranslation: stringFrom(translation, 'fruitTranslation', path),
});

const overlaidMysterySet = (mysterySet: JsonRecord, translation: JsonRecord): JsonRecord => {
  const id = stringFrom(mysterySet, 'id', 'mysterySets');
  const mysteries = recordsOf(mysterySet['mysteries'], `${id}.mysteries`);
  const translations = keyedBy(
    recordsOf(translation['mysteries'], `overlay.${id}.mysteries`),
    (record) => String(positiveIntegerFrom(record, 'ordinal', `overlay.${id}`)),
    `overlay.${id}.mysteries`,
  );

  if (translations.size !== mysteries.length) {
    fail(`overlay.${id}.mysteries count`);
  }

  return {
    ...mysterySet,
    name: stringFrom(translation, 'name', `overlay.${id}`),
    nameSourceId: stringFrom(translation, 'nameSourceId', `overlay.${id}`),
    mysteries: mysteries.map((mystery) => {
      const ordinal = String(positiveIntegerFrom(mystery, 'ordinal', id));

      return overlaidMystery(
        mystery,
        translationOf(translations, ordinal, `overlay.${id}`),
        `${id}.${ordinal}`,
      );
    }),
  };
};

const overlaidStatement = (statement: unknown, text: string, path: string): JsonRecord => ({
  ...recordFrom(statement, path),
  text,
});

const overlaidGuidance = (guidance: JsonRecord, translation: JsonRecord): JsonRecord => {
  const opening = arrayFrom(guidance[OPENING_HAIL_MARYS], OPENING_HAIL_MARYS);
  const openingTexts = arrayFrom(translation[OPENING_HAIL_MARYS], `overlay.${OPENING_HAIL_MARYS}`);

  if (openingTexts.length !== opening.length) {
    fail(`overlay.${OPENING_HAIL_MARYS} count`);
  }

  const statements = Object.entries(guidance).filter(
    ([key, value]) => key !== OPENING_HAIL_MARYS && isRecord(value) && 'text' in value,
  );

  return {
    ...guidance,
    [TRANSLATION]: stringFrom(translation, TRANSLATION, 'overlay.guidance'),
    [OPENING_HAIL_MARYS]: opening.map((statement, index) => {
      const text = openingTexts[index];

      return overlaidStatement(
        statement,
        typeof text === 'string' ? text : fail(`overlay.${OPENING_HAIL_MARYS}[${String(index)}]`),
        OPENING_HAIL_MARYS,
      );
    }),
    ...Object.fromEntries(
      statements.map(([key, statement]) => [
        key,
        overlaidStatement(statement, stringFrom(translation, key, 'overlay.guidance'), key),
      ]),
    ),
  };
};

const overlaidRosary = (english: unknown, overlay: unknown): JsonRecord => {
  const rosary = recordFrom(english, 'rosary');
  const translation = recordFrom(overlay, 'overlay.rosary');
  const sets = keyedBy(
    recordsOf(translation['mysterySets'], 'overlay.mysterySets'),
    (record) => stringFrom(record, 'id', 'overlay.mysterySets'),
    'overlay.mysterySets',
  );
  const mysterySets = recordsOf(rosary['mysterySets'], 'mysterySets');

  if (sets.size !== mysterySets.length) {
    fail('overlay.mysterySets count');
  }

  return {
    ...rosary,
    mysterySets: mysterySets.map((mysterySet) =>
      overlaidMysterySet(
        mysterySet,
        translationOf(sets, stringFrom(mysterySet, 'id', 'mysterySets'), 'overlay.mysterySets'),
      ),
    ),
    guidance: overlaidGuidance(
      recordFrom(rosary['guidance'], 'guidance'),
      recordFrom(translation['guidance'], 'overlay.guidance'),
    ),
  };
};

export const contentInLanguage = async (
  { overlayDirectory }: ContentLanguage,
  english: LanguageContent,
  repositoryRoot: URL,
): Promise<LanguageContent> => {
  if (overlayDirectory === null) {
    return english;
  }

  const [prayers, rosary] = await Promise.all([
    readJsonFile(`${overlayDirectory}${PRAYER_OVERLAY}`, repositoryRoot),
    readJsonFile(`${overlayDirectory}${ROSARY_OVERLAY}`, repositoryRoot),
  ]);

  return {
    prayers: overlaidPrayers(english.prayers, prayers),
    rosary: overlaidRosary(english.rosary, rosary),
  };
};

const overlaidSource = (id: string, english: unknown, overlay: unknown): JsonRecord => {
  const path = `overlay.sources.${id}`;
  const source = recordFrom(english, `sources.${id}`);
  const translation = recordFrom(overlay, path);
  const fields = SOURCE_NOTE in source ? [...SOURCE_TEXT_FIELDS, SOURCE_NOTE] : SOURCE_TEXT_FIELDS;

  return {
    ...source,
    ...Object.fromEntries(fields.map((field) => [field, stringFrom(translation, field, path)])),
  };
};

export const sourcesInLanguage = async (
  { overlayDirectory }: ContentLanguage,
  english: unknown,
  repositoryRoot: URL,
): Promise<unknown> => {
  if (overlayDirectory === null) {
    return english;
  }

  const sources = recordFrom(english, 'sources');
  const translations = recordFrom(
    await readJsonFile(`${overlayDirectory}${SOURCE_OVERLAY}`, repositoryRoot),
    'overlay.sources',
  );

  if (Object.keys(translations).length !== Object.keys(sources).length) {
    fail('overlay.sources count');
  }

  return Object.fromEntries(
    Object.entries(sources).map(([id, source]) => [
      id,
      overlaidSource(id, source, translations[id]),
    ]),
  );
};
