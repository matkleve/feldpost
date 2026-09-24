import { Component, computed, inject, input, output, signal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import type { UploadLocationMapPickRequest } from '../../core/workspace-pane/workspace-pane-shell-events.types';
import type { ThumbnailCardHoverEvent } from '../../core/workspace-pane/workspace-pane-thumbnail-hover.types';
import { ShareSheetComponent } from '../../shared/share-sheet/share-sheet.component';
import { HLM_BUTTON_IMPORTS } from '../../shared/ui/button';
import { WorkspaceBulkActionService } from '../../shared/workspace-pane/workspace-bulk-action.service';
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
    ShareSheetComponent,
    ...HLM_BUTTON_IMPORTS,
  ],
  templateUrl: './selected-items-panel.component.html',
  styleUrl: './selected-items-panel.component.scss',
  host: {
    class: 'selected-items-panel',
    '[attr.data-state]': 'detailMediaId() ? "detail" : "grid"',
  },
})
export class SelectedItemsPanelComponent {
  private readonly selection = inject(WorkspaceSelectionService);
  private readonly bulk = inject(WorkspaceBulkActionService);
  private readonly i18n = inject(I18nService);

  readonly t = (key: string, fallback = ''): string => this.i18n.t(key, fallback);
  readonly selectedCount = computed(() => this.selection.selectedMediaIds().size);
  readonly shareOpen = signal(false);

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

  share(): void {
    if (this.useSystemShare()) {
      void this.shareOnPhone();
      return;
    }
    this.shareOpen.update((open) => !open);
  }

  openShare(): void {
    if (this.useSystemShare()) {
      void this.shareOnPhone();
      return;
    }
    this.shareOpen.set(true);
  }

  private useSystemShare(): boolean {
    return window.matchMedia('(max-width: 48rem)').matches;
  }

  private async shareOnPhone(): Promise<void> {
    const url = await this.bulk.createShareLinkWithAudience(false, {
      audience: 'public',
      shareGrant: 'view',
      recipientUserIds: [],
    });
    if (!url || typeof navigator.share !== 'function') return;
    try {
      await navigator.share({ url });
    } catch {
      // The person closed the system sheet.
    }
  }
}
