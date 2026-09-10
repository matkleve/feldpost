import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n/i18n.service';
import { UploadLocationResolutionService } from '../../../core/upload/location/upload-location-resolution.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelStateService } from './upload-panel-state.service';

describe('UploadPanelLaneHandlersService', () => {
  let handlers: UploadPanelLaneHandlersService;
  let signals: UploadPanelSignalsService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        UploadPanelLaneHandlersService,
        UploadPanelSignalsService,
        {
          provide: UploadManagerService,
          useValue: {
            jobs: signal([]),
            batches: signal([]),
            activeBatch: signal(null),
            isFolderImportSupported: signal(true),
            isBusy: signal(false),
          },
        },
        {
          provide: UploadPanelStateService,
          useValue: {
            laneCounts: signal({ uploading: 0, uploaded: 0, issues: 0 }),
            scanning: signal(false),
            scanningLabel: signal(null),
            hasAwaitingPlacement: signal(false),
            showProgressBoard: signal(false),
            laneBuckets: signal({ uploading: [], uploaded: [], issues: [] }),
          },
        },
        {
          provide: WorkspaceViewService,
          useValue: { selectedProjectIds: signal(new Set<string>()) },
        },
        {
          provide: UploadLocationResolutionService,
          useValue: { pendingGroupCount: signal(0) },
        },
        {
          provide: I18nService,
          useValue: { t: (_key: string, fallback: string) => fallback },
        },
      ],
    });
    handlers = TestBed.inject(UploadPanelLaneHandlersService);
    signals = TestBed.inject(UploadPanelSignalsService);
  });

  it('clears embedded selection when the selected lane changes', () => {
    const clearSelection = vi.fn();
    handlers.register({ clearSelection });

    signals.setSelectedLane('uploaded');
    handlers.setSelectedLane('issues');

    expect(clearSelection).toHaveBeenCalledTimes(1);
    expect(signals.selectedLane()).toBe('issues');
  });

  it('does not clear selection when setSelectedLane receives the same lane', () => {
    const clearSelection = vi.fn();
    handlers.register({ clearSelection });

    signals.setSelectedLane('uploaded');
    handlers.setSelectedLane('uploaded');

    expect(clearSelection).not.toHaveBeenCalled();
  });
});
