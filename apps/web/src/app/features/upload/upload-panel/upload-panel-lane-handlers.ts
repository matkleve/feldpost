/**
 * UploadPanelLaneHandlersService — lane navigation & selection.
 */

import { Injectable, inject } from '@angular/core';
import type { ToggleValue } from '@spartan-ng/brain/toggle-group';
import { toggleSingleStringValue } from '../../../shared/ui/toggle-group/toggle-group-option.helpers';
import { isUploadLane } from './upload-panel-helpers';
import type { UploadLane } from '../upload-phase.helpers';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

@Injectable({ providedIn: 'root' })
export class UploadPanelLaneHandlersService {
  private readonly signals = inject(UploadPanelSignalsService);

  private clearSelection?: () => void;

  register(options: { clearSelection: () => void }): void {
    this.clearSelection = options.clearSelection;
  }

  setSelectedLane(lane: UploadLane): void {
    const previous = this.signals.selectedLane();
    if (previous !== lane) {
      this.clearSelection?.();
    }
    this.signals.setSelectedLane(lane);
  }

  onLaneSwitchValueChange(raw: ToggleValue<string>): void {
    const value = toggleSingleStringValue(raw);
    if (!value || !isUploadLane(value)) {
      return;
    }
    this.setSelectedLane(value);
  }
}
