import { describe, expect, it } from 'vitest';
import { buildBatchSummaryToast } from './upload-batch-summary.util';
import type { BatchCompleteEvent } from '../upload-manager.types';

function event(overrides: Partial<BatchCompleteEvent> = {}): BatchCompleteEvent {
  return {
    batchId: 'b1',
    label: 'batch',
    totalFiles: 0,
    completedFiles: 0,
    skippedFiles: 0,
    mergedAddressFiles: 0,
    failedFiles: 0,
    durationMs: 1000,
    ...overrides,
  };
}

describe('buildBatchSummaryToast', () => {
  it('returns null for an all-new batch (nothing noteworthy)', () => {
    expect(buildBatchSummaryToast(event({ totalFiles: 5, completedFiles: 5 }))).toBeNull();
  });

  it('summarises uploaded + already-present', () => {
    const toast = buildBatchSummaryToast(event({ completedFiles: 8, skippedFiles: 2 }));
    expect(toast?.body).toBe('8 uploaded · 2 already present');
    expect(toast?.type).toBe('info');
  });

  it('reports merged addresses with singular/plural', () => {
    expect(buildBatchSummaryToast(event({ completedFiles: 1, mergedAddressFiles: 1 }))?.body).toBe(
      '1 uploaded · 1 address added',
    );
    expect(
      buildBatchSummaryToast(event({ completedFiles: 1, skippedFiles: 3, mergedAddressFiles: 3 }))
        ?.body,
    ).toBe('1 uploaded · 3 already present · 3 addresses added');
  });

  it('marks failures as a warning', () => {
    const toast = buildBatchSummaryToast(event({ completedFiles: 4, failedFiles: 1 }));
    expect(toast?.body).toBe('4 uploaded · 1 failed');
    expect(toast?.type).toBe('warning');
  });
});
