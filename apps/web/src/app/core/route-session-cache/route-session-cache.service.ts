import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, merge } from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import { ROUTE_SESSION_SHELL_POLICIES } from './route-session-cache.policies';
import type {
  DeletePatchHandler,
  RevalidateHandler,
  RouteCacheEntry,
} from './route-session-cache.types';

const UPLOAD_AUDIT_MS = 300;
const REVALIDATE_DEBOUNCE_MS = 400;

@Injectable({ providedIn: 'root' })
export class RouteSessionCacheService {
  private readonly authService = inject(AuthService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly mediaDeleteUndo = inject(MediaDeleteUndoService);

  private readonly store = new Map<string, RouteCacheEntry<unknown>>();
  private readonly revalidateHandlers = new Map<string, RevalidateHandler>();
  private readonly deletePatchHandlers = new Map<string, DeletePatchHandler>();

  private revalidateTimer: ReturnType<typeof setTimeout> | null = null;
  private revalidateInFlightSignature: string | null = null;

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
      .pipe(auditTime(UPLOAD_AUDIT_MS), takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.dispatchUploadPolicies();
      });

    this.mediaDeleteUndo.mediaDeleted$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(({ mediaItemIds }) => {
        this.dispatchDeletePolicies(mediaItemIds);
      });

    this.mediaDeleteUndo.mediaRestored$
      .pipe(takeUntilDestroyed(destroyRef))
      .subscribe(() => {
        this.dispatchRestorePolicies();
      });

    effect(() => {
      if (!this.authService.session()) {
        this.invalidateAll();
      }
    });
  }

  save<T>(shellKey: string, signature: string, data: T): void {
    this.store.set(shellKey, {
      data,
      querySignature: signature,
      cachedAt: Date.now(),
    });
  }

  restore<T>(shellKey: string, signature: string): T | null {
    const entry = this.store.get(shellKey);
    if (!entry || entry.querySignature !== signature) {
      return null;
    }

    return entry.data as T;
  }

  getEntry(shellKey: string): RouteCacheEntry<unknown> | null {
    return this.store.get(shellKey) ?? null;
  }

  invalidate(shellKey: string): void {
    this.store.delete(shellKey);
  }

  invalidateAll(): void {
    this.store.clear();
    this.revalidateInFlightSignature = null;
    if (this.revalidateTimer) {
      clearTimeout(this.revalidateTimer);
      this.revalidateTimer = null;
    }
    this._revalidating.set(false);
  }

  registerRevalidateHandler(shellKey: string, handler: RevalidateHandler): void {
    this.revalidateHandlers.set(shellKey, handler);
  }

  registerDeletePatchHandler(shellKey: string, handler: DeletePatchHandler): void {
    this.deletePatchHandlers.set(shellKey, handler);
  }

  scheduleRevalidate(
    shellKey: string,
    signature: string,
    debounceMs: number = REVALIDATE_DEBOUNCE_MS,
  ): void {
    if (!this.revalidateHandlers.has(shellKey)) {
      return;
    }

    if (this.revalidateTimer) {
      clearTimeout(this.revalidateTimer);
    }

    this.revalidateTimer = setTimeout(() => {
      this.revalidateTimer = null;
      void this.runRevalidate(shellKey, signature);
    }, debounceMs);
  }

  private async runRevalidate(shellKey: string, signature: string): Promise<void> {
    const handler = this.revalidateHandlers.get(shellKey);
    if (!handler) {
      return;
    }

    if (this.revalidateInFlightSignature === signature) {
      return;
    }

    this.revalidateInFlightSignature = signature;
    this._revalidating.set(true);

    try {
      await handler(signature);
    } finally {
      if (this.revalidateInFlightSignature === signature) {
        this.revalidateInFlightSignature = null;
        this._revalidating.set(false);
      }
    }
  }

  private dispatchUploadPolicies(): void {
    for (const policy of ROUTE_SESSION_SHELL_POLICIES) {
      const entry = this.getEntry(policy.shellKey);
      if (!entry) {
        continue;
      }

      if (policy.onUpload === 'invalidate') {
        this.invalidate(policy.shellKey);
        continue;
      }

      if (policy.onUpload === 'revalidate-active') {
        this.scheduleRevalidate(policy.shellKey, entry.querySignature);
      }
    }
  }

  private dispatchDeletePolicies(mediaItemIds: string[]): void {
    for (const policy of ROUTE_SESSION_SHELL_POLICIES) {
      if (policy.onDelete === 'invalidate') {
        this.invalidate(policy.shellKey);
        continue;
      }

      if (policy.onDelete === 'patch') {
        const entry = this.getEntry(policy.shellKey);
        const handler = this.deletePatchHandlers.get(policy.shellKey);
        if (!entry || !handler || mediaItemIds.length === 0) {
          continue;
        }

        handler(mediaItemIds, entry);
      }
    }
  }

  private dispatchRestorePolicies(): void {
    for (const policy of ROUTE_SESSION_SHELL_POLICIES) {
      if (policy.onRestore === 'invalidate') {
        this.invalidate(policy.shellKey);
      }
    }
  }
}
