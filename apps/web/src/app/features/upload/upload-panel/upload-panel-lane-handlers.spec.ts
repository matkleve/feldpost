import { TestBed } from '@angular/core/testing';
import { UploadPanelLaneHandlersService } from './upload-panel-lane-handlers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

describe('UploadPanelLaneHandlersService', () => {
  let handlers: UploadPanelLaneHandlersService;
  let signals: UploadPanelSignalsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
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
