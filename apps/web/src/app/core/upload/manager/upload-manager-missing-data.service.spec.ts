import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { UploadManagerMissingDataService } from './upload-manager-missing-data.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { ProjectsService } from '../../projects/projects.service';
import { GeocodingService } from '../../geocoding/geocoding.service';
import type { UploadAddressCandidate } from '../upload-manager.types';

describe('UploadManagerMissingDataService', () => {
  const rpc = vi.fn();

  beforeEach(() => {
    rpc.mockReset();
    rpc.mockResolvedValue({ data: true, error: null });
    TestBed.configureTestingModule({
      providers: [
        UploadManagerMissingDataService,
        {
          provide: SupabaseService,
          useValue: { client: { rpc } },
        },
        {
          provide: UploadJobStateService,
          useValue: {
            transitionTo: vi.fn(),
            updateJob: vi.fn(),
            findJob: vi.fn().mockReturnValue({ batchId: 'batch-1' }),
          },
        },
        {
          provide: ProjectsService,
          useValue: { addMediaToProject: vi.fn() },
        },
        {
          provide: GeocodingService,
          useValue: {
            reverse: vi.fn().mockResolvedValue({
              addressLabel: 'Stephansplatz, 1010 Wien',
              city: 'Wien',
              district: 'Innere Stadt',
              street: 'Stephansplatz',
              streetNumber: null,
              zip: '1010',
              country: 'Austria',
              countryCode: 'at',
            }),
          },
        },
      ],
    });
  });

  it('persists address precision when user picks an address candidate in Issues', async () => {
    const service = TestBed.inject(UploadManagerMissingDataService);
    const candidate: UploadAddressCandidate = {
      id: 'cand-1',
      addressLabel: '1010 Wien',
      lat: 48.2082,
      lng: 16.3738,
      city: 'Wien',
      postcode: '1010',
      state: 'Wien',
    };

    await service.resolvePersistedMissingDataLocation(
      'job-1',
      'media-1',
      { lat: candidate.lat, lng: candidate.lng },
      vi.fn(),
      candidate,
    );

    expect(rpc).toHaveBeenCalledWith(
      'resolve_media_location',
      expect.objectContaining({
        p_media_item_id: 'media-1',
        p_latitude: 48.2082,
        p_longitude: 16.3738,
        p_city: 'Wien',
        p_postcode: '1010',
        p_address_precision: 'city',
      }),
    );
  });

  it('caps pin-drop reverse geocode precision below houseNumber', async () => {
    TestBed.overrideProvider(GeocodingService, {
      useValue: {
        reverse: vi.fn().mockResolvedValue({
          addressLabel: 'Fuchsthallergasse 4, 1090 Wien',
          city: 'Wien',
          district: 'Alsergrund',
          street: 'Fuchsthallergasse',
          streetNumber: '4',
          zip: '1090',
          country: 'Austria',
          countryCode: 'at',
        }),
      },
    });
    const service = TestBed.inject(UploadManagerMissingDataService);

    await service.resolvePersistedMissingDataLocation(
      'job-1',
      'media-1',
      { lat: 48.22, lng: 16.36 },
      vi.fn(),
    );

    expect(rpc).toHaveBeenCalledWith(
      'resolve_media_location',
      expect.objectContaining({
        p_address_precision: 'street',
        p_house_number: null,
      }),
    );
  });
});
