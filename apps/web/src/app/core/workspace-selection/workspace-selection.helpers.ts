import type { MediaItemPointerModifiers } from './workspace-selection.types';

/** True when the click should toggle membership without replacing the whole set. */
export function isAdditivePointerSelection(modifiers: MediaItemPointerModifiers): boolean {
  return modifiers.ctrlKey || modifiers.metaKey;
}

/** Anchor for shift-range: explicit anchor, else sole selection, else the clicked id. */
export function resolveRangeAnchorId(
  anchorId: string | null,
  selectedIds: ReadonlySet<string>,
  targetId: string,
): string {
  if (anchorId) {
    return anchorId;
  }
  if (selectedIds.size === 1) {
    const [only] = selectedIds;
    if (only) {
      return only;
    }
  }
  return targetId;
}

/** Inclusive id range between two positions in the visible grid order. */
export function sliceIdRangeInOrder(
  orderedIds: readonly string[],
  fromId: string,
  toId: string,
): readonly string[] {
  const fromIndex = orderedIds.indexOf(fromId);
  const toIndex = orderedIds.indexOf(toId);
  if (fromIndex < 0 || toIndex < 0) {
    return [toId];
  }
  const lo = Math.min(fromIndex, toIndex);
  const hi = Math.max(fromIndex, toIndex);
  return orderedIds.slice(lo, hi + 1);
}
