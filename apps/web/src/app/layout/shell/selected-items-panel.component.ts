import { Component, input, output } from '@angular/core';
import type { UploadLocationMapPickRequest } from '../../core/workspace-pane/workspace-pane-shell-events.types';
import type { ThumbnailCardHoverEvent } from '../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { MediaDetailViewComponent } from '../../shared/workspace-pane/media-detail/media-detail-view.component';
import { WorkspaceSelectedItemsGridComponent } from '../../shared/workspace-pane/selected-items/workspace-selected-items-grid.component';
import { WorkspaceToolbarComponent } from '../../shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component';

/**
 * Stable state: `detail` when `detailMediaId` is set, otherwise `grid`.
 * The surface header owns the title and the collapse control.
 * @see docs/specs/ui/shell/selected-items-panel.md
 */
@Component({
  selector: 'app-selected-items-panel',
  standalone: true,
  imports: [
    WorkspaceToolbarComponent,
    WorkspaceSelectedItemsGridComponent,
    MediaDetailViewComponent,
  ],
  templateUrl: './selected-items-panel.component.html',
  styleUrl: './selected-items-panel.component.scss',
  host: {
    class: 'selected-items-panel',
    '[attr.data-state]': 'detailMediaId() ? "detail" : "grid"',
  },
})
export class SelectedItemsPanelComponent {
  readonly detailMediaId = input<string | null>(null);
  readonly detailAddressSearchRequestMediaId = input<string | null>(null);
  readonly detailAddressSearchRequestId = input(0);
  readonly linkedHoveredMediaIds = input<Set<string>>(new Set());

  readonly detailClosed = output<void>();
  readonly detailAddressSearchRequestConsumed = output<number>();
  readonly detailRequested = output<string>();
  readonly zoomToLocationRequested = output<{
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }>();
  readonly uploadLocationMapPickRequested = output<UploadLocationMapPickRequest>();
  readonly workspaceItemHoverStarted = output<ThumbnailCardHoverEvent>();
  readonly workspaceItemHoverEnded = output<string>();
}
