import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { MediaQueryService } from '../media-query/media-query.service';
import { RouteSessionCacheService } from '../route-session-cache/route-session-cache.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import { buildMediaGalleryQuerySignature } from './media-page-state.helpers';
import { MediaPageStateService } from './media-page-state.service';
import type { MediaGalleryQueryInputs } from './media-page-state.types';

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

const baseInputs: MediaGalleryQueryInputs = {
  userId: 'user-1',
  projectIds: new Set<string>(),
  sorts: [{ key: 'date-captured', direction: 'desc' }],
  groupingIds: [],
  filterRules: [],
};

describe('MediaPageStateService', () => {
  let service: MediaPageStateService;
  let imageUploaded$: Subject<{ mediaId: string; jobId: string; batchId: string }>;
  let batchComplete$: Subject<unknown>;
  let loadAllSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    imageUploaded$ = new Subject();
    batchComplete$ = new Subject();
    loadAllSpy = vi.fn().mockResolvedValue([sampleMedia('fresh-1')]);

    await TestBed.configureTestingModule({
      providers: [
        RouteSessionCacheService,
        MediaPageStateService,
        {
          provide: AuthService,
          useValue: {
            user: () => ({ id: 'user-1' }),
            session: () => ({ user: { id: 'user-1' } }),
          },
        },
        {
          provide: MediaQueryService,
          useValue: { loadAllCurrentUserWorkspaceMedia: loadAllSpy },
        },
        {
          provide: UploadManagerService,
          useValue: {
            batchComplete$: batchComplete$.asObservable(),
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

    service = TestBed.inject(MediaPageStateService);
  });

  it('returns cache hit for matching querySignature', () => {
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    const lookup = service.lookup(baseInputs);
    expect(lookup.hit).toBe(true);
    expect(lookup.mediaItems.map((m) => m.id)).toEqual(['cached-1']);
  });

  it('returns miss when querySignature changes', () => {
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    const otherInputs: MediaGalleryQueryInputs = {
      ...baseInputs,
      projectIds: new Set(['project-a']),
    };

    expect(buildMediaGalleryQuerySignature(otherInputs)).not.toBe(
      buildMediaGalleryQuerySignature(baseInputs),
    );
    expect(service.lookup(otherInputs).hit).toBe(false);
  });

  it('imageUploaded patches cache without full gallery load when no project filter', async () => {
    vi.useFakeTimers();
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    loadAllSpy.mockClear();
    imageUploaded$.next({ mediaId: 'new-media', jobId: 'j1', batchId: 'b1' });
    await vi.advanceTimersByTimeAsync(800);

    expect(loadAllSpy).not.toHaveBeenCalled();
    const lookup = service.lookup(baseInputs);
    expect(lookup.hit).toBe(true);
    expect(lookup.mediaItems.some((m) => m.id === 'new-media')).toBe(true);
    vi.useRealTimers();
  });

  it('imageUploaded with project-scoped cache falls back to full revalidate', async () => {
    vi.useFakeTimers();
    const scopedInputs: MediaGalleryQueryInputs = {
      ...baseInputs,
      projectIds: new Set(['project-a']),
    };
    service.writeCache(scopedInputs, [sampleMedia('cached-1')]);

    loadAllSpy.mockClear();
    imageUploaded$.next({ mediaId: 'new-media', jobId: 'j1', batchId: 'b1' });
    await vi.advanceTimersByTimeAsync(800);

    expect(loadAllSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('cross-shell: batchComplete schedules revalidate while cache exists', async () => {
    vi.useFakeTimers();
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    batchComplete$.next({});
    await vi.advanceTimersByTimeAsync(800);

    expect(loadAllSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('patchMediaItemPreview updates cached row thumbnailPath', () => {
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    const patched = service.patchMediaItemPreview('cached-1', {
      thumbnailPath: 'org/u/thumb.jpg',
      previewGenerationStatus: 'ready',
    });

    expect(patched).toBe(true);
    const lookup = service.lookup(baseInputs);
    expect(lookup.mediaItems[0]?.thumbnailPath).toBe('org/u/thumb.jpg');
    expect(lookup.mediaItems[0]?.previewGenerationStatus).toBe('ready');
  });

  it('map-first: handlers registered in MediaPageState ctor then upload patches cache', async () => {
    vi.useFakeTimers();

    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    loadAllSpy.mockClear();
    imageUploaded$.next({ mediaId: 'from-map', jobId: 'j1', batchId: 'b1' });
    await vi.advanceTimersByTimeAsync(800);

    expect(loadAllSpy).not.toHaveBeenCalled();
    const lookup = service.lookup(baseInputs);
    expect(lookup.hit).toBe(true);
    expect(lookup.mediaItems.some((m) => m.id === 'from-map')).toBe(true);
    vi.useRealTimers();
  });
});
