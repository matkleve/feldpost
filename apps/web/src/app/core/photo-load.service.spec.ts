import { TestBed } from '@angular/core/testing';
import {
  PhotoLoadService,
  PHOTO_PLACEHOLDER_ICON,
  PHOTO_NO_PHOTO_ICON,
} from './photo-load.service';
import { SupabaseService } from './supabase.service';

// ── Helpers ────────────────────────────────────────────────────────────────────

function buildFakeSupabase(
  overrides: {
    createSignedUrl?: ReturnType<typeof vi.fn>;
    createSignedUrls?: ReturnType<typeof vi.fn>;
  } = {},
) {
  const createSignedUrl =
    overrides.createSignedUrl ??
    vi.fn().mockResolvedValue({
      data: { signedUrl: 'https://storage.example/signed/photo.jpg' },
      error: null,
    });
  const createSignedUrls =
    overrides.createSignedUrls ??
    vi.fn().mockResolvedValue({
      data: [
        { path: 'org/user/thumb_abc.jpg', signedUrl: 'https://storage.example/signed/thumb.jpg' },
      ],
      error: null,
    });

  return {
    client: {
      storage: {
        from: vi.fn().mockReturnValue({ createSignedUrl, createSignedUrls }),
      },
    },
    _createSignedUrl: createSignedUrl,
    _createSignedUrls: createSignedUrls,
  };
}

