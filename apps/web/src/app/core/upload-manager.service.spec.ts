/**
 * UploadManagerService unit tests.
 *
 * Strategy:
 *  - UploadService, GeocodingService, AuthService, and SupabaseService are faked.
 *  - Tests verify queue management, concurrency, pipeline phases, event emissions,
 *    and state transitions without any real network calls.
 */

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { UploadManagerService, UploadJob, UploadPhase } from './upload-manager.service';
import { UploadService } from './upload.service';
import { GeocodingService } from './geocoding.service';
import { AuthService } from './auth.service';
import { SupabaseService } from './supabase.service';

// ── Fakes ──────────────────────────────────────────────────────────────────────

function buildFakeUploadService() {
  return {
    validateFile: vi.fn().mockReturnValue({ valid: true }),
    parseExif: vi.fn().mockResolvedValue({ coords: { lat: 48.2, lng: 16.37 }, direction: 90 }),
    uploadFile: vi.fn().mockResolvedValue({
      id: 'img-123',
      storagePath: 'org/user/uuid.jpg',
      coords: { lat: 48.2, lng: 16.37 },
      direction: 90,
      error: null,
    }),
  };
}

function buildFakeGeocodingService() {
  return {
    reverse: vi.fn().mockResolvedValue({
      addressLabel: '123 Test St',
      city: 'Vienna',
      district: null,
      street: 'Test St',
      country: 'Austria',
    }),
    forward: vi.fn().mockResolvedValue({
      lat: 48.2,
      lng: 16.37,
      addressLabel: '123 Test St',
      city: 'Vienna',
      district: null,
      street: 'Test St',
      country: 'Austria',
    }),
  };
}

function buildFakeAuthService() {
  const userSignal = signal({ id: 'user-1' });
  return {
    user: userSignal.asReadonly(),
    session: signal(null).asReadonly(),
    loading: signal(false).asReadonly(),
    _userSignal: userSignal,
  };
}

