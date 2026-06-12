import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SupabaseMetadataAdapter } from './adapters/supabase-metadata.adapter';
import { MetadataService } from './metadata.service';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';

function makeMedia(overrides: Partial<WorkspaceMedia> = {}): WorkspaceMedia {
  return {
    id: crypto.randomUUID(),
    latitude: 47.3769,
    longitude: 8.5417,
    thumbnailPath: null,
    storagePath: 'org/user/media.jpg',
    capturedAt: '2025-06-01T12:00:00Z',
    createdAt: '2025-06-02T08:00:00Z',
    projectId: 'proj-1',
    projectName: 'Bridge Inspection',
    direction: null,
    exifLatitude: 47.3769,
    exifLongitude: 8.5417,
    addressLabel: 'Burgstrasse 7, 8001 Zurich',
    city: 'Zurich',
    district: 'Altstadt',
    street: 'Burgstrasse 7',
    country: 'Switzerland',
    userName: 'Max Mustermann',
    ...overrides,
  };
}

describe('MetadataService', () => {
  let service: MetadataService;

  beforeEach(() => {
    vi.restoreAllMocks();
    TestBed.configureTestingModule({ providers: [MetadataService] });
    service = TestBed.inject(MetadataService);
  });

  it('provides built-in metadata fields', () => {
    expect(service.allMetadataFields().length).toBeGreaterThanOrEqual(10);
    expect(
      service.allMetadataFields().every((field) => field.id && field.label && field.icon),
    ).toBe(true);
  });

  it('registers custom metadata fields from keys', () => {
    const before = service.allMetadataFields().length;

    service.setMetadataFieldsFromKeys([
      { id: 'phase', key_name: 'Phase', key_type: 'text' },
      { id: 'floor', key_name: 'Floor', key_type: 'number' },
    ]);

    expect(service.allMetadataFields().length).toBe(before + 2);
    expect(service.getMetadataField('phase')?.builtIn).toBe(false);
  });

  it('resolves sortable and filter values for custom numeric fields', () => {
    service.setMetadataFieldsFromKeys([{ id: 'floor', key_name: 'Floor', key_type: 'number' }]);

    const media = makeMedia({ metadata: { floor: '12' } });

    expect(service.getSortableValue(media, 'floor')).toBe(12);
    expect(service.getFilterValue(media, 'floor')).toBe('12');
    expect(service.getGroupingLabel(media, 'floor')).toBe('Floor 12');
  });

  it('clears custom metadata fields when refresh returns no keys after keys existed', async () => {
    const adapter = TestBed.inject(SupabaseMetadataAdapter);
    vi.spyOn(adapter, 'fetchMetadataKeys')
      .mockResolvedValueOnce([{ id: 'phase', key_name: 'Phase', key_type: 'text' }])
      .mockResolvedValueOnce([]);

    await service.refreshMetadataFields();
    expect(service.getMetadataField('phase')).toBeDefined();

    await service.refreshMetadataFields();
    expect(service.getMetadataField('phase')).toBeUndefined();
  });
});
