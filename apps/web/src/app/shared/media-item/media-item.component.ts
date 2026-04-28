import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { UploadOverlayState } from '../../core/media/media-renderer.types';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type {
  ItemContextActionEvent,
  ItemDisplayMode,
} from '../item-grid/item.component';
import type { ImageRecord } from '../../core/media-query/media-query.types';
import { ACTION_CONTEXT_IDS } from '../../core/action/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { MediaDisplayComponent } from '../media-display/media-display.component';

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
    '[attr.data-has-item]': "item() ? 'true' : 'false'",
    '[class.media-item]': 'true',
    '[class.media-item--selected]': 'selected()',
    '(contextmenu)': 'onContextMenu($event)',
    '(dblclick)': 'onOpenDoubleClick($event)',
  },
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

  private debugInteraction(
    stage: string,
    event: MouseEvent | Event | null,
    extra: Record<string, unknown> = {},
  ): void {
    const mouse = event instanceof MouseEvent ? event : null;
    const target = mouse?.target instanceof Element ? mouse.target : null;
    const currentTarget = mouse?.currentTarget instanceof Element ? mouse.currentTarget : null;

    console.info('[media-item][interaction]', {
      stage,
      itemId: this.itemId(),
      mediaIdentity: this.mediaIdentity(),
      selected: this.selected(),
      state: this.state(),
      disabled: this.disabled(),
      hasMapLocation: this.hasMapLocation(),
      eventType: event?.type ?? null,
      button: mouse?.button ?? null,
      buttons: mouse?.buttons ?? null,
      ctrlKey: mouse?.ctrlKey ?? false,
      metaKey: mouse?.metaKey ?? false,
      shiftKey: mouse?.shiftKey ?? false,
      altKey: mouse?.altKey ?? false,
      targetTag: target?.tagName ?? null,
      targetClass: target?.className ?? null,
      currentTargetTag: currentTarget?.tagName ?? null,
      currentTargetClass: currentTarget?.className ?? null,
      timestamp: Date.now(),
      ...extra,
    });
  }

  onOpenClick(event: MouseEvent): void {
    this.debugInteraction('open.click.received', event);
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      this.debugInteraction('open.click.blocked.disabled', event);
      return;
    }
    if (event.ctrlKey || event.metaKey) {
      const nextSelected = !this.selected();
      this.debugInteraction('open.click.ctrlMeta.selectToggle', event, { nextSelected });
      this.selectedChange.emit(!this.selected());
      return;
    }

    this.debugInteraction('open.click.emit.opened', event, { openedItemId: this.itemId() });
    this.opened.emit(this.itemId());
  }

  onOpenDoubleClick(event: MouseEvent): void {
    this.debugInteraction('open.doubleClick.received', event);
    const target = event.target;
    if (!(target instanceof Element) || !target.closest('.media-item__open')) {
      this.debugInteraction('open.doubleClick.ignored.nonOpenTarget', event);
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    if (this.disabled() || !this.selected()) {
      this.debugInteraction('open.doubleClick.blocked', event, {
        blockedByDisabled: this.disabled(),
        blockedByUnselected: !this.selected(),
      });
      return;
    }

    this.debugInteraction('open.doubleClick.emit.deselect', event);
    this.selectedChange.emit(false);
  }

  onSelectRequested(): void {
    this.debugInteraction('quietAction.select.requested', null);
    if (this.disabled()) {
      this.debugInteraction('quietAction.select.blocked.disabled', null);
      return;
    }
    const nextSelected = !this.selected();
    this.debugInteraction('quietAction.select.emit', null, { nextSelected });
    this.selectedChange.emit(nextSelected);
  }

  onContextMenu(event: MouseEvent): void {
    this.debugInteraction('contextmenu.received', event);
    event.preventDefault();
    event.stopPropagation();
    if (this.disabled()) {
      this.debugInteraction('contextmenu.blocked.disabled', event);
      return;
    }
    const payload = {
      itemId: this.itemId(),
      actionId: 'open_in_media',
      contextId: this.actionContextId(),
    };
    this.debugInteraction('contextmenu.emit.contextActionRequested', event, { payload });
    this.contextActionRequested.emit(payload);
  }

  onMapActionRequested(): void {
    this.debugInteraction('quietAction.map.requested', null);
    if (this.disabled() || !this.hasMapLocation()) {
      this.debugInteraction('quietAction.map.blocked', null, {
        blockedByDisabled: this.disabled(),
        blockedByMissingMapLocation: !this.hasMapLocation(),
      });
      return;
    }
    const payload = {
      itemId: this.itemId(),
      actionId: 'zoom_house',
      contextId: this.actionContextId(),
    };
    this.debugInteraction('quietAction.map.emit.contextActionRequested', null, { payload });
    this.contextActionRequested.emit(payload);
  }
}
