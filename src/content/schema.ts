import { isRecord, type UnknownRecord } from '../shared/guards.ts';

export type SourceType = 'art' | 'bible' | 'liturgical' | 'magisterial' | 'prayer' | 'text';

export const DEVOTIONAL_SCHEMA_VERSION = 1;

export type DevotionalSource = {
  readonly id: string;
  readonly work: string;
  readonly author: string;
  readonly approval: string;
  readonly url: string;
  readonly type: SourceType;
  readonly path?: string;
  readonly translator?: string;
  readonly publisher?: string;
  readonly published?: string;
  readonly citationUrl?: string;
  readonly renewalSearchUrl?: string;
};

export type Prayer = {
  readonly id: string;
  readonly title: string;
  readonly text: string;
  readonly sourceId: string;
};

export type Artwork = {
  readonly id: string;
  readonly artist: string;
  readonly title: string;
  readonly date: string;
  readonly holder: string;
  readonly url: string;
  readonly file: string;
  readonly width: number;
  readonly height: number;
  readonly sourceId: string;
  readonly accession?: string;
};

export type ScripturePassage = {
  readonly reference: string;
  readonly book: string;
  readonly bookAlias?: string;
  readonly chapter: number;
  readonly verseStart: number;
  readonly verseEnd: number;
  readonly sourceId: string;
  readonly selectionSourceId: string;
  readonly text: string;
};

export type MysteryReflection = {
  readonly status: 'candidate' | 'mapped';
  readonly sourceId: string;
  readonly mappingType: string;
  readonly sectionId: string;
  readonly locator: string;
  readonly sourceTitle: string;
  readonly theme: string;
  readonly note?: string;
};

export type Mystery = {
  readonly set: string;
  readonly ordinal: number;
  readonly title: string;
  readonly titleSourceId: string;
  readonly fruit: string;
  readonly fruitSourceId: string;
  readonly scripture: ScripturePassage;
  readonly reflection: MysteryReflection;
  readonly artIds: readonly string[];
};

export type MysterySet = {
  readonly id: string;
  readonly ordinal: number;
  readonly name: string;
  readonly nameSourceId: string;
  readonly mysteries: readonly Mystery[];
};

export type SourceReference = {
  readonly sourceId: string;
  readonly locator: string;
  readonly sections?: readonly string[];
};

export type GuidanceStatement = {
  readonly text: string;
  readonly sourceId: string;
  readonly sourceRefs: readonly SourceReference[];
};

export type RosaryGuidance = {
  readonly settings: {
    readonly preferenceId: string;
    readonly default: boolean;
  };
  readonly sourceIds: readonly string[];
  readonly silentSteps: readonly string[];
  readonly openingHailMarys: readonly (GuidanceStatement & { readonly repetition: number })[];
  readonly mysteryAnnouncement: GuidanceStatement;
  readonly decadeOurFather: GuidanceStatement;
  readonly decadeHailMarys: GuidanceStatement;
  readonly decadeGloryBe: GuidanceStatement;
  readonly fatimaPrayer: GuidanceStatement;
  readonly hailHolyQueen: GuidanceStatement;
  readonly finalPrayer: GuidanceStatement;
  readonly fruitLine: {
    readonly note: string;
    readonly sourceId: string;
    readonly sourceRefs: readonly SourceReference[];
  };
};

export type RosaryContent = {
  readonly devotion: string;
  readonly schedule: {
    readonly sunday: string;
    readonly monday: string;
    readonly tuesday: string;
    readonly wednesday: string;
    readonly thursday: string;
    readonly friday: string;
    readonly saturday: string;
    readonly sourceId: string;
  };
  readonly prayerIds: readonly string[];
  readonly mysterySets: readonly MysterySet[];
  readonly prayerStageArt: Readonly<Record<string, readonly string[]>>;
  readonly guidance: RosaryGuidance;
};

export type DevotionalContent = {
  readonly schemaVersion: typeof DEVOTIONAL_SCHEMA_VERSION;
  readonly sources: readonly DevotionalSource[];
  readonly prayers: readonly Prayer[];
  readonly artworks: readonly Artwork[];
  readonly rosary: RosaryContent;
};

export class ContentSchemaError extends Error {
  override readonly name = 'ContentSchemaError';

  constructor(path: string) {
    super(`Invalid devotional content at ${path}`);
  }
}

const invalid = (path: string): never => {
  throw new ContentSchemaError(path);
};

