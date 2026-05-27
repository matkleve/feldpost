import { describe, expect, it } from 'vitest';
import type { UploadDisambiguationGroup } from '../../core/upload/upload-manager.types';
import {
  extractStreetFromTitleAddress,
  resolverQuestionKeyForGroup,
  resolverScoreBand,
  resolverScoreFillPercent,
} from './upload-resolver-tray.helpers';

function group(
  partial: Partial<UploadDisambiguationGroup>,
): UploadDisambiguationGroup {
  return {
    id: 'g1',
    batchId: 'b1',
    queryKey: 'q',
    folderDisplayPath: '',
    titleAddress: 'Musterstrasse 12, 8001 Zürich',
    jobIds: ['j1'],
    candidates: [],
    collapseStage: 'partial',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    ...partial,
  };
}

describe('upload-resolver-tray.helpers', () => {
  it('extractStreetFromTitleAddress keeps street segment', () => {
    expect(extractStreetFromTitleAddress('Musterstrasse 12, 8001 Zürich')).toBe(
      'Musterstrasse 12',
    );
  });

  it('resolverQuestionKeyForGroup picks city question', () => {
    expect(
      resolverQuestionKeyForGroup(group({ collapseStage: 'city' })),
    ).toBe('upload.resolver.question.city');
  });

  it('resolverQuestionKeyForGroup picks door question for per_file', () => {
    expect(
      resolverQuestionKeyForGroup(group({ collapseStage: 'per_file' })),
    ).toBe('upload.resolver.question.door');
  });

  it('resolverScoreBand maps low, okay, and strong thresholds', () => {
    expect(resolverScoreBand(0.69)).toBe('low');
    expect(resolverScoreBand(0.7)).toBe('okay');
    expect(resolverScoreBand(0.979)).toBe('okay');
    expect(resolverScoreBand(0.98)).toBe('strong');
    expect(resolverScoreBand(undefined)).toBeNull();
  });

  it('resolverScoreFillPercent clamps to 0–100', () => {
    expect(resolverScoreFillPercent(0.456)).toBe(46);
    expect(resolverScoreFillPercent(1.2)).toBe(100);
    expect(resolverScoreFillPercent(-0.1)).toBe(0);
  });
});
