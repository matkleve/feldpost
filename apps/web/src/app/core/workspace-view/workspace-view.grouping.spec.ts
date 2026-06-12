/**
 * WorkspaceViewService — grouping with addresses + numeric metadata sorting.
 * Shared setup: workspace-view.spec-setup.ts
 */

import { TestBed } from '@angular/core/testing';
import { MetadataService } from '../metadata/metadata.service';
import { setup, makeImage } from './workspace-view.spec-setup';

// ── Grouping with addresses ───────────────────────────────────────────────────

describe('WorkspaceViewService â€" grouping with addresses', () => {
  it('groups by district using resolved address data', async () => {
    const { service } = setup();

    const images = [
      makeImage({ id: 'a', district: 'Altstadt' }),
      makeImage({ id: 'b', district: 'Altstadt' }),
      makeImage({ id: 'c', district: 'Seefeld' }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'district', label: 'District', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);

    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Altstadt');
    expect(headings).toContain('Seefeld');
  });

  it('shows "Unknown district" for images without district', () => {
    const { service } = setup();

    const images = [makeImage({ id: 'a', district: null })];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'district', label: 'District', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections[0].heading).toBe('Unknown district');
  });

  it('groups by city using resolved address data', () => {
    const { service } = setup();

    const images = [makeImage({ id: 'a', city: 'ZÃ¼rich' }), makeImage({ id: 'b', city: 'Bern' })];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'city', label: 'City', icon: '' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);
    expect(sections.map((s) => s.heading)).toContain('ZÃ¼rich');
    expect(sections.map((s) => s.heading)).toContain('Bern');
  });
});

// ── Numeric sorting (custom number properties) ────────────────────────────────

describe('WorkspaceViewService â€" numeric sorting', () => {
  it('sorts number-type metadata fields numerically, not lexicographically', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '100' } }),
      makeImage({ id: 'b', metadata: { fang: '5' } }),
      makeImage({ id: 'c', metadata: { fang: '12' } }),
      makeImage({ id: 'd', metadata: { fang: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'asc' }]);

    const sorted = service.groupedSections()[0].images;
    // Numeric order: 1, 5, 12, 100 (not lexicographic "1", "100", "12", "5")
    expect(sorted.map((i) => i.id)).toEqual(['d', 'b', 'c', 'a']);
  });

  it('sorts number-type metadata fields descending', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '1' } }),
      makeImage({ id: 'b', metadata: { fang: '100' } }),
      makeImage({ id: 'c', metadata: { fang: '12' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'desc' }]);

    const sorted = service.groupedSections()[0].images;
    expect(sorted.map((i) => i.id)).toEqual(['b', 'c', 'a']);
  });

  it('pushes null metadata values to the end during numeric sort', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'fang', key_name: 'Fang', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { fang: '5' } }),
      makeImage({ id: 'b' }), // no metadata
      makeImage({ id: 'c', metadata: { fang: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveSorts([{ key: 'fang', direction: 'asc' }]);

    const sorted = service.groupedSections()[0].images;
    expect(sorted[0].id).toBe('c'); // 1
    expect(sorted[1].id).toBe('a'); // 5
    expect(sorted[2].id).toBe('b'); // null â†' end
  });

  it('groups by number-type metadata field', () => {
    const { service } = setup();
    const registry = TestBed.inject(MetadataService);

    registry.setMetadataFieldsFromKeys([{ id: 'floor', key_name: 'Floor', key_type: 'number' }]);

    const images = [
      makeImage({ id: 'a', metadata: { floor: '1' } }),
      makeImage({ id: 'b', metadata: { floor: '2' } }),
      makeImage({ id: 'c', metadata: { floor: '1' } }),
    ];
    service.setActiveSelectionImages(images);
    service.setActiveGroupings([{ id: 'floor', label: 'Floor', icon: 'numbers' }]);

    const sections = service.groupedSections();
    expect(sections.length).toBe(2);
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Floor 1');
    expect(headings).toContain('Floor 2');
  });
});
