import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  computed,
  effect,
  inject,
  input,
  output,
  signal,
  untracked,
} from '@angular/core';
import type { AfterViewInit, InputSignal } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { resolveFileType } from '../../core/media/file-type-registry';
import { mediaFileIdentityFromRecord } from '../../core/media/media-file-identity.helpers';
import { requiresServerPreviewGeneration } from '../../core/media/office-preview-eligibility.helpers';
import type { MediaContext } from '../../core/media/media-renderer.types';
import type { PreviewGenerationStatus } from '../../core/media/preview-generation-status.types';
import { MediaAspectRatioCacheService } from '../../core/media/media-aspect-ratio-cache.service';
import { MediaDownloadService } from '../../core/media-download/media-download.service';
import { MediaPreviewGenerationService } from '../../core/media-thumbnail/media-preview-generation.service';
import { CONTEXT_DEFAULT_TIER, tierToMediaSize } from '../../core/media-download/media-download.helpers';
import { type MediaDisplayState, transitionMediaDisplayState } from './media-display-state';
import { type MediaDisplayDeliveryState } from './media-display.helpers';
import { canWarmSkipGridLoadingSurface } from './media-display-warm-revisit.helpers';

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
    '[class.media-display--fill-slot]': "slotGeometry() === 'fill'",
    '[class.media-display--intrinsic]': "slotGeometry() === 'intrinsic'",
  },
})
export class MediaDisplayComponent implements AfterViewInit {
  private readonly hostEl = inject(ElementRef<HTMLElement>);
  private readonly destroyRef = inject(DestroyRef);
  private readonly mediaDownloadService = inject(MediaDownloadService);
  private readonly aspectRatioCache = inject(MediaAspectRatioCacheService);
  private readonly previewGeneration = inject(MediaPreviewGenerationService);
  private readonly i18nService = inject(I18nService);

  private resizeObserver: ResizeObserver | null = null;
  private lastHandoffKey = '';
  private ratioProbeImg: HTMLImageElement | null = null;

  readonly mediaId: InputSignal<string> = input.required<string>();
  readonly storagePath = input<string | null>(null);
  readonly thumbnailPath = input<string | null>(null);
  readonly previewGenerationStatus = input<PreviewGenerationStatus | null>(null);
  readonly originalFilename = input<string | null>(null);
  readonly maxWidth: InputSignal<string> = input('100%');
  readonly maxHeight: InputSignal<string> = input('100%');
  readonly aspectRatio: InputSignal<number | null> = input<number | null>(null);
  /** CSS object-position for bitmap layers (documents: top center). */
  readonly contentObjectPosition = input('center center');
  /** `fill` = fixed-slot mode (row); `intrinsic` = height driven by media aspect-ratio (grid). */
  readonly slotGeometry = input<'fill' | 'intrinsic'>('fill');
  /**
   * Grid shell revisit: parent slot already has session-cached aspect ratio — skip
   * ratio-known-contain (no CSS transition → no transitionend) and reveal directly.
   */
  readonly skipIntrinsicRatioTransition = input(false);
  /** Drives tier floor and cache registration context in MediaDownloadService. */
  readonly downloadContext = input<MediaContext>('grid');
  /**
   * Emits the resolved aspect ratio so the parent slot can mirror it.
   * CSS cannot inherit child → parent, so an output is the only spec-compliant channel.
   */
  readonly aspectRatioChange = output<number>();

  readonly state = signal<MediaDisplayState>('idle');
  readonly slotSizeRem = signal(1);
  readonly resolvedUrl = signal('');
  readonly stagedContentUrl = signal('');
  readonly icon = signal('insert_drive_file');
  readonly metadataAspectRatio = signal<number | null>(null);
  /** Grid intrinsic: block sharp content until parent slot aspect transition has committed. */
  private readonly gridSlotAspectSettled = signal(false);