const recordFrom = (value: unknown, path: string): UnknownRecord => {
  if (!isRecord(value)) {
    return invalid(path);
  }

  return value;
};

const arrayFrom = (value: unknown, path: string): readonly unknown[] => {
  if (!Array.isArray(value)) {
    return invalid(path);
  }

  return value;
};

const stringFrom = (record: UnknownRecord, field: string, path: string): string => {
  const value = record[field];

  if (typeof value !== 'string' || value.length === 0) {
    return invalid(`${path}.${field}`);
  }

  return value;
};

const optionalStringFrom = (
  record: UnknownRecord,
  field: string,
  path: string,
): string | undefined => {
  const value = record[field];

  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== 'string' || value.length === 0) {
    return invalid(`${path}.${field}`);
  }

  return value;
};

const positiveIntegerFrom = (record: UnknownRecord, field: string, path: string): number => {
  const value = record[field];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    return invalid(`${path}.${field}`);
  }

  return value;
};

const stringArrayFrom = (value: unknown, path: string): readonly string[] =>
  arrayFrom(value, path).map((entry, index) => {
    if (typeof entry !== 'string' || entry.length === 0) {
      return invalid(`${path}[${index}]`);
    }

    return entry;
  });

const sourceTypeFrom = (value: string, path: string): SourceType => {
  switch (value) {
    case 'art':
    case 'bible':
    case 'liturgical':
    case 'magisterial':
    case 'prayer':
    case 'text':
      return value;
    default:
      return invalid(path);
  }
};

const optionalProperty = (
  key: string,
  value: string | undefined,
): Readonly<Record<string, string>> => (value === undefined ? {} : { [key]: value });

const sourceFrom = (value: unknown, index: number): DevotionalSource => {
  const path = `sources[${index}]`;
  const source = recordFrom(value, path);

  return {
    id: stringFrom(source, 'id', path),
    work: stringFrom(source, 'work', path),
    author: stringFrom(source, 'author', path),
    approval: stringFrom(source, 'approval', path),
    url: stringFrom(source, 'url', path),
    type: sourceTypeFrom(stringFrom(source, 'type', path), `${path}.type`),
    ...optionalProperty('path', optionalStringFrom(source, 'path', path)),
    ...optionalProperty('translator', optionalStringFrom(source, 'translator', path)),
    ...optionalProperty('publisher', optionalStringFrom(source, 'publisher', path)),
    ...optionalProperty('published', optionalStringFrom(source, 'published', path)),
    ...optionalProperty('citationUrl', optionalStringFrom(source, 'citationUrl', path)),
    ...optionalProperty('renewalSearchUrl', optionalStringFrom(source, 'renewalSearchUrl', path)),
  };
};

const prayerFrom = (value: unknown, index: number): Prayer => {
  const path = `prayers[${index}]`;
  const prayer = recordFrom(value, path);

  return {
    id: stringFrom(prayer, 'id', path),
    title: stringFrom(prayer, 'title', path),
    text: stringFrom(prayer, 'text', path),
    sourceId: stringFrom(prayer, 'sourceId', path),
  };
};

const artworkFrom = (value: unknown, index: number): Artwork => {
  const path = `artworks[${index}]`;
  const artwork = recordFrom(value, path);

  return {
    id: stringFrom(artwork, 'id', path),
    artist: stringFrom(artwork, 'artist', path),
    title: stringFrom(artwork, 'title', path),
    date: stringFrom(artwork, 'date', path),
    holder: stringFrom(artwork, 'holder', path),
    url: stringFrom(artwork, 'url', path),
    file: stringFrom(artwork, 'file', path),
    width: positiveIntegerFrom(artwork, 'width', path),
    height: positiveIntegerFrom(artwork, 'height', path),
    sourceId: stringFrom(artwork, 'sourceId', path),
    ...optionalProperty('accession', optionalStringFrom(artwork, 'accession', path)),
  };
};

const scriptureFrom = (value: unknown, path: string): ScripturePassage => {
  const scripture = recordFrom(value, path);

  return {
    reference: stringFrom(scripture, 'reference', path),
    book: stringFrom(scripture, 'book', path),
    ...optionalProperty('bookAlias', optionalStringFrom(scripture, 'bookAlias', path)),
    chapter: positiveIntegerFrom(scripture, 'chapter', path),
    verseStart: positiveIntegerFrom(scripture, 'verseStart', path),
    verseEnd: positiveIntegerFrom(scripture, 'verseEnd', path),
    sourceId: stringFrom(scripture, 'sourceId', path),
    selectionSourceId: stringFrom(scripture, 'selectionSourceId', path),
    text: stringFrom(scripture, 'text', path),
  };
};

