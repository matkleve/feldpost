import { TestBed } from '@angular/core/testing';
import { UploadEnrichmentService } from './upload-enrichment.service';
import { GeocodingService } from '../geocoding/geocoding.service';
import { SupabaseService } from '../supabase/supabase.service';

describe('UploadEnrichmentService', () => {
  it('persists forward geocode via resolve_media_location RPC', async () => {
    const geocodingMock = {
      forward: vi.fn().mockResolvedValue({
        lat: 47.3769,
        lng: 8.5417,
        addressLabel: 'Burgstrasse 7, 8001 Zurich, Switzerland',
        city: 'Zurich',
        district: 'Altstadt',
        street: 'Burgstrasse 7',
        streetNumber: '7',
        zip: '8001',
        country: 'Switzerland',
      }),
    };

    const rpcMock = vi.fn().mockResolvedValue({ data: true, error: null });
    const supabaseMock = {
      client: {
        rpc: rpcMock,
      },
    };

    TestBed.configureTestingModule({
      providers: [
        UploadEnrichmentService,
        { provide: GeocodingService, useValue: geocodingMock },
        { provide: SupabaseService, useValue: supabaseMock },
      ],
    });

    const service = TestBed.inject(UploadEnrichmentService);
    const result = await service.enrichWithForwardGeocode('media-123', 'Burgstrasse 7, Zurich');

    expect(geocodingMock.forward).toHaveBeenCalledWith('Burgstrasse 7, Zurich');
    expect(rpcMock).toHaveBeenCalledWith(
      'resolve_media_location',
      expect.objectContaining({
        p_media_item_id: 'media-123',
        p_latitude: 47.3769,
        p_longitude: 8.5417,
        p_address_label: 'Burgstrasse 7, 8001 Zurich, Switzerland',
      }),
    );
    expect(result).toEqual({ coords: { lat: 47.3769, lng: 8.5417 } });
  });
});
