import type { MediaType } from './upload-file-types';

/** Media types that participate in org-scoped content-hash dedup. */
export function isContentHashDedupEligible(mediaType: MediaType): boolean {
  return mediaType === 'photo' || mediaType === 'document' || mediaType === 'video';
}