  readonly t = (key: string, fallback = ''): string => this.i18nService.t(key, fallback);
  readonly showSharpContent = computed(
    () => !!this.resolvedUrl() && this.canRevealGridIntrinsicContent(),
  );
  readonly noMediaLabel = computed(() => this.t('media.page.empty', 'No media found'));

  constructor() {
    effect(() => {
      this.hostEl.nativeElement.style.setProperty('--media-display-max-width', this.maxWidth());
      this.hostEl.nativeElement.style.setProperty('--media-display-max-height', this.maxHeight());
    });

    effect(() => {
      const hintedRatio = this.aspectRatio();
      if (hintedRatio != null && hintedRatio > 0 && this.metadataAspectRatio() == null) {
        this.storeAspectRatio(hintedRatio, this.shouldDeferSlotAspectRatio());
      }
    });

    effect(() => {
      if (this.isGridIntrinsicSlot() && this.skipIntrinsicRatioTransition()) {
        this.gridSlotAspectSettled.set(true);
      }
    });

    effect((onCleanup) => {
      const id = this.mediaId().trim();
      const storagePath = this.storagePath();
      const thumbnailPath = this.thumbnailPath();
      const previewStatus = this.previewGenerationStatus();
      const handoffKey = `${id}|${this.slotGeometry()}|${this.downloadContext()}`;

      if (!id) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.resetState();
        this.lastHandoffKey = '';
        this.goTo('idle');
        return;
      }

      const isNewHandoff = this.lastHandoffKey !== handoffKey;
      if (isNewHandoff) {
        this.resolvedUrl.set('');
        this.stagedContentUrl.set('');
        this.cancelRatioProbe();
        this.lastHandoffKey = handoffKey;

        this.gridSlotAspectSettled.set(false);

        const sessionRatio = this.aspectRatioCache.get(id);
        if (sessionRatio != null && sessionRatio > 0) {
          this.metadataAspectRatio.set(sessionRatio);
        } else {
          this.resetState();
        }

        this.goTo('loading-surface-visible');
      }

      if (storagePath) {
        this.mediaDownloadService.registerPreviewPaths(
          id,
          storagePath,
          thumbnailPath,
          previewStatus,
          this.downloadContext(),
        );

        if (isNewHandoff) {
          this.tryWarmIntrinsicGridRevisit(id);
        }
      }

      if (storagePath && !thumbnailPath?.trim()) {
        const fileType = resolveFileType(
          mediaFileIdentityFromRecord({
            storage_path: storagePath,
            original_filename: this.originalFilename(),
          }),
        );
        if (requiresServerPreviewGeneration(fileType)) {
          void this.previewGeneration.enqueue(id, previewStatus);
        }
      }
    });

    // Delivery subscription tracks slot size — untracked slot in the handoff effect above
    // left getState stuck at 1rem → immediate icon-only for documents (spec: sign when thumb exists).
    effect((onCleanup) => {
      const id = this.mediaId().trim();
      const storagePath = this.storagePath();
      // Re-subscribe when thumb path / status changes (registered in handoff effect above).
      this.thumbnailPath();
      this.previewGenerationStatus();
      if (!id || !storagePath) {
        return;
      }

      const slot = this.slotSizeRem();
      const sub = this.mediaDownloadService
        .getState(id, slot)
        .subscribe((delivery) => this.handleDelivery(delivery));

      onCleanup(() => sub.unsubscribe());
    });

