import { describe, expect, it, vi } from 'vitest';
import { UploadJobStateService } from './upload-job-state.service';
import type { UploadJob } from '../upload-manager.types';

function createJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File(['x'], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'uploading',
    progress: 0,
    statusLabel: 'Uploading…',
    submittedAt: new Date(),
    mode: 'new',
    ...overrides,
  };
}

describe('UploadJobStateService terminal idempotency', () => {
  it('does not overwrite complete with error when failJob is called late', () => {
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'uploading' })]);

    service.setPhase('job-1', 'complete');
    service.failJob('job-1', 'uploading', 'late rejection');

    expect(service.findJob('job-1')?.phase).toBe('complete');
  });

  it('does not emit uploadFailed$ when failJob is called on a terminal job', () => {
    const service = new UploadJobStateService();
    const failed = vi.fn();
    service.uploadFailed$.subscribe(failed);
    service.addJobs([createJob({ phase: 'complete' })]);

    service.failJob('job-1', 'uploading', 'late rejection');

    expect(failed).not.toHaveBeenCalled();
  });
});

describe('UploadJobStateService.failJob issueKind', () => {
  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
  it('sets issueKind=upload_error on the one guarded failure path so getIssueKind is authoritative', () => {
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'uploading' })]);

    service.failJob('job-1', 'uploading', 'Storage upload failed.');

    const found = service.findJob('job-1');
    expect(found?.phase).toBe('error');
    expect(found?.issueKind).toBe('upload_error');
  });
});

/**
 * Phase 3.1 / F-07 — the store is id-keyed so a write costs O(1). These pin the guarantees the
 * representation must keep; the cost itself is proven by the harness scale tier.
 * @see docs/specs/service/media-upload-service/upload-manager.job-store.supplement.md
 */
describe('UploadJobStateService store guarantees', () => {
  function seed(service: UploadJobStateService, count: number): void {
    service.addJobs(
      Array.from({ length: count }, (_, i) => createJob({ id: `job-${i}`, phase: 'queued' })),
    );
  }

  it('G2: keeps insertion order across updates', () => {
    const service = new UploadJobStateService();
    seed(service, 5);

    service.updateJob('job-3', { progress: 50 });
    service.updateJob('job-0', { progress: 10 });

    expect(service.jobs().map((j) => j.id)).toEqual([
      'job-0',
      'job-1',
      'job-2',
      'job-3',
      'job-4',
    ]);
  });

  it('G3: an update replaces only the patched job, leaving the others identical by reference', () => {
    const service = new UploadJobStateService();
    seed(service, 4);
    const before = service.jobs();

    service.updateJob('job-2', { progress: 75 });
    const after = service.jobs();

    expect(after[2]).not.toBe(before[2]);
    expect(after[2].progress).toBe(75);
    for (const i of [0, 1, 3]) {
      expect(after[i]).toBe(before[i]);
    }
  });

  it('G4: a write for an unknown id changes nothing and notifies nobody', () => {
    const service = new UploadJobStateService();
    seed(service, 2);
    const before = service.jobs();

    service.updateJob('job-does-not-exist', { progress: 99 });

    // Same array instance: no recomputation was triggered.
    expect(service.jobs()).toBe(before);
    expect(service.findJob('job-does-not-exist')).toBeUndefined();
  });

  it('G5: snapshot() and jobs() agree, and removal keeps the rest in order', () => {
    const service = new UploadJobStateService();
    seed(service, 4);

    service.removeJob('job-1');

    expect(service.snapshot().map((j) => j.id)).toEqual(['job-0', 'job-2', 'job-3']);
    expect(service.snapshot()).toEqual(service.jobs());
  });

  it('removeTerminalJobs drops exactly the terminal ones and leaves the rest ordered', () => {
    const service = new UploadJobStateService();
    service.addJobs([
      createJob({ id: 'a', phase: 'queued' }),
      createJob({ id: 'b', phase: 'complete' }),
      createJob({ id: 'c', phase: 'uploading' }),
      createJob({ id: 'd', phase: 'error' }),
    ]);

    service.removeTerminalJobs();

    expect(service.jobs().map((j) => j.id)).toEqual(['a', 'c']);
  });

  it('G1: findJob does not degrade with the number of jobs held', () => {
    const service = new UploadJobStateService();
    seed(service, 20_000);

    // The last job is as cheap to reach as the first — a scan would make this the worst case.
    expect(service.findJob('job-19999')?.id).toBe('job-19999');
    expect(service.findJob('job-0')?.id).toBe('job-0');
  });
});
