import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import type { UploadOverlayState } from '../../core/media/media-renderer.types';

@Component({
  selector: 'app-media-item-upload-overlay',
  imports: [],
  templateUrl: './media-item-upload-overlay.component.html',
  styleUrl: './media-item-upload-overlay.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MediaItemUploadOverlayComponent {
  readonly overlay = input<UploadOverlayState | null>(null);

  readonly progressPercent = computed(() => {
    const raw = this.overlay()?.progress ?? 0;
    return Math.max(0, Math.min(100, raw));
  });
}
