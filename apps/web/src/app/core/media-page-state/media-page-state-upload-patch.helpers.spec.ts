import { describe, expect, it } from 'vitest';
import {
  patchMediaCacheItems,
  signatureHasProjectFilter,
  workspaceMediaFromUploadEvent,
} from './media-page-state-upload-patch.helpers';
import { buildMediaGalleryQuerySignature } from './media-page-state.helpers';
import type { MediaGalleryQueryInputs } from './media-page-state.types';

const baseInputs: MediaGalleryQueryInputs = {
  userId: 'user-1',
  projectIds: new Set<string>(),
  sorts: [{ key: 'date-captured', direction: 'desc' }],
  groupingIds: [],
  filterRules: [],
};

describe('media-page-state-upload-patch.helpers', () => {
  it('signatureHasProjectFilter is false for all-projects scope', () => {
    const signature = buildMediaGalleryQuerySignature(baseInputs);
    expect(signatureHasProjectFilter(signature)).toBe(false);
  });

  it('signatureHasProjectFilter is true when projectIds are set', () => {
    const signature = buildMediaGalleryQuerySignature({
      ...baseInputs,
      projectIds: new Set(['project-a']),
    });
    expect(signatureHasProjectFilter(signature)).toBe(true);
  });

  it('workspaceMediaFromUploadEvent sets zoomableLocationCount from coords', () => {
    const withCoords = workspaceMediaFromUploadEvent({
      jobId: 'j1',
      batchId: 'b1',
      mediaId: 'media-1',
      coords: { lat: 48, lng: 16 },
    });
    expect(withCoords.zoomableLocationCount).toBe(1);
    expect(withCoords.latitude).toBe(48);
    expect(withCoords.longitude).toBe(16);

    const withoutCoords = workspaceMediaFromUploadEvent({
      jobId: 'j2',
      batchId: 'b2',
      mediaId: 'media-2',
    });
    expect(withoutCoords.zoomableLocationCount).toBe(0);
  });

  it('patchMediaCacheItems prepends new row and replaces duplicate id', () => {
    const existing = [
      workspaceMediaFromUploadEvent({ jobId: 'j', batchId: 'b', mediaId: 'old' }),
    ];
    const incoming = workspaceMediaFromUploadEvent({ jobId: 'j2', batchId: 'b2', mediaId: 'new' });

    const patched = patchMediaCacheItems(existing, incoming);
    expect(patched.map((m) => m.id)).toEqual(['new', 'old']);
  });
});
