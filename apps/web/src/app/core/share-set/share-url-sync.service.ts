import { Injectable, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { ShareSetService } from './share-set.service';
import type { ShareUrlSyncRequest, ShareUrlSyncStatus } from './share-url-sync.types';

const SYNC_DEBOUNCE_MS = 250;

/**
 * Keeps share URL query params in sync with current selection/detail state.
 * @see docs/specs/service/share-set/share-link-restore.md
 */
@Injectable({ providedIn: 'root' })
export class ShareUrlSyncService {
  private readonly shareSetService = inject(ShareSetService);
  private readonly router = inject(Router);

  private readonly syncStatusSignal = signal<ShareUrlSyncStatus>('idle');
  readonly syncStatus = this.syncStatusSignal.asReadonly();

  private latestRequest: ShareUrlSyncRequest | null = null;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private scheduleVersion = 0;

  private lastResolvedFingerprint: string | null = null;
  private lastResolvedToken: string | null = null;

  private inFlightFingerprint: string | null = null;
  private inFlightTokenPromise: Promise<string | null> | null = null;

  /** Blocks auto-publishing share params until scope clears or {@link resumeOutboundSync}. */
  private outboundSyncSuppressed = false;

  /** Call before consuming an inbound `?share=` restore so hydration does not re-write the URL. */
  suppressOutboundSyncAfterRestore(): void {
    this.outboundSyncSuppressed = true;
  }

  /** Re-enables live URL sync after the user changes post-restore selection scope. */
  resumeOutboundSync(): void {
    this.outboundSyncSuppressed = false;
  }

  scheduleSync(request: ShareUrlSyncRequest): void {
    this.latestRequest = request;
    this.scheduleVersion += 1;
    const version = this.scheduleVersion;

    if (this.debounceTimer != null) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      void this.flush(version);
    }, SYNC_DEBOUNCE_MS);
  }

  private async flush(version: number): Promise<void> {
    if (version !== this.scheduleVersion || !this.latestRequest) {
      return;
    }

    const request = this.latestRequest;
    const scopeMediaIds = request.scopeMediaIds.filter((id) => id.length > 0);

    if (this.outboundSyncSuppressed) {
      if (scopeMediaIds.length === 0) {
        await this.applyParams(request, null, null);
        this.outboundSyncSuppressed = false;
        this.syncStatusSignal.set('applied');
      } else {
        this.syncStatusSignal.set('idle');
      }
      return;
    }

    if (scopeMediaIds.length === 0) {
      await this.applyParams(request, null, null);
      this.syncStatusSignal.set('applied');
      return;
    }

    const fingerprint = scopeMediaIds.join('|');
    const token = await this.resolveToken(fingerprint, scopeMediaIds);
    if (!token) {
      return;
    }

    // If a newer state arrived while token RPC was in-flight, skip applying stale params.
    if (!this.latestRequest) {
      return;
    }
    const latestFingerprint = this.latestRequest.scopeMediaIds.join('|');
    if (latestFingerprint !== fingerprint) {
      return;
    }

    const detailMediaId = this.resolveDetailMediaId(this.latestRequest);
    await this.applyParams(this.latestRequest, token, detailMediaId);
    this.syncStatusSignal.set('applied');
  }

  private resolveDetailMediaId(request: ShareUrlSyncRequest): string | null {
    const scope = request.scopeMediaIds;
    if (scope.length === 1) {
      return scope[0];
    }
    if (request.detailMediaId && scope.includes(request.detailMediaId)) {
      return request.detailMediaId;
    }
    return null;
  }

  private async resolveToken(fingerprint: string, scopeMediaIds: string[]): Promise<string | null> {
    if (this.lastResolvedFingerprint === fingerprint && this.lastResolvedToken) {
      return this.lastResolvedToken;
    }

    if (this.inFlightFingerprint === fingerprint && this.inFlightTokenPromise) {
      return this.inFlightTokenPromise;
    }

    this.syncStatusSignal.set('resolvingShare');
    this.inFlightFingerprint = fingerprint;
    this.inFlightTokenPromise = this.shareSetService
      .createOrReuseShareSet(scopeMediaIds)
      .then((result) => {
        this.lastResolvedFingerprint = fingerprint;
        this.lastResolvedToken = result.token;
        return result.token;
      })
      .catch((error: unknown) => {
        if (typeof console !== 'undefined' && typeof console.warn === 'function') {
          const message = error instanceof Error ? error.message : String(error);
          console.warn('[ShareUrlSyncService] create_or_reuse_share_set failed:', message);
        }
        this.syncStatusSignal.set('error');
        return null;
      })
      .finally(() => {
        if (this.inFlightFingerprint === fingerprint) {
          this.inFlightFingerprint = null;
          this.inFlightTokenPromise = null;
        }
      });

    return this.inFlightTokenPromise;
  }

  private async applyParams(
    request: ShareUrlSyncRequest,
    shareToken: string | null,
    mediaId: string | null,
  ): Promise<void> {
    const currentShare = request.routeSnapshot.queryParamMap.get('share');
    const currentMedia = request.routeSnapshot.queryParamMap.get('media');
    const targetShare = shareToken ?? null;
    const targetMedia = mediaId ?? null;

    if (currentShare === targetShare && currentMedia === targetMedia) {
      return;
    }

    await this.router.navigate([], {
      queryParams: { share: targetShare, media: targetMedia },
      queryParamsHandling: 'merge',
      replaceUrl: true,
      state: { shareUrlSync: true },
    });
  }
}
