import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type {
  ItemContextActionEvent,
  ItemDisplayMode,
} from '../../shared/item-grid/item.component';
import type { ImageRecord } from '../map/workspace-pane/media-detail-view.types';
import { WorkspaceSelectionService } from '../../core/workspace-selection/workspace-selection.service';
import { ACTION_CONTEXT_IDS } from '../action-system/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { MediaDisplayComponent } from '../../shared/media-display/media-display.component';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

export type MediaItemState = 'idle' | 'selected' | 'uploading' | 'error';

@Component({
  selector: 'app-media-item',
  imports: [MediaDisplayComponent, MediaItemUploadOverlayComponent, MediaItemQuietActionsComponent],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'article',
    '[attr.data-state]': 'state()',
    '[class.media-item]': 'true',
    '[class.media-item--selected]': 'selected()',
    '(contextmenu)': 'onContextMenu($event)',
    '(dblclick)': 'onOpenDoubleClick($event)',
  },
})
export class MediaItemComponent {
  private readonly i18nService = inject(I18nService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly workspaceSelectionService = inject(WorkspaceSelectionService);

  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly state = input<MediaItemState>('idle');
  readonly actionContextId = input<string | null>(MEDIA_ITEM_ACTION_CONTEXT);
  readonly disabled = input(false);

  readonly selectedChange = output<boolean>();
  readonly opened = output<string>();
  readonly contextActionRequested = output<ItemContextActionEvent>();

  readonly item = input<ImageRecord | null>(null);
  readonly selected = computed(() => this.state() === 'selected');

  readonly hasMapLocation = computed(() => {
    const record = this.item();
    return !!record && record.latitude !== null && record.longitude !== null;
  });
  readonly mediaIdentity = computed(() => this.item()?.id ?? this.itemId());

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

  onOpenClick(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) return;
    if (event.ctrlKey || event.metaKey) {
      this.selectedChange.emit(!this.selected());
      return;
    }

    const currentSelection = this.workspaceSelectionService.selectedMediaIds();
    const preserveExistingSelection =
      currentSelection.size > 0 && !currentSelection.has(this.itemId());
    const selectionSnapshot = preserveExistingSelection ? Array.from(currentSelection) : null;

    this.opened.emit(this.itemId());

    if (!selectionSnapshot) {
      return;
    }

    queueMicrotask(() => {
      this.workspaceSelectionService.selectAllInScope(selectionSnapshot);
    });
  }

  onOpenDoubleClick(event: MouseEvent): void {
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.media-item__open')) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (this.disabled() || !this.selected()) {
      return;
    }

    this.selectedChange.emit(false);
  }

  onSelectRequested(): void {
    if (this.disabled()) return;
    this.selectedChange.emit(!this.selected());
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
}
