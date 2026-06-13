import { TestBed } from '@angular/core/testing';
import { WorkspaceSelectionService } from './workspace-selection.service';

describe('WorkspaceSelectionService', () => {
  function setup(): WorkspaceSelectionService {
    TestBed.configureTestingModule({
      providers: [WorkspaceSelectionService],
    });
    return TestBed.inject(WorkspaceSelectionService);
  }

  it('toggles additive selection with ctrl/meta semantics', () => {
    const service = setup();

    service.toggle('img-1', { additive: true });
    service.toggle('img-2', { additive: true });

    expect(Array.from(service.selectedMediaIds())).toEqual(['img-1', 'img-2']);

    service.toggle('img-1', { additive: true });
    expect(Array.from(service.selectedMediaIds())).toEqual(['img-2']);
  });

  it('replaces selection when additive is false', () => {
    const service = setup();

    service.toggle('img-1', { additive: true });
    service.toggle('img-2', { additive: false });

    expect(Array.from(service.selectedMediaIds())).toEqual(['img-2']);
  });

  it('selects all ids in scope and clears selection', () => {
    const service = setup();

    service.selectAllInScope(['img-1', 'img-2', 'img-3']);
    expect(service.selectedCount()).toBe(3);

    service.clearSelection();
    expect(service.selectedCount()).toBe(0);
    expect(service.rangeAnchorId()).toBeNull();
  });

  it('selects an inclusive shift-range in visible order', () => {
    const service = setup();
    const ordered = ['a', 'b', 'c', 'd', 'e'];

    service.setRangeAnchor('b');
    service.selectRangeInOrder(ordered, 'd');

    expect(Array.from(service.selectedMediaIds())).toEqual(['b', 'c', 'd']);
    expect(service.rangeAnchorId()).toBe('d');
  });

  it('applies ctrl/meta as additive toggle without opening', () => {
    const service = setup();
    const ordered = ['a', 'b', 'c'];

    const result = service.applyGridPointerSelection(ordered, 'b', {
      shiftKey: false,
      ctrlKey: true,
      metaKey: false,
    });

    expect(result).toBe('selection-changed');
    expect(service.isSelected('b')).toBe(true);
    expect(service.rangeAnchorId()).toBe('b');
  });

  it('applies shift as range replace and blocks open', () => {
    const service = setup();
    const ordered = ['a', 'b', 'c', 'd'];

    service.setRangeAnchor('a');
    service.toggle('c', { additive: true });

    const result = service.applyGridPointerSelection(ordered, 'd', {
      shiftKey: true,
      ctrlKey: false,
      metaKey: false,
    });

    expect(result).toBe('selection-changed');
    expect(Array.from(service.selectedMediaIds())).toEqual(['a', 'b', 'c', 'd']);
  });

  it('merges shift-range when ctrl/meta is also held', () => {
    const service = setup();
    const ordered = ['a', 'b', 'c', 'd', 'e'];

    service.selectAllInScope(['a']);
    service.setRangeAnchor('a');

    service.applyGridPointerSelection(ordered, 'c', {
      shiftKey: true,
      ctrlKey: true,
      metaKey: false,
    });

    expect(service.isSelected('a')).toBe(true);
    expect(service.isSelected('b')).toBe(true);
    expect(service.isSelected('c')).toBe(true);
    expect(service.isSelected('d')).toBe(false);
  });

  it('returns open-item for plain click and selects sole item with range anchor', () => {
    const service = setup();
    const ordered = ['a', 'b'];

    const result = service.applyGridPointerSelection(ordered, 'b', {
      shiftKey: false,
      ctrlKey: false,
      metaKey: false,
    });

    expect(result).toBe('open-item');
    expect(service.rangeAnchorId()).toBe('b');
    expect(service.selectedCount()).toBe(1);
    expect(service.isSelected('b')).toBe(true);
  });
});
