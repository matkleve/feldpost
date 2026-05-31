/**
 * Resolve address candidate from disambiguation tray or missing_data issues.
 * @see upload-manager.service.ts selectAddressCandidate
 */

import type { UploadManagerActionsDeps } from './upload-manager-actions.util';
import { placeUploadManagerJob } from './upload-manager-actions.util';
import type { UploadManagerMissingDataService } from './upload-manager-missing-data.service';
import type { UploadLocationResolutionService } from './upload-location-resolution.service';
import type { UploadJobStateService } from './upload-job-state.service';
import type { UploadAddressCandidate } from './upload-manager.types';

export function selectUploadManagerAddressCandidate(
  jobId: string,
  candidate: UploadAddressCandidate,
  deps: {
    jobState: UploadJobStateService;
    locationResolution: UploadLocationResolutionService;
    missingData: UploadManagerMissingDataService;
    actionDeps: UploadManagerActionsDeps;
    emitBatchProgress: (batchId: string) => void;
  },
): void {
  const job = deps.jobState.findJob(jobId);
  if (!job) {
    return;
  }

  if (job.phase === 'awaiting_disambiguation' && job.disambiguationGroupId) {
    deps.locationResolution.applyCandidateToGroup(job.disambiguationGroupId, candidate.id);
    return;
  }

  if (job.phase !== 'missing_data') {
    return;
  }

  if (job.mediaId) {
    deps.jobState.updateJob(jobId, {
      titleAddress: candidate.addressLabel,
      titleAddressSource: 'file',
      locationSourceUsed: 'file',
      issueKind: undefined,
      addressCandidates: undefined,
    });
    void deps.missingData.resolvePersistedMissingDataLocation(
      jobId,
      job.mediaId,
      { lat: candidate.lat, lng: candidate.lng },
      deps.emitBatchProgress,
    );
    return;
  }

  deps.jobState.updateJob(jobId, {
    titleAddress: candidate.addressLabel,
    titleAddressSource: 'file',
    locationSourceUsed: 'file',
    issueKind: undefined,
    addressCandidates: undefined,
  });
  placeUploadManagerJob(jobId, { lat: candidate.lat, lng: candidate.lng }, deps.actionDeps);
}
