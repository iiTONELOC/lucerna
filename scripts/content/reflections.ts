import { LibraryBlockKind, type LibraryContent } from '../../src/content/schema.ts';
import { ContentBuildError, ContentBuildErrorCode } from './records.ts';

const DECADE_ORDINALS: readonly string[] = [
  'First',
  'Second',
  'Third',
  'Fourth',
  'Fifth',
  'Sixth',
  'Seventh',
  'Eighth',
  'Ninth',
  'Tenth',
  'Eleventh',
  'Twelfth',
  'Thirteenth',
  'Fourteenth',
  'Fifteenth',
];

const DECADE_OFFSET_BY_SET: Readonly<Record<string, number>> = {
  joyful: 0,
  sorrowful: 5,
  glorious: 10,
};

const FIRST_METHOD_PATTERN = /^first-method\.(?<set>[a-z]+)\.(?<decade>\d)$/;
const THIRD_METHOD_PATTERN = /^third-method\.summary\.finding-in-the-temple\.(?<point>\d+)$/;
const FINDING_HEADING = 'The Finding of Jesus in the Temple';

const failReflection = (sectionId: string): never => {
  throw new ContentBuildError(ContentBuildErrorCode.InvalidField, `reflection ${sectionId}`);
};

const firstMethodText = (setId: string, decade: number, text: string): string | null => {
  const offset = DECADE_OFFSET_BY_SET[setId];
  const ordinal = offset === undefined ? undefined : DECADE_ORDINALS[offset + decade - 1];

  if (ordinal === undefined) {
    return null;
  }

  const pattern = new RegExp(String.raw`^(?:\d+\. )?${ordinal} decade\. (?<offering>.+)$`, 'm');

  return pattern.exec(text)?.groups?.['offering'] ?? null;
};

const thirdMethodText = (point: number, text: string): string | null => {
  const start = text.indexOf(FINDING_HEADING);

  if (start < 0) {
    return null;
  }

  const pattern = new RegExp(
    String.raw`^${String(point)}\. Hail Mary\.\n\n(?<meditation>.+)$`,
    'm',
  );

  return pattern.exec(text.slice(start))?.groups?.['meditation'] ?? null;
};

export const reflectionBlockIndexOf = (
  library: LibraryContent,
  workId: string,
  reflectionText: string,
): number => {
  const work = library.works.find(({ id }) => id === workId);

  if (work === undefined) {
    return failReflection(workId);
  }

  const matches = work.blocks.flatMap((block, index) =>
    block.kind === LibraryBlockKind.Paragraph && block.text.endsWith(reflectionText) ? [index] : [],
  );
  const match = matches.length === 1 ? matches[0] : undefined;

  return match ?? failReflection(`${workId} block`);
};

export const reflectionTextFrom = (sectionId: string, text: string): string => {
  const first = FIRST_METHOD_PATTERN.exec(sectionId)?.groups;

  if (first !== undefined) {
    return (
      firstMethodText(first['set'] ?? '', Number(first['decade']), text) ??
      failReflection(sectionId)
    );
  }

  const third = THIRD_METHOD_PATTERN.exec(sectionId)?.groups;

  if (third !== undefined) {
    return thirdMethodText(Number(third['point']), text) ?? failReflection(sectionId);
  }

  return failReflection(sectionId);
};
