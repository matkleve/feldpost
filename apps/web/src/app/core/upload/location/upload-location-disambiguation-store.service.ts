/**
 * Disambiguation group state container (signals, selection, batch aggregates).
 * @see docs/specs/service/media-upload-service/upload-location-resolution.md
 */

import { Injectable, computed, inject, signal } from '@angular/core';
import { UploadBatchService } from '../support/upload-batch.service';
import { isGroupBlocked, pickCollapseStage } from './upload-location-resolution.helpers';
import type { UploadAddressCandidate, UploadDisambiguationGroup } from '../upload-manager.types';

@Injectable({ providedIn: 'root' })
export class UploadLocationDisambiguationStoreService {
  private readonly batchService = inject(UploadBatchService);

  private readonly _groups = signal<UploadDisambiguationGroup[]>([]);
  private readonly _selectedGroupId = signal<string | null>(null);

  readonly disambiguationGroups = this._groups.asReadonly();
  readonly selectedGroupId = this._selectedGroupId.asReadonly();

  readonly groupsById = computed(() => {
    const map = new Map<string, UploadDisambiguationGroup>();
    for (const group of this._groups()) {
      map.set(group.id, group);
    }
    return map;
  });

  readonly pendingGroupCount = computed(
    () => this._groups().filter((g) => isGroupBlocked(g)).length,
  );

  readonly activeGroup = computed(() => {
    const selectedId = this._selectedGroupId();
    const groups = this._groups().filter((g) => isGroupBlocked(g));
    if (!groups.length) {
      return null;
    }
    if (selectedId) {
      return groups.find((g) => g.id === selectedId) ?? groups[0];
    }
    return groups[0];
  });

  /** Current group list snapshot (facade orchestration). */
  groups(): UploadDisambiguationGroup[] {
    return this._groups();
  }

  setSelectedGroupId(groupId: string | null): void {
    this._selectedGroupId.set(groupId);
    const group = groupId ? this._groups().find((g) => g.id === groupId) : undefined;
    if (group) {
      this.syncBatchDisambiguationAggregates(group.batchId);
    }
  }

  /** Selection only; caller syncs batch aggregates when needed. */
  selectGroupId(groupId: string | null): void {
    this._selectedGroupId.set(groupId);
  }

  removeGroupsForBatch(batchId: string): void {
    this._groups.update((prev) => prev.filter((g) => g.batchId !== batchId));
  }

  removeGroupById(groupId: string): void {
    this._groups.update((prev) => prev.filter((g) => g.id !== groupId));
  }

  createGroup(input: {
    batchId: string;
    queryKey: string;
    folderDisplayPath: string;
    titleAddress: string;
    localityHint?: string;
    candidates: UploadAddressCandidate[];
    jobIds: string[];
    disambiguationKind?: UploadDisambiguationGroup['disambiguationKind'];
    trayStep?: UploadDisambiguationGroup['trayStep'];
    confirmedCity?: string | null;
    step1bGate?: UploadDisambiguationGroup['step1bGate'];
    projectCentroid?: UploadDisambiguationGroup['projectCentroid'];
    citySuggestions?: string[];
    houseNumberCandidates?: UploadAddressCandidate[];
  }): UploadDisambiguationGroup {
    const id = crypto.randomUUID();
    return {
      id,
      batchId: input.batchId,
      queryKey: input.queryKey,
      folderDisplayPath: input.folderDisplayPath,
      titleAddress: input.titleAddress,
      jobIds: input.jobIds,
      candidates: input.candidates,
      collapseStage: pickCollapseStage(input.candidates, input.jobIds.length || 1),
      resolutionStatus: 'pending',
      resolutionGateOpen: true,
      localityHint: input.localityHint,
      disambiguationKind: input.disambiguationKind ?? 'geocode',
      trayStep: input.trayStep,
      confirmedCity: input.confirmedCity,
      step1bGate: input.step1bGate,
      projectCentroid: input.projectCentroid,
      citySuggestions: input.citySuggestions,
      houseNumberCandidates: input.houseNumberCandidates,
    };
  }

  patchGroup(group: UploadDisambiguationGroup): void {
    this._groups.update((prev) => {
      const index = prev.findIndex((g) => g.id === group.id);
      if (index < 0) {
        return [...prev, group];
      }
      const next = [...prev];
      next[index] = group;
      return next;
    });
  }

  syncBatchDisambiguationAggregates(batchId: string): void {
    const pending = this._groups().filter(
      (g) => g.batchId === batchId && isGroupBlocked(g),
    ).length;
    const activeId = this._selectedGroupId();
    this.batchService.updateBatch(batchId, {
      pendingDisambiguationCount: pending,
      activeDisambiguationGroupId: pending > 0 ? activeId : null,
    });
  }

  pickNextActiveGroup(batchId: string): void {
    const next = this._groups().find((g) => g.batchId === batchId && isGroupBlocked(g));
    this._selectedGroupId.set(next?.id ?? null);
    this.syncBatchDisambiguationAggregates(batchId);
  }
}
