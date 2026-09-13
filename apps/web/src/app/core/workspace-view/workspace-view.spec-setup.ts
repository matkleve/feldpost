/**
 * Shared test infrastructure for WorkspaceViewService spec suite.
 *
 * Exports:
 *  - makeImage()            — builds a WorkspaceImage with sensible defaults
 *  - ZURICH_RESULT          — canonical geocoding result fixture
 *  - buildFakeSupabase()    — chainable Supabase client fake
 *  - buildFakeGeocoding()   — fake GeocodingService
 *  - buildFakeFilterService() — fake FilterService
 *  - setup()                — configures TestBed and returns service + fakes
 */

import { TestBed } from '@angular/core/testing';
import { WorkspaceViewService } from './workspace-view.service';
import { SupabaseService } from '../supabase/supabase.service';
import { FilterService } from '../filter/filter.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { MetadataService } from '../metadata/metadata.service';
import type { WorkspaceImage } from './workspace-view.types';
import { createSupabaseClientStub } from '../../../test/mocks/supabase-chain.mock';

// ── Helpers ──────────────────────────────────────────────────────────────────

export function makeImage(overrides: Partial<WorkspaceImage> = {}): WorkspaceImage {
  return {
    id: crypto.randomUUID(),
    latitude: 47.3769,
    longitude: 8.5417,
    thumbnailPath: null,
    storagePath: 'org/user/photo.jpg',
    capturedAt: '2025-06-01T12:00:00Z',
    createdAt: '2025-06-01T12:00:00Z',
    projectId: null,
    projectName: null,
    direction: null,
    exifLatitude: 47.3769,
    exifLongitude: 8.5417,
    addressLabel: null,
    city: null,
    district: null,
    street: null,
    country: null,
    userName: null,
    ...overrides,
  };
}

export const ZURICH_RESULT = {
  addressLabel: 'BurgstraÃŸe 7, 8001 ZÃ¼rich, Switzerland',
  city: 'ZÃ¼rich',
  district: 'Altstadt',
  street: 'BurgstraÃŸe 7',
  country: 'Switzerland',
};

export function buildFakeSupabase() {
  return { client: createSupabaseClientStub() };
}

export function buildFakeGeocoding(result = ZURICH_RESULT) {
  return {
    reverse: vi.fn().mockResolvedValue(result),
  };
}

export function buildFakeFilterService() {
  return {
    rules: vi.fn().mockReturnValue([]),
    activeCount: 0,
    clearAll: vi.fn(),
    matchesClientSide: vi.fn().mockReturnValue(true),
  };
}

export function setup(geocodingResult = ZURICH_RESULT) {
  const fakeSupabase = buildFakeSupabase();
  const fakeGeocoding = buildFakeGeocoding(geocodingResult);
  const fakeFilter = buildFakeFilterService();

  TestBed.configureTestingModule({
    providers: [
      WorkspaceViewService,
      MetadataService,
      { provide: SupabaseService, useValue: fakeSupabase },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: FilterService, useValue: fakeFilter },
    ],
  });

  const service = TestBed.inject(WorkspaceViewService);
  return { service, fakeSupabase, fakeGeocoding };
}
