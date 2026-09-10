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

  it('fails the job on illegal pipeline transitions when no test reporter is installed', () => {
    setTransitionViolationReporter(undefined);
    const service = new UploadJobStateService();
    service.addJobs([createJob({ phase: 'hashing' })]);

    const changed = service.transitionTo('job-1', 'conflict_check', {
      channel: 'pipeline',
    });

    expect(changed).toBe(false);
    const job = service.findJob('job-1');
    expect(job?.phase).toBe('error');
    expect(job?.error).toContain('invalid phase transition');
  });
});
