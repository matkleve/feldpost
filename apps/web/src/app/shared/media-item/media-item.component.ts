import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import type { MediaContext, UploadOverlayState } from '../../core/media/media-renderer.types';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type {
  ItemContextActionEvent,
  ItemDisplayMode,
} from '../item-grid/item.component';
import type { MediaRecord } from '../../core/media-query/media-query.types';
import { mediaHasZoomableLocation } from '../../core/media-locations/media-locations.helpers';
import { ACTION_CONTEXT_IDS } from '../../core/action/action-context-ids';
import { MediaItemQuietActionsComponent } from './media-item-quiet-actions.component';
import type { MediaItemMapZoomEvent } from './media-item-map-action.component';
import type { MediaItemQuietActionsState } from './media-item-quiet-actions.component';
import { MediaItemUploadOverlayComponent } from './media-item-upload-overlay.component';
import { resolveMediaItemUploadOverlay } from './media-item-upload.utils';
import { chipVariantForFileType } from '../../core/media/file-type-chip-variant';
import { fileTypeBadge, resolveFileType } from '../../core/media/file-type-registry';
import { MediaAspectRatioCacheService } from '../../core/media/media-aspect-ratio-cache.service';
import { mediaFileIdentityFromRecord } from '../../core/media/media-file-identity.helpers';
import { probeImageAspectRatio } from '../../core/media/probe-image-aspect-ratio.helpers';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { MediaDisplayComponent } from '../media-display/media-display.component';
import { ChipComponent, type ChipVariant } from '../components/chip/chip.component';
import {
  resolveInitialGridAspectRatioCss,
  shouldIgnoreGridAspectHandoffReset,
} from './media-item-grid-aspect.helpers';

export const MEDIA_ITEM_ACTION_CONTEXT = ACTION_CONTEXT_IDS.wsGridThumbnail;

export type MediaItemState = 'idle' | 'selected' | 'uploading' | 'error';

