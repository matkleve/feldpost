import { ChangeDetectionStrategy, Component, computed, effect, input, signal } from '@angular/core';
import type { MediaTier } from '../../core/media/media-renderer.types';
import { MEDIA_NO_MEDIA_ICON } from '../../core/media-download/media-download.service';
import { ChipComponent, type ChipVariant } from '../components/chip/chip.component';

// Stable states: loading, content, content-selected, error, no-media.
// @see docs/specs/component/media/media-item.md#state-machine
export type MediaItemRenderState = 'loading' | 'content' | 'error' | 'no-media';
export type MediaItemRenderSurfaceState = MediaItemRenderState | 'content-selected';

@Component({
  selector: 'app-media-item-render-surface',
  imports: [ChipComponent],
  templateUrl: './media-item-render-surface.component.html',
  styleUrl: './media-item-render-surface.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.media-item-render-surface__slot]': 'true',
    '[attr.data-state]': 'state()',
    '[attr.data-tier-requested]': 'requestedTier()',
    '[attr.data-tier-effective]': 'effectiveTier()',
    '[attr.data-slot-width-rem]': 'slotWidthRem()',
    '[attr.data-slot-height-rem]': 'slotHeightRem()',
    '[style.width.rem]': 'mediaFrameWidthRem()',
    '[style.height.rem]': 'mediaFrameHeightRem()',
  },
})
export class MediaItemRenderSurfaceComponent {
  readonly slotMode = input<'grid-sm' | 'grid-md' | 'grid-lg' | 'row' | 'card'>('grid-md');
  readonly state = input<MediaItemRenderSurfaceState>('loading');
  readonly isImage = input(true);
  readonly isDocument = input(false);
  readonly thumbnailUrl = input('');
  readonly icon = input('image');
  readonly altText = input('');
  readonly requestedTier = input<MediaTier>('small');
  readonly effectiveTier = input<MediaTier>('small');
  readonly slotWidthRem = input<number | null>(null);
  readonly slotHeightRem = input<number | null>(null);
  readonly fileTypeIcon = input('image');
  readonly fileTypeText = input('');
  readonly fileTypeChipVariant = input<ChipVariant>('default');

  // Stable state normalization: content-selected uses content rendering plus selected visual emphasis in SCSS.
  // @see docs/specs/component/media/media-item.md#visual-behavior-contract
  readonly renderLayerState = computed<MediaItemRenderState>(() => {
    const state = this.state();
    return state === 'content-selected' ? 'content' : state;
  });

  readonly loadedAssetRatio = signal<number | null>(null);
  readonly mediaFrameRatio = computed(() => {
    if (this.isDocument()) {
      return 1 / 1.414;
    }
    const ratio = this.loadedAssetRatio();
    return ratio && Number.isFinite(ratio) && ratio > 0 ? ratio : 1;
  });
  readonly mediaFrameBaseRem = computed(() => {
    switch (this.slotMode()) {
      case 'grid-sm':
        return 8;
      case 'grid-lg':
        return 13;
      case 'card':
        return 14;
      case 'row':
        return 10;
      case 'grid-md':
      default:
        return 10;
    }
  });
  readonly mediaFrameWidthRem = computed(() => {
    const ratio = this.mediaFrameRatio();
    const base = this.mediaFrameBaseRem();
    return ratio >= 1 ? base : base * ratio;
  });
  readonly mediaFrameHeightRem = computed(() => {
    const ratio = this.mediaFrameRatio();
    const base = this.mediaFrameBaseRem();
    return ratio >= 1 ? base / ratio : base;
  });

  readonly noPhotoIconUrl = MEDIA_NO_MEDIA_ICON;

  constructor() {
    effect(
      () => {
        this.thumbnailUrl();
        this.loadedAssetRatio.set(null);
      },
      { allowSignalWrites: true },
    );
  }

  onAssetLoaded(event: Event): void {
    const image = event.target as HTMLImageElement | null;
    if (!image || image.naturalWidth <= 0 || image.naturalHeight <= 0) {
      return;
    }
    this.loadedAssetRatio.set(image.naturalWidth / image.naturalHeight);
  }
}
