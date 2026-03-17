import { Component, computed, inject, input, output, signal } from '@angular/core';
import { PaneHeaderComponent } from './pane-header.component';
import { WorkspaceToolbarComponent } from './workspace-toolbar/workspace-toolbar.component';
import { ThumbnailGridComponent } from './thumbnail-grid.component';
import { ImageDetailViewComponent } from './image-detail-view.component';
import { WorkspaceExportBarComponent } from './workspace-export-bar.component';
import { WorkspaceViewService } from '../../../core/workspace-view.service';
import { WorkspaceSelectionService } from '../../../core/workspace-selection.service';

@Component({
  selector: 'app-workspace-pane',
  imports: [
    PaneHeaderComponent,
    WorkspaceToolbarComponent,
    ThumbnailGridComponent,
    ImageDetailViewComponent,
    WorkspaceExportBarComponent,
  ],
  templateUrl: './workspace-pane.component.html',
  styleUrl: './workspace-pane.component.scss',
})
export class WorkspacePaneComponent {
  private readonly workspaceViewService = inject(WorkspaceViewService);
  protected readonly selectionService = inject(WorkspaceSelectionService);

  // ── Inputs from MapShell ──────────────────────────────────────────────────
  readonly detailImageId = input<string | null>(null);
  readonly title = input('Workspace');
  readonly titleEditable = input(false);
  readonly titleEditEnabled = input(false);
  readonly titleEditValue = input('');
  readonly projectColorToken = input<string | null>(null);
  readonly colorPickerEnabled = input(false);
  readonly colorPickerOpen = input(false);

  // ── Outputs to MapShell ──────────────────────────────────────────────────
  readonly closed = output<void>();
  readonly detailClosed = output<void>();
  readonly detailRequested = output<string>();
  readonly zoomToLocationRequested = output<{ imageId: string; lat: number; lng: number }>();
  readonly titleEditValueChange = output<string>();
  readonly titleSubmitRequested = output<string>();
  readonly titleEditRequested = output<void>();
  readonly colorPickerRequested = output<void>();

  // ── Internal state ───────────────────────────────────────────────────────
  readonly activeTabId = signal<string>('selection');
  readonly exportScopeIds = computed(() =>
    this.workspaceViewService.rawImages().map((img) => img.id),
  );
  readonly exportScopeImages = computed(() => this.workspaceViewService.rawImages());

  // ── Methods ──────────────────────────────────────────────────────────────
  close(): void {
    this.closed.emit();
  }

  onTabChange(tabId: string): void {
    this.activeTabId.set(tabId);
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
}
