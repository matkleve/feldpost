import { TestBed } from '@angular/core/testing';
import { WorkspaceSelectionService } from './workspace-selection/workspace-selection.service';

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
  });
});
