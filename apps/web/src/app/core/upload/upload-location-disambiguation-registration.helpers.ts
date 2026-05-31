/**
 * Pure helpers for disambiguation group registration merge/patch.
 * @see upload-location-disambiguation-registration.service.ts
 */

import { pickCollapseStage } from './upload-location-resolution.helpers';
import type {
  UploadAddressCandidate,
  UploadDisambiguationGroup,
} from './upload-manager.types';

export interface DisambiguationRegistrationInput {
  batchId: string;
  queryKey: string;
  folderDisplayPath: string;
  titleAddress: string;
  jobIds: string[];
  candidates: UploadAddressCandidate[];
  localityHint?: string;
  disambiguationKind?: UploadDisambiguationGroup['disambiguationKind'];
  trayStep?: UploadDisambiguationGroup['trayStep'];
  confirmedCity?: string | null;
  step1bGate?: UploadDisambiguationGroup['step1bGate'];
  projectCentroid?: UploadDisambiguationGroup['projectCentroid'];
  citySuggestions?: string[];
  houseNumberCandidates?: UploadAddressCandidate[];
  discriminatingField?: UploadDisambiguationGroup['discriminatingField'];
  collapseStage?: UploadDisambiguationGroup['collapseStage'];
}

export function mergeDisambiguationGroupPatch(
  group: UploadDisambiguationGroup,
  input: DisambiguationRegistrationInput,
): UploadDisambiguationGroup {
  const jobIds = [...new Set([...group.jobIds, ...input.jobIds])];
  return {
    ...group,
    jobIds,
    candidates: input.candidates.length ? input.candidates : group.candidates,
    collapseStage:
      input.collapseStage ??
      pickCollapseStage(
        input.candidates.length ? input.candidates : group.candidates,
        jobIds.length,
      ),
    discriminatingField: input.discriminatingField ?? group.discriminatingField,
    disambiguationKind: input.disambiguationKind ?? group.disambiguationKind ?? 'geocode',
    trayStep: input.trayStep ?? group.trayStep,
    confirmedCity: input.confirmedCity ?? group.confirmedCity,
    step1bGate: input.step1bGate ?? group.step1bGate,
    projectCentroid: input.projectCentroid ?? group.projectCentroid,
    citySuggestions: input.citySuggestions ?? group.citySuggestions,
    houseNumberCandidates: input.houseNumberCandidates ?? group.houseNumberCandidates,
  };
}
