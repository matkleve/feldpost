/**
 * Maps UploadLocationResolutionService disambiguation groups to tray orchestrator items.
 * @see docs/specs/service/media-upload-service/upload-resolver-tray-orchestrator.md
 */

import { Injectable, Injector, inject } from '@angular/core';
import { UploadLocationResolutionService } from '../../upload/location/upload-location-resolution.service';
import { UploadManagerService } from '../../upload/upload-manager.service';
import {
  discriminatingFieldValue,
  pickDiscriminatingField,
} from '../../upload/location/upload-location-resolution.helpers';
import {
  formatSourceConflictDistance,
  haversineMeters,
  labelFromFolderDisplayPath,
  SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
  SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
} from '../../upload/location/upload-location-precedence.helpers';
import type {
  UploadAddressCandidate,
  UploadDiscriminatingField,
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
  /** Stable dialogue unit per disambiguation group (1A+1B share). */
  private readonly groupDialogueUnitIds = new Map<string, string>();

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

      if (group.disambiguationKind === 'containment_check') {
        if (event.answer?.optionId) {
          this.resolution.applyContainmentCheckChoice(groupId, event.answer.optionId);
        }
        this.clearGroupMappings(groupId);
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
        const picked = group.candidates.find((c) => c.id === event.answer?.optionId);
        const field = group.discriminatingField ?? pickDiscriminatingField(group.candidates);
        const city =
          event.answer?.text?.trim() ??
          (picked && field ? discriminatingFieldValue(picked, field) : undefined) ??
          picked?.city ??
          picked?.addressLabel;
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

      // Tray Continue gate ensures jobs are awaiting_disambiguation before resolveActiveItem.
      // selectAddressCandidate → applyCandidateToGroup for the whole disambiguation group.
      // @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Tray Continue gate
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
    const unitId = this.dialogueUnitIdForGroup(group.id);
    const input = groupToEnqueueInput(group, unitId);
    if (!input.options.length) {
      return '';
    }
    const itemId = this.orchestrator.enqueueItem(input);
    this.groupStepToItemId.set(stepKey, itemId);
    return itemId;
  }

  enqueueHouseStepItem(group: UploadDisambiguationGroup, dependsOnItemId: string): string {
    const stepKey = itemKeyForGroup(group);
    if (this.groupStepToItemId.has(stepKey)) {
      return this.groupStepToItemId.get(stepKey)!;
    }
    const unitId = this.dialogueUnitIdForGroup(group.id);
    const input = groupToEnqueueInput(group, unitId, dependsOnItemId);
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
    this.groupDialogueUnitIds.delete(groupId);
  }

  private dialogueUnitIdForGroup(groupId: string): string {
    const existing = this.groupDialogueUnitIds.get(groupId);
    if (existing) {
      return existing;
    }
    const id = crypto.randomUUID();
    this.groupDialogueUnitIds.set(groupId, id);
    return id;
  }
}

function itemKeyForGroup(group: UploadDisambiguationGroup): string {
  return `${group.id}:${group.trayStep ?? 'default'}`;
}

function normalizeTrayAddressLabel(value: string): string {
  return value.replace(/_/g, ' ').trim().toLocaleLowerCase();
}

function questionKeyForGroup(group: UploadDisambiguationGroup): string {
  if (group.disambiguationKind === 'layer_package') {
    return 'upload.resolver.question.layerPackage';
  }
  if (group.disambiguationKind === 'admin_level_conflict') {
    return 'upload.resolver.question.adminLevelConflict';
  }
  if (group.disambiguationKind === 'containment_check') {
    return 'upload.resolver.question.containmentCheck';
  }
  if (group.disambiguationKind === 'source') {
    return 'upload.resolver.question.source';
  }
  if (group.disambiguationKind === 'city_step' || group.trayStep === '1a') {
    const field = group.discriminatingField ?? pickDiscriminatingField(group.candidates);
    if (field === 'municipality') {
      return 'upload.resolver.question.municipalityStep';
    }
    if (field === 'district') {
      return 'upload.resolver.question.districtStep';
    }
    if (field === 'state') {
      return 'upload.resolver.question.stateStep';
    }
    if (field === 'postcode') {
      return 'upload.resolver.question.postcodeStep';
    }
    return 'upload.resolver.question.cityStep';
  }
  if (group.disambiguationKind === 'house_step' || group.trayStep === '1b') {
    return 'upload.resolver.question.houseStep';
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
  dialogueUnitId: string,
  dependsOnItemId?: string,
): EnqueueTrayItemInput {
  const questionKey = questionKeyForGroup(group);
  const street = group.titleAddress.split(',')[0]?.trim() ?? group.titleAddress;
  const questionParams: Record<string, string> = {
    street,
    address: group.titleAddress,
    city: group.candidates.find((c) => c.city)?.city ?? street.split(',')[1]?.trim() ?? '',
  };
  if (group.disambiguationKind === 'source') {
    const pathLeaf = labelFromFolderDisplayPath(group.folderDisplayPath);
    const parsed = group.titleAddress.trim();
    // Subtitle only when parser output differs from the folder row (e.g. street without house).
    if (parsed && pathLeaf && normalizeTrayAddressLabel(parsed) !== normalizeTrayAddressLabel(pathLeaf)) {
      questionParams['parsedAddress'] = parsed;
    }
    const textCand = group.candidates.find((c) => c.id === SOURCE_CONFLICT_TEXT_CANDIDATE_ID);
    const exifCand = group.candidates.find((c) => c.id === SOURCE_CONFLICT_EXIF_CANDIDATE_ID);
    if (textCand && exifCand) {
      questionParams['distance'] = formatSourceConflictDistance(
        haversineMeters(
          { lat: textCand.lat, lng: textCand.lng },
          { lat: exifCand.lat, lng: exifCand.lng },
        ),
      );
    }
  } else {
    questionParams['parsedAddress'] = group.titleAddress;
  }

  let trayStepLabel: '1a' | '1b' | undefined;
  if (group.trayStep === '1a') {
    trayStepLabel = '1a';
  } else if (group.trayStep === '1b') {
    trayStepLabel = '1b';
  }

  const options = resolveOptions(group);

  return {
    dialogueUnitId,
    producerId: PRODUCER_ID,
    batchId: group.batchId,
    questionKey,
    questionParams,
    answerKind: 'single_choice',
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
  if (group.disambiguationKind === 'source') {
    return candidates.map((c) => ({
      id: c.id,
      label: c.addressLabel,
      lat: c.lat,
      lng: c.lng,
      city: c.city,
    }));
  }
  if (group.collapseStage === 'city' || group.trayStep === '1a') {
    const field: UploadDiscriminatingField =
      group.discriminatingField ?? pickDiscriminatingField(candidates) ?? 'city';
    const byField = new Map<string, UploadAddressCandidate>();
    for (const candidate of candidates) {
      const key = discriminatingFieldValue(candidate, field).trim();
      const fallback = (candidate.city ?? candidate.addressLabel).trim();
      const labelKey = (key || fallback).toLowerCase();
      if (!labelKey || byField.has(labelKey)) {
        continue;
      }
      byField.set(labelKey, candidate);
    }
    return Array.from(byField.values())
      .slice(0, 5)
      .map((c) => ({
        id: c.id,
        label: discriminatingFieldValue(c, field).trim() || (c.city ?? c.addressLabel).trim(),
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
