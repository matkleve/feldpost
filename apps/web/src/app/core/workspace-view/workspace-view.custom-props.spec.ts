/**
 * WorkspaceViewService — loadCustomProperties integration.
 *
 * Tests verify the full pipeline: DB load â†' MetadataService registry â†'
 * sort/group/filter dropdowns populated â†' end-to-end image operations.
 *
 * These tests each configure their own TestBed because they need a custom
 * Supabase mock for the metadata_keys table.
 *
 * Shared helpers: workspace-view.spec-setup.ts
 */

import { TestBed } from '@angular/core/testing';
import { WorkspaceViewService } from './workspace-view.service';
import { SupabaseService } from '../supabase/supabase.service';
import { FilterService } from '../filter/filter.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MetadataService } from '../metadata/metadata.service';
import {
  buildFakeSupabase,
  buildFakeGeocoding,
  buildFakeFilterService,
  makeImage,
} from './workspace-view.spec-setup';

/** Builds a fakeSupabase client that serves fakeMetadataKeys from the metadata_keys table. */
function buildMetadataSupabase(fakeMetadataKeys: Array<{ id: string; key_name: string }>) {
  const fakeSupabase = buildFakeSupabase();
  fakeSupabase.client.from.mockImplementation((table: string) => {
    if (table === 'metadata_keys') {
      return {
        select: vi.fn().mockResolvedValue({ data: fakeMetadataKeys, error: null }),
      };
    }
    return {
      update: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      }),
      select: vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ data: [], error: null }),
      }),
    };
  });
  return fakeSupabase;
}

