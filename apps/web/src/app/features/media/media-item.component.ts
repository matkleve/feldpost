import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type {
  ItemContextActionEvent,
  ItemDisplayMode,
  ItemVisualState,
} from '../../shared/item-grid/item.component';
import { ItemStateFrameComponent } from '../../shared/item-grid/item-state-frame.component';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { MediaDisplayComponent } from '../../shared/media-display/media-display.component';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

const GRID_SM_MAX_EDGE_REM = 8;
const GRID_MD_MAX_EDGE_REM = 10;
const GRID_LG_MAX_EDGE_REM = 13;
const ROW_MAX_EDGE_REM = 10;
const CARD_MAX_EDGE_REM = 14;

export type MediaItemState = 'idle' | 'selected' | 'uploading' | 'error';

@Component({
  selector: 'app-media-item',
  imports: [
    ItemStateFrameComponent,
    MediaDisplayComponent,
    MediaItemUploadOverlayComponent,
    MediaItemQuietActionsComponent,
  ],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemComponent {
  private readonly i18nService = inject(I18nService);
  private readonly uploadManager = inject(UploadManagerService);

  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly state = input<MediaItemState>('idle');
  readonly actionContextId = input<string | null>(MEDIA_ITEM_ACTION_CONTEXT);
  readonly disabled = input(false);

  readonly selectedChange = output<boolean>();
  readonly opened = output<string>();
  readonly retryRequested = output<string>();
  readonly contextActionRequested = output<ItemContextActionEvent>();

  readonly item = input<ImageRecord | null>(null);
  readonly activeMode = computed<ItemDisplayMode>(() => this.mode());
  readonly loadingLabel = computed(() => this.t('common.loading', 'Loading media...'));
  readonly errorLabel = computed(() => this.t('media.page.error', 'Failed to load media'));
  readonly emptyLabel = computed(() => this.t('media.page.empty', 'No media found'));
  readonly selected = computed(() => this.state() === 'selected');
  readonly showErrorState = computed(() => this.state() === 'error');
  readonly frameState = computed<ItemVisualState>(() => {
    if (!this.item()) {
      return 'empty';
    }
    if (this.showErrorState()) {
      return 'error';
    }
    return this.selected() ? 'selected' : 'content';
  });

  readonly hasMapLocation = computed(() => {
    const record = this.item();
    return !!record && record.latitude !== null && record.longitude !== null;
  });
  readonly mediaIdentity = computed(() => this.item()?.id ?? this.itemId());
  readonly mediaDisplayMaxEdgeRem = computed(() => this.resolveModeMaxEdge(this.activeMode()));
  readonly mediaDisplayMaxWidth = computed(() => `${this.mediaDisplayMaxEdgeRem()}rem`);
  readonly mediaDisplayMaxHeight = computed(() => `${this.mediaDisplayMaxEdgeRem()}rem`);
  readonly mediaDisplayAspectRatio = computed<number | null>(() => null);

  readonly quietActionsState = computed<MediaItemQuietActionsState>(() => {
    if (this.disabled()) {
      return 'disabled';
    }
    const selected = this.selected();
    const hasMapLocation = this.hasMapLocation();
    if (selected && !hasMapLocation) {
      return 'interactive-selected-map-disabled';
    }
    if (selected) {
      return 'interactive-selected';
    }
    if (!hasMapLocation) {
      return 'interactive-map-disabled';
    }
    return 'interactive-unselected';
  });
  readonly uploadOverlay = computed<UploadOverlayState | null>(() =>
    this.state() === 'uploading'
      ? resolveMediaItemUploadOverlay(this.uploadManager.jobs(), this.item())
      : null,
  );

  readonly titleText = computed(
    () => this.item()?.address_label || this.t('media.page.title', 'Media'),
  );

  t(key: string, fallback: string): string {
    const value = this.i18nService.t(key, fallback);
    return typeof value === 'string' && value.trim().length > 0 ? value : fallback;
  }

  onOpenClick(event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    this.opened.emit(this.itemId());
  }

  onSelectRequested(): void {
    if (this.disabled()) return;
    this.selectedChange.emit(!this.selected());
  }

  onRetryRequested(itemId: string): void {
    if (itemId !== this.itemId()) return;
    this.retryRequested.emit(this.itemId());
  }

  onContextMenu(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    this.contextActionRequested.emit({
      itemId: this.itemId(),
      actionId: 'open_in_media',
      contextId: this.actionContextId(),
    });
  }

  onMapActionRequested(): void {
    if (this.disabled() || !this.hasMapLocation()) return;
    this.contextActionRequested.emit({
      itemId: this.itemId(),
      actionId: 'zoom_house',
      contextId: this.actionContextId(),
    });
  }

  private resolveModeMaxEdge(mode: ItemDisplayMode): number {
    switch (mode) {
      case 'grid-sm':
        return GRID_SM_MAX_EDGE_REM;
      case 'grid-lg':
        return GRID_LG_MAX_EDGE_REM;
      case 'card':
        return CARD_MAX_EDGE_REM;
      case 'row':
        return ROW_MAX_EDGE_REM;
      case 'grid-md':
      default:
        return GRID_MD_MAX_EDGE_REM;
    }
  }
}
