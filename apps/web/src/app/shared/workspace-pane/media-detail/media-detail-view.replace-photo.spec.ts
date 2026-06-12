/**
 * MediaDetailViewComponent — IE-10 Replace / Attach Photo.
 *
 * Dedicated TestBed setup (setupReplace) because this flow requires
 * UploadManagerService, WorkspaceViewService, and MediaDownloadService
 * which are not needed in the core editing tests.
 *
 * Shared fixtures: MOCK_MEDIA, setImageId — from media-detail-view.spec-setup.ts
 */

import { NO_ERRORS_SCHEMA, signal } from '@angular/core';
import { ComponentRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Subject } from 'rxjs';
import { MediaDetailViewComponent } from './media-detail-view.component';
import {
  UploadManagerService,
  ImageReplacedEvent,
  ImageAttachedEvent,
  UploadFailedEvent,
} from '../../../core/upload/upload-manager.service';
import { SupabaseService } from '../../../core/supabase/supabase.service';
import { GeocodingService } from '../../../core/geocoding/geocoding.service';
import { UploadService } from '../../../core/upload/upload.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { MediaDownloadService } from '../../../core/media-download/media-download.service';
import { MOCK_MEDIA, setImageId } from './media-detail-view.spec-setup';

// ── IE-10 dedicated setup ─────────────────────────────────────────────────────

/**
 * Builds mocks specifically for the replace/attach photo flow (IE-10).
 * Component delegates to UploadManagerService and reacts to events.
 */
