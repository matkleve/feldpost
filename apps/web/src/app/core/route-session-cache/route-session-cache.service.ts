import { DestroyRef, Injectable, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { auditTime, map, merge, Subject } from 'rxjs';
import type { BatchCompleteEvent, ImageUploadedEvent } from '../upload/upload-manager.types';
import { AuthService } from '../auth/auth.service';
import { MediaDeleteUndoService } from '../media-delete/media-delete-undo.service';
import { UploadManagerService } from '../upload/upload-manager.service';
import { ROUTE_SESSION_SHELL_POLICIES } from './route-session-cache.policies';
import type {
  DeletePatchHandler,
  RevalidateHandler,
  RouteCacheEntry,
  RouteUploadDispatchEvent,
  ShellRevalidateState,
  UploadActivityHandler,
} from './route-session-cache.types';
import { ROUTE_SESSION_SHELL_KEYS } from './route-session-cache.keys';

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
  private readonly uploadActivityHandlers = new Map<string, UploadActivityHandler>();
  private readonly revalidateStates = new Map<string, ShellRevalidateState>();

  private readonly _shellInvalidated$ = new Subject<string>();
  /** Fires when a shell cache entry is dropped (e.g. map upload invalidation). */
  readonly shellInvalidated$ = this._shellInvalidated$.asObservable();

  private readonly _revalidating = signal(false);
  readonly revalidating = this._revalidating.asReadonly();

  constructor() {
    const destroyRef = inject(DestroyRef);

    merge(
      this.uploadManager.batchComplete$.pipe(
        map((_event: BatchCompleteEvent): RouteUploadDispatchEvent => ({ kind: 'batchComplete' })),
      ),
      this.uploadManager.imageUploaded$.pipe(
        map((event: ImageUploadedEvent): RouteUploadDispatchEvent => ({ kind: 'imageUploaded', event })),
      ),
      this.uploadManager.imageReplaced$.pipe(
        map((): RouteUploadDispatchEvent => ({ kind: 'imageReplaced' })),
      ),
      this.uploadManager.imageAttached$.pipe(
        map((): RouteUploadDispatchEvent => ({ kind: 'imageAttached' })),
      ),
    )
      .pipe(auditTime(UPLOAD_AUDIT_MS), takeUntilDestroyed(destroyRef))
      .subscribe((event) => {
        this.dispatchUploadPolicies(event);
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
    const hadEntry = this.store.has(shellKey);
    this.store.delete(shellKey);
    if (hadEntry) {
      this._shellInvalidated$.next(shellKey);
    }
  }

  invalidateAll(): void {
    this.store.clear();
    this.clearAllRevalidateState();
    this._revalidating.set(false);
  }

  registerRevalidateHandler(shellKey: string, handler: RevalidateHandler): void {
    this.revalidateHandlers.set(shellKey, handler);
  }

  registerDeletePatchHandler(shellKey: string, handler: DeletePatchHandler): void {
    this.deletePatchHandlers.set(shellKey, handler);
  }

  registerUploadActivityHandler(shellKey: string, handler: UploadActivityHandler): void {
    this.uploadActivityHandlers.set(shellKey, handler);
  }

  scheduleRevalidate(
    shellKey: string,
    signature: string,
    debounceMs: number = REVALIDATE_DEBOUNCE_MS,
  ): void {
    if (!this.revalidateHandlers.has(shellKey)) {
      return;
    }

    const state = this.getOrCreateRevalidateState(shellKey);
    if (state.timer) {
      clearTimeout(state.timer);
    }

    state.timer = setTimeout(() => {
      state.timer = null;
      void this.runRevalidate(shellKey, signature);
    }, debounceMs);
  }

  private getOrCreateRevalidateState(shellKey: string): ShellRevalidateState {
    let state = this.revalidateStates.get(shellKey);
    if (!state) {
      state = { timer: null, inFlightSignature: null };
      this.revalidateStates.set(shellKey, state);
    }
    return state;
  }

  private syncRevalidatingSignal(): void {
    for (const state of this.revalidateStates.values()) {
      if (state.inFlightSignature !== null) {
        this._revalidating.set(true);
        return;
      }
    }
    this._revalidating.set(false);
  }

  private clearRevalidateState(shellKey: string): void {
    const state = this.revalidateStates.get(shellKey);
    if (!state) {
      return;
    }

    if (state.timer) {
      clearTimeout(state.timer);
    }
    state.timer = null;
    state.inFlightSignature = null;
  }

  private clearAllRevalidateState(): void {
    for (const shellKey of this.revalidateStates.keys()) {
      this.clearRevalidateState(shellKey);
    }
  }

  private async runRevalidate(shellKey: string, signature: string): Promise<void> {
    const handler = this.revalidateHandlers.get(shellKey);
    if (!handler) {
      return;
    }

    const state = this.getOrCreateRevalidateState(shellKey);
    if (state.inFlightSignature === signature) {
      return;
    }

    state.inFlightSignature = signature;
    this.syncRevalidatingSignal();

    try {
      await handler(signature);
    } finally {
      if (state.inFlightSignature === signature) {
        state.inFlightSignature = null;
        this.syncRevalidatingSignal();
      }
    }
  }

  private dispatchUploadPolicies(event: RouteUploadDispatchEvent): void {
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
        const handler = this.uploadActivityHandlers.get(policy.shellKey);
        if (handler?.(event)) {
          continue;
        }

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
