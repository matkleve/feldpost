import { Injectable, computed, signal } from '@angular/core';
import {
  isAdditivePointerSelection,
  resolveRangeAnchorId,
  sliceIdRangeInOrder,
} from './workspace-selection.helpers';
import type {
  GridPointerSelectionResult,
  MediaItemPointerModifiers,
} from './workspace-selection.types';

export interface SelectionToggleOptions {
  additive: boolean;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceSelectionService {
  private readonly _selectedMediaIds = signal<Set<string>>(new Set());
  private readonly _rangeAnchorId = signal<string | null>(null);

  readonly selectedMediaIds = this._selectedMediaIds.asReadonly();
  readonly rangeAnchorId = this._rangeAnchorId.asReadonly();

  readonly selectedCount = computed(() => this._selectedMediaIds().size);

  isSelected(id: string): boolean {
    return this._selectedMediaIds().has(id);
  }

  toggle(id: string, options: SelectionToggleOptions): void {
    this._selectedMediaIds.update((existing) => {
      const next = new Set(existing);
      if (options.additive) {
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      }

      if (next.size === 1 && next.has(id)) {
        return new Set();
      }

      return new Set([id]);
    });
  }

  setRangeAnchor(id: string): void {
    this._rangeAnchorId.set(id);
  }

  clearRangeAnchor(): void {
    this._rangeAnchorId.set(null);
  }

  /**
   * Shift+click range in visible grid order. Replaces selection unless ctrl/meta is also held.
   */
  selectRangeInOrder(
    orderedIds: readonly string[],
    targetId: string,
    options: { merge?: boolean } = {},
  ): void {
    const anchor = resolveRangeAnchorId(
      this._rangeAnchorId(),
      this._selectedMediaIds(),
      targetId,
    );
    const rangeIds = sliceIdRangeInOrder(orderedIds, anchor, targetId);

    if (options.merge) {
      this._selectedMediaIds.update((existing) => {
        const next = new Set(existing);
        for (const id of rangeIds) {
          next.add(id);
        }
        return next;
      });
    } else {
      this.selectAllInScope([...rangeIds]);
    }

    this.setRangeAnchor(targetId);
  }

  /**
   * Standard grid tile click: shift range, ctrl/meta toggle, plain click opens item.
   */
  applyGridPointerSelection(
    orderedIds: readonly string[],
    targetId: string,
    modifiers: MediaItemPointerModifiers,
  ): GridPointerSelectionResult {
    if (modifiers.shiftKey) {
      this.selectRangeInOrder(orderedIds, targetId, {
        merge: isAdditivePointerSelection(modifiers),
      });
      return 'selection-changed';
    }

    if (isAdditivePointerSelection(modifiers)) {
      this.toggle(targetId, { additive: true });
      this.setRangeAnchor(targetId);
      return 'selection-changed';
    }

    this.setSingle(targetId);
    return 'open-item';
  }

  setSingle(id: string): void {
    this._selectedMediaIds.set(new Set([id]));
    this.setRangeAnchor(id);
  }

  selectAllInScope(scopeIds: string[]): void {
    this._selectedMediaIds.set(new Set(scopeIds));
  }

  clearSelection(): void {
    this._selectedMediaIds.set(new Set());
    this.clearRangeAnchor();
  }
}