function setupReplace() {
  const imageReplaced$ = new Subject<ImageReplacedEvent>();
  const imageAttached$ = new Subject<ImageAttachedEvent>();
  const uploadFailed$ = new Subject<UploadFailedEvent>();
  const jobsSignal = signal<ReadonlyArray<any>>([]);

  const fakeUploadManager = {
    replaceFile: vi.fn().mockReturnValue('job-001'),
    attachFile: vi.fn().mockReturnValue('job-002'),
    imageReplaced$: imageReplaced$.asObservable(),
    imageAttached$: imageAttached$.asObservable(),
    uploadFailed$: uploadFailed$.asObservable(),
    jobs: jobsSignal,
  };

  // DB select chain for loadImage
  const imageSingleFn = vi.fn().mockResolvedValue({ data: MOCK_MEDIA, error: null });
  const metaSelectEqFn = vi.fn().mockResolvedValue({ data: [], error: null });
  const projectOrderFn = vi.fn().mockResolvedValue({
    data: [{ id: 'proj-001', name: 'Project Alpha' }],
    error: null,
  });
  const metaKeysOrderFn = vi.fn().mockResolvedValue({
    data: [{ key_name: 'Building type' }],
    error: null,
  });
  const createSignedUrlFn = vi.fn().mockResolvedValue({
    data: { signedUrl: 'https://example.com/signed-new' },
    error: null,
  });

  const client = {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'media_items') {
        const mediaRow = {
          id: 'media-001',
          source_image_id: MOCK_MEDIA.id,
          organization_id: MOCK_MEDIA.organization_id,
          created_by: MOCK_MEDIA.user_id,
          storage_path: MOCK_MEDIA.storage_path,
          thumbnail_path: MOCK_MEDIA.thumbnail_path,
          latitude: MOCK_MEDIA.latitude,
          longitude: MOCK_MEDIA.longitude,
          exif_latitude: MOCK_MEDIA.exif_latitude,
          exif_longitude: MOCK_MEDIA.exif_longitude,
          captured_at: MOCK_MEDIA.captured_at,
          created_at: MOCK_MEDIA.created_at,
          mime_type: 'image/jpeg',
          location_status: 'gps',
          address_label: MOCK_MEDIA.address_label,
          street: MOCK_MEDIA.street,
          city: MOCK_MEDIA.city,
          district: MOCK_MEDIA.district,
          country: MOCK_MEDIA.country,
          media_type: 'image',
          gps_assignment_allowed: true,
        };
        return {
          select: vi.fn(() => ({
            or: vi.fn(() => ({
              limit: vi.fn(() => ({
                maybeSingle: vi.fn().mockResolvedValue({ data: mediaRow, error: null }),
              })),
            })),
          })),
          update: vi
            .fn()
            .mockReturnValue({ or: vi.fn().mockResolvedValue({ data: null, error: null }) }),
          delete: vi
            .fn()
            .mockReturnValue({ or: vi.fn().mockResolvedValue({ data: null, error: null }) }),
        };
      }
      if (table === 'images') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ single: imageSingleFn }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ data: null, error: null }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: null, error: null }),
            }),
          }),
        };
      }
      if (table === 'media_metadata') {
        return {
          select: vi.fn().mockReturnValue({ eq: metaSelectEqFn }),
        };
      }
      if (table === 'projects') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({ order: projectOrderFn }),
          }),
        };
      }
      if (table === 'metadata_keys') {
        return {
          select: vi.fn().mockImplementation((cols: string) => {
            if (cols === 'key_name') {
              return { eq: vi.fn().mockReturnValue({ order: metaKeysOrderFn }) };
            }
            return {
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
                }),
              }),
            };
          }),
        };
      }
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      };
    }),
    storage: {
      from: vi.fn().mockReturnValue({
        createSignedUrl: createSignedUrlFn,
      }),
    },
  };

  const fakeUpload = {
    validateFile: vi.fn().mockReturnValue({ valid: true }),
    parseExif: vi.fn().mockResolvedValue({}),
    getSignedUrl: vi.fn().mockResolvedValue('https://example.com/signed'),
  };
  const fakeWorkspaceView = {
    rawImages: signal([
      {
        id: MOCK_MEDIA.id,
        storagePath: MOCK_MEDIA.storage_path,
        thumbnailPath: MOCK_MEDIA.thumbnail_path,
        signedThumbnailUrl: 'https://example.com/old-thumb',
        thumbnailUnavailable: false,
        latitude: MOCK_MEDIA.latitude,
        longitude: MOCK_MEDIA.longitude,
        capturedAt: MOCK_MEDIA.captured_at,
        createdAt: MOCK_MEDIA.created_at,
        projectId: MOCK_MEDIA.project_id,
        projectName: 'Project Alpha',
        direction: MOCK_MEDIA.direction,
        exifLatitude: MOCK_MEDIA.exif_latitude,
        exifLongitude: MOCK_MEDIA.exif_longitude,
        addressLabel: MOCK_MEDIA.address_label,
        city: MOCK_MEDIA.city,
        district: MOCK_MEDIA.district,
        street: MOCK_MEDIA.street,
        country: MOCK_MEDIA.country,
        userName: null,
      },
    ]),
    batchSignThumbnails: vi.fn().mockResolvedValue(undefined),
    activeSorts: signal([]),
    activeGroupings: signal([]),
    collapsedGroups: signal(new Set()),
    isLoading: signal(false),
    selectionActive: signal(false),
  };
  const fakeGeocoding = {
    forward: vi.fn().mockResolvedValue(null),
    reverse: vi.fn().mockResolvedValue(null),
  };
  const fakeMediaDownloadService = {
    getLoadState: vi.fn().mockImplementation(() => signal<'idle' | 'loaded'>('loaded')),
    getSignedUrl: vi.fn().mockResolvedValue({
      url: 'https://example.com/signed-new',
      error: null,
    }),
    preload: vi.fn().mockResolvedValue(true),
    invalidate: vi.fn(),
    markNoMedia: vi.fn(),
  };

  TestBed.configureTestingModule({
    imports: [MediaDetailViewComponent],
    schemas: [NO_ERRORS_SCHEMA],
    providers: [
      { provide: SupabaseService, useValue: { client } },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: UploadService, useValue: fakeUpload },
      { provide: UploadManagerService, useValue: fakeUploadManager },
      { provide: WorkspaceViewService, useValue: fakeWorkspaceView },
      { provide: MediaDownloadService, useValue: fakeMediaDownloadService },
    ],
  });

  const fixture = TestBed.createComponent(MediaDetailViewComponent);
  const component = fixture.componentInstance;
  const ref = fixture.componentRef as ComponentRef<MediaDetailViewComponent>;
  setImageId(component, MOCK_MEDIA.id);
  fixture.detectChanges();

  return {
    component,
    fixture,
    ref,
    client,
    fakeUpload,
    fakeUploadManager,
    fakeWorkspaceView,
    imageReplaced$,
    imageAttached$,
    jobsSignal,
    createSignedUrlFn,
  };
}

function createTestFile(name = 'replacement.jpg', type = 'image/jpeg', size = 1024): File {
  const blob = new Blob(['x'.repeat(size)], { type });
  return new File([blob], name, { type });
}