function buildFakeSupabaseService() {
  return {
    client: {
      storage: {
        from: vi.fn().mockReturnValue({
          remove: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      },
      from: vi.fn().mockReturnValue({
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
      rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    },
  };
}

function makeFile(name = 'photo.jpg'): File {
  return new File([new Uint8Array(512)], name, { type: 'image/jpeg' });
}

// ── Setup ──────────────────────────────────────────────────────────────────────

async function setup() {
  const fakeUpload = buildFakeUploadService();
  const fakeGeocoding = buildFakeGeocodingService();
  const fakeAuth = buildFakeAuthService();
  const fakeSupabase = buildFakeSupabaseService();

  TestBed.configureTestingModule({
    providers: [
      UploadManagerService,
      { provide: UploadService, useValue: fakeUpload },
      { provide: GeocodingService, useValue: fakeGeocoding },
      { provide: AuthService, useValue: fakeAuth },
      { provide: SupabaseService, useValue: fakeSupabase },
    ],
  });

  const service = TestBed.inject(UploadManagerService);
  return { service, fakeUpload, fakeGeocoding, fakeAuth, fakeSupabase };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('UploadManagerService', () => {
  describe('creation', () => {
    it('creates', async () => {
      const { service } = await setup();
      expect(service).toBeTruthy();
    });

    it('starts with empty jobs', async () => {
      const { service } = await setup();
      expect(service.jobs()).toHaveLength(0);
    });

    it('starts with isBusy false', async () => {
      const { service } = await setup();
      expect(service.isBusy()).toBe(false);
    });

    it('starts with activeCount 0', async () => {
      const { service } = await setup();
      expect(service.activeCount()).toBe(0);
    });
  });

  describe('submit()', () => {
    it('returns an array of job IDs', async () => {
      const { service } = await setup();
      const ids = service.submit([makeFile(), makeFile()]);
      expect(ids).toHaveLength(2);
      expect(typeof ids[0]).toBe('string');
      expect(typeof ids[1]).toBe('string');
    });

    it('adds jobs to the queue', async () => {
      const { service } = await setup();
      service.submit([makeFile()]);
      expect(service.jobs().length).toBeGreaterThanOrEqual(1);
    });

    it('creates thumbnail URLs for submitted files', async () => {
      const { service } = await setup();
      service.submit([makeFile()]);
      const job = service.jobs()[0];
      expect(job.thumbnailUrl).toBeTruthy();
    });
  });

  describe('Path A: GPS in EXIF', () => {
    it('completes upload with coords from EXIF', async () => {
      const { service, fakeUpload } = await setup();

      fakeUpload.parseExif.mockResolvedValue({
        coords: { lat: 48.2, lng: 16.37 },
        direction: 90,
      });

      const events: { imageId: string }[] = [];
      service.imageUploaded$.subscribe((e) => events.push(e));

      service.submit([makeFile()]);

      await vi.waitFor(() => {
        expect(events.length).toBe(1);
      });

      expect(events[0].imageId).toBe('img-123');
    });
  });

  describe('Path B: address in filename', () => {
    it('detects address in filename and forward-geocodes', async () => {
      const { service, fakeUpload, fakeGeocoding } = await setup();

      // No GPS in EXIF
      fakeUpload.parseExif.mockResolvedValue({});
      // Upload succeeds without coords
      fakeUpload.uploadFile.mockResolvedValue({
        id: 'img-456',
        storagePath: 'org/user/uuid.jpg',
        coords: undefined,
        direction: undefined,
        error: null,
      });

      const events: { imageId: string }[] = [];
      service.imageUploaded$.subscribe((e) => events.push(e));

      // Filename with street address
      service.submit([makeFile('Burgstraße_7_facade.jpg')]);

      await vi.waitFor(() => {
        expect(events.length).toBe(1);
      });

      expect(fakeGeocoding.forward).toHaveBeenCalled();
      expect(events[0].imageId).toBe('img-456');
    });
  });

  describe('Path C: no GPS, no address', () => {
    it('enters missing_data and emits missingData$', async () => {
      const { service, fakeUpload } = await setup();

      // No GPS in EXIF
      fakeUpload.parseExif.mockResolvedValue({});

      const events: { jobId: string; reason: string }[] = [];
      service.missingData$.subscribe((e) => events.push(e));

      // Generic camera filename — no address
      service.submit([makeFile('IMG_20260311_143022.jpg')]);

      await vi.waitFor(() => {
        expect(events.length).toBe(1);
      });

      expect(events[0].reason).toBe('no_gps_no_address');
      const job = service.jobs().find((j) => j.id === events[0].jobId);
      expect(job?.phase).toBe('missing_data');
    });
  });

  describe('concurrency', () => {
    it('does not start more than 3 concurrent uploads', async () => {
      const { service, fakeUpload } = await setup();

      // Make upload hang indefinitely
      let resolvers: Array<(v: unknown) => void> = [];
      fakeUpload.parseExif.mockImplementation(() => new Promise((res) => resolvers.push(res)));

      service.submit([makeFile(), makeFile(), makeFile(), makeFile(), makeFile()]);

      // Wait a tick for the drain to run
      await new Promise((r) => setTimeout(r, 10));

      // Only 3 should have started parsing (the 4th and 5th should be queued)
      expect(resolvers.length).toBe(3);
    });
  });

  describe('retryJob()', () => {
    it('moves an errored job back to queued', async () => {
      const { service, fakeUpload } = await setup();

      // First upload fails
      fakeUpload.uploadFile.mockResolvedValueOnce({ error: 'Network error' });
      // Second attempt succeeds
      fakeUpload.uploadFile.mockResolvedValueOnce({
        id: 'img-retry',
        storagePath: 'p',
        coords: { lat: 1, lng: 2 },
        error: null,
      });

      const failEvents: string[] = [];
      service.uploadFailed$.subscribe((e) => failEvents.push(e.jobId));

      const [jobId] = service.submit([makeFile()]);

      await vi.waitFor(() => {
        expect(failEvents.length).toBe(1);
      });

      // Retry
      const successEvents: string[] = [];
      service.imageUploaded$.subscribe((e) => successEvents.push(e.jobId));

      service.retryJob(jobId);

      await vi.waitFor(() => {
        expect(successEvents.length).toBe(1);
      });
    });
  });

  describe('dismissJob()', () => {
    it('removes a completed job from the list', async () => {
      const { service } = await setup();
      const events: string[] = [];
      service.imageUploaded$.subscribe((e) => events.push(e.jobId));

      const [jobId] = service.submit([makeFile()]);

      await vi.waitFor(() => {
        expect(events.length).toBe(1);
      });

      service.dismissJob(jobId);
      expect(service.jobs().find((j) => j.id === jobId)).toBeUndefined();
    });
  });

  describe('dismissAllCompleted()', () => {
    it('removes all terminal jobs', async () => {
      const { service } = await setup();
      const events: string[] = [];
      service.imageUploaded$.subscribe((e) => events.push(e.jobId));

      service.submit([makeFile(), makeFile()]);

      await vi.waitFor(() => {
        expect(events.length).toBe(2);
      });

      service.dismissAllCompleted();
      expect(service.jobs().filter((j) => j.phase === 'complete')).toHaveLength(0);
    });
  });

  describe('cancelJob()', () => {
    it('cancels a queued job', async () => {
      const { service, fakeUpload } = await setup();

      // Make all uploads hang
      fakeUpload.parseExif.mockImplementation(() => new Promise(() => {}));

      const ids = service.submit([makeFile(), makeFile(), makeFile(), makeFile()]);
      await new Promise((r) => setTimeout(r, 10));

      // The 4th job should still be queued
      const fourthJob = service.jobs().find((j) => j.id === ids[3]);
      expect(fourthJob?.phase).toBe('queued');

      service.cancelJob(ids[3]);

      const cancelled = service.jobs().find((j) => j.id === ids[3]);
      expect(cancelled?.phase).toBe('error');
      expect(cancelled?.error).toContain('cancelled');
    });
  });

  describe('placeJob()', () => {
    it('moves a missing_data job back to queued with coords', async () => {
      const { service, fakeUpload } = await setup();

      // No GPS in EXIF
      fakeUpload.parseExif.mockResolvedValue({});

      const missingEvents: string[] = [];
      service.missingData$.subscribe((e) => missingEvents.push(e.jobId));

      // Camera filename — no address
      const [jobId] = service.submit([makeFile('DSC_0001.jpg')]);

      await vi.waitFor(() => {
        expect(missingEvents.length).toBe(1);
      });

      // Now upload succeeds when called with coords
      fakeUpload.uploadFile.mockResolvedValueOnce({
        id: 'img-placed',
        storagePath: 'p',
        coords: { lat: 48.2, lng: 16.37 },
        direction: undefined,
        error: null,
      });

      const completeEvents: string[] = [];
      service.imageUploaded$.subscribe((e) => completeEvents.push(e.jobId));

      service.placeJob(jobId, { lat: 48.2, lng: 16.37 });

      await vi.waitFor(() => {
        expect(completeEvents.length).toBe(1);
      });
    });
  });

  describe('validation failure', () => {
    it('moves to error phase if validation fails', async () => {
      const { service, fakeUpload } = await setup();

      fakeUpload.validateFile.mockReturnValue({ valid: false, error: 'File too large' });

      const failEvents: string[] = [];
      service.uploadFailed$.subscribe((e) => failEvents.push(e.error));

      service.submit([makeFile()]);

      await vi.waitFor(() => {
        expect(failEvents.length).toBe(1);
      });

      expect(failEvents[0]).toBe('File too large');
    });
  });

  describe('title extraction', () => {
    it('detects German street address in filename', async () => {
      const { service, fakeUpload } = await setup();
      fakeUpload.parseExif.mockResolvedValue({});
      fakeUpload.uploadFile.mockResolvedValue({
        id: 'img-title',
        storagePath: 'p',
        coords: undefined,
        error: null,
      });

      const events: string[] = [];
      service.imageUploaded$.subscribe((e) => events.push(e.jobId));

      service.submit([makeFile('Hauptstraße_12_front.jpg')]);

      await vi.waitFor(() => {
        expect(events.length).toBe(1);
      });

      const job = service.jobs().find((j) => j.id === events[0]);
      expect(job?.titleAddress).toContain('Hauptstraße');
    });

    it('rejects camera-generated filenames', async () => {
      const { service, fakeUpload } = await setup();
      fakeUpload.parseExif.mockResolvedValue({});

      const missingEvents: string[] = [];
      service.missingData$.subscribe((e) => missingEvents.push(e.jobId));

      service.submit([makeFile('IMG_0042.jpg')]);

      await vi.waitFor(() => {
        expect(missingEvents.length).toBe(1);
      });
    });
  });
});
