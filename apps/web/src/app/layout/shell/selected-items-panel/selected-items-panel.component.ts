import {
  afterNextRender,
  Component,
  computed,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
} from '@angular/core';
import { WorkspaceToolbarComponent } from '../../../shared/workspace-pane/toolbar/workspace-toolbar/workspace-toolbar.component';
import { WorkspaceSelectedItemsGridComponent } from '../../../shared/workspace-pane/selected-items/workspace-selected-items-grid.component';
import { MediaDetailViewComponent } from '../../../shared/workspace-pane/media-detail/media-detail-view.component';
import { WorkspacePaneFooterComponent } from '../../../shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component';
import type { UploadLocationMapPickRequest } from '../../../core/workspace-pane/workspace-pane-shell-events.types';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { UnifiedSelectionService } from '../../../core/unified-selection/unified-selection.service';
import { ShellPanelColumnResizeService } from '../../../core/shell-layout/shell-panel-column-resize.service';
import type { ThumbnailCardHoverEvent } from '../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';

/**
 * Selected items panel body — grid, toolbar, footer, and inline detail for grid shell download surface.
 * @see docs/specs/ui/shell/selected-items-panel.md
 */
@Component({
  selector: 'app-selected-items-panel',
  imports: [
    WorkspaceToolbarComponent,
    WorkspaceSelectedItemsGridComponent,
    MediaDetailViewComponent,
    WorkspacePaneFooterComponent,
  ],
  templateUrl: './selected-items-panel.component.html',
  styleUrl: './selected-items-panel.component.scss',
  host: {
    class: 'selected-items-panel-host',
  },
})
export class SelectedItemsPanelComponent {
  private readonly workspaceViewService = inject(WorkspaceViewService);
  protected readonly selectionService = inject(UnifiedSelectionService);
  private readonly panelColumnResize = inject(ShellPanelColumnResizeService);

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

  readonly panelWidthPx = this.panelColumnResize.panelColumnWidthPx;

  readonly showFooter = computed(
    () => !this.detailMediaId() && this.selectionService.selectedCount() > 0,
  );

  readonly exportScopeIds = computed(() =>
    this.workspaceViewService.rawImages().map((img) => img.id),
  );
  readonly exportScopeImages = computed(() => this.workspaceViewService.rawImages());

  onThumbnailClick(imageId: string): void {
    this.detailRequested.emit(imageId);
  }

  onDetailClose(): void {
    this.detailClosed.emit();
  }

  onDetailAddressSearchRequestConsumed(requestId: number): void {
    this.detailAddressSearchRequestConsumed.emit(requestId);
  }

  onZoomToLocation(event: {
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }): void {
    this.zoomToLocationRequested.emit(event);
  }

  onWorkspaceItemHoverStarted(event: ThumbnailCardHoverEvent): void {
    this.workspaceItemHoverStarted.emit(event);
  }

  onWorkspaceItemHoverEnded(mediaId: string): void {
    this.workspaceItemHoverEnded.emit(mediaId);
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.uploadLocationMapPickRequested.emit(event);
  }
}
