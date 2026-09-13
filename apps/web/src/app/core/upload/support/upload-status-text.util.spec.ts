import { describe, expect, it } from 'vitest';
import {
  resolveUploadErrorText,
  resolveUploadPhaseText,
  resolveUploadStatusText,
} from './upload-status-text.util';
import type { UploadJob } from '../upload-manager.types';

/** Marks the key so a test can tell a translated string from a raw fallback. */
const t = (key: string, fallback: string): string => `[${key}]${fallback}`;

function job(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: 'j1',
    phase: 'queued',
    progress: 0,
    statusLabel: 'RAW ENGLISH FROM PIPELINE',
    ...overrides,
  } as UploadJob;
}

describe('resolveUploadStatusText', () => {
  it('never returns the pipeline statusLabel, even for an unmapped phase', () => {
    // The guard that matters: statusLabel is a diagnostic and must not surface.
    const text = resolveUploadStatusText(job({ phase: 'unknown_future' as never }), t, null);
    expect(text).not.toContain('RAW ENGLISH FROM PIPELINE');
    expect(text).toBe('[upload.status.working]Working...');
  });

  it('translates a keyed failure instead of showing raw error text', () => {
    const text = resolveUploadStatusText(
      job({ phase: 'error', error: 'duplicate key value violates constraint', errorKey: 'storage_upload_failed' }),
      t,
      'upload_error',
    );
    expect(text).toBe('[upload.error.storageUploadFailed]File could not be stored');
    expect(text).not.toContain('duplicate key');
  });

  it('falls back to the generic translated failure when the error has no key', () => {
    // Dynamic Supabase/network text is untranslatable, so it must not be shown.
    const text = resolveUploadStatusText(
      job({ phase: 'error', error: 'TypeError: fetch failed' }),
      t,
      'upload_error',
    );
    expect(text).toBe('[upload.status.error]Upload failed');
    expect(text).not.toContain('fetch failed');
  });

  it('distinguishes missing_data variants by issueKind, not by phase inference', () => {
    expect(resolveUploadStatusText(job({ phase: 'missing_data' }), t, 'duplicate_file')).toBe(
      '[upload.status.missingData.duplicate]File already in workspace',
    );
    expect(resolveUploadStatusText(job({ phase: 'missing_data' }), t, 'document_unresolved')).toBe(
      '[upload.status.missingData.document]Choose location or project',
    );
    expect(resolveUploadStatusText(job({ phase: 'missing_data' }), t, null)).toBe(
      '[upload.status.missingData.gps]Choose location',
    );
  });

  it('translates ordinary in-flight phases', () => {
    expect(resolveUploadStatusText(job({ phase: 'uploading' }), t, null)).toBe(
      '[upload.status.uploading]Uploading...',
    );
  });
});

describe('resolveUploadErrorText', () => {
  it('returns null when the job carries no key', () => {
    expect(resolveUploadErrorText(job({ error: 'boom' }), t)).toBeNull();
  });

  it('translates each known key', () => {
    expect(resolveUploadErrorText(job({ errorKey: 'replace_requires_photo' }), t)).toBe(
      '[upload.error.replaceRequiresPhoto]Only photos can replace a photo',
    );
  });
});

describe('resolveUploadPhaseText', () => {
  it('translates a phase without needing a job', () => {
    expect(resolveUploadPhaseText('saving_record', t)).toBe('[upload.status.savingRecord]Saving...');
  });
});
