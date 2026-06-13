import { describe, expect, it } from 'vitest';
import { getIssueKind, getLaneForJob, isDuplicateIssueKind } from './upload-phase.helpers';
import { makeUploadJob } from './upload-panel/upload-panel.test-utils.spec';

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

  it('G4a: address_deferred issueKind routes to issues lane', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Choose location',
      issueKind: 'address_deferred',
    });

    expect(getIssueKind(job)).toBe('address_deferred');
    expect(getLaneForJob(job)).toBe('issues');
  });

  it('G4a: address_deferred is distinct from missing_gps', () => {
    const deferredJob = makeUploadJob({
      phase: 'missing_data',
      issueKind: 'address_deferred',
    });
    const missingGpsJob = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Missing location',
    });

    expect(getIssueKind(deferredJob)).toBe('address_deferred');
    expect(getIssueKind(missingGpsJob)).toBe('missing_gps');
    expect(getIssueKind(deferredJob)).not.toBe(getIssueKind(missingGpsJob));
  });

  it('G4a: address_deferred takes priority over statusLabel heuristic', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Missing location',
      issueKind: 'address_deferred',
    });

    expect(getIssueKind(job)).toBe('address_deferred');
  });

  it('G4a: address_deferred is not a duplicate issue', () => {
    expect(isDuplicateIssueKind('address_deferred')).toBe(false);
  });
});
