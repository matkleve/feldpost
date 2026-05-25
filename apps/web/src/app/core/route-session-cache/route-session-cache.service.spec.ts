import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import { MAP_VIEWPORT_SIGNATURE, ROUTE_SESSION_SHELL_KEYS } from './route-session-cache.keys';
import { RouteSessionCacheService } from './route-session-cache.service';

function sampleMedia(id: string): WorkspaceMedia {
  return {
    id,
    latitude: 48.2,
    longitude: 16.37,
    thumbnailPath: null,
    storagePath: null,
    capturedAt: null,
    createdAt: '2026-01-01T00:00:00Z',
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
}

const mediaSignature = '{"userId":"u1"}';

describe('RouteSessionCacheService', () => {
  let service: RouteSessionCacheService;
  let imageUploaded$: Subject<{ mediaId: string }>;
  let mediaDeleted$: Subject<{ mediaItemIds: string[] }>;
  let mediaRestored$: Subject<void>;
  let sessionSignal: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    imageUploaded$ = new Subject();
    mediaDeleted$ = new Subject();
    mediaRestored$ = new Subject();
    sessionSignal = vi.fn(() => ({ user: { id: 'user-1' } }));

    await TestBed.configureTestingModule({
      providers: [
        RouteSessionCacheService,
        {
          provide: AuthService,
          useValue: { session: sessionSignal },
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
            mediaDeleted$: mediaDeleted$.asObservable(),
            mediaRestored$: mediaRestored$.asObservable(),
          },
        },
      ],
    }).compileComponents();

    service = TestBed.inject(RouteSessionCacheService);
  });

  it('save then restore returns data for matching signature', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);

    const restored = service.restore<WorkspaceMedia[]>(
      ROUTE_SESSION_SHELL_KEYS.MEDIA,
      mediaSignature,
    );
    expect(restored?.map((m) => m.id)).toEqual(['a']);
  });

  it('restore returns null when signature differs', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);

    expect(service.restore(ROUTE_SESSION_SHELL_KEYS.MEDIA, '{"other":true}')).toBeNull();
  });

  it('invalidate clears shell entry', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);
    service.invalidate(ROUTE_SESSION_SHELL_KEYS.MEDIA);

    expect(service.restore(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature)).toBeNull();
  });

  it('invalidateAll clears every shell key', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);
    service.save(ROUTE_SESSION_SHELL_KEYS.MAP, MAP_VIEWPORT_SIGNATURE, {
      centerLat: 1,
      centerLng: 2,
      zoom: 10,
      fetchSouth: 0,
      fetchWest: 0,
      fetchNorth: 1,
      fetchEast: 1,
      roundedZoom: 10,
      viewportRows: [],
      cachedAt: Date.now(),
    });

    service.invalidateAll();

    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MEDIA)).toBeNull();
    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MAP)).toBeNull();
  });

  it('rapid scheduleRevalidate runs handler once per signature', async () => {
    vi.useFakeTimers();
    const handler = vi.fn().mockResolvedValue(undefined);
    service.registerRevalidateHandler(ROUTE_SESSION_SHELL_KEYS.MEDIA, handler);

    service.scheduleRevalidate(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature);
    service.scheduleRevalidate(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature);

    await vi.advanceTimersByTimeAsync(500);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(mediaSignature);
    vi.useRealTimers();
  });

  it('upload before registerRevalidateHandler does not throw and does not call handler', async () => {
    vi.useFakeTimers();
    const handler = vi.fn().mockResolvedValue(undefined);
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('cached')]);

    imageUploaded$.next({ mediaId: 'new' });
    await vi.advanceTimersByTimeAsync(800);

    expect(handler).not.toHaveBeenCalled();
    expect(service.restore(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature)?.[0].id).toBe('cached');

    service.registerRevalidateHandler(ROUTE_SESSION_SHELL_KEYS.MEDIA, handler);
    imageUploaded$.next({ mediaId: 'new-2' });
    await vi.advanceTimersByTimeAsync(800);

    expect(handler).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('upload with map entry invalidates map', async () => {
    vi.useFakeTimers();
    service.save(ROUTE_SESSION_SHELL_KEYS.MAP, MAP_VIEWPORT_SIGNATURE, {
      centerLat: 1,
      centerLng: 2,
      zoom: 10,
      fetchSouth: 0,
      fetchWest: 0,
      fetchNorth: 1,
      fetchEast: 1,
      roundedZoom: 10,
      viewportRows: [],
      cachedAt: Date.now(),
    });

    imageUploaded$.next({ mediaId: 'x' });
    await vi.advanceTimersByTimeAsync(400);

    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MAP)).toBeNull();
    vi.useRealTimers();
  });

  it('mediaDeleted invokes delete patch handler for media only', () => {
    const patchHandler = vi.fn();
    service.registerDeletePatchHandler(ROUTE_SESSION_SHELL_KEYS.MEDIA, patchHandler);
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a'), sampleMedia('b')]);
    service.save(ROUTE_SESSION_SHELL_KEYS.MAP, MAP_VIEWPORT_SIGNATURE, {
      centerLat: 0,
      centerLng: 0,
      zoom: 5,
      fetchSouth: 0,
      fetchWest: 0,
      fetchNorth: 1,
      fetchEast: 1,
      roundedZoom: 5,
      viewportRows: [],
      cachedAt: 0,
    });

    mediaDeleted$.next({ mediaItemIds: ['a'] });

    expect(patchHandler).toHaveBeenCalled();
    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MAP)).toBeNull();
  });

  it('mediaRestored invalidates media entry', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);

    mediaRestored$.next();

    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MEDIA)).toBeNull();
  });

  it('logout clears all entries via session effect', () => {
    service.save(ROUTE_SESSION_SHELL_KEYS.MEDIA, mediaSignature, [sampleMedia('a')]);
    sessionSignal.mockReturnValue(null);
    TestBed.flushEffects();

    expect(service.getEntry(ROUTE_SESSION_SHELL_KEYS.MEDIA)).toBeNull();
  });
});
