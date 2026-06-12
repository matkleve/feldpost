import assert from 'node:assert/strict';
import test from 'node:test';
import { buildThumbnailStoragePath } from './paths.js';

test('buildThumbnailStoragePath uses stem and webp suffix', () => {
  const path = buildThumbnailStoragePath(
    'org-1/user-2/deck-uuid.pptx',
    'org-1',
  );
  assert.equal(path, 'org-1/user-2/deck-uuid_thumb.webp');
});
