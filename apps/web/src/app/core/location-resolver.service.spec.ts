import { TestBed } from '@angular/core/testing';
import { LocationResolverService } from './location-resolver.service';
import { GeocodingService } from './geocoding.service';
import { SupabaseService } from './supabase/supabase.service';
import { AuthService } from './auth/auth.service';
import type { WorkspaceImage } from './workspace-view.types';

describe('LocationResolverService', () => {
  it('keeps on-demand resolution non-blocking when persist address RPC fails', async () => {
    const geocodingMock = {
      reverse: vi.fn().mockResolvedValue({
        addressLabel: 'Wilhelminenstrasse 85, 1160 Wien',
        city: 'Wien',
        district: 'Ottakring',
        street: 'Wilhelminenstrasse 85',
        country: 'Austria',
        countryCode: 'at',
      }),
      forward: vi.fn().mockResolvedValue(null),
    };

    const supabaseMock = {
      client: {
        rpc: vi.fn().mockResolvedValue({
          data: null,
          error: new TypeError('NetworkError when attempting to fetch resource.'),
        }),
      },
    };

    const authMock = {
      user: vi.fn().mockReturnValue({ id: 'user-1' }),
    };

    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    TestBed.configureTestingModule({
      providers: [
        LocationResolverService,
        { provide: GeocodingService, useValue: geocodingMock },
        { provide: SupabaseService, useValue: supabaseMock },
        { provide: AuthService, useValue: authMock },
      ],
    });

    const service = TestBed.inject(LocationResolverService);
    const image: WorkspaceImage = {
      id: 'img-1',
      latitude: 48.2174,
      longitude: 16.3008,
      thumbnailPath: null,
      storagePath: null,
      capturedAt: null,
      createdAt: new Date().toISOString(),
      projectId: null,
      projectName: null,
      direction: null,
      exifLatitude: null,
      exifLongitude: null,
      addressLabel: null,
      city: null,
      district: null,
      street: null,
      country: null,
      userName: null,
    };

    const results = await service.resolveOnDemand([image]);

    expect(results.get('img-1')).toMatchObject({
      addressLabel: 'Wilhelminenstrasse 85, 1160 Wien',
      city: 'Wien',
    });
    expect(geocodingMock.reverse).toHaveBeenCalledTimes(1);
    expect(supabaseMock.client.rpc).toHaveBeenCalledWith(
      'bulk_update_image_addresses',
      expect.objectContaining({
        p_image_ids: ['img-1'],
      }),
    );
    expect(errorSpy).toHaveBeenCalledWith(
      '[LocationResolver] Failed to persist address:',
      expect.objectContaining({
        message: expect.stringContaining('NetworkError'),
      }),
    );
    expect((service as unknown as { pending: Set<string> }).pending.size).toBe(0);
  });
});

