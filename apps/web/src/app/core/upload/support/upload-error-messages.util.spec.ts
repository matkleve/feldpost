import { describe, expect, it } from 'vitest';
import {
  formatUploadFailureMessage,
  uploadFailureMessageToToastText,
} from './upload-error-messages.util';

describe('upload-error-messages.util', () => {
  it('returns default summary when error is empty', () => {
    const parts = formatUploadFailureMessage('');
    expect(parts.title).toBe('Upload failed');
    expect(parts.hint).toBeTruthy();
  });

  it('maps GPS assignment errors to remediation hint', () => {
    const parts = formatUploadFailureMessage(
      'GPS assignment is disabled for this media item type',
    );
    expect(parts.title).toBe('Upload failed');
    expect(parts.summary).toContain('file type');
    expect(parts.hint).toContain('supabase db reset');
  });

  it('maps RLS permission errors to viewer-facing upload denial copy', () => {
    const parts = formatUploadFailureMessage(
      'new row violates row-level security policy for table "media"',
    );
    expect(parts.title).toBe('Upload failed');
    expect(parts.summary).toBe("You don't have permission to upload");
    expect(parts.hint).toBeUndefined();
  });

  it('joins summary and hint for legacy toast text', () => {
    const text = uploadFailureMessageToToastText(
      formatUploadFailureMessage('Storage bucket "media" is missing'),
    );
    expect(text).toContain('Upload failed');
    expect(text).toContain('Storage bucket');
  });
});
