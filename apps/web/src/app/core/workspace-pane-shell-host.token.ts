import { InjectionToken } from '@angular/core';
import type {
  ImageUploadedEvent,
  UploadLocationMapPickRequest,
  UploadLocationPreviewEvent,
} from '../features/upload/upload-panel.types';
import type { ThumbnailCardHoverEvent } from '../features/map/workspace-pane/thumbnail-card/thumbnail-card.component';
import type { WorkspacePaneTab } from './workspace-pane-host.port';

/**
 * Authenticated layout host API for workspace pane + split.
 * MapShellComponent delegates pane mutations here when mounted under AuthenticatedAppLayoutComponent.
 */
export interface WorkspacePaneShellHost {
  openDetailView(mediaId: string): void;
  closeDetailView(): void;
  closeWorkspacePane(): void;
  onWorkspaceWidthChange(newWidth: number): void;
  onWorkspacePaneActiveTabChange(tab: WorkspacePaneTab): void;
  onDetailAddressSearchRequestConsumed(requestId: number): void;
  onZoomToLocationRequested(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void;
  onImageUploadedFromWorkspacePane(event: ImageUploadedEvent): void;
  enterPlacementModeFromWorkspacePane(key: string): void;
  onUploadLocationPreviewRequestedFromWorkspacePane(event: UploadLocationPreviewEvent): void;
  onUploadLocationPreviewClearedFromWorkspacePane(): void;
  onUploadLocationMapPickRequestedFromWorkspacePane(event: UploadLocationMapPickRequest): void;
  onWorkspaceItemHoverStartedFromPane(event: ThumbnailCardHoverEvent): void;
  onWorkspaceItemHoverEndedFromPane(mediaId: string): void;
}

export const WORKSPACE_PANE_SHELL_HOST = new InjectionToken<WorkspacePaneShellHost>(
  'WORKSPACE_PANE_SHELL_HOST',
);
