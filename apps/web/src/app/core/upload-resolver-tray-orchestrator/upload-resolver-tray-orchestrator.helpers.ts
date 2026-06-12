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

export function countDialogueUnits(items: readonly TrayResolveItem[]): number {
  return new Set(items.map((item) => item.dialogueUnitId)).size;
}

export function unitIndexForItem(
  items: readonly TrayResolveItem[],
  itemId: string,
): number {
  const item = items.find((entry) => entry.id === itemId);
  if (!item) {
    return 0;
  }
  const order: string[] = [];
  for (const entry of items) {
    if (!order.includes(entry.dialogueUnitId)) {
      order.push(entry.dialogueUnitId);
    }
  }
  const index = order.indexOf(item.dialogueUnitId);
  return index >= 0 ? index : 0;
}

/**
 * Carousel label within a presentation bundle by dialogue unit (e.g. 1A/3).
 */
export function formatBundleCarouselIndicator(
  unitIndex: number,
  unitTotal: number,
  trayStepLabel?: '1a' | '1b',
): string | null {
  if (unitTotal < 2) {
    return null;
  }
  const index = Math.min(Math.max(unitIndex, 0), unitTotal - 1);
  if (trayStepLabel === '1a') {
    return `1A/${unitTotal}`;
  }
  if (trayStepLabel === '1b') {
    return `1B/${unitTotal}`;
  }
  return `${index + 1}/${unitTotal}`;
}