function createFileEvent(file: File): Event {
  const input = document.createElement('input');
  input.type = 'file';
  Object.defineProperty(input, 'files', { value: [file], writable: false });
  return { target: input } as unknown as Event;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('MediaDetailViewComponent — IE-10 Replace Photo', () => {
  it('delegates to uploadManager.replaceFile for images with storage_path', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    expect(ctx.fakeUploadManager.replaceFile).toHaveBeenCalledWith(MOCK_MEDIA.id, expect.any(File));
    expect(ctx.fakeUploadManager.attachFile).not.toHaveBeenCalled();
  });

  it('delegates to uploadManager.attachFile for photoless images', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA, storage_path: null });

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    expect(ctx.fakeUploadManager.attachFile).toHaveBeenCalledWith(MOCK_MEDIA.id, expect.any(File));
    expect(ctx.fakeUploadManager.replaceFile).not.toHaveBeenCalled();
  });

  it('shows error when file validation fails', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });
    ctx.fakeUpload.validateFile.mockReturnValueOnce({
      valid: false,
      error: 'File too large (30 MB)',
    });

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    expect(ctx.component.replaceError()).toBe('File too large (30 MB)');
    expect(ctx.fakeUploadManager.replaceFile).not.toHaveBeenCalled();
  });

  it('replacing computed reflects active UploadManagerService job state', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });

    expect(ctx.component.replacing()).toBe(false);

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    ctx.jobsSignal.set([{ id: 'job-001', phase: 'uploading' }]);
    expect(ctx.component.replacing()).toBe(true);

    ctx.jobsSignal.set([{ id: 'job-001', phase: 'complete' }]);
    expect(ctx.component.replacing()).toBe(false);
  });

  it('updates image state on imageReplaced$', async () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });
    setImageId(ctx.component, MOCK_MEDIA.id);
    ctx.fixture.detectChanges();

    const blobUrl = 'blob:http://localhost/fake-blob';
    ctx.imageReplaced$.next({
      jobId: 'job-001',
      mediaId: MOCK_MEDIA.id,
      newStoragePath: 'org-001/user-001/new-photo.jpg',
      localObjectUrl: blobUrl,
    });

    await Promise.resolve();

    expect(ctx.component.media()?.storage_path).toBe('org-001/user-001/new-photo.jpg');
  });

  it('updates workspace grid cache on imageReplaced$', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });
    setImageId(ctx.component, MOCK_MEDIA.id);
    ctx.fixture.detectChanges();

    ctx.imageReplaced$.next({
      jobId: 'job-001',
      mediaId: MOCK_MEDIA.id,
      newStoragePath: 'org-001/user-001/new-photo.jpg',
    });

    const gridImage = ctx.fakeWorkspaceView.rawImages().find((wi) => wi.id === MOCK_MEDIA.id);
    expect(gridImage?.storagePath).toBe('org-001/user-001/photo.jpg');

    return vi.waitFor(() => {
      const updated = ctx.fakeWorkspaceView.rawImages().find((wi) => wi.id === MOCK_MEDIA.id);
      expect(updated?.storagePath).toBe('org-001/user-001/new-photo.jpg');
      expect(updated?.signedThumbnailUrl).toBeUndefined();
      expect(ctx.fakeWorkspaceView.batchSignThumbnails).toHaveBeenCalled();
    });
  });

  it('switches from no-photo to photo display on imageAttached$', async () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA, storage_path: null });
    setImageId(ctx.component, MOCK_MEDIA.id);
    ctx.fixture.detectChanges();

    expect(ctx.component.hasPhoto()).toBe(false);

    ctx.imageAttached$.next({
      jobId: 'job-002',
      mediaId: MOCK_MEDIA.id,
      newStoragePath: 'org-001/user-001/attached.jpg',
      localObjectUrl: 'blob:http://localhost/fake-blob',
      hadExistingCoords: false,
    });

    await Promise.resolve();

    expect(ctx.component.hasPhoto()).toBe(true);
    expect(ctx.component.media()?.storage_path).toBe('org-001/user-001/attached.jpg');
  });

  it('revokes blob URL after replace event is handled', async () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });
    setImageId(ctx.component, MOCK_MEDIA.id);
    ctx.fixture.detectChanges();

    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const blobUrl = 'blob:http://localhost/fake-blob';

    ctx.imageReplaced$.next({
      jobId: 'job-001',
      mediaId: MOCK_MEDIA.id,
      newStoragePath: 'org-001/user-001/new-photo.jpg',
      localObjectUrl: blobUrl,
    });

    await vi.waitFor(() => {
      expect(revokeSpy).toHaveBeenCalledWith(blobUrl);
    });

    revokeSpy.mockRestore();
  });

  it('does nothing when no file is selected (cancel)', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });

    const input = document.createElement('input');
    input.type = 'file';
    ctx.component.onFileSelected({ target: input } as unknown as Event);

    expect(ctx.fakeUploadManager.replaceFile).not.toHaveBeenCalled();
  });

  it('does nothing when image is null', () => {
    const ctx = setupReplace();
    ctx.component.media.set(null);

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    expect(ctx.fakeUploadManager.replaceFile).not.toHaveBeenCalled();
  });

  it('clears previous replaceError on new attempt', () => {
    const ctx = setupReplace();
    ctx.component.media.set({ ...MOCK_MEDIA });
    ctx.component.replaceError.set('Previous error');

    ctx.component.onFileSelected(createFileEvent(createTestFile()));

    expect(ctx.component.replaceError()).toBeNull();
  });
});
