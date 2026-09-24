import { Injectable, inject } from '@angular/core';
import {
  WorkspaceSelectionService,
  type SelectionToggleOptions,
} from '../workspace-selection/workspace-selection.service';
import type {
  GridPointerSelectionResult,
  MediaItemPointerModifiers,
} from './unified-selection.types';

/**
 * Application-wide media selection facade — delegates to WorkspaceSelectionService.
 * @see docs/specs/service/unified-selection/unified-selection.md
 * @see docs/specs/ui/shell/unified-selection.md
 */
@Injectable({ providedIn: 'root' })
export class UnifiedSelectionService {
  private readonly workspaceSelection = inject(WorkspaceSelectionService);

  readonly selectedMediaIds = this.workspaceSelection.selectedMediaIds;
  readonly rangeAnchorId = this.workspaceSelection.rangeAnchorId;
  readonly selectedCount = this.workspaceSelection.selectedCount;

  isSelected(id: string): boolean {
    return this.workspaceSelection.isSelected(id);
  }

  toggle(id: string, options: SelectionToggleOptions): void {
    this.workspaceSelection.toggle(id, options);
  }

  setRangeAnchor(id: string): void {
    this.workspaceSelection.setRangeAnchor(id);
  }

  clearRangeAnchor(): void {
    this.workspaceSelection.clearRangeAnchor();
  }

  selectRangeInOrder(
    orderedIds: readonly string[],
    targetId: string,
    options: { merge?: boolean } = {},
  ): void {
    this.workspaceSelection.selectRangeInOrder(orderedIds, targetId, options);
  }

  applyGridPointerSelection(
    orderedIds: readonly string[],
    targetId: string,
    modifiers: MediaItemPointerModifiers,
  ): GridPointerSelectionResult {
    return this.workspaceSelection.applyGridPointerSelection(orderedIds, targetId, modifiers);
  }

  setSingle(id: string): void {
    this.workspaceSelection.setSingle(id);
  }

  selectAllInScope(scopeIds: string[]): void {
    this.workspaceSelection.selectAllInScope(scopeIds);
  }

  clearSelection(): void {
    this.workspaceSelection.clearSelection();
  }
}
