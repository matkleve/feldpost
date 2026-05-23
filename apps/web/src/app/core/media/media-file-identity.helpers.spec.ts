import { describe, expect, it } from 'vitest';
import { mediaFileIdentityFromRecord } from './media-file-identity.helpers';
import { resolveFileType } from './file-type-registry';

describe('mediaFileIdentityFromRecord', () => {
  it('prefers storage_path extension when filenames disagree', () => {
    const identity = mediaFileIdentityFromRecord({
      storage_path: 'org/user/report.pdf',
      original_filename: 'notes.docx',
    });
    expect(identity.extension).toBe('pdf');
    expect(resolveFileType(identity).id).toBe('pdf');
  });

  it('uses storage_path when only path is present', () => {
    const identity = mediaFileIdentityFromRecord({
      storage_path: 'org/user/a.png',
      original_filename: null,
    });
    expect(identity.extension).toBe('png');
  });

  it('falls back to original_filename extension', () => {
    const identity = mediaFileIdentityFromRecord({
      storage_path: 'org/user/noext',
      original_filename: 'scan.heic',
    });
    expect(identity.extension).toBe('heic');
  });

  it('resolves unknown when both paths lack extension', () => {
    const identity = mediaFileIdentityFromRecord({
      storage_path: null,
      original_filename: null,
    });
    expect(identity.extension).toBeUndefined();
    expect(resolveFileType(identity).id).toBe('unknown');
  });
});
