import { Component, computed, input, output } from '@angular/core';
import type { WorkspaceImage } from '../../../../../core/workspace-view.types';
import { UniversalMediaComponent } from '../../../../../shared/media/universal-media.component';
import type { MediaTier } from '../../../../../core/media/media-renderer.types';

// Stable state: loading, loaded, icon-only.
// @see docs/element-specs/thumbnail-grid.md#state
export type ThumbnailCardMediaState = 'loading' | 'loaded' | 'icon-only';

@Component({
  selector: 'app-thumbnail-card-media',
  standalone: true,
  imports: [UniversalMediaComponent],
  template: `
    <!-- Stable state: loading | loaded | icon-only rendered through universal-media renderState mapping. -->
    <!-- @see docs/element-specs/thumbnail-grid.md#state -->
    <app-universal-media
      [fileIdentity]="fileIdentity()"
      [context]="'grid'"
      [requestedTier]="requestedTier()"
      [slotWidthRem]="slotWidthRem()"
      [slotHeightRem]="slotHeightRem()"
      [renderState]="renderState()"
      [altText]="altText()"
      [fit]="fitMode()"
      [minHeightRem]="0"
      (assetReady)="imgLoaded.emit()"
      (assetFailed)="imgError.emit()"
    />
  `,
  styleUrl: './thumbnail-card-media.component.scss',
})
export class ThumbnailCardMediaComponent {
  readonly image = input.required<WorkspaceImage>();
  readonly state = input<ThumbnailCardMediaState>('loading');
  readonly requestedTier = input<MediaTier>('small');
  readonly slotWidthRem = input<number | null>(null);
  readonly slotHeightRem = input<number | null>(null);
  readonly rowMode = input(false);
  readonly altText = input('Photo thumbnail');

  readonly imgLoaded = output<void>();
  readonly imgError = output<void>();

  readonly fileIdentity = computed(() => {
    const image = this.image();
    return {
      fileName: image.storagePath,
      mimeType: image.fileMetadata?.mimeType ?? null,
      extension: image.fileMetadata?.extension ?? null,
    };
  });

  // Stable state mapping to universal media render contract.
  // @see docs/element-specs/thumbnail-grid.md#state
  readonly renderState = computed(() => {
    const signedThumbnailUrl = this.image().signedThumbnailUrl;

    if (this.state() === 'loaded' && signedThumbnailUrl) {
      return {
        status: 'loaded' as const,
        url: signedThumbnailUrl,
        resolvedTier: this.requestedTier(),
      };
    }

    if (this.state() === 'loading') {
      return { status: 'loading' as const };
    }

    return { status: 'icon-only' as const };
  });

  readonly fitMode = computed<'contain' | 'cover'>(() => (this.rowMode() ? 'cover' : 'contain'));
}
