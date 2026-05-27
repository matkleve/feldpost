import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import { UploadLocationConfigService } from '../upload/upload-location-config.service';
import { DEFAULT_UPLOAD_LOCATION_CONFIG } from '../upload/upload-location-config';
import { TokenNormalizerService } from './token-normalizer.service';

describe('TokenNormalizerService', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        TokenNormalizerService,
        {
          provide: LocalGeoDataAdapter,
          useValue: {
            getBundeslaender: vi.fn().mockResolvedValue([{ n: 'Vienna', a: ['Wien'] }]),
          },
        },
        {
          provide: UploadLocationConfigService,
          useValue: {
            getConfig: () => DEFAULT_UPLOAD_LOCATION_CONFIG,
          },
        },
      ],
    });
  });

  it('maps known state token to canonical English', async () => {
    const service = TestBed.inject(TokenNormalizerService);
    const result = await service.normalizeToken('Wien');
    expect(result).toMatchObject({ field: 'state', value: 'Vienna', confidence: 1 });
    await expect(service.normalizeToken('Wien')).resolves.toMatchObject({
      field: 'state',
      value: 'Vienna',
    });
    expect(result.confidence).toBe(1);
  });
});
