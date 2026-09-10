import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { runUploadCall } from './upload-new-run-upload-phase.util';
import type { PipelineContext, UploadJob } from '../../upload-manager.types';

function createJob(mode: UploadJob['locationRequirementMode']): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'uploading',
    progress: 0,
    statusLabel: 'Uploading',
    submittedAt: new Date(),
    mode: 'new',
    locationRequirementMode: mode,
  };
}

function buildSupabaseClientMock() {
  const remove = vi.fn().mockResolvedValue({ data: null, error: null });
  const or = vi.fn().mockResolvedValue({ data: null, error: null });
  const del = vi.fn().mockReturnValue({ or });
  const client = {
    storage: { from: vi.fn().mockReturnValue({ remove }) },
    from: vi.fn().mockReturnValue({ delete: del }),
  };
  return { client, remove, del, or };
}

/** Deferred promise, so the test controls exactly when uploadFile() "resolves". */
function createDeferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

describe('runUploadCall', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function buildArgs(overrides: {
    uploadFile: ReturnType<typeof vi.fn>;
    ctx: PipelineContext;
    supabaseClient: ReturnType<typeof buildSupabaseClientMock>['client'];
  }) {
    return {
      jobId: 'job-1',
      job: createJob('required'),
      coords: undefined,
      parsedExif: undefined,
      uploadService: { uploadFile: overrides.uploadFile } as unknown as Parameters<
        typeof runUploadCall
      >[0]['uploadService'],
      jobState: { setPhase: vi.fn(), updateJob: vi.fn() } as unknown as Parameters<
        typeof runUploadCall
      >[0]['jobState'],
      timeoutMs: 1000,
      abortSignal: undefined,
      ctx: overrides.ctx,
      supabaseClient: overrides.supabaseClient as unknown as Parameters<
        typeof runUploadCall
      >[0]['supabaseClient'],
    };
  }

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-06
  it('aborts the job request when the upload times out', async () => {
    const { promise } = createDeferred<{ error: null; id: string; storagePath: string }>();
    const abortJobRequest = vi.fn();
    const ctx = { abortJobRequest } as unknown as PipelineContext;
    const { client } = buildSupabaseClientMock();

    const callPromise = runUploadCall(
      buildArgs({ uploadFile: vi.fn().mockReturnValue(promise), ctx, supabaseClient: client }),
    );
    // Prevent an unhandled-rejection warning for the race's timeout branch.
    callPromise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);

    expect(abortJobRequest).toHaveBeenCalledWith('job-1');
    await expect(callPromise).rejects.toThrow('Upload timed out. Please retry.');
  });

  it('cleans up storage + DB residue when the upload succeeds after the timeout already fired', async () => {
    const { promise, resolve } = createDeferred<{
      error: null;
      id: string;
      storagePath: string;
    }>();
    const ctx = { abortJobRequest: vi.fn() } as unknown as PipelineContext;
    const { client, remove, del, or } = buildSupabaseClientMock();

    const callPromise = runUploadCall(
      buildArgs({ uploadFile: vi.fn().mockReturnValue(promise), ctx, supabaseClient: client }),
    );
    callPromise.catch(() => {});

    await vi.advanceTimersByTimeAsync(1000);
    // The upload "arrives late" — after the timeout has already rejected the race.
    resolve({ error: null, id: 'media-1', storagePath: 'org/user/uuid.jpg' });
    await vi.waitFor(() => {
      expect(remove).toHaveBeenCalled();
    });

    expect(remove).toHaveBeenCalledWith(['org/user/uuid.jpg']);
    expect(del).toHaveBeenCalled();
    expect(or).toHaveBeenCalledWith('id.eq.media-1,source_image_id.eq.media-1');
  });

  it('does not touch storage/DB when the upload resolves before the timeout', async () => {
    const ctx = { abortJobRequest: vi.fn() } as unknown as PipelineContext;
    const { client, remove } = buildSupabaseClientMock();
    const result: { error: null; id: string; storagePath: string } = {
      error: null,
      id: 'media-1',
      storagePath: 'org/user/uuid.jpg',
    };

    const callPromise = runUploadCall(
      buildArgs({
        uploadFile: vi.fn().mockResolvedValue(result),
        ctx,
        supabaseClient: client,
      }),
    );

    await expect(callPromise).resolves.toEqual(result);
    expect(ctx.abortJobRequest).not.toHaveBeenCalled();
    expect(remove).not.toHaveBeenCalled();
  });
});