const reflectionStatusFrom = (value: string, path: string): MysteryReflection['status'] => {
  if (value === 'candidate' || value === 'mapped') {
    return value;
  }

  return invalid(path);
};

const reflectionFrom = (value: unknown, path: string): MysteryReflection => {
  const reflection = recordFrom(value, path);

  return {
    status: reflectionStatusFrom(stringFrom(reflection, 'status', path), `${path}.status`),
    sourceId: stringFrom(reflection, 'sourceId', path),
    mappingType: stringFrom(reflection, 'mappingType', path),
    sectionId: stringFrom(reflection, 'sectionId', path),
    locator: stringFrom(reflection, 'locator', path),
    sourceTitle: stringFrom(reflection, 'sourceTitle', path),
    theme: stringFrom(reflection, 'theme', path),
    ...optionalProperty('note', optionalStringFrom(reflection, 'note', path)),
  };
};

const mysteryArtIdsFrom = (value: unknown, path: string): readonly string[] => {
  const artIds = stringArrayFrom(value, path);

  if (artIds.length === 0) {
    return invalid(path);
  }

  return artIds;
};

const mysteryFrom = (value: unknown, path: string): Mystery => {
  const mystery = recordFrom(value, path);

  return {
    set: stringFrom(mystery, 'set', path),
    ordinal: positiveIntegerFrom(mystery, 'ordinal', path),
    title: stringFrom(mystery, 'title', path),
    titleSourceId: stringFrom(mystery, 'titleSourceId', path),
    fruit: stringFrom(mystery, 'fruit', path),
    fruitSourceId: stringFrom(mystery, 'fruitSourceId', path),
    scripture: scriptureFrom(mystery['scripture'], `${path}.scripture`),
    reflection: reflectionFrom(mystery['reflection'], `${path}.reflection`),
    artIds: mysteryArtIdsFrom(mystery['artIds'], `${path}.artIds`),
  };
};

const mysterySetFrom = (value: unknown, index: number): MysterySet => {
  const path = `rosary.mysterySets[${index}]`;
  const mysterySet = recordFrom(value, path);

  return {
    id: stringFrom(mysterySet, 'id', path),
    ordinal: positiveIntegerFrom(mysterySet, 'ordinal', path),
    name: stringFrom(mysterySet, 'name', path),
    nameSourceId: stringFrom(mysterySet, 'nameSourceId', path),
    mysteries: arrayFrom(mysterySet['mysteries'], `${path}.mysteries`).map((mystery, offset) =>
      mysteryFrom(mystery, `${path}.mysteries[${offset}]`),
    ),
  };
};

const sourceReferenceFrom = (value: unknown, path: string): SourceReference => {
  const reference = recordFrom(value, path);
  const sections = reference['sections'];

  return {
    sourceId: stringFrom(reference, 'sourceId', path),
    locator: stringFrom(reference, 'locator', path),
    ...(sections === undefined ? {} : { sections: stringArrayFrom(sections, `${path}.sections`) }),
  };
};

const sourceReferencesFrom = (record: UnknownRecord, path: string): readonly SourceReference[] =>
  arrayFrom(record.sourceRefs, `${path}.sourceRefs`).map((reference, index) =>
    sourceReferenceFrom(reference, `${path}.sourceRefs[${index}]`),
  );

const guidanceStatementFrom = (value: unknown, path: string): GuidanceStatement => {
  const statement = recordFrom(value, path);

  return {
    text: stringFrom(statement, 'text', path),
    sourceId: stringFrom(statement, 'sourceId', path),
    sourceRefs: sourceReferencesFrom(statement, path),
  };
};

