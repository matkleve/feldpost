import { describe, expect, it } from 'vitest';
import { getIssueKind, getLaneForJob } from './upload-phase.helpers';
import { makeUploadJob } from './upload-panel.test-utils.spec';

describe('upload-phase helpers with locationSourceUsed', () => {
  it('keeps complete jobs in uploaded lane regardless of source marker', () => {
    const job = makeUploadJob({
      phase: 'complete',
      statusLabel: 'Uploaded',
      locationSourceUsed: 'none',
    });

    expect(getIssueKind(job)).toBeNull();
    expect(getLaneForJob(job)).toBe('uploaded');
  });

  it('keeps missing_data jobs in issues lane regardless of source marker', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Missing location',
      locationSourceUsed: 'file',
    });

    expect(getIssueKind(job)).toBe('missing_gps');
    expect(getLaneForJob(job)).toBe('issues');
  });

  it('uses explicit issueKind for issues lane independently from source marker', () => {
    const job = makeUploadJob({
      phase: 'uploading',
      statusLabel: 'Uploading',
      issueKind: 'document_unresolved',
      locationSourceUsed: 'folder',
    });

    expect(getIssueKind(job)).toBe('document_unresolved');
    expect(getLaneForJob(job)).toBe('issues');
  });
});
