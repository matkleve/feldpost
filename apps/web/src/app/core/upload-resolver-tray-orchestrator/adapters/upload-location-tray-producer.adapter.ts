/**
 * Maps UploadLocationResolutionService disambiguation groups to tray orchestrator items.
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { UploadLocationResolutionService } from '../../upload/upload-location-resolution.service';
import { UploadManagerService } from '../../upload/upload-manager.service';
import type {
  UploadAddressCandidate,
  UploadDisambiguationGroup,
} from '../../upload/upload-manager.types';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator.service';
import type { EnqueueTrayItemInput, TrayResolveOption } from '../upload-resolver-tray-orchestrator.types';

const PRODUCER_ID = 'upload-location-resolution';

interface GroupPayloadRef {
  disambiguationGroupId: string;
}

@Injectable({ providedIn: 'root' })
export class UploadLocationTrayProducerAdapter {
  private readonly orchestrator = inject(UploadResolverTrayOrchestratorService);
  private readonly resolution = inject(UploadLocationResolutionService);
  private readonly injector = inject(Injector);

  /** Maps disambiguation group id → orchestrator item id (per tray step). */
  private readonly groupStepToItemId = new Map<string, string>();

  constructor() {
    this.orchestrator.itemResolved$.subscribe((event) => {
      if (event.producerId !== PRODUCER_ID) {
        return;
      }
      const groupId = (event.item.payloadRef as GroupPayloadRef | undefined)
        ?.disambiguationGroupId;
      if (!groupId) {
        return;
      }
      if (event.skipped) {
        this.resolution.deferGroup(groupId);
        this.clearGroupMappings(groupId);
        return;
      }

      const group = this.resolution.disambiguationGroups().find((entry) => entry.id === groupId);
      if (!group) {
        return;
      }

      if (event.item.trayStepLabel === '1b' || group.trayStep === '1b') {
        if (event.answer?.optionId) {
          this.resolution.applyTrayHouseSelection(groupId, event.answer.optionId);
        }
        this.clearGroupMappings(groupId);
        return;
      }

      if (
        event.item.trayStepLabel === '1a' ||
        group.trayStep === '1a' ||
        group.disambiguationKind === 'city_step'
      ) {
        const city =
          event.answer?.text?.trim() ??
          group.candidates.find((c) => c.id === event.answer?.optionId)?.city ??
          group.candidates.find((c) => c.id === event.answer?.optionId)?.addressLabel;
        if (!city) {
          return;
        }
        const parentItemId = event.itemId;
        void this.resolution.confirmTrayCity(groupId, city).then(() => {
          const updated = this.resolution.disambiguationGroups().find((g) => g.id === groupId);
          if (updated?.trayStep === '1b') {
            this.enqueueHouseStepItem(updated, parentItemId);
          }
        });
        return;
      }

      const jobId = event.item.jobIds[0];
      const candidate = group.candidates.find((c) => c.id === event.answer?.optionId);
      if (jobId && candidate) {
        this.injector.get(UploadManagerService).selectAddressCandidate(jobId, candidate);
        this.clearGroupMappings(groupId);
      }
    });
  }

  syncGroupToOrchestrator(group: UploadDisambiguationGroup): string {
    const stepKey = itemKeyForGroup(group);
    const existing = this.groupStepToItemId.get(stepKey);
    if (existing) {
      return existing;
    }
    const input = groupToEnqueueInput(group);
    const itemId = this.orchestrator.enqueueItem(input);
    this.groupStepToItemId.set(stepKey, itemId);
    return itemId;
  }

  enqueueHouseStepItem(group: UploadDisambiguationGroup, dependsOnItemId: string): string {
    const stepKey = itemKeyForGroup(group);
    if (this.groupStepToItemId.has(stepKey)) {
      return this.groupStepToItemId.get(stepKey)!;
    }
    const input = groupToEnqueueInput(group, dependsOnItemId);
    const itemId = this.orchestrator.enqueueItem(input);
    this.groupStepToItemId.set(stepKey, itemId);
    return itemId;
  }

  removeGroupMapping(groupId: string): void {
    this.clearGroupMappings(groupId);
  }

  notifyScanIdle(batchId: string): void {
    this.orchestrator.notifyScanIdle(batchId);
  }

  private clearGroupMappings(groupId: string): void {
    for (const key of [...this.groupStepToItemId.keys()]) {
      if (key.startsWith(`${groupId}:`)) {
        this.groupStepToItemId.delete(key);
      }
    }
  }
}

