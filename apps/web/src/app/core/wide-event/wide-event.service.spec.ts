import { TestBed } from '@angular/core/testing';
import { SupabaseEventWriter } from './adapters/supabase-event-writer';
import { decideWideEventPersistence } from './wide-event.helpers';
import { WIDE_EVENT_SAMPLE_RATE, WIDE_EVENT_SLOW_THRESHOLD_MS } from './wide-event.types';
import { WideEventService } from './wide-event.service';

describe('wide-event.helpers decideWideEventPersistence', () => {
  it('always persists errors', () => {
    expect(decideWideEventPersistence('error', 10)).toEqual({
      persist: true,
      sampling: 'always',
    });
  });

  it('always persists timeouts', () => {
    expect(decideWideEventPersistence('timeout', 10)).toEqual({
      persist: true,
      sampling: 'always',
    });
  });

  it('always persists slow successes', () => {
    expect(
      decideWideEventPersistence('ok', WIDE_EVENT_SLOW_THRESHOLD_MS + 1, WIDE_EVENT_SAMPLE_RATE, WIDE_EVENT_SLOW_THRESHOLD_MS, 1),
    ).toEqual({
      persist: true,
      sampling: 'always',
    });
  });

  it('samples fast successes', () => {
    expect(
      decideWideEventPersistence('ok', 100, WIDE_EVENT_SAMPLE_RATE, WIDE_EVENT_SLOW_THRESHOLD_MS, 0.05),
    ).toEqual({
      persist: true,
      sampling: 'sampled',
    });

    expect(
      decideWideEventPersistence('ok', 100, WIDE_EVENT_SAMPLE_RATE, WIDE_EVENT_SLOW_THRESHOLD_MS, 0.5),
    ).toEqual({
      persist: false,
      sampling: null,
    });
  });
});

describe('WideEventService', () => {
  let service: WideEventService;
  let write: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    write = vi.fn().mockResolvedValue(undefined);

    TestBed.configureTestingModule({
      providers: [
        WideEventService,
        {
          provide: SupabaseEventWriter,
          useValue: { write },
        },
      ],
    });

    service = TestBed.inject(WideEventService);
  });

  it('persists error events with toast metadata', () => {
    const ev = service.start('upload.storage', { fileName: 'a.jpg' });
    ev.setToast({
      title: 'Upload failed',
      body: 'Try again',
      codeRef: { file: 'upload-storage.service.ts', fn: 'upload' },
    });
    ev.end('error', { errorMessage: 'storage error' });

    expect(write).toHaveBeenCalledTimes(1);
    const payload = write.mock.calls[0][0];
    expect(payload.operation).toBe('upload.storage');
    expect(payload.status).toBe('error');
    expect(payload.sampling).toBe('always');
    expect(payload.fileName).toBe('a.jpg');
    expect(payload.toastTitle).toBe('Upload failed');
    expect(payload.toastBody).toBe('Try again');
    expect(payload.toastCodeRef).toBe('upload-storage.service.ts · upload');
    expect(payload.traceId).toHaveLength(8);
  });

  it('drops unsampled fast successes', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0.99);

    const ev = service.start('upload.storage');
    ev.end('ok');

    expect(write).not.toHaveBeenCalled();
    vi.mocked(Math.random).mockRestore();
  });

  it('guards against double end()', () => {
    const ev = service.start('upload.storage');
    ev.end('error', { errorMessage: 'first' });
    ev.end('error', { errorMessage: 'second' });

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0].errorMessage).toBe('first');
  });

  it('rounds coordinates in set()', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const ev = service.start('location.resolve');
    ev.set({ latitude: 48.1234567, longitude: 16.9876543 });
    ev.end('ok');

    expect(write).toHaveBeenCalledTimes(1);
    expect(write.mock.calls[0][0].latitude).toBe(48.123);
    expect(write.mock.calls[0][0].longitude).toBe(16.988);
    vi.mocked(Math.random).mockRestore();
  });
});
