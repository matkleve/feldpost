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
