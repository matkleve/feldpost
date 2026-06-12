import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { describe, expect, it } from 'vitest';
import { WorkspaceViewService } from '../../../core/workspace-view/workspace-view.service';
import { UploadPanelSignalsService } from './upload-panel-signals.service';
import { UploadPanelStateService } from './upload-panel-state.service';
import { UploadManagerService } from '../../../core/upload/upload-manager.service';

describe('UploadPanelSignalsService', () => {
  it('defaults Auto location to required', () => {
    TestBed.configureTestingModule({
      providers: [
        UploadPanelSignalsService,
        UploadPanelStateService,
        {
          provide: UploadManagerService,
          useValue: {
            jobs: signal([]),
            batches: signal([]),
            activeBatch: signal(null),
            isFolderImportSupported: true,
            isBusy: signal(false),
          },
        },
        {
          provide: WorkspaceViewService,
          useValue: { selectedProjectIds: signal(new Set<string>()) },
        },
      ],
    });

    const signals = TestBed.inject(UploadPanelSignalsService);
    expect(signals.locationRequirementMode()).toBe('required');
  });
});
