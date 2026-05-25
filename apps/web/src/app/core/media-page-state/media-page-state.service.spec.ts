import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { MediaQueryService } from '../media-query/media-query.service';
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
  let imageUploaded$: Subject<{ mediaId: string }>;
  let loadAllSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    imageUploaded$ = new Subject();
    loadAllSpy = vi.fn().mockResolvedValue([sampleMedia('fresh-1')]);

    await TestBed.configureTestingModule({
      providers: [
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

  it('cross-shell: upload event schedules revalidate while cache exists', async () => {
    vi.useFakeTimers();
    service.writeCache(baseInputs, [sampleMedia('cached-1')]);

    imageUploaded$.next({ mediaId: 'new-media' } as { mediaId: string });
    await vi.advanceTimersByTimeAsync(800);

    expect(loadAllSpy).toHaveBeenCalled();
    vi.useRealTimers();
  });
});
