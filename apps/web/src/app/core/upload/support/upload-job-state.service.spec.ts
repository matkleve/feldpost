import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it } from 'vitest';
import type { UploadJob } from '../upload-manager.types';
import { UploadJobStateService } from './upload-job-state.service';

function job(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'job-1',
    batchId: 'batch-1',
    file: new File([], 'a.jpg'),
    phase: 'uploading',
    mode: 'new',
    progress: 50,
    ...overrides,
  } as UploadJob;
}

describe('UploadJobStateService.failJob', () => {
  let service: UploadJobStateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UploadJobStateService);
  });

  // @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
  it('sets issueKind=upload_error on the one guarded failure path so getIssueKind is authoritative', () => {
    service.addJobs([job()]);

    service.failJob('job-1', 'uploading', 'Storage upload failed.');

    const found = service.findJob('job-1');
    expect(found?.phase).toBe('error');
    expect(found?.issueKind).toBe('upload_error');
  });
});
