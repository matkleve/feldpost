import { describe, expect, it } from 'vitest';
import { resolveFileType } from './file-type-registry';
import { requiresServerPreviewGeneration } from './office-preview-eligibility.helpers';

describe('requiresServerPreviewGeneration', () => {
  it('is true for pptx and false for pdf', () => {
    expect(
      requiresServerPreviewGeneration(resolveFileType({ extension: 'pptx', fileName: 'a.pptx' })),
    ).toBe(true);
    expect(requiresServerPreviewGeneration(resolveFileType({ extension: 'pdf', fileName: 'a.pdf' }))).toBe(
      false,
    );
  });
});
