import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import {
  apparatusReferenceTarget,
  guidanceReferenceTarget,
  ReferenceGroup,
  referenceSectionsFrom,
} from './referenceCatalog.ts';

const sections = referenceSectionsFrom(contentCatalog);

const sectionSourceIds = (group: ReferenceGroup): readonly string[] | undefined =>
  sections.find((section) => section.group === group)?.records.map(({ target }) => target.sourceId);

describe('referenceSectionsFrom', () => {
  test('keeps the approved reference groups in display order', () => {
    expect(sections.map(({ group }) => group)).toEqual([
      ReferenceGroup.RosaryText,
      ReferenceGroup.Scripture,
      ReferenceGroup.Guidance,
      ReferenceGroup.Apparatus,
      ReferenceGroup.Artwork,
      ReferenceGroup.Rights,
    ]);
  });

  test('includes every bundled artwork exactly once in the artwork group', () => {
    const artwork = sections.find(({ group }) => group === ReferenceGroup.Artwork);

    expect(artwork?.records).toHaveLength(contentCatalog.artworks.length);
    expect(new Set(artwork?.records.map(({ id }) => id)).size).toBe(contentCatalog.artworks.length);
  });

  test('keeps each source unique within a source group', () => {
    for (const section of sections.filter(({ group }) => group !== ReferenceGroup.Artwork)) {
      expect(new Set(section.records.map(({ id }) => id)).size).toBe(section.records.length);
    }
  });

  test('reaches the witnesses and tools through the apparatus walk', () => {
    const sourceIds = sectionSourceIds(ReferenceGroup.Apparatus);
    const redLetter = contentCatalog.bible.redLetter;

    for (const source of [...redLetter.witnesses, ...redLetter.tools]) {
      expect(sourceIds).toContain(source.id);
    }
  });

  test('groups the passage selections as rosary text, not scripture', () => {
    expect(sectionSourceIds(ReferenceGroup.RosaryText)).toContain('holy-see-joyful');
    expect(sectionSourceIds(ReferenceGroup.Scripture)).toEqual(['douay-rheims-challoner']);
  });
});

describe('apparatusReferenceTarget', () => {
  test('opens the cited source in the apparatus section without a curated face', () => {
    const redLetter = contentCatalog.bible.redLetter;

    for (const source of [...redLetter.witnesses, ...redLetter.tools]) {
      expect(apparatusReferenceTarget(source.id)).toEqual({
        group: ReferenceGroup.Apparatus,
        sourceId: source.id,
      });
    }
  });
});

describe('guidanceReferenceTarget', () => {
  test('opens the exact primary locator and retains every supporting citation', () => {
    const guidance = contentCatalog.rosary.guidance.mysteryAnnouncement;
    const target = guidanceReferenceTarget(guidance);

    expect(target.sourceId).toBe(guidance.sourceId);
    expect(target.locator).toBe(guidance.sourceRefs[0]?.locator);
    expect(target.sections).toEqual(['29', '30', '31']);
    expect(target.supportingReferences).toEqual(guidance.sourceRefs);
  });
});
