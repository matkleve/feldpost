import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, merge } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { MediaQueryService } from '../media-query/media-query.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import type { WorkspaceMedia } from '../workspace-view/workspace-view.types';
import { buildMediaGalleryQuerySignature } from './media-page-state.helpers';
import type {
  MediaGalleryQueryInputs,
  MediaPageCacheLookup,
} from './media-page-state.types';

const REVALIDATE_DEBOUNCE_MS = 400;

@Injectable({ providedIn: 'root' })
export class MediaPageStateService {
  private readonly authService = inject(AuthService);
  private readonly mediaQueryService = inject(MediaQueryService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);

  private cacheEntry: { querySignature: string; mediaItems: WorkspaceMedia[]; lastSyncedAt: number } | null =
    null;

  private revalidateTimer: ReturnType<typeof setTimeout> | null = null;
  private revalidateInFlightSignature: string | null = null;
  private pendingRevalidateSignature: string | null = null;

  private readonly _revalidating = signal(false);
  readonly revalidating = this._revalidating.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);

    merge(
      this.uploadManager.batchComplete$,
      this.uploadManager.imageUploaded$,
      this.uploadManager.imageReplaced$,
      this.uploadManager.imageAttached$,
    )
      .pipe(auditTime(300), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.onUploadActivity();
      });

    this.mediaDeleteUndo.mediaDeleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ mediaItemIds }) => {
        this.removeMediaFromCache(mediaItemIds);
      });

    this.mediaDeleteUndo.mediaRestored$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.invalidateActiveCache();
      });

    effect(() => {
      if (!this.authService.session()) {
        this.clearAll();
      }
    });
  }

  lookup(inputs: MediaGalleryQueryInputs): MediaPageCacheLookup {
    const signature = buildMediaGalleryQuerySignature(inputs);
    const entry = this.cacheEntry;

    if (!entry || entry.querySignature !== signature) {
      return { hit: false, mediaItems: [] };
    }

    return { hit: true, mediaItems: entry.mediaItems };
  }

  writeCache(inputs: MediaGalleryQueryInputs, mediaItems: WorkspaceMedia[]): void {
    const signature = buildMediaGalleryQuerySignature(inputs);
    this.cacheEntry = {
      querySignature: signature,
      mediaItems: [...mediaItems],
      lastSyncedAt: Date.now(),
    };
  }

  invalidateActiveCache(): void {
    if (!this.cacheEntry) {
      return;
    }

    this.cacheEntry = null;
  }

  scheduleRevalidate(inputs: MediaGalleryQueryInputs): void {
    const signature = buildMediaGalleryQuerySignature(inputs);
    this.pendingRevalidateSignature = signature;

    if (this.revalidateTimer) {
      clearTimeout(this.revalidateTimer);
    }

    this.revalidateTimer = setTimeout(() => {
      this.revalidateTimer = null;
      void this.runRevalidate(signature);
    }, REVALIDATE_DEBOUNCE_MS);
  }

  private async runRevalidate(signature: string): Promise<void> {
    if (this.revalidateInFlightSignature === signature) {
      return;
    }

    if (!this.authService.user()) {
      return;
    }

    this.revalidateInFlightSignature = signature;
    this._revalidating.set(true);

    try {
      const rows = await this.mediaQueryService.loadAllCurrentUserWorkspaceMedia();
      if (this.revalidateInFlightSignature !== signature) {
        return;
      }

      if (this.cacheEntry?.querySignature === signature) {
        this.cacheEntry = {
          querySignature: signature,
          mediaItems: rows,
          lastSyncedAt: Date.now(),
        };
      }
    } finally {
      if (this.revalidateInFlightSignature === signature) {
        this.revalidateInFlightSignature = null;
        this._revalidating.set(false);
      }
    }
  }

  private onUploadActivity(): void {
    if (!this.cacheEntry) {
      return;
    }

    this.scheduleRevalidateForCachedSignature(this.cacheEntry.querySignature);
  }

  private scheduleRevalidateForCachedSignature(signature: string): void {
    this.pendingRevalidateSignature = signature;

    if (this.revalidateTimer) {
      clearTimeout(this.revalidateTimer);
    }

    this.revalidateTimer = setTimeout(() => {
      this.revalidateTimer = null;
      void this.runRevalidate(signature);
    }, REVALIDATE_DEBOUNCE_MS);
  }

  private removeMediaFromCache(mediaItemIds: string[]): void {
    if (!this.cacheEntry || mediaItemIds.length === 0) {
      return;
    }

    const deleted = new Set(mediaItemIds);
    const next = this.cacheEntry.mediaItems.filter((item) => !deleted.has(item.id));
    this.cacheEntry = {
      ...this.cacheEntry,
      mediaItems: next,
      lastSyncedAt: Date.now(),
    };
  }

  clearAll(): void {
    this.cacheEntry = null;
    this.revalidateInFlightSignature = null;
    this.pendingRevalidateSignature = null;
    if (this.revalidateTimer) {
      clearTimeout(this.revalidateTimer);
      this.revalidateTimer = null;
    }
    this._revalidating.set(false);
  }
}
