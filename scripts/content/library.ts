import {
  LIBRARY_SCHEMA_VERSION,
  LibraryBlockKind,
  LibraryHeadingLevel,
  libraryContentFrom,
  type LibraryBlock,
  type LibraryContent,
} from '../../src/content/schema.ts';
import { arrayFrom, recordFrom, stringFrom } from '../../src/content/shape.ts';
import { ORDINAL_WORDS } from '../../src/shared/ordinals.ts';
import { SOURCE_DATABASE } from './devotional.ts';
import {
  ContentBuildError,
  ContentBuildErrorCode,
  readJsonFile,
  sourceRecordOf,
} from './records.ts';

export const LIBRARY_DATABASE = 'data/db/library.json';

const FRONT_MATTER_GROUP_COUNT = 2;
const SUBHEADING_MAXIMUM_LENGTH = 65;
const SUBTITLE_MAXIMUM_LENGTH = 120;

const PART_PATTERN = /^(?:FIRST|SECOND|THIRD|FOURTH|FIFTH) DECADE$|^Methods of saying the Rosary$/;
const DEDICATION_PATTERN = /^A (?:White|Red|Mystical) Rose(?: Tree)?$|^A Rosebud$/;
const ROSE_PATTERN = /^[A-Z][a-z]+(?:-[a-z]+)? Rose$/;
const METHOD_PATTERN = /^(?:First|Second, Shorter|Third|Fourth|Fifth) Method\b/;
const NUMBERED_PATTERN = /^(?<number>\d+)\. (?<text>.+)$/;
const ORDINAL_FRAGMENT_PATTERN = /^\d+(?:st|nd|rd|th)$/;
const TERMINAL_PUNCTUATION_PATTERN = /[.?!:,;")]$/;

const groupsOf = (text: string): readonly (readonly string[])[] => {
  const groups: string[][] = [];
  let current: string[] = [];

  for (const line of text.split('\n')) {
    const trimmed = line.replace(/^\s+/, '').trimEnd();

    if (trimmed.length > 0) {
      current.push(trimmed);
    } else if (current.length > 0) {
      groups.push(current);
      current = [];
    }
  }

  if (current.length > 0) {
    groups.push(current);
  }

  return groups;
};

type SectionCounters = {
  roses: number;
  methods: number;
};

const orderedShortOf = (line: string, word: string, ordinal: number): string => {
  const expected = ORDINAL_WORDS[ordinal - 1];

  if (expected === undefined || !line.startsWith(expected)) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidLibraryDatabase, line);
  }

  return `${word} ${String(ordinal)}`;
};

const chapterShortOf = (line: string, counters: SectionCounters): string | null => {
  if (ROSE_PATTERN.test(line)) {
    counters.roses += 1;
    return orderedShortOf(line, 'Rose', counters.roses);
  }

  if (METHOD_PATTERN.test(line)) {
    counters.methods += 1;
    return orderedShortOf(line, 'Method', counters.methods);
  }

  return null;
};

const headingOf = (line: string, counters: SectionCounters): LibraryBlock | null => {
  if (PART_PATTERN.test(line) || DEDICATION_PATTERN.test(line)) {
    return { kind: LibraryBlockKind.Heading, level: LibraryHeadingLevel.Part, text: line };
  }

  const short = chapterShortOf(line, counters);

  if (short !== null) {
    return {
      kind: LibraryBlockKind.Heading,
      level: LibraryHeadingLevel.Chapter,
      text: line,
      short,
    };
  }

  return null;
};

const isSubheading = (line: string): boolean =>
  line.length <= SUBHEADING_MAXIMUM_LENGTH &&
  !TERMINAL_PUNCTUATION_PATTERN.test(line) &&
  !line.startsWith('(') &&
  !ORDINAL_FRAGMENT_PATTERN.test(line);

const followsHeading = (previous: LibraryBlock | undefined): boolean =>
  previous?.kind === LibraryBlockKind.Heading && previous.level !== LibraryHeadingLevel.Subheading;

const paragraphOf = (line: string): LibraryBlock => {
  const groups = NUMBERED_PATTERN.exec(line)?.groups;
  const text = groups?.['text'];
  const number = groups?.['number'];

  if (text === undefined || number === undefined) {
    return { kind: LibraryBlockKind.Paragraph, text: line };
  }

  return { kind: LibraryBlockKind.Paragraph, text, number: Number(number) };
};

const lineBlockOf = (
  line: string,
  previous: LibraryBlock | undefined,
  counters: SectionCounters,
): LibraryBlock => {
  const heading = headingOf(line, counters);

  if (heading !== null) {
    return heading;
  }

  if (NUMBERED_PATTERN.test(line)) {
    return paragraphOf(line);
  }

  if ((followsHeading(previous) && line.length <= SUBTITLE_MAXIMUM_LENGTH) || isSubheading(line)) {
    return { kind: LibraryBlockKind.Heading, level: LibraryHeadingLevel.Subheading, text: line };
  }

  return paragraphOf(line);
};

const blocksFrom = (groups: readonly (readonly string[])[]): readonly LibraryBlock[] => {
  const blocks: LibraryBlock[] = [];
  const counters: SectionCounters = { roses: 0, methods: 0 };

  for (const group of groups.slice(FRONT_MATTER_GROUP_COUNT)) {
    const line = group[0];

    if (group.length > 1 || line === undefined) {
      blocks.push({ kind: LibraryBlockKind.Verse, lines: group });
    } else {
      blocks.push(lineBlockOf(line, blocks.at(-1), counters));
    }
  }

  return blocks;
};

const workFrom = async (
  value: unknown,
  index: number,
  sources: unknown,
  repositoryRoot: URL,
): Promise<unknown> => {
  const path = `works[${index}]`;
  const record = recordFrom(value, path);
  const sourceId = stringFrom(record, 'sourceId', path);
  const sourcePath = `sources.${sourceId}`;
  const source = sourceRecordOf(sources, sourceId);
  const text = await Bun.file(
    new URL(stringFrom(source, 'path', sourcePath), repositoryRoot),
  ).text();

  return {
    id: sourceId,
    title: stringFrom(source, 'work', sourcePath),
    author: stringFrom(source, 'author', sourcePath),
    sourceId,
    category: stringFrom(record, 'category', path),
    blocks: blocksFrom(groupsOf(text)),
  };
};

export const buildLibraryContent = async (repositoryRoot: URL): Promise<LibraryContent> => {
  const database = recordFrom(await readJsonFile(LIBRARY_DATABASE, repositoryRoot), 'library');
  const works = arrayFrom(database['works'], 'works');

  if (works.length === 0) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidLibraryDatabase);
  }

  const sources = await readJsonFile(SOURCE_DATABASE, repositoryRoot);

  return libraryContentFrom({
    schemaVersion: LIBRARY_SCHEMA_VERSION,
    works: await Promise.all(
      works.map((work, index) => workFrom(work, index, sources, repositoryRoot)),
    ),
  });
};
