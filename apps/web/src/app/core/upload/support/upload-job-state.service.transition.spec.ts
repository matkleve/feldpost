import { describe, expect, it, vi } from 'vitest';
import { setTransitionViolationReporter } from './upload-phase-transitions';
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

describe('UploadJobStateService.transitionTo', () => {
  it('rejects illegal pipeline transitions without mutating the job', () => {
    setTransitionViolationReporter(undefined);
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'complete' })]);

    const changed = service.transitionTo('job-1', 'uploading', { channel: 'pipeline' });

    expect(changed).toBe(false);
    expect(service.findJob('job-1')?.phase).toBe('complete');
  });

  it('allows user-channel error → queued resurrection', () => {
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'error', error: 'failed' })]);

    const changed = service.transitionTo('job-1', 'queued', {
      channel: 'user',
      statusLabel: 'Queued',
    });

    expect(changed).toBe(true);
    expect(service.findJob('job-1')?.phase).toBe('queued');
  });

  it('does not emit jobPhaseChanged$ for user-channel transitions', () => {
    const service = new UploadJobStateService();
    const phaseChanged = vi.fn();
    service.jobPhaseChanged$.subscribe(phaseChanged);
    service.addJobs([createJob({ phase: 'error' })]);

    service.transitionTo('job-1', 'queued', { channel: 'user', statusLabel: 'Queued' });

    expect(phaseChanged).not.toHaveBeenCalled();
  });

  it('emits jobPhaseChanged$ for pipeline-channel transitions', () => {
    const service = new UploadJobStateService();
    const phaseChanged = vi.fn();
    service.jobPhaseChanged$.subscribe(phaseChanged);
    service.addJobs([createJob({ phase: 'queued' })]);

    service.transitionTo('job-1', 'validating', { channel: 'pipeline' });

    expect(phaseChanged).toHaveBeenCalledOnce();
  });

  // An unmapped non-terminal edge is a bug in the map, not grounds to break the upload.
  // @see upload-manager.phase-fsm.supplement.md § Guard policy
  it('reports but still applies an unmapped non-terminal pipeline transition', () => {
    const reporter = vi.fn();
    setTransitionViolationReporter(reporter);
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'hashing' })]);

    const changed = service.transitionTo('job-1', 'conflict_check', {
      channel: 'pipeline',
    });

    expect(reporter).toHaveBeenCalledOnce();
    expect(changed).toBe(true);
    const job = service.findJob('job-1');
    expect(job?.phase).toBe('conflict_check');
    expect(job?.error).toBeUndefined();
    setTransitionViolationReporter(undefined);
  });

  // Regression: awaiting_conflict_resolution is non-terminal, so USER_TERMINAL_RESURRECTIONS
  // never applied to it and resolveUploadManagerConflict silently failed to requeue.
  it('allows user-channel awaiting_conflict_resolution → queued without reporting', () => {
    const reporter = vi.fn();
    setTransitionViolationReporter(reporter);
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'awaiting_conflict_resolution' })]);

    const changed = service.transitionTo('job-1', 'queued', {
      channel: 'user',
      statusLabel: 'Queued',
    });

    expect(reporter).not.toHaveBeenCalled();
    expect(changed).toBe(true);
    expect(service.findJob('job-1')?.phase).toBe('queued');
    setTransitionViolationReporter(undefined);
  });
});
