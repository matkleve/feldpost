import { Component, computed, inject, input, output } from '@angular/core';
import { WorkspacePaneHeaderComponent } from '../chrome/workspace-pane-header/workspace-pane-header.component';
import { WorkspacePaneToolbarComponent } from '../chrome/workspace-pane-toolbar/workspace-pane-toolbar.component';
import { WorkspaceSelectedItemsGridComponent } from '../selected-items/workspace-selected-items-grid.component';
import { MediaDetailViewComponent } from '../media-detail/media-detail-view.component';
import { WorkspacePaneFooterComponent } from '../footer/workspace-pane-footer/workspace-pane-footer.component';
import type { UploadLocationMapPickRequest } from '../../../core/workspace-pane/workspace-pane-shell-events.types';
import { MaxWidthContainerComponent } from '../../../shared/containers';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection/workspace-selection.service';
import type { ThumbnailCardHoverEvent } from '../../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { WorkspacePaneTab } from '../../../core/workspace-pane/workspace-pane-host.port';

/**
 * Stable state: `activeTab` switches the primary region (selected-items grid vs media detail) while the shell layout stays fixed.
 * @see docs/specs/ui/workspace/workspace-pane.md
 */
@Component({
  selector: 'app-workspace-pane',
  imports: [
    MaxWidthContainerComponent,
    WorkspacePaneHeaderComponent,
    WorkspacePaneToolbarComponent,
    WorkspaceSelectedItemsGridComponent,
    MediaDetailViewComponent,
    WorkspacePaneFooterComponent,
  ],
  templateUrl: './workspace-pane.component.html',
  styleUrl: './workspace-pane.component.scss',
})
export class WorkspacePaneComponent {
  private readonly i18nService = inject(I18nService);
  private readonly workspaceViewService = inject(WorkspaceViewService);
  protected readonly selectionService = inject(WorkspaceSelectionService);
  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);

  // ── Inputs from MapShell ──────────────────────────────────────────────────
  readonly detailMediaId = input<string | null>(null);
  readonly detailAddressSearchRequestMediaId = input<string | null>(null);
  readonly detailAddressSearchRequestId = input(0);
  readonly activeTab = input<WorkspacePaneTab>('selected-items');
  readonly title = input('');
  readonly titleEditable = input(false);
  readonly titleEditEnabled = input(false);
  readonly titleEditValue = input('');
  readonly projectColorToken = input<string | null>(null);
  readonly colorPickerEnabled = input(false);
  readonly colorPickerOpen = input(false);
  readonly linkedHoveredMediaIds = input<Set<string>>(new Set());

  // ── Outputs to MapShell ──────────────────────────────────────────────────
  readonly closed = output<void>();
  readonly detailClosed = output<void>();
  readonly detailAddressSearchRequestConsumed = output<number>();
  readonly detailRequested = output<string>();
  readonly activeTabChange = output<WorkspacePaneTab>();
  readonly zoomToLocationRequested = output<{
    mediaId: string;
    lat: number;
    lng: number;
    zoomMode?: 'house' | 'street';
  }>();
  readonly uploadLocationMapPickRequested = output<UploadLocationMapPickRequest>();
  readonly titleEditValueChange = output<string>();
  readonly titleSubmitRequested = output<string>();
  readonly titleEditRequested = output<void>();
  readonly colorPickerRequested = output<void>();
  readonly workspaceItemHoverStarted = output<ThumbnailCardHoverEvent>();
  readonly workspaceItemHoverEnded = output<string>();

  // ── Internal state ───────────────────────────────────────────────────────
  readonly exportScopeIds = computed(() =>
    this.workspaceViewService.rawImages().map((img) => img.id),
  );
  readonly exportScopeImages = computed(() => this.workspaceViewService.rawImages());
  readonly resolvedTitle = computed(
    () => this.title() || this.t('workspace.pane.title', 'Workspace'),
  );

  // ── Methods ──────────────────────────────────────────────────────────────
  close(): void {
    this.closed.emit();
  }

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
    // Spec link: docs/specs/ui/media-detail/media-detail-actions.md -> forward zoom mode so house/street actions stay distinct.
    this.zoomToLocationRequested.emit(event);
  }

  onTitleEditValueChange(value: string): void {
    this.titleEditValueChange.emit(value);
  }

  onTitleSubmit(value: string): void {
    this.titleSubmitRequested.emit(value);
  }

  onTitleEditRequest(): void {
    this.titleEditRequested.emit();
  }

  onColorPickerRequest(): void {
    this.colorPickerRequested.emit();
  }

  onWorkspaceItemHoverStarted(event: ThumbnailCardHoverEvent): void {
    this.workspaceItemHoverStarted.emit(event);
  }

  onWorkspaceItemHoverEnded(mediaId: string): void {
    this.workspaceItemHoverEnded.emit(mediaId);
  }

  setActiveTab(tab: WorkspacePaneTab): void {
    this.activeTabChange.emit(tab);
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.uploadLocationMapPickRequested.emit(event);
  }
}
