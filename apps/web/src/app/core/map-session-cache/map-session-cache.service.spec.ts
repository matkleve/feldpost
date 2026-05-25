import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { RouteSessionCacheService } from '../route-session-cache/route-session-cache.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import { MapSessionCacheService } from './map-session-cache.service';
import type { MapSessionSnapshot } from './map-session-cache.types';

function sampleSnapshot(): MapSessionSnapshot {
  return {
    centerLat: 48.2,
    centerLng: 16.37,
    zoom: 12,
    fetchSouth: 48,
    fetchWest: 16,
    fetchNorth: 49,
    fetchEast: 17,
    roundedZoom: 12,
    viewportRows: [],
    cachedAt: Date.now(),
  };
}

describe('MapSessionCacheService', () => {
  let mapCache: MapSessionCacheService;
  let imageUploaded$: Subject<{ mediaId: string }>;

  beforeEach(async () => {
    imageUploaded$ = new Subject();

    await TestBed.configureTestingModule({
      providers: [
        RouteSessionCacheService,
        MapSessionCacheService,
        {
          provide: AuthService,
          useValue: { session: () => ({ user: { id: 'user-1' } }) },
        },
        {
          provide: UploadManagerService,
          useValue: {
            batchComplete$: new Subject(),
            imageUploaded$: imageUploaded$.asObservable(),
            imageReplaced$: new Subject(),
            imageAttached$: new Subject(),
          },
        },
        {
          provide: MediaDeleteUndoService,
          useValue: {
            mediaDeleted$: new Subject(),
            mediaRestored$: new Subject(),
          },
        },
      ],
    }).compileComponents();

    mapCache = TestBed.inject(MapSessionCacheService);
  });

  it('write then read round-trips snapshot', () => {
    const snapshot = sampleSnapshot();
    mapCache.write(snapshot);

    expect(mapCache.read()).toEqual(snapshot);
  });

  it('upload event invalidates cached snapshot', async () => {
    vi.useFakeTimers();
    mapCache.write(sampleSnapshot());

    imageUploaded$.next({ mediaId: 'new' });
    await vi.advanceTimersByTimeAsync(400);

    expect(mapCache.read()).toBeNull();
    vi.useRealTimers();
  });
});