    this.destroyRef.onDestroy(() => {
      this.resizeObserver?.disconnect();
      this.resizeObserver = null;
      this.cancelRatioProbe();
    });
  }

  ngAfterViewInit(): void {
    this.setupResizeObserver();
  }

  /**
   * Called when parent slot finishes aspect-ratio transition (ratio-known-contain path).
   * Spec: transient-state exits are controlled by transitionend.
   * @see docs/specs/component/media/media-item.md#spacing--framing-ownership
   */
  onSlotGeometryTransitionEnd(): void {
    if (this.state() === 'ratio-known-contain') {
      this.advanceAfterRatioSettled();
    }
  }

  /**
   * Listens for opacity transitions on staged-content and content layers.
   * @see docs/specs/component/media/media-display.md#transition-choreography-table-required-before-css
   */
  onLayerTransitionEnd(event: TransitionEvent, layer: 'staged-content' | 'content'): void {
    if (event.propertyName !== 'opacity') {
      return;
    }

    if (layer === 'content' && this.state() === 'content-fade-in') {
      this.goTo('content-visible');
      return;
    }

    if (layer === 'staged-content' && this.state() === 'content-visible') {
      this.stagedContentUrl.set('');
    }
  }

  /**
   * Called when the sharp content image loads in the DOM.
   * If no metadata ratio is known yet, derive it from natural dimensions and trigger
   * the ratio-known-contain transition before advancing to content-fade-in.
   */
  onContentImageLoad(event: Event): void {
    if (this.metadataAspectRatio() != null) {
      return;
    }

    const img = event.target;
    if (!(img instanceof HTMLImageElement) || img.naturalWidth <= 0 || img.naturalHeight <= 0) {
      return;
    }

    const ratio = img.naturalWidth / img.naturalHeight;

    if (this.slotGeometry() === 'intrinsic') {
      const current = this.state();
      if (current === 'loading-surface-visible') {
        this.triggerRatioTransition(ratio);
        return;
      }
    }

    this.storeAspectRatio(ratio, this.shouldDeferSlotAspectRatio());
  }

  private handleDelivery(delivery: MediaDisplayDeliveryState): void {
    if (delivery.metadataAspectRatio != null && delivery.metadataAspectRatio > 0) {
      this.storeAspectRatio(delivery.metadataAspectRatio, this.shouldDeferSlotAspectRatio());
    }

    if (delivery.warmPreviewUrl) {
      this.stagedContentUrl.set(delivery.warmPreviewUrl);
    }

    if (delivery.resolvedUrl) {
      this.resolvedUrl.set(delivery.resolvedUrl);
    }

    if (delivery.icon) {
      this.icon.set(delivery.icon);
    }

    switch (delivery.state) {
      case 'loading':
      case 'warm-preview': {
        // Only accept loading signal when not already past it — prevents resize-driven regression.
        const current = this.state();
        if (
          current !== 'loading-surface-visible' &&
          current !== 'idle'
        ) {
          this.syncGridIntrinsicRevealAfterUrlUpdate();
          return;
        }

        this.goTo('loading-surface-visible');
        this.syncGridIntrinsicRevealAfterUrlUpdate();
        return;
      }

      case 'loaded': {
        let current = this.state();

        if (current === 'content-fade-in' || current === 'content-visible') {
          if (
            this.isGridIntrinsicSlot() &&
            this.resolvedUrl() &&
            !this.gridSlotAspectSettled() &&
            this.skipIntrinsicRatioTransition()
          ) {
            this.gridSlotAspectSettled.set(true);
          }
          return;
        }

        if (current === 'ratio-known-contain') {
          if (this.resolvedUrl()) {
            this.markGridSlotAspectSettledAndAdvance();
          }
          return;
        }

        if (this.isGridIntrinsicSlot() && current === 'idle') {
          this.goTo('loading-surface-visible');
          current = 'loading-surface-visible';
        }

        if (this.isGridIntrinsicSlot() && this.tryRevealGridIntrinsicWhenReady(current)) {
          return;
        }

        if (this.slotGeometry() === 'intrinsic' && current === 'loading-surface-visible') {
          const targetRatio = this.resolveTargetAspectRatioForTransition();

          if (this.downloadContext() === 'detail') {
            if (targetRatio != null) {
              this.storeAspectRatio(targetRatio, false);
            } else if (delivery.resolvedUrl) {
              this.probeRatioFromUrl(delivery.resolvedUrl);
              return;
            }
            this.fallThroughToReveal();
            return;
          }

          if (targetRatio != null) {
            this.revealWithKnownRatio(targetRatio);
            return;
          }

          if (delivery.resolvedUrl) {
            this.probeRatioFromUrl(delivery.resolvedUrl);
            return;
          }
        }

        if (current === 'loading-surface-visible') {
          this.goTo('media-ready');
        }

        if (this.state() === 'media-ready') {
          this.goTo('content-fade-in');
        }

        return;
      }

      case 'icon-only': {
        if (delivery.metadataAspectRatio == null && this.aspectRatio() == null) {
          this.storeAspectRatio(1, false);
        }

        this.goTo('icon-only');
        return;
      }

      case 'error': {
        this.goTo('error');
        return;
      }

      case 'no-media': {
        this.goTo('no-media');
        return;
      }

      default:
        return;
    }

    this.syncGridIntrinsicRevealAfterUrlUpdate();
  }

  /**
   * Probe natural image dimensions off-screen to derive aspect-ratio when service does not
   * supply metadataAspectRatio.  Triggers ratio-known-contain FSM path on success.
   */
  private probeRatioFromUrl(url: string): void {
    this.cancelRatioProbe();

    const img = new Image();
    this.ratioProbeImg = img;

    img.onload = () => {
      this.ratioProbeImg = null;
      if (img.naturalWidth > 0 && img.naturalHeight > 0) {
        this.revealWithKnownRatio(img.naturalWidth / img.naturalHeight);
      } else {
        this.fallThroughToReveal();
      }
    };

    img.onerror = () => {
      this.ratioProbeImg = null;
      this.fallThroughToReveal();
    };

    img.src = url;
  }

  private cancelRatioProbe(): void {
    if (this.ratioProbeImg) {
      this.ratioProbeImg.onload = null;
      this.ratioProbeImg.onerror = null;
      this.ratioProbeImg = null;
    }
  }

  /**
   * Start ratio-known-contain → sets variable → CSS aspect-ratio transition fires →
   * onViewportTransitionEnd → advanceAfterRatioSettled → media-ready → content-fade-in.
   * Spec: loading-surface-visible → ratio-known-contain: slot aspect-ratio 300ms var(--motion-ease-out).
   */
  /**
   * Grid/detail intrinsic: shrink choreography or direct reveal when ratio is already known.
   * Detail uses immediate reveal; grid may skip transition on warm revisit.
   */
  private revealWithKnownRatio(ratio: number): void {
    if (this.downloadContext() === 'detail') {
      this.storeAspectRatio(ratio, false);
      this.fallThroughToReveal();
      return;
    }

    if (this.shouldSkipIntrinsicRatioTransition()) {
      this.storeAspectRatio(ratio, false);
      if (this.isGridIntrinsicSlot()) {
        this.gridSlotAspectSettled.set(true);
      }
      this.fallThroughToReveal();
      return;
    }

    this.triggerRatioTransition(ratio);
  }

  /** After registerPreviewPaths: restore cached URL + session ratio without gray stall. */
  private tryWarmIntrinsicGridRevisit(mediaId: string): void {
    const sessionRatio = this.aspectRatioCache.get(mediaId);
    const tier = CONTEXT_DEFAULT_TIER[this.downloadContext()];
    const cachedUrl = this.mediaDownloadService.getCachedUrl(mediaId, tierToMediaSize(tier));

    if (
      !canWarmSkipGridLoadingSurface({
        downloadContext: this.downloadContext(),
        slotGeometry: this.slotGeometry(),
        sessionAspectRatio: sessionRatio,
        cachedPreviewUrl: cachedUrl,
      })
    ) {
      return;
    }

    this.resolvedUrl.set(cachedUrl!);
    if (sessionRatio != null) {
      this.metadataAspectRatio.set(sessionRatio);
      this.commitAspectRatioToSlot(sessionRatio);
    }

    this.gridSlotAspectSettled.set(true);
    this.goTo('content-visible');
  }

  private shouldSkipIntrinsicRatioTransition(): boolean {
    if (this.skipIntrinsicRatioTransition()) {
      return true;
    }

    if (this.downloadContext() !== 'grid' || this.slotGeometry() !== 'intrinsic') {
      return false;
    }

    return this.aspectRatioCache.get(this.mediaId().trim()) != null;
  }

  private triggerRatioTransition(ratio: number): void {
    if (this.state() !== 'loading-surface-visible') {
      return;
    }

    if (this.downloadContext() === 'detail') {
      this.storeAspectRatio(ratio, false);
      this.fallThroughToReveal();
      return;
    }

    this.goTo('ratio-known-contain');
    this.commitAspectRatioToSlot(ratio);

    if (this.prefersReducedMotion()) {
      queueMicrotask(() => this.markGridSlotAspectSettledAndAdvance());
      return;
    }

    // Square tiles: no CSS transition → transitionend may never fire.
    if (Math.abs(ratio - 1) < 0.001) {
      queueMicrotask(() => this.markGridSlotAspectSettledAndAdvance());
      return;
    }

    // Parent slot may already match session ratio — no transitionend will fire.
    const sessionRatio = this.aspectRatioCache.get(this.mediaId().trim());
    if (sessionRatio != null && Math.abs(sessionRatio - ratio) < 0.001) {
      queueMicrotask(() => this.markGridSlotAspectSettledAndAdvance());
    }
  }

  /** Registry hint or deferred metadata; null when ratio must come from image probe. */
  private resolveTargetAspectRatioForTransition(): number | null {
    const metadata = this.metadataAspectRatio();
    if (metadata != null && metadata > 0) {
      return metadata;
    }

    const sessionRatio = this.aspectRatioCache.get(this.mediaId().trim());
    if (sessionRatio != null && sessionRatio > 0) {
      return sessionRatio;
    }

    return null;
  }

  private advanceAfterRatioSettled(): void {
    this.markGridSlotAspectSettledAndAdvance();
  }

  private markGridSlotAspectSettledAndAdvance(): void {
    if (this.state() !== 'ratio-known-contain') {
      return;
    }

    if (this.isGridIntrinsicSlot()) {
      this.gridSlotAspectSettled.set(true);
    }

    // ratio-known-contain → media-ready → content-fade-in (staged layer optional / may stay empty).
    this.goTo('media-ready');

    if (this.resolvedUrl() && this.canRevealGridIntrinsicContent()) {
      this.goTo('content-fade-in');
    }
  }

  private fallThroughToReveal(): void {
    const current = this.state();

    if (current === 'loading-surface-visible' || current === 'ratio-known-contain') {
      this.goTo('media-ready');
    }

    if (!this.resolvedUrl() || !this.canRevealGridIntrinsicContent()) {
      return;
    }

    if (this.state() === 'media-ready') {
      this.goTo(this.shouldSkipIntrinsicRatioTransition() ? 'content-visible' : 'content-fade-in');
    }
  }

  private isGridIntrinsicSlot(): boolean {
    return this.downloadContext() === 'grid' && this.slotGeometry() === 'intrinsic';
  }

  private canRevealGridIntrinsicContent(): boolean {
    if (!this.isGridIntrinsicSlot()) {
      return true;
    }

    return this.gridSlotAspectSettled();
  }

  /**
   * Completes reveal when URL arrives after an earlier fallThrough stopped at media-ready
   * (session ratio known, signed URL still in flight).
   */
  private tryRevealGridIntrinsicWhenReady(current: MediaDisplayState): boolean {
    if (!this.isGridIntrinsicSlot() || !this.resolvedUrl()) {
      return false;
    }

    if (current === 'content-fade-in' || current === 'content-visible') {
      return true;
    }

    if (current === 'media-ready' && this.gridSlotAspectSettled()) {
      this.fallThroughToReveal();
      return true;
    }

    return false;
  }

  /**
   * Grid revisit: URL can arrive on a `loading` emit while FSM is already `media-ready`.
   * Row view works because fill mode bypasses this gate — keep grid in sync here.
   */
  private syncGridIntrinsicRevealAfterUrlUpdate(): void {
    if (!this.isGridIntrinsicSlot() || !this.resolvedUrl()) {
      return;
    }

    if (this.skipIntrinsicRatioTransition()) {
      this.gridSlotAspectSettled.set(true);
    }

    const current = this.state();
    if (this.tryRevealGridIntrinsicWhenReady(current)) {
      return;
    }

    if (current !== 'loading-surface-visible') {
      return;
    }

    const targetRatio = this.resolveTargetAspectRatioForTransition();
    if (targetRatio != null) {
      this.revealWithKnownRatio(targetRatio);
      return;
    }

    this.probeRatioFromUrl(this.resolvedUrl());
  }

  private setupResizeObserver(): void {
    if (typeof ResizeObserver === 'undefined') {
      return;
    }

    const viewportElement = this.hostEl.nativeElement.querySelector(
      '.media-display__viewport',
    ) as HTMLElement | null;

    if (!viewportElement) {
      return;
    }

    const applyMeasuredSlot = (widthPx: number, heightPx: number): void => {
      const shortEdgePx = Math.min(widthPx, heightPx);
      const rootFontSize = this.readRootFontSize();
      const next = shortEdgePx > 0 ? shortEdgePx / rootFontSize : 1;

      if (Math.abs(this.slotSizeRem() - next) < SLOT_SIZE_REM_EPSILON) {
        return;
      }

      this.slotSizeRem.set(next);
    };

    const rect = viewportElement.getBoundingClientRect();
    applyMeasuredSlot(rect.width, rect.height);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) {
        return;
      }

      applyMeasuredSlot(entry.contentRect.width, entry.contentRect.height);
    });

    ro.observe(viewportElement);
    this.resizeObserver = ro;
  }

  private readRootFontSize(): number {
    if (typeof document === 'undefined') {
      return DEFAULT_ROOT_FONT_SIZE_PX;
    }

    const raw = parseFloat(getComputedStyle(document.documentElement).fontSize);
    return Number.isFinite(raw) && raw > 0 ? raw : DEFAULT_ROOT_FONT_SIZE_PX;
  }

  private shouldDeferSlotAspectRatio(): boolean {
    if (this.downloadContext() === 'detail') {
      return false;
    }

    return (
      this.slotGeometry() === 'intrinsic' &&
      (this.state() === 'loading-surface-visible' || this.state() === 'idle')
    );
  }

  /** Stores ratio internally; emits to slot only when not deferring (keeps 1:1 until shrink). */
  private storeAspectRatio(ratio: number, deferEmit: boolean): void {
    this.metadataAspectRatio.set(ratio);
    if (!deferEmit) {
      this.cachePublishedAspectRatio(ratio);
      this.aspectRatioChange.emit(ratio);
    }
  }

  /** Commits ratio to parent slot — triggers CSS aspect-ratio transition on media-item__slot. */
  private commitAspectRatioToSlot(ratio: number): void {
    this.metadataAspectRatio.set(ratio);
    this.cachePublishedAspectRatio(ratio);
    this.aspectRatioChange.emit(ratio);
  }

  /** Session cache for workspace detail; grid still owns 1:1 shrink choreography locally. */
  private cachePublishedAspectRatio(ratio: number): void {
    const id = this.mediaId().trim();
    if (!id || !Number.isFinite(ratio) || ratio <= 0) {
      return;
    }
    this.aspectRatioCache.set(id, ratio, 'intrinsic');
  }

  private resetState(): void {
    this.metadataAspectRatio.set(null);
    this.gridSlotAspectSettled.set(false);
    this.cancelRatioProbe();
    if (this.downloadContext() !== 'detail') {
      this.aspectRatioChange.emit(1);
    }
  }

  private prefersReducedMotion(): boolean {
    return (
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    );
  }

  private goTo(next: MediaDisplayState): void {
    const current = untracked(() => this.state());
    const target = transitionMediaDisplayState(current, next);

    if (target !== current) {
      this.state.set(target);
    }
  }
}
