import { describe, expect, it, vi } from 'vitest';
import { runUploadDedupCheck } from './upload-dedup-check.util';
import type { PipelineContext, UploadJob } from '../upload-manager.types';

function makeJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'dup-1',
    batchId: 'batch-1',
    file: new File(['x'], 'foto.jpg', { type: 'image/jpeg' }),
    phase: 'hashing',
    progress: 0,
    statusLabel: 'Hashing',
    submittedAt: new Date(),
    mode: 'new',
    locationRequirementMode: 'required',
    contentHash: 'hash-abc',
    contentHashAlgo: 'photo_v1',
    groupingKey: 'at|wien|1070|wien|hauptstrasse|5',
    titleAddress: 'Hauptstraße 5, Wien',
    ...overrides,
  } as UploadJob;
}

function makeDeps(owner: Partial<UploadJob> | null) {
  return {
    jobState: {
      findJob: vi.fn().mockReturnValue(owner),
      setPhase: vi.fn(),
      updateJob: vi.fn(),
    },
    queue: { markDone: vi.fn() },
    uploadService: { resolveMediaType: vi.fn().mockReturnValue('photo') },
  } as never;
}

function makeCtx(ownerJobId: string | null): PipelineContext {
  return {
    claimBatchHash: vi.fn().mockReturnValue(ownerJobId),
    checkDedupHash: vi.fn().mockResolvedValue(null),
    getCurrentUserId: vi.fn().mockReturnValue('user-1'),
    emitUploadSkipped: vi.fn(),
    emitBatchProgress: vi.fn(),
    drainQueue: vi.fn(),
    mergeDuplicateAddress: vi.fn(),
  } as unknown as PipelineContext;
}

describe('runUploadDedupCheck — intra-batch address merge', () => {
  it('attaches the duplicate address when the owner sits at a different address', async () => {
    const ctx = makeCtx('owner-1');
    const deps = makeDeps({ groupingKey: 'at|graz|8020|graz|annenstrasse|10', mediaId: 'media-1' });

    const outcome = await runUploadDedupCheck(deps, 'dup-1', makeJob(), undefined, ctx);

    expect(outcome).toBe('skipped');
    expect(ctx.mergeDuplicateAddress).toHaveBeenCalledWith('owner-1', 'Hauptstraße 5, Wien');
    expect(ctx.checkDedupHash).not.toHaveBeenCalled();
  });

  it('does not merge when the duplicate shares the owner address (true double pick)', async () => {
    const ctx = makeCtx('owner-1');
    const deps = makeDeps({ groupingKey: 'at|wien|1070|wien|hauptstrasse|5', mediaId: 'media-1' });

    const outcome = await runUploadDedupCheck(deps, 'dup-1', makeJob(), undefined, ctx);

    expect(outcome).toBe('skipped');
    expect(ctx.mergeDuplicateAddress).not.toHaveBeenCalled();
  });

  it('runs the server lookup when the job owns its hash (no intra-batch match)', async () => {
    const ctx = makeCtx(null);
    const deps = makeDeps(null);

    const outcome = await runUploadDedupCheck(deps, 'dup-1', makeJob(), undefined, ctx);

    expect(outcome).toBe('no_match');
    expect(ctx.checkDedupHash).toHaveBeenCalledWith('hash-abc');
    expect(ctx.mergeDuplicateAddress).not.toHaveBeenCalled();
  });
});
