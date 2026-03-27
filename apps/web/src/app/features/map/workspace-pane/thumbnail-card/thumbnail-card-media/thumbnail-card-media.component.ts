import { Component, computed, input, output } from '@angular/core';
import type { WorkspaceImage } from '../../../../../core/workspace-view.types';
import { UniversalMediaComponent } from '../../../../../shared/media/universal-media.component';
import type { MediaTier } from '../../../../../core/media/media-renderer.types';

@Component({
  selector: 'app-thumbnail-card-media',
  standalone: true,
  imports: [UniversalMediaComponent],
  template: `
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
  readonly imgLoading = input(true);
  readonly isLoading = input(false);
  readonly imageReady = input(false);
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

  readonly renderState = computed(() => {
    const signedThumbnailUrl = this.image().signedThumbnailUrl;

    if (this.imageReady() && signedThumbnailUrl) {
      return {
        status: 'loaded' as const,
        url: signedThumbnailUrl,
        resolvedTier: this.requestedTier(),
      };
    }

    if (this.isLoading()) {
      return { status: 'loading' as const };
    }

    return { status: 'icon-only' as const };
  });

  readonly fitMode = computed<'contain' | 'cover'>(() => (this.rowMode() ? 'cover' : 'contain'));
}
