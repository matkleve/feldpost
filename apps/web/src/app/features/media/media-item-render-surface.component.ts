import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import type { MediaTier } from '../../core/media/media-renderer.types';
import { PHOTO_NO_PHOTO_ICON, PHOTO_PLACEHOLDER_ICON } from '../../core/photo-load.service';

export type MediaItemRenderState =
  | 'placeholder'
  | 'icon-only'
  | 'loading'
  | 'loaded'
  | 'error'
  | 'no-photo';

@Component({
  selector: 'app-media-item-render-surface',
  imports: [],
  templateUrl: './media-item-render-surface.component.html',
  styleUrl: './media-item-render-surface.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemRenderSurfaceComponent {
  readonly renderState = input<MediaItemRenderState>('placeholder');
  readonly thumbnailUrl = input('');
  readonly icon = input('image');
  readonly altText = input('');
  readonly requestedTier = input<MediaTier>('small');
  readonly effectiveTier = input<MediaTier>('small');
  readonly slotWidthRem = input<number | null>(null);
  readonly slotHeightRem = input<number | null>(null);

  readonly placeholderIconUrl = PHOTO_PLACEHOLDER_ICON;
  readonly noPhotoIconUrl = PHOTO_NO_PHOTO_ICON;
}