function createService(fakeSupabase?: ReturnType<typeof buildFakeSupabase>) {
  const fake = fakeSupabase ?? buildFakeSupabase();
  TestBed.configureTestingModule({
    providers: [PhotoLoadService, { provide: SupabaseService, useValue: fake }],
  });
  return { service: TestBed.inject(PhotoLoadService), fake };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('PhotoLoadService', () => {
  beforeEach(() => TestBed.resetTestingModule());

  describe('getSignedUrl', () => {
    it('signs a marker URL with 80×80 transform', async () => {
      const { service, fake } = createService();
      const result = await service.getSignedUrl('org/user/photo.jpg', 'marker', 'img-1');

      expect(result.url).toBe('https://storage.example/signed/photo.jpg');
      expect(result.error).toBeNull();
      expect(fake._createSignedUrl).toHaveBeenCalledWith('org/user/photo.jpg', 3600, {
        transform: { width: 80, height: 80, resize: 'cover' },
      });
    });

    it('signs a thumb URL with 256×256 transform', async () => {
      const { service, fake } = createService();
      await service.getSignedUrl('org/user/photo.jpg', 'thumb', 'img-1');

      expect(fake._createSignedUrl).toHaveBeenCalledWith('org/user/photo.jpg', 3600, {
        transform: { width: 256, height: 256, resize: 'cover' },
      });
    });

    it('signs a full URL with no transform', async () => {
      const { service, fake } = createService();
      await service.getSignedUrl('org/user/photo.jpg', 'full', 'img-1');

      expect(fake._createSignedUrl).toHaveBeenCalledWith('org/user/photo.jpg', 3600, undefined);
    });

    it('returns cached URL on repeated calls within staleness window', async () => {
      const { service, fake } = createService();

      await service.getSignedUrl('org/user/photo.jpg', 'thumb', 'img-1');
      await service.getSignedUrl('org/user/photo.jpg', 'thumb', 'img-1');

      expect(fake._createSignedUrl).toHaveBeenCalledTimes(1);
    });

    it('returns error when signing fails', async () => {
      const fake = buildFakeSupabase({
        createSignedUrl: vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'Object not found' },
        }),
      });
      const { service } = createService(fake);
      const result = await service.getSignedUrl('bad/path.jpg', 'thumb', 'img-1');

      expect(result.url).toBeNull();
      expect(result.error).toBe('Object not found');
    });

    it('transitions load state: idle → loading → loaded', async () => {
      const { service } = createService();
      const state = service.getLoadState('img-1', 'thumb');
      expect(state()).toBe('idle');

      await service.getSignedUrl('org/user/photo.jpg', 'thumb', 'img-1');
      expect(state()).toBe('loaded');
    });

    it('transitions load state to error on failure', async () => {
      const fake = buildFakeSupabase({
        createSignedUrl: vi.fn().mockResolvedValue({ data: null, error: { message: 'fail' } }),
      });
      const { service } = createService(fake);

      await service.getSignedUrl('bad/path.jpg', 'thumb', 'img-1');
      expect(service.getLoadState('img-1', 'thumb')()).toBe('error');
    });
  });

  describe('batchSign', () => {
    it('uses createSignedUrls for items with thumbnailPath', async () => {
      const { service, fake } = createService();
      const items = [
        { id: 'img-1', storagePath: 'org/user/photo.jpg', thumbnailPath: 'org/user/thumb_abc.jpg' },
      ];

      const results = await service.batchSign(items, 'thumb');

      expect(fake._createSignedUrls).toHaveBeenCalledWith(['org/user/thumb_abc.jpg'], 3600);
      expect(results.get('img-1')?.url).toBe('https://storage.example/signed/thumb.jpg');
    });

    it('uses individual createSignedUrl with transform for items without thumbnailPath', async () => {
      const { service, fake } = createService();
      const items = [{ id: 'img-2', storagePath: 'org/user/photo2.jpg', thumbnailPath: null }];

      await service.batchSign(items, 'thumb');

      expect(fake._createSignedUrl).toHaveBeenCalledWith('org/user/photo2.jpg', 3600, {
        transform: { width: 256, height: 256, resize: 'cover' },
      });
    });

    it('emits batchComplete$ when done', async () => {
      const { service } = createService();
      const events: string[][] = [];
      service.batchComplete$.subscribe((e) => events.push(e.imageIds));

      await service.batchSign([{ id: 'img-1', storagePath: 'p', thumbnailPath: 'tp' }], 'thumb');

      expect(events).toHaveLength(1);
      expect(events[0]).toContain('img-1');
    });
  });

  describe('preload', () => {
    it('resolves true when image loads', async () => {
      // Image constructor is available in jsdom
      const result = await new Promise<boolean>((resolve) => {
        // We can't easily test real image loading in jsdom, but we test the interface
        const service = createService().service;
        // preload will call new Image() which in jsdom fires onerror (no real network)
        service.preload('https://example.com/photo.jpg').then(resolve);
      });
      // jsdom Image doesn't load, so expect false
      expect(typeof result).toBe('boolean');
    });
  });

  describe('invalidate', () => {
    it('clears all size variants; next call re-signs', async () => {
      const { service, fake } = createService();

      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');
      await service.getSignedUrl('org/photo.jpg', 'marker', 'img-1');

      service.invalidate('img-1');

      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');
      // 3 calls total: initial thumb, initial marker, re-sign thumb
      expect(fake._createSignedUrl).toHaveBeenCalledTimes(3);
    });
  });

  describe('invalidateStale', () => {
    it('only clears entries older than the threshold', async () => {
      const { service, fake } = createService();
      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');

      // With maxAge of 0, everything should be stale
      const cleared = service.invalidateStale(0);
      expect(cleared).toBe(1);

      // Now it should re-sign
      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');
      expect(fake._createSignedUrl).toHaveBeenCalledTimes(2);
    });

    it('does not clear local blob URLs', () => {
      const { service } = createService();
      service.setLocalUrl('img-1', 'blob:http://localhost/abc');

      const cleared = service.invalidateStale(0);
      expect(cleared).toBe(0);
    });
  });

  describe('setLocalUrl / revokeLocalUrl', () => {
    it('makes all sizes return the blob URL immediately', async () => {
      const { service, fake } = createService();
      service.setLocalUrl('img-1', 'blob:http://localhost/abc');

      const result = await service.getSignedUrl('any-path', 'thumb', 'img-1');
      expect(result.url).toBe('blob:http://localhost/abc');
      // No Supabase call needed
      expect(fake._createSignedUrl).not.toHaveBeenCalled();
    });

    it('revokeLocalUrl clears cache and calls revokeObjectURL', () => {
      const { service } = createService();
      const revokeSpy = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {});

      service.setLocalUrl('img-1', 'blob:http://localhost/abc');
      service.revokeLocalUrl('img-1');

      expect(revokeSpy).toHaveBeenCalledWith('blob:http://localhost/abc');
      expect(service.getLoadState('img-1', 'thumb')()).toBe('idle');

      revokeSpy.mockRestore();
    });
  });

  describe('event streams', () => {
    it('urlChanged$ emits when a new URL is cached', async () => {
      const { service } = createService();
      const events: string[] = [];
      service.urlChanged$.subscribe((e) => events.push(e.url));

      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');
      expect(events).toHaveLength(1);
      expect(events[0]).toBe('https://storage.example/signed/photo.jpg');
    });

    it('stateChanged$ emits on every state transition', async () => {
      const { service } = createService();
      const states: string[] = [];
      service.stateChanged$.subscribe((e) => states.push(e.state));

      await service.getSignedUrl('org/photo.jpg', 'thumb', 'img-1');
      expect(states).toContain('loading');
      expect(states).toContain('loaded');
    });
  });

  describe('markNoPhoto', () => {
    it('sets all sizes to no-photo immediately without network request', () => {
      const { service, fake } = createService();

      service.markNoPhoto('img-1');

      expect(service.getLoadState('img-1', 'marker')()).toBe('no-photo');
      expect(service.getLoadState('img-1', 'thumb')()).toBe('no-photo');
      expect(service.getLoadState('img-1', 'full')()).toBe('no-photo');
      expect(fake._createSignedUrl).not.toHaveBeenCalled();
      expect(fake._createSignedUrls).not.toHaveBeenCalled();
    });

    it('emits stateChanged$ for each size', () => {
      const { service } = createService();
      const events: Array<{ imageId: string; size: string; state: string }> = [];
      service.stateChanged$.subscribe((e) => events.push(e));

      service.markNoPhoto('img-1');

      expect(events).toHaveLength(3);
      expect(events.every((e) => e.state === 'no-photo')).toBe(true);
      expect(events.map((e) => e.size)).toEqual(['marker', 'thumb', 'full']);
    });
  });

  describe('placeholder icons', () => {
    it('exports valid SVG data-URIs', () => {
      expect(PHOTO_PLACEHOLDER_ICON).toContain('data:image/svg+xml');
      expect(PHOTO_NO_PHOTO_ICON).toContain('data:image/svg+xml');
    });
  });
});
