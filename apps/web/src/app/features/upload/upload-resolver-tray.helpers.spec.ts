import { describe, expect, it } from 'vitest';
import type { UploadDisambiguationGroup } from '../../core/upload/upload-manager.types';
import {
  extractStreetFromTitleAddress,
  resolverQuestionKeyForGroup,
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
});