function itemKeyForGroup(group: UploadDisambiguationGroup): string {
  return `${group.id}:${group.trayStep ?? 'default'}`;
}

function questionKeyForGroup(group: UploadDisambiguationGroup): string {
  if (group.disambiguationKind === 'source') {
    return 'upload.resolver.question.source';
  }
  if (group.disambiguationKind === 'city_step' || group.trayStep === '1a') {
    return 'upload.resolver.question.cityStep';
  }
  if (group.disambiguationKind === 'house_step' || group.trayStep === '1b') {
    return 'upload.resolver.question.houseStep';
  }
  if (group.disambiguationKind === 'project_address_a') {
    return 'upload.resolver.question.projectAddressA';
  }
  if (group.disambiguationKind === 'project_address_b') {
    return 'upload.resolver.question.projectAddressB';
  }
  if (group.collapseStage === 'city') {
    return 'upload.resolver.question.city';
  }
  if (group.collapseStage === 'per_file') {
    return 'upload.resolver.question.door';
  }
  return 'upload.resolver.question.address';
}

function groupToEnqueueInput(
  group: UploadDisambiguationGroup,
  dependsOnItemId?: string,
): EnqueueTrayItemInput {
  const questionKey = questionKeyForGroup(group);
  const street = group.titleAddress.split(',')[0]?.trim() ?? group.titleAddress;
  const questionParams: Record<string, string> = {
    street,
    address: group.titleAddress,
  };

  let trayStepLabel: '1a' | '1b' | undefined;
  if (group.trayStep === '1a') {
    trayStepLabel = '1a';
  } else if (group.trayStep === '1b') {
    trayStepLabel = '1b';
  }

  const options = resolveOptions(group);
  const answerKind =
    group.disambiguationKind === 'city_step' && !options.length ? 'text' : 'single_choice';

  return {
    producerId: PRODUCER_ID,
    batchId: group.batchId,
    questionKey,
    questionParams,
    answerKind,
    options,
    jobIds: [...group.jobIds],
    folderDisplayPath: group.folderDisplayPath,
    dependsOnItemId,
    trayStepLabel,
    payloadRef: { disambiguationGroupId: group.id } satisfies GroupPayloadRef,
  };
}

function resolveOptions(group: UploadDisambiguationGroup): TrayResolveOption[] {
  const candidates =
    group.candidates.length > 0
      ? group.candidates
      : (group.houseNumberCandidates ?? []);

  if (group.collapseStage === 'city' || group.trayStep === '1a') {
    if (candidates.length) {
      return candidatesToOptions(candidates, group);
    }
    if (group.citySuggestions?.length) {
      return group.citySuggestions.slice(0, 5).map((city, index) => ({
        id: `city-suggestion-${index}`,
        label: city,
        city,
      }));
    }
  }

  return candidatesToOptions(candidates, group);
}

function candidatesToOptions(
  candidates: UploadAddressCandidate[],
  group: UploadDisambiguationGroup,
): TrayResolveOption[] {
  if (group.collapseStage === 'city' || group.trayStep === '1a') {
    const byCity = new Map<string, UploadAddressCandidate>();
    for (const candidate of candidates) {
      const key = (candidate.city ?? candidate.addressLabel).trim();
      if (!byCity.has(key)) {
        byCity.set(key, candidate);
      }
    }
    return Array.from(byCity.values())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        label: (c.city ?? c.addressLabel).trim(),
        lat: c.lat,
        lng: c.lng,
        score: c.score,
        city: c.city,
      }));
  }
  return candidates.map((c) => ({
    id: c.id,
    label: c.addressLabel,
    lat: c.lat,
    lng: c.lng,
    score: c.score,
    city: c.city,
  }));
}
