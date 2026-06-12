import { TestBed } from '@angular/core/testing';
import { WorkspaceSelectedItemsSyncService } from './workspace-selected-items-sync.service';
import { WorkspaceSelectionService } from './workspace-selection.service';
import { WorkspaceViewService } from '../workspace-view/workspace-view.service';
import type { WorkspaceImage } from '../workspace-view/workspace-view.types';

function sampleImage(id: string): WorkspaceImage {
  return {
    id,
    storagePath: `${id}.jpg`,
    thumbnailPath: null,
    latitude: 48.2,
    longitude: 16.37,
  } as WorkspaceImage;
}

describe('WorkspaceSelectedItemsSyncService', () => {
  let selectionService: WorkspaceSelectionService;
  let workspaceViewService: WorkspaceViewService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WorkspaceSelectionService,
        {
          provide: WorkspaceViewService,
          useValue: {
            rawImages: vi.fn(() => []),
            clearActiveSelection: vi.fn(),
            setActiveSelectionImages: vi.fn(),
            loadImagesByIdsOrdered: vi.fn().mockResolvedValue([]),
          },
        },
        WorkspaceSelectedItemsSyncService,
      ],
    });

    selectionService = TestBed.inject(WorkspaceSelectionService);
    workspaceViewService = TestBed.inject(WorkspaceViewService);
  });

  it('clears workspace scope when selection becomes empty', async () => {
    TestBed.inject(WorkspaceSelectedItemsSyncService);
    selectionService.setSingle('a');
    TestBed.flushEffects();
    await Promise.resolve();
    await Promise.resolve();
    selectionService.clearSelection();
    TestBed.flushEffects();
    await Promise.resolve();
    await Promise.resolve();

    expect(workspaceViewService.clearActiveSelection).toHaveBeenCalled();
  });

  it('loads missing ids and sets ordered workspace images', async () => {
    vi.mocked(workspaceViewService.loadImagesByIdsOrdered).mockResolvedValue([
      sampleImage('b'),
      sampleImage('a'),
    ]);

    TestBed.inject(WorkspaceSelectedItemsSyncService);
    selectionService.selectAllInScope(['a', 'b']);
    TestBed.flushEffects();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(workspaceViewService.loadImagesByIdsOrdered).toHaveBeenCalledWith(['a', 'b']);
    expect(workspaceViewService.setActiveSelectionImages).toHaveBeenCalledWith([
      sampleImage('a'),
      sampleImage('b'),
    ]);
  });
});
