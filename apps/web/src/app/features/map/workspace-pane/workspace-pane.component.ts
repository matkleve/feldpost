import { Component, computed, inject, input, output } from '@angular/core';
import { WorkspacePaneHeaderComponent } from './workspace-pane-header/workspace-pane-header.component';
import { WorkspacePaneToolbarComponent } from './workspace-pane-toolbar/workspace-pane-toolbar.component';
import { ThumbnailGridComponent } from './thumbnail-grid.component';
import { MediaDetailViewComponent } from './media-detail-view.component';
import { WorkspacePaneFooterComponent } from './workspace-pane-footer/workspace-pane-footer.component';
import {
  UploadPanelComponent,
  type ImageUploadedEvent,
  type UploadLocationMapPickRequest,
  type UploadLocationPreviewEvent,
} from '../../upload/upload-panel.component';
import { MaxWidthContainerComponent } from '../../../shared/containers';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';
import type { ThumbnailCardHoverEvent } from './thumbnail-card/thumbnail-card.component';
import { I18nService } from '../../../core/i18n/i18n.service';
import type { WorkspacePaneTab } from '../../../core/workspace-pane-host.port';

@Component({
  selector: 'app-workspace-pane',
  imports: [
    MaxWidthContainerComponent,
    WorkspacePaneHeaderComponent,
    WorkspacePaneToolbarComponent,
    ThumbnailGridComponent,
    MediaDetailViewComponent,
    WorkspacePaneFooterComponent,
    UploadPanelComponent,
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
  readonly detailImageId = input<string | null>(null);
  readonly activeTab = input<WorkspacePaneTab>('selected-items');
  readonly title = input('');
  readonly titleEditable = input(false);
  readonly titleEditEnabled = input(false);
  readonly titleEditValue = input('');
  readonly projectColorToken = input<string | null>(null);
  readonly colorPickerEnabled = input(false);
  readonly colorPickerOpen = input(false);
  readonly linkedHoveredImageIds = input<Set<string>>(new Set());

  // ── Outputs to MapShell ──────────────────────────────────────────────────
  readonly closed = output<void>();
  readonly detailClosed = output<void>();
  readonly detailRequested = output<string>();
  readonly activeTabChange = output<WorkspacePaneTab>();
  readonly zoomToLocationRequested = output<{ imageId: string; lat: number; lng: number }>();
  readonly imageUploaded = output<ImageUploadedEvent>();
  readonly placementRequested = output<string>();
  readonly uploadLocationPreviewRequested = output<UploadLocationPreviewEvent>();
  readonly uploadLocationPreviewCleared = output<void>();
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

  onZoomToLocation(event: { imageId: string; lat: number; lng: number }): void {
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

  onWorkspaceItemHoverEnded(imageId: string): void {
    this.workspaceItemHoverEnded.emit(imageId);
  }

  setActiveTab(tab: WorkspacePaneTab): void {
    this.activeTabChange.emit(tab);
  }

  onImageUploaded(event: ImageUploadedEvent): void {
    this.imageUploaded.emit(event);
  }

  onPlacementRequested(jobId: string): void {
    this.placementRequested.emit(jobId);
  }

  onUploadLocationPreviewRequested(event: UploadLocationPreviewEvent): void {
    this.uploadLocationPreviewRequested.emit(event);
  }

  onUploadLocationPreviewCleared(): void {
    this.uploadLocationPreviewCleared.emit();
  }

  onUploadLocationMapPickRequested(event: UploadLocationMapPickRequest): void {
    this.uploadLocationMapPickRequested.emit(event);
  }
}
