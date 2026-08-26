import { describe, expect, test } from 'bun:test';
import { contentCatalog } from '../../content/catalog.ts';
import {
  guidanceReferenceTarget,
  ReferenceGroup,
  referenceSectionsFrom,
} from './referenceCatalog.ts';

describe('referenceSectionsFrom', () => {
  const sections = referenceSectionsFrom(contentCatalog);

  test('keeps the approved reference groups in display order', () => {
    expect(sections.map(({ group }) => group)).toEqual([
      ReferenceGroup.RosaryText,
      ReferenceGroup.Scripture,
      ReferenceGroup.Guidance,
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
