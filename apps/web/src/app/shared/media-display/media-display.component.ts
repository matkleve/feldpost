import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  signal,
  untracked,
} from '@angular/core';
import type { AfterViewInit, InputSignal } from '@angular/core';
import type { Subscription } from 'rxjs';
import { I18nService } from '../../core/i18n/i18n.service';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { type MediaDisplayState, transitionMediaDisplayState } from './media-display-state';
import {
  type MediaDisplayDeliveryState,
  type MediaDownloadStateStreamApi,
  mapLegacyLoadState,
} from './media-display.helpers';

const DEFAULT_ROOT_FONT_SIZE_PX = 16;
const SLOT_SIZE_REM_EPSILON = 0.05;

@Component({
  selector: 'app-media-display',
  templateUrl: './media-display.component.html',
  styleUrl: './media-display.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.data-state]': 'state()',
    '[class.media-display]': 'true',
  },
})
export class MediaDisplayComponent implements AfterViewInit {
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly i18nService = inject(I18nService);
  private readonly stateApi = this.mediaDownloadService as unknown as MediaDownloadStateStreamApi;

  private resizeObserver: ResizeObserver | null = null;

  readonly mediaId: InputSignal<string> = input.required<string>();
  readonly maxWidth: InputSignal<string> = input('100%');
  readonly maxHeight: InputSignal<string> = input('100%');
  readonly aspectRatio: InputSignal<number | null> = input<number | null>(null);
  readonly state = signal<MediaDisplayState>('empty');
  readonly slotSizeRem = signal(1);
  readonly refreshNonce = signal(0);

  readonly resolvedUrl = signal('');
  readonly warmPreviewUrl = signal('');
  readonly icon = signal('insert_drive_file');
  readonly metadataAspectRatio = signal<number | null>(null);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly alt = computed(() => this.t('workspace.imageDetail.photoPreview.alt', 'Photo preview'));
  readonly retryLabel = computed(() => this.t('media.page.retry', 'Retry'));
  readonly noMediaLabel = computed(() => this.t('media.page.empty', 'No media found'));

  constructor() {
    effect(() => {
      this.hostEl.nativeElement.style.setProperty('--media-display-max-width', this.maxWidth());
      this.hostEl.nativeElement.style.setProperty('--media-display-max-height', this.maxHeight());
    });

    effect(() => {
      const hintedRatio = this.aspectRatio();
      if (hintedRatio != null && hintedRatio > 0 && this.metadataAspectRatio() == null) {
        this.applyAspectRatio(hintedRatio);
      }
    });

    effect((onCleanup) => {
      const id = this.mediaId().trim();
      this.refreshNonce();

      if (!id) {
        this.resolvedUrl.set('');
        this.warmPreviewUrl.set('');
        this.metadataAspectRatio.set(null);
        this.goTo('empty');
        return;
      }

      const getState = this.stateApi.getState;
      this.goTo('loading');
      if (typeof getState !== 'function') {
        const loadState = this.mediaDownloadService.getLoadState(id, 'thumb');
        const cachedUrl = this.mediaDownloadService.getCachedUrl(id, 'thumb');
        const hasResolvedUrl = typeof cachedUrl === 'string' && cachedUrl.length > 0;
        if (hasResolvedUrl) {
          this.resolvedUrl.set(cachedUrl as string);
        }
        this.goTo(mapLegacyLoadState(loadState(), hasResolvedUrl));
        return;
      }

      const slot = this.slotSizeRem();

      const subscription: Subscription = getState(id, slot).subscribe((delivery) => {
        this.handleDelivery(delivery);
      });

      onCleanup(() => subscription.unsubscribe());
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  onLayerTransitionEnd(event: TransitionEvent, layer: 'warm-preview' | 'loaded'): void {
    if (event.propertyName !== 'opacity') {
      return;
    }

    if (layer === 'warm-preview' && this.state() === 'loaded') {
      this.warmPreviewUrl.set('');
      return;
    }

    if (layer === 'loaded' && this.state() === 'icon-only') {
      this.resolvedUrl.set('');
    }
  }

  onRetry(): void {
    this.refreshNonce.update((value) => value + 1);
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      const shortEdgePx = Math.min(entry.contentRect.width, entry.contentRect.height);
      const rootFontSize = this.readRootFontSize();
      const next = shortEdgePx > 0 ? shortEdgePx / rootFontSize : 1;
      if (Math.abs(this.slotSizeRem() - next) < SLOT_SIZE_REM_EPSILON) {
        return;
      }
      this.slotSizeRem.set(next);
    });

    ro.observe(this.hostEl.nativeElement);
    this.resizeObserver = ro;
  }

  private readRootFontSize(): number {
    if (typeof document === 'undefined') {
      return DEFAULT_ROOT_FONT_SIZE_PX;
    }

    const raw = parseFloat(getComputedStyle(document.documentElement).fontSize);
    if (!Number.isFinite(raw) || raw <= 0) {
      return DEFAULT_ROOT_FONT_SIZE_PX;
    }
    return raw;
  }

  private handleDelivery(delivery: MediaDisplayDeliveryState): void {
    if (delivery.metadataAspectRatio != null && delivery.metadataAspectRatio > 0) {
      this.applyAspectRatio(delivery.metadataAspectRatio);
    }

    if (delivery.warmPreviewUrl) {
      this.warmPreviewUrl.set(delivery.warmPreviewUrl);
    }

    if (delivery.resolvedUrl) {
      this.resolvedUrl.set(delivery.resolvedUrl);
    }

    if (delivery.icon) {
      this.icon.set(delivery.icon);
    }

    if (delivery.state === 'warm-preview') {
      if (delivery.metadataAspectRatio == null) {
        return;
      }
      this.goTo('warm-preview');
      return;
    }

    if (
      delivery.state === 'icon-only' &&
      delivery.metadataAspectRatio == null &&
      this.aspectRatio() == null
    ) {
      this.applyAspectRatio(1);
    }

    this.goTo(delivery.state);
  }

  private applyAspectRatio(ratio: number): void {
    this.metadataAspectRatio.set(ratio);
    this.hostEl.nativeElement.style.setProperty('--media-aspect-ratio', String(ratio));
  }

  private goTo(next: MediaDisplayState): void {
    const current = untracked(() => this.state());
    if (current === 'loading' && next === 'warm-preview' && this.metadataAspectRatio() == null) {
      return;
    }

    const target = transitionMediaDisplayState(current, next);
    if (target !== current) {
      this.state.set(target);
    }
  }
}
