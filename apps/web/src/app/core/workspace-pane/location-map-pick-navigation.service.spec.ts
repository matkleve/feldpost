import { describe, expect, it, vi } from 'vitest';
import type { Router } from '@angular/router';
import { LocationMapPickNavigationService } from './location-map-pick-navigation.service';

describe('LocationMapPickNavigationService', () => {
  const service = new LocationMapPickNavigationService();

  it('reads payload from navigation state', () => {
    const router = {
      getCurrentNavigation: () => ({
        extras: {
          state: {
            locationMapPickNav: {
              request: { mediaId: 'media-1', fileName: 'photo.jpg' },
              returnUrl: '/media',
            },
          },
        },
      }),
    } as unknown as Router;

    expect(service.readPayload(router)).toEqual({
      request: { mediaId: 'media-1', fileName: 'photo.jpg' },
      returnUrl: '/media',
    });
  });

  it('rejects invalid returnUrl', () => {
    const router = {
      getCurrentNavigation: () => ({
        extras: {
          state: {
            locationMapPickNav: {
              request: { mediaId: 'media-1', fileName: 'photo.jpg' },
              returnUrl: 'https://evil.example',
            },
          },
        },
      }),
    } as unknown as Router;

    expect(service.readPayload(router)).toBeNull();
  });
});
