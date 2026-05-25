/**
 * Passive + active address disambiguation tray (shell sibling, OD-6).
 * @see docs/specs/component/upload/upload-resolver-tray.md
 */

import { Component, computed, inject, input, output } from '@angular/core';
import { I18nService } from '../../core/i18n/i18n.service';
import { UploadLocationResolutionService } from '../../core/upload/upload-location-resolution.service';
import { UploadManagerService } from '../../core/upload/upload-manager.service';
import type { UploadAddressCandidate } from '../../core/upload/upload-manager.types';
import { UploadPanelSignalsService } from './upload-panel-signals.service';

export type UploadResolverTrayMode = 'passive' | 'active' | 'hidden';

@Component({
  selector: 'app-upload-resolver-tray',
  standalone: true,
  templateUrl: './upload-resolver-tray.component.html',
  styleUrl: './upload-resolver-tray.component.scss',
})
export class UploadResolverTrayComponent {
  private readonly i18n = inject(I18nService);
  private readonly resolution = inject(UploadLocationResolutionService);
  private readonly uploadManager = inject(UploadManagerService);
  private readonly panelSignals = inject(UploadPanelSignalsService);

  readonly panelOpen = input(false);
  readonly embeddedInPane = input(false);

  readonly candidateSelected = output<{ groupId: string; candidateId: string }>();
  readonly groupChanged = output<string>();
  readonly deferRequested = output<string>();
  readonly previewLocation = output<{ lat: number; lng: number }>();

  readonly t = this.i18n.t.bind(this.i18n);

  readonly activeGroup = this.resolution.activeGroup;
  readonly pendingGroupCount = this.resolution.pendingGroupCount;
  readonly disambiguationGroups = this.resolution.disambiguationGroups;
  readonly passiveStatusLine = this.panelSignals.passiveStatusLine;

  readonly trayMode = computed<UploadResolverTrayMode>(() => {
    if (this.embeddedInPane()) {
      return 'hidden';
    }
    if (this.pendingGroupCount() > 0) {
      return 'active';
    }
    const passive = this.passiveStatusLine();
    if (passive && !this.panelOpen()) {
      return 'passive';
    }
    return 'hidden';
  });

  readonly groupedCandidates = computed(() => {
    const group = this.activeGroup();
    if (!group) {
      return [];
    }
    if (group.collapseStage === 'city') {
      const byCity = new Map<string, UploadAddressCandidate[]>();
      for (const candidate of group.candidates) {
        const key = (candidate.city ?? candidate.addressLabel).trim();
        const list = byCity.get(key) ?? [];
        list.push(candidate);
        byCity.set(key, list);
      }
      return Array.from(byCity.entries()).map(([label, candidates]) => ({
        label,
        candidates: candidates.slice(0, 1),
      }));
    }
    return group.candidates.map((candidate) => ({
      label: candidate.addressLabel,
      candidates: [candidate],
    }));
  });

  onSelectCandidate(candidateId: string): void {
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    const candidate = group.candidates.find((c) => c.id === candidateId);
    const jobId = group.jobIds[0];
    if (!candidate || !jobId) {
      return;
    }
    this.candidateSelected.emit({ groupId: group.id, candidateId });
    this.uploadManager.selectAddressCandidate(jobId, candidate);
  }

  onGroupSelect(groupId: string): void {
    this.resolution.setSelectedGroupId(groupId);
    this.groupChanged.emit(groupId);
  }

  onDefer(): void {
    const group = this.activeGroup();
    if (!group) {
      return;
    }
    this.deferRequested.emit(group.id);
    this.resolution.deferGroup(group.id);
  }

  onPreviewCandidate(candidate: UploadAddressCandidate): void {
    this.previewLocation.emit({ lat: candidate.lat, lng: candidate.lng });
  }
}
