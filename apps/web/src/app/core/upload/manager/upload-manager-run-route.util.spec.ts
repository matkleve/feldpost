import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import { runUploadPipelineByMode } from './upload-manager-run-route.util';
import type { RunUploadPipelineByModeDeps } from './upload-manager-run-route.util';

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

function buildDeps(): RunUploadPipelineByModeDeps & {
  runReplace: ReturnType<typeof vi.fn>;
  runAttach: ReturnType<typeof vi.fn>;
  runNew: ReturnType<typeof vi.fn>;
} {
  return {
    runReplace: vi.fn().mockResolvedValue(undefined),
    runAttach: vi.fn().mockResolvedValue(undefined),
    runNew: vi.fn().mockResolvedValue(undefined),
    logJobIdPrefixLen: 8,
  };
}

describe('runUploadPipelineByMode', () => {
  let logSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    localStorage.removeItem('feldpost:debug:upload-manager');
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-41
  it('does not emit console.log per routed job when the debug flag is disabled', async () => {
    const deps = buildDeps();

    await runUploadPipelineByMode(job({ mode: 'new' }), deps);

    expect(logSpy).not.toHaveBeenCalled();
  });

  it('still routes to the correct pipeline regardless of logging', async () => {
    const deps = buildDeps();

    await runUploadPipelineByMode(job({ mode: 'replace' }), deps);

    expect(deps.runReplace).toHaveBeenCalledWith('job-1');
    expect(deps.runAttach).not.toHaveBeenCalled();
    expect(deps.runNew).not.toHaveBeenCalled();
  });

  it('emits console.log when the debug flag is enabled', async () => {
    localStorage.setItem('feldpost:debug:upload-manager', '1');
    const deps = buildDeps();

    await runUploadPipelineByMode(job({ mode: 'attach' }), deps);

    expect(logSpy).toHaveBeenCalled();
  });
});
