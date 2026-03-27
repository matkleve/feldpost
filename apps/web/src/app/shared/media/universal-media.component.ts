import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, inject, input, output } from '@angular/core';
import { MediaOrchestratorService } from '../../core/media/media-orchestrator.service';
import type {
  MediaContext,
  MediaFileIdentity,
  MediaRenderState,
  MediaTier,
  UploadOverlayState,
} from '../../core/media/media-renderer.types';

const DEFAULT_MIN_HEIGHT_REM = 6;

@Component({
  selector: 'app-universal-media',
  standalone: true,
  imports: [NgTemplateOutlet],
  templateUrl: './universal-media.component.html',
  styleUrl: './universal-media.component.scss',
  host: {
    '[class.universal-media]': 'true',
    '[class.universal-media--loading]': "renderState().status === 'loading'",
    '[class.universal-media--error]': "renderState().status === 'error'",
    '[class.universal-media--loaded]': "renderState().status === 'loaded'",
  },
})
export class UniversalMediaComponent {
  private readonly mediaOrchestrator = inject(MediaOrchestratorService);

  readonly fileIdentity = input<MediaFileIdentity>({});
  readonly context = input<MediaContext>('grid');
  readonly requestedTier = input<MediaTier>('small');
  readonly slotWidthRem = input<number | null>(null);
  readonly slotHeightRem = input<number | null>(null);

  readonly renderState = input<MediaRenderState>({ status: 'placeholder' });
  readonly uploadOverlay = input<UploadOverlayState | null>(null);
  readonly altText = input<string>('');
  readonly interactive = input(false);
  readonly fit = input<'contain' | 'cover'>('contain');
  readonly minHeightRem = input<number | null>(DEFAULT_MIN_HEIGHT_REM);

  readonly clicked = output<void>();
  readonly assetReady = output<void>();
  readonly assetFailed = output<void>();

  readonly fileType = computed(() => this.mediaOrchestrator.resolveFileType(this.fileIdentity()));
  readonly badge = computed(() => this.mediaOrchestrator.resolveBadge(this.fileIdentity()));
  readonly icon = computed(() => this.mediaOrchestrator.resolveIcon(this.fileIdentity()));
  readonly loadedUrl = computed(() => {
    const state = this.renderState();
    return state.status === 'loaded' ? state.url : null;
  });
  readonly effectiveTier = computed(() =>
    this.mediaOrchestrator.selectRequestedTierForSlot({
      requestedTier: this.requestedTier(),
      slotWidthRem: this.slotWidthRem(),
      slotHeightRem: this.slotHeightRem(),
      context: this.context(),
    }),
  );

  onClick(): void {
    this.clicked.emit();
  }

  onAssetLoaded(): void {
    this.assetReady.emit();
  }

  onAssetError(): void {
    this.assetFailed.emit();
  }
}