function setupWithMetadata(fakeMetadataKeys: Array<{ id: string; key_name: string }>) {
  const fakeSupabase = buildMetadataSupabase(fakeMetadataKeys);
  TestBed.configureTestingModule({
    providers: [
      WorkspaceViewService,
      MetadataService,
      { provide: SupabaseService, useValue: fakeSupabase },
      { provide: GeocodingService, useValue: buildFakeGeocoding() },
      { provide: FilterService, useValue: buildFakeFilterService() },
    ],
  });
  return {
    service: TestBed.inject(WorkspaceViewService),
    registry: TestBed.inject(MetadataService),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('WorkspaceViewService â€" loadCustomProperties integration', () => {
  it('loads metadata_keys from Supabase and registers them in MetadataService', async () => {
    const { service, registry } = setupWithMetadata([
      { id: 'uuid-bauphase', key_name: 'Bauphase' },
      { id: 'uuid-fang', key_name: 'Fang' },
    ]);

    // Before loading: only built-in properties
    const builtInCount = registry.allMetadataFields().length;
    expect(registry.allMetadataFields().every((p) => p.builtIn)).toBe(true);

    await service.loadMetadataFields();

    // After loading: metadata fields appear in the registry
    expect(registry.allMetadataFields().length).toBe(builtInCount + 2);
    expect(registry.allMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
    expect(registry.allMetadataFields().some((p) => p.label === 'Fang')).toBe(true);

    // Metadata fields show up in all dropdown lists
    expect(registry.sortableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
    expect(registry.groupableMetadataFields().some((p) => p.label === 'Fang')).toBe(true);
    expect(registry.filterableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);
  });

  it('metadata fields are not marked as builtIn after loading', async () => {
    const { service, registry } = setupWithMetadata([{ id: 'uuid-floor', key_name: 'Floor' }]);

    await service.loadMetadataFields();

    const floorProp = registry.getMetadataField('uuid-floor');
    expect(floorProp).toBeDefined();
    expect(floorProp!.builtIn).toBe(false);
    expect(floorProp!.label).toBe('Floor');
  });

  it('handles empty metadata_keys gracefully', async () => {
    const { service, registry } = setupWithMetadata([]);
    const before = registry.allMetadataFields().length;

    await service.loadMetadataFields();

    expect(registry.allMetadataFields().length).toBe(before);
  });

  it('end-to-end: load metadata field -> add metadata to image -> group by it', async () => {
    const { service, registry } = setupWithMetadata([
      { id: 'uuid-bauphase', key_name: 'Bauphase' },
    ]);

    // Step 1: Load metadata fields from DB
    await service.loadMetadataFields();
    expect(registry.groupableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);

    // Step 2: Add images with metadata values
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'b', metadata: { 'uuid-bauphase': 'Innenausbau' } }),
      makeImage({ id: 'c', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'd' }), // no Bauphase
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Group by Bauphase
    service.setActiveGroupings([{ id: 'uuid-bauphase', label: 'Bauphase', icon: 'tag' }]);

    // Step 4: Verify groups
    const sections = service.groupedSections();
    const headings = sections.map((s) => s.heading);
    expect(headings).toContain('Bauphase Rohbau');
    expect(headings).toContain('Bauphase Innenausbau');
    expect(headings).toContain('No Bauphase');

    const rohbau = sections.find((s) => s.heading === 'Bauphase Rohbau')!;
    expect(rohbau.images.length).toBe(2);
  });

  it('end-to-end: load metadata field -> add metadata -> sort numerically', async () => {
    const { service, registry } = setupWithMetadata([{ id: 'uuid-fang', key_name: 'Fang' }]);

    // Step 1: Load metadata fields â€" Fang defaults to 'text' type from DB
    await service.loadMetadataFields();
    expect(registry.sortableMetadataFields().some((p) => p.label === 'Fang')).toBe(true);

    // Step 2: Add images with numeric metadata
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-fang': '100' } }),
      makeImage({ id: 'b', metadata: { 'uuid-fang': '5' } }),
      makeImage({ id: 'c', metadata: { 'uuid-fang': '12' } }),
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Sort by Fang ascending
    service.setActiveSorts([{ key: 'uuid-fang', direction: 'asc' }]);

    // Step 4: Verify text-type sort (since DB has no key_type, defaults to text)
    // Text sort ascending: '100' < '12' < '5' (lexicographic)
    const sorted = service.groupedSections()[0].images;
    expect(sorted.map((i) => i.id)).toEqual(['a', 'c', 'b']);
  });

  it('end-to-end: load metadata field -> add metadata -> filter by it', async () => {
    const fakeSupabase = buildMetadataSupabase([{ id: 'uuid-bauphase', key_name: 'Bauphase' }]);

    // Use real FilterService for this integration test
    TestBed.configureTestingModule({
      providers: [
        WorkspaceViewService,
        MetadataService,
        FilterService,
        { provide: SupabaseService, useValue: fakeSupabase },
        { provide: GeocodingService, useValue: buildFakeGeocoding() },
      ],
    });

    const service = TestBed.inject(WorkspaceViewService);
    const registry = TestBed.inject(MetadataService);
    const filterService = TestBed.inject(FilterService);

    // Step 1: Load metadata fields
    await service.loadMetadataFields();
    expect(registry.filterableMetadataFields().some((p) => p.label === 'Bauphase')).toBe(true);

    // Step 2: Add images with metadata
    const images = [
      makeImage({ id: 'a', metadata: { 'uuid-bauphase': 'Rohbau' } }),
      makeImage({ id: 'b', metadata: { 'uuid-bauphase': 'Innenausbau' } }),
      makeImage({ id: 'c', metadata: { 'uuid-bauphase': 'Rohbau' } }),
    ];
    service.setActiveSelectionImages(images);

    // Step 3: Add a filter rule for Bauphase = "Rohbau"
    filterService.addRule();
    const ruleId = filterService.rules()[0].id;
    filterService.updateRule(ruleId, {
      property: 'uuid-bauphase',
      operator: 'is',
      value: 'Rohbau',
    });

    // Step 4: Verify filtered results
    const sections = service.groupedSections();
    const allImages = sections.flatMap((s) => s.images);
    expect(allImages.length).toBe(2);
    expect(allImages.every((img) => img.metadata?.['uuid-bauphase'] === 'Rohbau')).toBe(true);
  });
});
