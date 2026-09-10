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
      issueKind: 'missing_gps',
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
      issueKind: 'missing_gps',
    });

    expect(getIssueKind(deferredJob)).toBe('address_deferred');
    expect(getIssueKind(missingGpsJob)).toBe('missing_gps');
    expect(getIssueKind(deferredJob)).not.toBe(getIssueKind(missingGpsJob));
  });

  it('G4a: address_deferred is not a duplicate issue', () => {
    expect(isDuplicateIssueKind('address_deferred')).toBe(false);
  });
});

// @see docs/audits/upload-process-analysis-2026-09-08/10-findings.md UP-07
describe('getIssueKind is authoritative on job.issueKind alone', () => {
  it('classifies correctly from a misleading statusLabel, proving statusLabel is never read', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      // Deliberately wrong/unrelated text — a real statusLabel-matching fallback
      // would have misclassified this job (or missed it) based on this string.
      statusLabel: 'Standort fehlt',
      issueKind: 'document_unresolved',
    });

    expect(getIssueKind(job)).toBe('document_unresolved');
  });

  it('classifies correctly from an empty statusLabel, proving statusLabel is never read', () => {
    const job = makeUploadJob({
      phase: 'error',
      statusLabel: '',
      issueKind: 'upload_error',
    });

    expect(getIssueKind(job)).toBe('upload_error');
  });

  it('returns null for an issue-shaped phase when no producer set issueKind — no phase-based inference remains', () => {
    const job = makeUploadJob({
      phase: 'missing_data',
      statusLabel: 'Choose location or project',
    });

    expect(getIssueKind(job)).toBeNull();
    expect(getLaneForJob(job)).toBe('uploading');
  });

  it('returns null (not undefined) when no producer has set issueKind', () => {
    const job = makeUploadJob({ phase: 'awaiting_disambiguation' });

    expect(getIssueKind(job)).toBeNull();
    expect(getLaneForJob(job)).toBe('uploading');
  });
});
