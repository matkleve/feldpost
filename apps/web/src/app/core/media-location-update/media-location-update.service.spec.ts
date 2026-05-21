import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';
import { LOCATION_UPDATE_NOT_FOUND_ERROR } from './media-location-update.helpers';
import { MediaLocationUpdateService } from './media-location-update.service';

describe('MediaLocationUpdateService', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    rpc.mockReset();
    TestBed.configureTestingModule({
      providers: [
        MediaLocationUpdateService,
        {
          provide: SupabaseService,
          useValue: { client: { rpc } },
        },
        {
          provide: GeocodingService,
          useValue: { reverse: vi.fn().mockResolvedValue(null) },
        },
      ],
    });
  });

  it('returns ok when RPC resolves true', async () => {
    rpc.mockResolvedValue({ data: true, error: null });
    const service = TestBed.inject(MediaLocationUpdateService);
    const result = await service.updateFromAddressSuggestion('media-1', {
      lat: 48.2,
      lng: 16.37,
      addressLabel: 'Vienna',
      city: 'Vienna',
      district: null,
      street: null,
      streetNumber: null,
      zip: null,
      country: 'Austria',
    });
    expect(result.ok).toBe(true);
    expect(result.lat).toBe(48.2);
  });

  it('returns not-found error when RPC data is false', async () => {
    rpc.mockResolvedValue({ data: false, error: null });
    const service = TestBed.inject(MediaLocationUpdateService);
    const result = await service.updateFromCoordinates('media-1', { lat: 48.2, lng: 16.37 });
    expect(result.ok).toBe(false);
    expect(result.error).toBe(LOCATION_UPDATE_NOT_FOUND_ERROR);
  });

  it('returns RPC message when PostgREST reports error', async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'GPS assignment is disabled for this media item type' },
    });
    const service = TestBed.inject(MediaLocationUpdateService);
    const result = await service.updateFromAddressSuggestion('media-1', {
      lat: 48.2,
      lng: 16.37,
      addressLabel: 'Vienna',
      city: null,
      district: null,
      street: null,
      streetNumber: null,
      zip: null,
      country: null,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toContain('GPS assignment');
  });
});
