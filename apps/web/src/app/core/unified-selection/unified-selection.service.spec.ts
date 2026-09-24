import { TestBed } from '@angular/core/testing';
import { UnifiedSelectionService } from './unified-selection.service';
import { WorkspaceSelectionService } from '../workspace-selection/workspace-selection.service';

describe('UnifiedSelectionService', () => {
  function setup(): { unified: UnifiedSelectionService; workspace: WorkspaceSelectionService } {
    TestBed.configureTestingModule({
      providers: [UnifiedSelectionService, WorkspaceSelectionService],
    });
    return {
      unified: TestBed.inject(UnifiedSelectionService),
      workspace: TestBed.inject(WorkspaceSelectionService),
    };
  }

  it('mirrors selection toggles through the shared store (map ↔ panel contract)', () => {
    const { unified, workspace } = setup();

    unified.toggle('panel-only-id', { additive: true });

    expect(workspace.isSelected('panel-only-id')).toBe(true);
    expect(Array.from(unified.selectedMediaIds())).toEqual(['panel-only-id']);
  });

  it('reflects map-side clears in the panel-facing facade', () => {
    const { unified, workspace } = setup();

    workspace.selectAllInScope(['a', 'b', 'c']);
    workspace.clearSelection();

    expect(unified.selectedCount()).toBe(0);
    expect(unified.isSelected('a')).toBe(false);
  });

  it('forbids divergent selection namespaces — facade and workspace always match', () => {
    const { unified, workspace } = setup();

    unified.toggle('img-1', { additive: true });
    workspace.toggle('img-2', { additive: true });

    expect(Array.from(unified.selectedMediaIds()).sort()).toEqual(['img-1', 'img-2']);
    expect(Array.from(workspace.selectedMediaIds()).sort()).toEqual(['img-1', 'img-2']);
  });

  it('delegates grid pointer selection to the same store', () => {
    const { unified, workspace } = setup();
    const ordered = ['a', 'b', 'c'];

    const result = unified.applyGridPointerSelection(ordered, 'b', {
      shiftKey: false,
      ctrlKey: true,
      metaKey: false,
    });

    expect(result).toBe('selection-changed');
    expect(workspace.isSelected('b')).toBe(true);
    expect(unified.rangeAnchorId()).toBe('b');
  });
});
