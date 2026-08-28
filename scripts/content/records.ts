import { recordFrom } from '../../src/content/shape.ts';
import { CodedError } from '../../src/shared/codedError.ts';

export enum ContentBuildErrorCode {
  InvalidField = 'invalid-field',
  InvalidSourceRange = 'invalid-source-range',
  InvalidLibraryDatabase = 'invalid-library-database',
  DuplicateReference = 'duplicate-reference',
  MissingSource = 'missing-source',
  UnterminatedFootnote = 'unterminated-footnote',
  UnsupportedMarker = 'unsupported-marker',
  InvalidBibleStructure = 'invalid-bible-structure',
  InvalidRedLetter = 'invalid-red-letter',
  InvalidVerse = 'invalid-verse',
  MissingScripture = 'missing-scripture',
  InvalidSourceBook = 'invalid-source-book',
}

type ErrorMessageDefinition = {
  readonly fallback?: string;
  readonly message: string;
};

const UNKNOWN_SOURCE_CONTEXT = 'unknown source';

const ERROR_MESSAGE: Readonly<Record<ContentBuildErrorCode, ErrorMessageDefinition>> = {
  [ContentBuildErrorCode.DuplicateReference]: {
    message: 'Splash verse references must be unique',
  },
  [ContentBuildErrorCode.InvalidField]: { fallback: 'field', message: 'Invalid ' },
  [ContentBuildErrorCode.InvalidSourceBook]: {
    fallback: UNKNOWN_SOURCE_CONTEXT,
    message: 'Invalid scripture book in ',
  },
  [ContentBuildErrorCode.InvalidSourceRange]: {
    message: 'Invalid splash verse source range',
  },
  [ContentBuildErrorCode.InvalidLibraryDatabase]: { message: 'Invalid library database' },
  [ContentBuildErrorCode.InvalidVerse]: {
    fallback: UNKNOWN_SOURCE_CONTEXT,
    message: 'Invalid scripture verse in ',
  },
  [ContentBuildErrorCode.MissingScripture]: {
    fallback: 'unknown reference',
    message: 'Missing scripture for ',
  },
  [ContentBuildErrorCode.MissingSource]: {
    fallback: 'unknown',
    message: 'Missing source ',
  },
  [ContentBuildErrorCode.InvalidBibleStructure]: {
    fallback: UNKNOWN_SOURCE_CONTEXT,
    message: 'Invalid bible structure at ',
  },
  [ContentBuildErrorCode.InvalidRedLetter]: {
    fallback: 'unknown entry',
    message: 'Invalid red letter entry at ',
  },
  [ContentBuildErrorCode.UnsupportedMarker]: { message: 'Unsupported scripture marker' },
  [ContentBuildErrorCode.UnterminatedFootnote]: { message: 'Unterminated scripture footnote' },
};

const errorMessage = (code: ContentBuildErrorCode, context?: string): string => {
  const definition = ERROR_MESSAGE[code];

  if (definition.fallback === undefined) {
    return definition.message;
  }

  return `${definition.message}${context ?? definition.fallback}`;
};

export class ContentBuildError extends CodedError<ContentBuildErrorCode> {
  constructor(code: ContentBuildErrorCode, context?: string) {
    super('ContentBuildError', code, errorMessage(code, context));
  }
}

export const buildFailure =
  (code: ContentBuildErrorCode) =>
  (context?: string): never => {
    throw new ContentBuildError(code, context);
  };

export const readJsonFile = (path: string, repositoryRoot: URL): Promise<unknown> =>
  Bun.file(new URL(path, repositoryRoot)).json();

export const sourceRecordOf = (sources: unknown, sourceId: string) =>
  recordFrom(recordFrom(sources, 'sources')[sourceId], `sources.${sourceId}`);
