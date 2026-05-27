/**
 * Pure helpers for tray orchestrator FSM and carousel labels.
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

import type { TrayItemStatus, TrayResolveItem } from './upload-resolver-tray-orchestrator.types';

export function itemStatus(
  item: TrayResolveItem,
  resolvedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): TrayItemStatus {
  if (resolvedIds.has(item.id)) {
    return 'resolved';
  }
  if (skippedIds.has(item.id)) {
    return 'skipped';
  }
  if (item.dependsOnItemId && !resolvedIds.has(item.dependsOnItemId)) {
    return 'blocked';
  }
  return 'ready';
}

export function isItemTerminal(
  item: TrayResolveItem,
  resolvedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): boolean {
  const status = itemStatus(item, resolvedIds, skippedIds);
  return status === 'resolved' || status === 'skipped';
}

export function bundleAllTerminal(
  items: readonly TrayResolveItem[],
  resolvedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): boolean {
  if (!items.length) {
    return true;
  }
  return items.every((item) => isItemTerminal(item, resolvedIds, skippedIds));
}

export function firstActionableIndex(
  items: readonly TrayResolveItem[],
  resolvedIds: ReadonlySet<string>,
  skippedIds: ReadonlySet<string>,
): number {
  const readyIndex = items.findIndex(
    (item) => itemStatus(item, resolvedIds, skippedIds) === 'ready',
  );
  return readyIndex >= 0 ? readyIndex : 0;
}

/**
 * Carousel label within a presentation bundle (e.g. 1A/3, 2/3).
 */
export function formatBundleCarouselIndicator(
  pageIndex: number,
  total: number,
  trayStepLabel?: '1a' | '1b',
): string | null {
  if (total < 2) {
    return null;
  }
  const index = Math.min(Math.max(pageIndex, 0), total - 1);
  if (trayStepLabel === '1a') {
    return `1A/${total}`;
  }
  if (trayStepLabel === '1b') {
    return `1B/${total}`;
  }
  return `${index + 1}/${total}`;
}
