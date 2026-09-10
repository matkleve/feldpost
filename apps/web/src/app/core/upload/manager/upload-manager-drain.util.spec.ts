import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import { drainUploadManagerQueue } from './upload-manager-drain.util';
import type { DrainUploadManagerQueueDeps } from './upload-manager-drain.util';

function job(overrides: Partial<UploadJob>): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'queued',
    mode: 'new',
    progress: 0,
    ...overrides,
  } as UploadJob;
}

function buildDeps(jobs: UploadJob[], slots: number): DrainUploadManagerQueueDeps {
  return {
    snapshotJobs: () => jobs,
    availableSlots: () => slots,
    ensureAbortController: vi.fn(),
    markRunning: vi.fn(),
    runPipeline: vi.fn(),
    logJobIdPrefixLen: 8,
  };
}

describe('drainUploadManagerQueue', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('feldpost:debug:upload-manager');
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-41
  it('does not emit console.log per drain when the debug flag is disabled', () => {
    const deps = buildDeps([job({ id: 'a' }), job({ id: 'b' })], 3);

    drainUploadManagerQueue(deps);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('does not emit console.log on the no-slots-available exit path either', () => {
    const deps = buildDeps([job({ id: 'a' })], 0);

    drainUploadManagerQueue(deps);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('still starts jobs for the available slots regardless of logging', () => {
    const deps = buildDeps([job({ id: 'a' }), job({ id: 'b' })], 3);

    drainUploadManagerQueue(deps);

    expect(deps.runPipeline).toHaveBeenCalledWith('a');
    expect(deps.runPipeline).toHaveBeenCalledWith('b');
  });

  it('emits console.log when the debug flag is enabled', () => {
    localStorage.setItem('feldpost:debug:upload-manager', '1');
    const deps = buildDeps([job({ id: 'a' })], 3);

    drainUploadManagerQueue(deps);

    expect(logSpy).toHaveBeenCalled();
  });
});