@Component({
  selector: 'app-media-item',
  imports: [
    ChipComponent,
    MediaDisplayComponent,
    MediaItemUploadOverlayComponent,
    MediaItemQuietActionsComponent,
  ],
  templateUrl: './media-item.component.html',
  styleUrl: './media-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'article',
    '[attr.data-state]': 'state()',
    '[attr.data-has-item]': "item() ? 'true' : 'false'",
    '[attr.data-mode]': 'mode()',
    '[attr.data-file-category]': 'fileCategory()',
    '[class.media-item]': 'true',
    '[class.media-item--selected]': 'selected()',
    '[class.media-item--detail-embed]': '!showInteractionChrome()',
    '(contextmenu)': 'onContextMenu($event)',
    '(dblclick)': 'onOpenDoubleClick($event)',
  },
})
export class MediaItemComponent {
  private readonly i18nService = inject(I18nService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly aspectRatioCache = inject(MediaAspectRatioCacheService);
  private readonly mediaDownload = inject(MediaDownloadService);

  readonly itemId = input.required<string>();
  readonly mode = input<ItemDisplayMode>('grid-md');
  readonly state = input<MediaItemState>('idle');
  readonly actionContextId = input<string | null>(MEDIA_ITEM_ACTION_CONTEXT);
  readonly disabled = input(false);
  /** When false, hides grid chrome (quiet actions, file-type chip) for detail-pane embed. */
  readonly showInteractionChrome = input(true);
  readonly downloadContext = input<MediaContext>('grid');

  readonly selectedChange = output<boolean>();
  /** Primary tile click with modifier keys for range / additive selection. */
  readonly pointerClick = output<{
    shiftKey: boolean;
    ctrlKey: boolean;
    metaKey: boolean;
  }>();
  readonly contextActionRequested = output<ItemContextActionEvent>();
  /** Detail pane: right-click on preview (no workspace grid context menu). */
  readonly embedContextMenu = output<void>();

  readonly item = input<MediaRecord | null>(null);
  readonly selected = computed(() => this.state() === 'selected');
  /** Slot geometry: grid starts square (1); detail uses hero band until ratio is committed. */
  readonly mediaAspectRatio = signal('1');
  /** Detail embed: true once real aspect ratio is known (skips square-first grid choreography). */
  private readonly detailSlotRatioCommitted = signal(false);
  readonly detailSlotRatioPending = computed(
    () => !this.showInteractionChrome() && !this.detailSlotRatioCommitted(),
  );
  readonly usesFillSlotGeometry = computed(() => this.mode() === 'row');
  private readonly mediaPreview = viewChild(MediaDisplayComponent);

  readonly fileIdentity = computed(() => {
    const record = this.item();
    if (!record) {
      return mediaFileIdentityFromRecord({ storage_path: null, original_filename: null });
    }
    return mediaFileIdentityFromRecord({
      storage_path: record.storage_path,
      original_filename: record.original_filename ?? null,
    });
  });

  readonly fileTypeDefinition = computed(() => resolveFileType(this.fileIdentity()));

  readonly fileCategory = computed(() => this.fileTypeDefinition().category);

  /** True when grid slot aspect was restored from session cache (shell revisit). */
  readonly gridSessionAspectPrefilled = computed(
    () => this.showInteractionChrome() && this.aspectRatioCache.get(this.mediaIdentity()) != null,
  );

  readonly fileTypeChipText = computed(() => fileTypeBadge(this.fileIdentity()));

  readonly fileTypeChipVariant = computed<ChipVariant>(() =>
    chipVariantForFileType(this.fileTypeDefinition()),
  );

  readonly fileTypeChipIcon = computed(() => this.fileTypeDefinition().icon);

  readonly showFileTypeChip = computed(() => (this.fileTypeChipText()?.length ?? 0) > 0);

  readonly slotContentObjectPosition = computed(() => 'center center');

  constructor() {
    effect(() => {
      const mediaId = this.mediaIdentity();
      const isDetailEmbed = !this.showInteractionChrome();
      if (isDetailEmbed) {
        // Detail: use session cache / registry / full URL probe — no 1:1 grid bootstrap.
        // @see docs/specs/ui/media-detail/media-detail-media-viewer.md#what-it-looks-like
        this.bootstrapDetailSlotAspect(mediaId);
        return;
      }

      // Grid: reuse session aspect ratio on shell revisit to avoid 1:1 → native shrink animation.
      // @see docs/specs/component/media/media-item.md#file-type-aspect-ratio-policy
      this.bootstrapGridSlotAspect(mediaId);
    });
  }

  private bootstrapGridSlotAspect(mediaId: string): void {
    this.detailSlotRatioCommitted.set(true);
    const cached = this.aspectRatioCache.get(mediaId);
    this.mediaAspectRatio.set(resolveInitialGridAspectRatioCss(cached));
  }

  /** Detail embed: session cache, then signed thumbnail probe — never full-res for layout. */
  private bootstrapDetailSlotAspect(mediaId: string): void {
    this.detailSlotRatioCommitted.set(false);

    const cached = this.aspectRatioCache.get(mediaId);
    if (cached != null) {
      this.mediaAspectRatio.set(String(cached));
      this.detailSlotRatioCommitted.set(true);
      return;
    }

    void this.probeDetailAspectFromThumbnailUrl(mediaId);
  }

  private async probeDetailAspectFromThumbnailUrl(mediaId: string): Promise<void> {
    const thumbUrl = this.mediaDownload.getCachedUrl(mediaId, 'thumb');
    if (!thumbUrl) {
      return;
    }

    const ratio = await probeImageAspectRatio(thumbUrl);
    if (
      ratio == null ||
      this.showInteractionChrome() ||
      this.mediaIdentity() !== mediaId ||
      this.detailSlotRatioCommitted()
    ) {
      return;
    }

    this.aspectRatioCache.set(mediaId, ratio, 'intrinsic');
    this.mediaAspectRatio.set(String(ratio));
    this.detailSlotRatioCommitted.set(true);
  }

  onSlotGeometryTransitionEnd(event: TransitionEvent): void {
    if (event.propertyName !== 'aspect-ratio' && event.propertyName !== 'inline-size') {
      return;
    }

    this.mediaPreview()?.onSlotGeometryTransitionEnd();
  }

  onMediaAspectRatioChange(ratio: number): void {
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return;
    }

    if (
      this.showInteractionChrome() &&
      shouldIgnoreGridAspectHandoffReset(ratio, this.aspectRatioCache.get(this.mediaIdentity()))
    ) {
      return;
    }

    if (!this.showInteractionChrome() && !this.detailSlotRatioCommitted() && ratio === 1) {
      return;
    }

    // Unitless ratio required by CSS aspect-ratio (e.g. 1.777, not "1 / 1").
    this.mediaAspectRatio.set(String(ratio));
    if (!this.showInteractionChrome()) {
      this.detailSlotRatioCommitted.set(true);
    }
  }

  readonly hasMapLocation = computed(() => {
    const record = this.item();
    return !!record && mediaHasZoomableLocation(record);
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
    this.debugInteraction('open.click.emit.pointerClick', event, { itemId: this.itemId() });
    this.pointerClick.emit({
      shiftKey: event.shiftKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
    });
    (event.currentTarget as HTMLElement | null)?.blur();
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
    if (!this.showInteractionChrome()) {
      this.embedContextMenu.emit();
      return;
    }
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

  onMapZoomRequested(event: MediaItemMapZoomEvent): void {
    this.debugInteraction('quietAction.map.zoomRequested', null, { event });
    this.contextActionRequested.emit({
      itemId: event.mediaId,
      actionId: 'zoom_house',
      contextId: this.actionContextId(),
      lat: event.lat,
      lng: event.lng,
    });
  }
}
