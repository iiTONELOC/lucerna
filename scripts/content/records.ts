import { isRecord, type UnknownRecord } from '../../src/shared/guards.ts';

export enum ContentBuildErrorCode {
  InvalidField = 'invalid-field',
  InvalidSplashRecord = 'invalid-splash-record',
  InvalidSourceRange = 'invalid-source-range',
  InvalidSplashDatabase = 'invalid-splash-database',
  DuplicateReference = 'duplicate-reference',
  MissingSource = 'missing-source',
  UnterminatedFootnote = 'unterminated-footnote',
  UnsupportedMarker = 'unsupported-marker',
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
  [ContentBuildErrorCode.InvalidSplashDatabase]: { message: 'Invalid splash verse database' },
  [ContentBuildErrorCode.InvalidSplashRecord]: { message: 'Invalid splash verse record' },
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

export class ContentBuildError extends Error {
  override readonly name = 'ContentBuildError';

  constructor(
    readonly code: ContentBuildErrorCode,
    context?: string,
  ) {
    super(errorMessage(code, context));
  }
}

export const readJsonFile = (path: string, repositoryRoot: URL): Promise<unknown> =>
  Bun.file(new URL(path, repositoryRoot)).json();

export const recordFrom = (
  value: unknown,
  code: ContentBuildErrorCode,
  context?: string,
): UnknownRecord => {
  if (!isRecord(value)) {
    throw new ContentBuildError(code, context);
  }

  return value;
};

export const requiredString = (record: UnknownRecord, field: string): string => {
  const value = record[field];

  if (typeof value !== 'string' || value.length === 0) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidField, field);
  }

  return value;
};

export const requiredPositiveInteger = (record: UnknownRecord, field: string): number => {
  const value = record[field];

  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    throw new ContentBuildError(ContentBuildErrorCode.InvalidField, field);
  }

  return value;
};
