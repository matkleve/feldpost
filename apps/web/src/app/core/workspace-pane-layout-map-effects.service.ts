import { Injectable, signal } from '@angular/core';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../features/upload/upload-panel.types';
import type { ThumbnailCardHoverEvent } from '../features/map/workspace-pane/thumbnail-card/thumbnail-card.component';

/**
 * Optional map-route delegate for workspace pane outputs (zoom, upload placement, marker hover).
 * AuthenticatedAppLayoutComponent invokes this when the map shell is mounted; otherwise falls back
 * (e.g. navigate to /map for zoom-to-location).
 */
export interface WorkspacePaneLayoutMapEffects {
  onZoomToLocation(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void;
  onImageUploaded(event: ImageUploadedEvent): void;
  enterPlacementMode(key: string): void;
  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void;
  onUploadLocationPreviewCleared(): void;
  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void;
  onWorkspaceItemHoverStarted(event: ThumbnailCardHoverEvent): void;
  onWorkspaceItemHoverEnded(mediaId: string): void;
  /** Map-only cleanup before shared pane-close state updates (draft marker, selection, radius). */
  onWorkspacePaneClosing(): void;
  invalidateMapSize(): void;
}

@Injectable({ providedIn: 'root' })
export class WorkspacePaneLayoutMapEffectsService {
  private readonly delegate = signal<WorkspacePaneLayoutMapEffects | null>(null);

  registerMapEffects(effects: WorkspacePaneLayoutMapEffects): void {
    this.delegate.set(effects);
  }

  unregisterMapEffects(effects: WorkspacePaneLayoutMapEffects): void {
    this.delegate.update((current) => (current === effects ? null : current));
  }

  getMapEffects(): WorkspacePaneLayoutMapEffects | null {
    return this.delegate();
  }
}
