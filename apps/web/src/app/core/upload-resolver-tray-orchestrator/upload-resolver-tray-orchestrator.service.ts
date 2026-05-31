/**
 * Presentation orchestrator for upload resolver tray (conversation bundles).
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

import { Injectable, computed, signal } from '@angular/core';
import { Subject } from 'rxjs';
import type { Observable } from 'rxjs';
import {
  bundleAllTerminal,
  countDialogueUnits,
  firstActionableIndex,
  itemStatus,
} from './upload-resolver-tray-orchestrator.helpers';
import type {
  EnqueueTrayItemInput,
  PresentationBundle,
  TrayBundleCompletedEvent,
  TrayItemAnswer,
  TrayItemResolvedEvent,
  TrayItemStatus,
  TrayResolveItem,
} from './upload-resolver-tray-orchestrator.types';
import {
  PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS,
  PRESENTATION_BUNDLE_WINDOW_MS,
} from './upload-resolver-tray-orchestrator.types';

@Injectable({ providedIn: 'root' })
export class UploadResolverTrayOrchestratorService {
  private readonly _inbox = signal<TrayResolveItem[]>([]);
  private readonly _collectingBundle = signal<PresentationBundle | null>(null);
  private readonly _presentingBundle = signal<PresentationBundle | null>(null);
  private readonly _pendingBundles = signal<PresentationBundle[]>([]);
  private readonly _flushedBundles = signal<PresentationBundle[]>([]);

  private readonly _resolvedItemIds = signal<Set<string>>(new Set());
  private readonly _skippedItemIds = signal<Set<string>>(new Set());
  private readonly _itemAnswers = signal<Map<string, TrayItemAnswer>>(new Map());
  private readonly _activeItemIndex = signal(0);

  private collectTimer: ReturnType<typeof setTimeout> | null = null;
  private collectStartedAt = 0;
  private readonly scanIdleBatches = new Set<string>();

  private readonly _itemResolved$ = new Subject<TrayItemResolvedEvent>();
  private readonly _bundleCompleted$ = new Subject<TrayBundleCompletedEvent>();

  readonly itemResolved$: Observable<TrayItemResolvedEvent> = this._itemResolved$.asObservable();
  readonly bundleCompleted$: Observable<TrayBundleCompletedEvent> =
    this._bundleCompleted$.asObservable();

  readonly activeBundle = computed(() => this._presentingBundle());
  readonly pendingBundleCount = computed(() => this._pendingBundles().length);
  readonly hasActivePresentation = computed(() => this._presentingBundle() !== null);

  readonly activeItems = computed(() => this._presentingBundle()?.items ?? []);

  readonly activeItem = computed(() => {
    const bundle = this._presentingBundle();
    if (!bundle?.items.length) {
      return null;
    }
    const index = Math.min(
      Math.max(this._activeItemIndex(), 0),
      bundle.items.length - 1,
    );
    return bundle.items[index] ?? null;
  });

  readonly activeItemIndex = computed(() => this._activeItemIndex());

  readonly itemStatuses = computed(() => {
    const bundle = this._presentingBundle();
    if (!bundle) {
      return new Map<string, TrayItemStatus>();
    }
    const resolved = this._resolvedItemIds();
    const skipped = this._skippedItemIds();
    const map = new Map<string, TrayItemStatus>();
    for (const item of bundle.items) {
      map.set(item.id, itemStatus(item, resolved, skipped));
    }
    return map;
  });

  readonly bundleProgress = computed(() => {
    const bundle = this._presentingBundle();
    if (!bundle) {
      return { done: 0, total: 0, allTerminal: true };
    }
    const resolved = this._resolvedItemIds();
    const skipped = this._skippedItemIds();
    const total = bundle.items.length;
    const done = bundle.items.filter((item) =>
      itemStatus(item, resolved, skipped) === 'resolved' ||
      itemStatus(item, resolved, skipped) === 'skipped',
    ).length;
    return {
      done,
      total,
      allTerminal: bundleAllTerminal(bundle.items, resolved, skipped),
    };
  });

  readonly hasQueuedBundles = computed(
    () =>
      this._pendingBundles().length > 0 ||
      this._collectingBundle() !== null ||
      this._inbox().length > 0,
  );

  /** More presentation bundles or collecting window after current bundle. */
  readonly hasPresentationBacklog = computed(
    () =>
      this._pendingBundles().length > 0 ||
      this._collectingBundle() !== null ||
      this._inbox().length > 0,
  );

  enqueueItem(input: EnqueueTrayItemInput): string {
    const groupId = disambiguationGroupIdFromPayload(input.payloadRef);
    if (groupId) {
      const existingId = this.findExistingItemIdForGroup(input.batchId, groupId);
      if (existingId) {
        return existingId;
      }
    }

    const item: TrayResolveItem = {
      id: crypto.randomUUID(),
      dialogueUnitId: input.dialogueUnitId,
      producerId: input.producerId,
      batchId: input.batchId,
      questionKey: input.questionKey,
      questionParams: input.questionParams ?? {},
      answerKind: input.answerKind ?? 'single_choice',
      options: input.options,
      jobIds: [...input.jobIds],
      folderDisplayPath: input.folderDisplayPath,
      dependsOnItemId: input.dependsOnItemId,
      trayStepLabel: input.trayStepLabel,
      payloadRef: input.payloadRef,
    };

    this._inbox.update((prev) => [...prev, item]);

    if (this.scanIdleBatches.has(input.batchId)) {
      this.flushInboxToNewCollectingBundle(input.batchId);
      this.closeCollectingWindow();
      return item.id;
    }

    this.ensureCollecting(input.batchId);
    this.appendToCollectingWithUnitCap(item);

    if (this.scanIdleBatches.has(input.batchId)) {
      this.closeCollectingWindow();
    }

    return item.id;
  }

  notifyScanIdle(batchId: string): void {
    this.scanIdleBatches.add(batchId);
    const collecting = this._collectingBundle();
    if (collecting?.batchId === batchId) {
      this.closeCollectingWindow();
      return;
    }
    if (this._inbox().some((item) => item.batchId === batchId)) {
      this.flushInboxToNewCollectingBundle(batchId);
      this.closeCollectingWindow();
    }
  }

  clearScanIdle(batchId: string): void {
    this.scanIdleBatches.delete(batchId);
  }

  setActiveItemIndex(index: number): void {
    const bundle = this._presentingBundle();
    if (!bundle) {
      return;
    }
    const clamped = Math.min(Math.max(index, 0), bundle.items.length - 1);
    this._activeItemIndex.set(clamped);
  }

  goToAdjacentItem(delta: -1 | 1): void {
    const bundle = this._presentingBundle();
    if (!bundle || bundle.items.length < 2) {
      return;
    }
    const next = this._activeItemIndex() + delta;
    if (next < 0 || next >= bundle.items.length) {
      return;
    }
    this._activeItemIndex.set(next);
  }

  resolveActiveItem(answer: TrayItemAnswer): void {
    const bundle = this._presentingBundle();
    const item = this.activeItem();
    if (!bundle || !item) {
      return;
    }
    this.resolveItem(item.id, answer);
  }

  resolveItem(itemId: string, answer: TrayItemAnswer): void {
    const bundle = this._presentingBundle();
    if (!bundle) {
      return;
    }
    const item = bundle.items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    if (itemStatus(item, this._resolvedItemIds(), this._skippedItemIds()) !== 'ready') {
      return;
    }

    this._resolvedItemIds.update((prev) => new Set([...prev, itemId]));
    this._itemAnswers.update((prev) => new Map(prev).set(itemId, answer));

    const event: TrayItemResolvedEvent = {
      batchId: item.batchId,
      bundleId: bundle.id,
      itemId: item.id,
      producerId: item.producerId,
      answer,
      skipped: false,
      item,
    };
    this._itemResolved$.next(event);

    this.advanceAfterItemChange(bundle);
  }

  skipActiveItem(): void {
    const item = this.activeItem();
    if (!item) {
      return;
    }
    this.skipItem(item.id);
  }

  skipItem(itemId: string): void {
    const bundle = this._presentingBundle();
    if (!bundle) {
      return;
    }
    const item = bundle.items.find((entry) => entry.id === itemId);
    if (!item) {
      return;
    }
    const status = itemStatus(item, this._resolvedItemIds(), this._skippedItemIds());
    if (status !== 'ready') {
      return;
    }

    this._skippedItemIds.update((prev) => new Set([...prev, itemId]));

    const event: TrayItemResolvedEvent = {
      batchId: item.batchId,
      bundleId: bundle.id,
      itemId: item.id,
      producerId: item.producerId,
      answer: null,
      skipped: true,
      item,
    };
    this._itemResolved$.next(event);

    this.advanceAfterItemChange(bundle);
  }

  /** Dev / QA: seed a bundle directly into presenting state. */
  presentBundleImmediately(batchId: string, items: EnqueueTrayItemInput[]): void {
    this.clearCollectTimer();
    const created: TrayResolveItem[] = items.map((input) => ({
      id: crypto.randomUUID(),
      dialogueUnitId: input.dialogueUnitId,
      producerId: input.producerId,
      batchId: input.batchId,
      questionKey: input.questionKey,
      questionParams: input.questionParams ?? {},
      answerKind: input.answerKind ?? 'single_choice',
      options: input.options,
      jobIds: [...input.jobIds],
      folderDisplayPath: input.folderDisplayPath,
      dependsOnItemId: input.dependsOnItemId,
      trayStepLabel: input.trayStepLabel,
      payloadRef: input.payloadRef,
    }));
    const firstId = created[0]?.id;
    if (firstId) {
      for (const item of created) {
        if (item.dependsOnItemId === '__MOCK_1A__') {
          item.dependsOnItemId = firstId;
        }
      }
    }
    const bundle: PresentationBundle = {
      id: crypto.randomUUID(),
      batchId,
      status: 'presenting',
      openedAt: Date.now(),
      items: created,
    };
    this._collectingBundle.set(null);
    this.startPresenting(bundle);
  }

  resetAll(): void {
    this.clearCollectTimer();
    this._inbox.set([]);
    this._collectingBundle.set(null);
    this._presentingBundle.set(null);
    this._pendingBundles.set([]);
    this._flushedBundles.set([]);
    this._resolvedItemIds.set(new Set());
    this._skippedItemIds.set(new Set());
    this._activeItemIndex.set(0);
    this.scanIdleBatches.clear();
  }

  /** One tray card per disambiguation group — ignore duplicate producer syncs. */
  private findExistingItemIdForGroup(batchId: string, groupId: string): string | undefined {
    const match = (items: readonly TrayResolveItem[]): string | undefined =>
      items.find(
        (entry) =>
          entry.batchId === batchId &&
          disambiguationGroupIdFromPayload(entry.payloadRef) === groupId,
      )?.id;

    const presenting = this._presentingBundle();
    if (presenting?.batchId === batchId) {
      const id = match(presenting.items);
      if (id) {
        return id;
      }
    }
    const collecting = this._collectingBundle();
    if (collecting?.batchId === batchId) {
      const id = match(collecting.items);
      if (id) {
        return id;
      }
    }
    for (const bundle of this._pendingBundles()) {
      if (bundle.batchId !== batchId) {
        continue;
      }
      const id = match(bundle.items);
      if (id) {
        return id;
      }
    }
    return match(this._inbox());
  }

  private ensureCollecting(batchId: string): void {
    const existing = this._collectingBundle();
    if (existing) {
      return;
    }
    const bundle: PresentationBundle = {
      id: crypto.randomUUID(),
      batchId,
      status: 'collecting',
      openedAt: Date.now(),
      items: [],
    };
    this._collectingBundle.set(bundle);
    this.collectStartedAt = Date.now();
    this.scheduleCollectTimer();
  }

  private appendToCollectingWithUnitCap(item: TrayResolveItem): void {
    const collecting = this._collectingBundle();
    if (collecting?.batchId === item.batchId) {
      const prospective = [...collecting.items, item];
      const isNewUnit = !collecting.items.some(
        (entry) => entry.dialogueUnitId === item.dialogueUnitId,
      );
      if (
        isNewUnit &&
        countDialogueUnits(prospective) > PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS
      ) {
        this.closeCollectingWindow();
        this.ensureCollecting(item.batchId);
      }
    }
    this.appendToCollecting(item);
  }

  private appendToCollecting(item: TrayResolveItem): void {
    const collecting = this._collectingBundle();
    if (!collecting) {
      return;
    }
    if (collecting.batchId !== item.batchId) {
      this._pendingBundles.update((prev) => [
        ...prev,
        { ...collecting, status: 'collecting', items: [...collecting.items] },
      ]);
      const next: PresentationBundle = {
        id: crypto.randomUUID(),
        batchId: item.batchId,
        status: 'collecting',
        openedAt: Date.now(),
        items: [item],
      };
      this._collectingBundle.set(next);
      this.collectStartedAt = Date.now();
      this.scheduleCollectTimer();
      return;
    }
    this._collectingBundle.update((prev) =>
      prev ? { ...prev, items: [...prev.items, item] } : prev,
    );
  }

  private flushInboxToNewCollectingBundle(batchId: string): void {
    const items = this._inbox().filter((item) => item.batchId === batchId);
    if (!items.length) {
      return;
    }
    this._inbox.update((prev) => prev.filter((item) => item.batchId !== batchId));
    const bundle: PresentationBundle = {
      id: crypto.randomUUID(),
      batchId,
      status: 'collecting',
      openedAt: Date.now(),
      items,
    };
    this._collectingBundle.set(bundle);
    this.collectStartedAt = Date.now();
  }

  private scheduleCollectTimer(): void {
    this.clearCollectTimer();
    const elapsed = Date.now() - this.collectStartedAt;
    const remaining = Math.max(0, PRESENTATION_BUNDLE_WINDOW_MS - elapsed);
    this.collectTimer = setTimeout(() => this.closeCollectingWindow(), remaining);
  }

  private clearCollectTimer(): void {
    if (this.collectTimer !== null) {
      clearTimeout(this.collectTimer);
      this.collectTimer = null;
    }
  }

  private closeCollectingWindow(): void {
    this.clearCollectTimer();
    const collecting = this._collectingBundle();
    if (!collecting) {
      return;
    }
    if (!collecting.items.length) {
      this._collectingBundle.set(null);
      this.promoteNextBundle();
      return;
    }
    const toPresent: PresentationBundle = {
      ...collecting,
      status: 'presenting',
      openedAt: Date.now(),
    };
    this._collectingBundle.set(null);
    if (this._presentingBundle()) {
      this._pendingBundles.update((prev) => [...prev, toPresent]);
      this.promoteNextBundle();
      return;
    }
    this.startPresenting(toPresent);
  }

  private startPresenting(bundle: PresentationBundle): void {
    this._presentingBundle.set(bundle);
    this._resolvedItemIds.set(new Set());
    this._skippedItemIds.set(new Set());
    this._itemAnswers.set(new Map());
    const resolved = this._resolvedItemIds();
    const skipped = this._skippedItemIds();
    this._activeItemIndex.set(firstActionableIndex(bundle.items, resolved, skipped));
  }

  private advanceAfterItemChange(bundle: PresentationBundle): void {
    const resolved = this._resolvedItemIds();
    const skipped = this._skippedItemIds();
    if (!bundleAllTerminal(bundle.items, resolved, skipped)) {
      const nextIndex = firstActionableIndex(bundle.items, resolved, skipped);
      this._activeItemIndex.set(nextIndex);
      return;
    }
    this.flushPresentingBundle(bundle);
  }

  private flushPresentingBundle(bundle: PresentationBundle): void {
    const resolved = this._resolvedItemIds();
    const skipped = this._skippedItemIds();
    const answers = this._itemAnswers();
    const results: TrayItemResolvedEvent[] = bundle.items.map((item) => ({
      batchId: item.batchId,
      bundleId: bundle.id,
      itemId: item.id,
      producerId: item.producerId,
      answer: answers.get(item.id) ?? null,
      skipped: skipped.has(item.id),
      item,
    }));

    const flushed: PresentationBundle = { ...bundle, status: 'flushed' };
    this._flushedBundles.update((prev) => [...prev, flushed]);
    this._presentingBundle.set(null);
    this._bundleCompleted$.next({
      batchId: bundle.batchId,
      bundleId: bundle.id,
      results,
    });
    this.promoteNextBundle();
  }

  private promoteNextBundle(): void {
    const pending = this._pendingBundles();
    if (!pending.length) {
      if (this._collectingBundle()) {
        return;
      }
      const inbox = this._inbox();
      if (inbox.length) {
        const batchId = inbox[0]!.batchId;
        this.flushInboxToNewCollectingBundle(batchId);
        if (!this.scanIdleBatches.has(batchId)) {
          this.scheduleCollectTimer();
        } else {
          this.closeCollectingWindow();
        }
      }
      return;
    }
    const [next, ...rest] = pending;
    this._pendingBundles.set(rest);
    const presenting: PresentationBundle = {
      ...next,
      status: 'presenting',
      openedAt: Date.now(),
    };
    this.startPresenting(presenting);
  }
}

function disambiguationGroupIdFromPayload(payloadRef: unknown): string | undefined {
  return (payloadRef as { disambiguationGroupId?: string } | undefined)?.disambiguationGroupId;
}
