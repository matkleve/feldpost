import type { ImageUploadedEvent } from '../upload/upload-manager.types';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import type { MediaGalleryQueryInputs } from './media-page-state.types';

export interface MediaUploadPatchContext {
  readonly cachedSignature: string;
  readonly queryInputs: MediaGalleryQueryInputs;
}

/** True when the cached gallery query is scoped to one or more projects. */
export function signatureHasProjectFilter(signature: string): boolean {
  try {
    const parsed = JSON.parse(signature) as { projectIds?: string[] };
    return Array.isArray(parsed.projectIds) && parsed.projectIds.length > 0;
  } catch {
    return false;
  }
}

/**
 * Minimal WorkspaceMedia row for incremental cache patch after imageUploaded$.
 * @see docs/specs/service/media-page-state/media-page-state-service.md
 */
export function workspaceMediaFromUploadEvent(event: ImageUploadedEvent): WorkspaceMedia {
  const hasCoords = event.coords != null;
  return {
    id: event.mediaId,
    latitude: 0,
    longitude: 0,
    zoomableLocationCount: hasCoords ? 1 : 0,
    thumbnailPath: event.thumbnailUrl ?? null,
    storagePath: null,
    capturedAt: null,
    createdAt: new Date().toISOString(),
    projectId: null,
    projectName: null,
    projectIds: [],
    projectNames: [],
    direction: event.direction ?? null,
    exifLatitude: event.coords?.lat ?? null,
    exifLongitude: event.coords?.lng ?? null,
    addressLabel: null,
    city: null,
    district: null,
    street: null,
    streetNumber: null,
    zip: null,
    country: null,
    userName: null,
  };
}

export function patchMediaCacheItems(
  existing: readonly WorkspaceMedia[],
  incoming: WorkspaceMedia,
): WorkspaceMedia[] {
  const withoutDuplicate = existing.filter((item) => item.id !== incoming.id);
  return [incoming, ...withoutDuplicate];
}