const guidanceFrom = (value: unknown): RosaryGuidance => {
  const path = 'rosary.guidance';
  const guidance = recordFrom(value, path);
  const settings = recordFrom(guidance['settings'], `${path}.settings`);
  const defaultValue = settings['default'];
  const fruitLine = recordFrom(guidance['fruitLine'], `${path}.fruitLine`);

  if (typeof defaultValue !== 'boolean') {
    return invalid(`${path}.settings.default`);
  }

  return {
    settings: {
      preferenceId: stringFrom(settings, 'preferenceId', `${path}.settings`),
      default: defaultValue,
    },
    sourceIds: stringArrayFrom(guidance['sourceIds'], `${path}.sourceIds`),
    silentSteps: stringArrayFrom(guidance['silentSteps'], `${path}.silentSteps`),
    openingHailMarys: arrayFrom(guidance['openingHailMarys'], `${path}.openingHailMarys`).map(
      (entry, index) => {
        const entryPath = `${path}.openingHailMarys[${index}]`;
        const record = recordFrom(entry, entryPath);

        return {
          ...guidanceStatementFrom(entry, entryPath),
          repetition: positiveIntegerFrom(record, 'repetition', entryPath),
        };
      },
    ),
    mysteryAnnouncement: guidanceStatementFrom(
      guidance['mysteryAnnouncement'],
      `${path}.mysteryAnnouncement`,
    ),
    decadeOurFather: guidanceStatementFrom(guidance['decadeOurFather'], `${path}.decadeOurFather`),
    decadeHailMarys: guidanceStatementFrom(guidance['decadeHailMarys'], `${path}.decadeHailMarys`),
    decadeGloryBe: guidanceStatementFrom(guidance['decadeGloryBe'], `${path}.decadeGloryBe`),
    fatimaPrayer: guidanceStatementFrom(guidance['fatimaPrayer'], `${path}.fatimaPrayer`),
    hailHolyQueen: guidanceStatementFrom(guidance['hailHolyQueen'], `${path}.hailHolyQueen`),
    finalPrayer: guidanceStatementFrom(guidance['finalPrayer'], `${path}.finalPrayer`),
    fruitLine: {
      note: stringFrom(fruitLine, 'note', `${path}.fruitLine`),
      sourceId: stringFrom(fruitLine, 'sourceId', `${path}.fruitLine`),
      sourceRefs: sourceReferencesFrom(fruitLine, `${path}.fruitLine`),
    },
  };
};

const prayerStageArtFrom = (value: unknown): Readonly<Record<string, readonly string[]>> => {
  const path = 'rosary.prayerStageArt';
  const stages = recordFrom(value, path);

  return Object.fromEntries(
    Object.entries(stages).map(([prayerId, artIds]) => [
      prayerId,
      stringArrayFrom(artIds, `${path}.${prayerId}`),
    ]),
  );
};

const rosaryFrom = (value: unknown): RosaryContent => {
  const path = 'rosary';
  const rosary = recordFrom(value, path);
  const schedule = recordFrom(rosary['schedule'], `${path}.schedule`);

  return {
    devotion: stringFrom(rosary, 'devotion', path),
    schedule: {
      sunday: stringFrom(schedule, 'sunday', `${path}.schedule`),
      monday: stringFrom(schedule, 'monday', `${path}.schedule`),
      tuesday: stringFrom(schedule, 'tuesday', `${path}.schedule`),
      wednesday: stringFrom(schedule, 'wednesday', `${path}.schedule`),
      thursday: stringFrom(schedule, 'thursday', `${path}.schedule`),
      friday: stringFrom(schedule, 'friday', `${path}.schedule`),
      saturday: stringFrom(schedule, 'saturday', `${path}.schedule`),
      sourceId: stringFrom(schedule, 'sourceId', `${path}.schedule`),
    },
    prayerIds: stringArrayFrom(rosary['prayerIds'], `${path}.prayerIds`),
    mysterySets: arrayFrom(rosary['mysterySets'], `${path}.mysterySets`).map((entry, index) =>
      mysterySetFrom(entry, index),
    ),
    prayerStageArt: prayerStageArtFrom(rosary['prayerStageArt']),
    guidance: guidanceFrom(rosary['guidance']),
  };
};

export const devotionalContentFrom = (value: unknown): DevotionalContent => {
  const content = recordFrom(value, 'root');

  if (content.schemaVersion !== DEVOTIONAL_SCHEMA_VERSION) {
    return invalid('schemaVersion');
  }

  return {
    schemaVersion: DEVOTIONAL_SCHEMA_VERSION,
    sources: arrayFrom(content['sources'], 'sources').map((entry, index) =>
      sourceFrom(entry, index),
    ),
    prayers: arrayFrom(content['prayers'], 'prayers').map((entry, index) =>
      prayerFrom(entry, index),
    ),
    artworks: arrayFrom(content['artworks'], 'artworks').map((entry, index) =>
      artworkFrom(entry, index),
    ),
    rosary: rosaryFrom(content['rosary']),
  };
};
