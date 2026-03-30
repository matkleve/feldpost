/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, inject } from '@angular/core';
import { isUploadLane } from './upload-panel-helpers';
import type { UploadLane } from './upload-phase.helpers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  private readonly signals = inject(UploadPanelSignalsService);

  setSelectedLane(lane: UploadLane): void {
    this.signals.selectedLane.set(lane);
  }

  onLaneSwitchValueChange(value: string | null): void {
    if (!value || !isUploadLane(value)) {
      return;
    }
    this.setSelectedLane(value);
  }
}
