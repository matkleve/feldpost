import { describe, expect, it } from 'vitest';
import {
  normalizeToastOptions,
  toastHasExpandableDetail,
  truncateToastTechnicalDetail,
} from './toast.helpers';

describe('toast.helpers', () => {
  it('normalizes structured toast fields', () => {
    const normalized = normalizeToastOptions({
      title: 'Location update failed',
      body: 'Database conflict.',
      detail: 'Long postgres message',
      codeRef: { file: 'map-shell.component.ts', fn: 'applyUploadedLocationMapPick' },
    });
    expect(normalized.title).toBe('Location update failed');
    expect(normalized.message).toContain('Location update failed');
    expect(normalized.message).toContain('Long postgres message');
  });

  it('truncates technical detail', () => {
    const long = 'x'.repeat(2000);
    expect(truncateToastTechnicalDetail(long).length).toBeLessThanOrEqual(1201);
  });

  it('detects expandable detail', () => {
    expect(toastHasExpandableDetail({ detail: 'rpc error' })).toBe(true);
    expect(toastHasExpandableDetail({ body: 'only body' })).toBe(false);
  });
});
