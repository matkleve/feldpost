import { describe, expect, it } from 'vitest';
import { resolveFileType } from './file-type-registry';
import {
  requiresMissingThumbnailBackfill,
  requiresServerPreviewGeneration,
} from './office-preview-eligibility.helpers';

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

describe('requiresMissingThumbnailBackfill', () => {
  it('includes pdf and office types for server backfill on view', () => {
    expect(
      requiresMissingThumbnailBackfill(resolveFileType({ extension: 'pdf', fileName: 'a.pdf' })),
    ).toBe(true);
    expect(
      requiresMissingThumbnailBackfill(resolveFileType({ extension: 'pptx', fileName: 'a.pptx' })),
    ).toBe(true);
    expect(
      requiresMissingThumbnailBackfill(resolveFileType({ extension: 'jpg', fileName: 'a.jpg' })),
    ).toBe(false);
  });
});
