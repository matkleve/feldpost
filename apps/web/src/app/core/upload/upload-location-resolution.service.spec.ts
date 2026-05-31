import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GeocodingService } from '../geocoding/geocoding.service';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator/upload-resolver-tray-orchestrator.service';
import { UploadAddressResolutionOrchestrator } from './upload-address-resolution.orchestrator';
import { UploadBatchService } from './upload-batch.service';
import { UploadJobStateService } from './upload-job-state.service';
import { UploadLocationConfigService } from './upload-location-config.service';
import {
  SOURCE_CONFLICT_EXIF_CANDIDATE_ID,
  SOURCE_CONFLICT_NONE_CANDIDATE_ID,
  SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
  buildSourceConflictCandidates,
  buildSourceConflictQueryKey,
} from './upload-location-precedence.helpers';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { isGroupBlocked } from './upload-location-resolution.helpers';
import type { UploadJob } from './upload-manager.types';
import { UploadProjectLocationsAdapter } from './adapters/upload-project-locations.adapter';
import { LocalGeoDataAdapter } from '../location-path-parser/local-geo-data.adapter';
import { OrgSearchTuningService } from '../search/org-search-tuning.service';

function buildJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: overrides.id ?? 'job-1',
    batchId: 'batch-1',
    file: new File([], 'photo.heic', { type: 'image/heic' }),
    phase: 'resolving_location',
    progress: 0,
    statusLabel: 'Choose address',
    submittedAt: new Date(),
    mode: 'new',
    groupingKey: 'gk-thaliastrasse',
    folderDisplayPath: 'Thaliastraße 14',
    titleAddress: 'Thaliastraße 14',
    titleAddressCoords: { lat: 48.198, lng: 16.335 },
    parsedExif: { coords: { lat: 48.21, lng: 16.37 } },
    disambiguationGroupId: 'group-pending',
    issueKind: 'source_conflict',
    ...overrides,
  };
}

describe('UploadLocationResolutionService — source conflict', () => {
  let service: UploadLocationResolutionService;
  let jobState: UploadJobStateService;
  let reverseCalls: number;

  beforeEach(() => {
    reverseCalls = 0;
    TestBed.configureTestingModule({
      providers: [
        UploadLocationResolutionService,
        UploadJobStateService,
        UploadLocationConfigService,
        UploadAddressResolutionOrchestrator,
        UploadBatchService,
        UploadResolverTrayOrchestratorService,
        {
          provide: GeocodingService,
          useValue: {
            reverse: vi.fn().mockImplementation(async (lat: number, lng: number) => {
              reverseCalls += 1;
              if (lat === 48.198) {
                return { addressLabel: 'Thaliastraße 65, Wien' };
              }
              return { addressLabel: 'Antonsplatz, Wien' };
            }),
            forward: vi.fn(),
          },
        },
        {
          provide: UploadProjectLocationsAdapter,
          useValue: { listForProject: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: LocalGeoDataAdapter,
          useValue: {
            getBundeslaender: vi.fn().mockResolvedValue([]),
            getGemeinden: vi.fn().mockResolvedValue([]),
            getPlzMap: vi.fn().mockResolvedValue(new Map()),
          },
        },
        {
          provide: OrgSearchTuningService,
          useValue: { getTuning: vi.fn().mockReturnValue({}) },
        },
      ],
    });
    service = TestBed.inject(UploadLocationResolutionService);
    jobState = TestBed.inject(UploadJobStateService);
    TestBed.inject(UploadResolverTrayOrchestratorService).resetAll();
    service.clearBatch('batch-1');
  });

  it('singleflight: parallel registerSourceConflictGroup creates one blocked group', async () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const jobA = buildJob({ id: 'job-a' });
    const jobB = buildJob({ id: 'job-b' });
    jobState.addJobs([jobA, jobB]);

    await Promise.all([
      service.registerSourceConflictGroup(jobA, text, exif),
      service.registerSourceConflictGroup(jobB, text, exif),
    ]);

    const blocked = service
      .disambiguationGroups()
      .filter((g) => g.batchId === 'batch-1' && g.disambiguationKind === 'source' && isGroupBlocked(g));
    expect(blocked).toHaveLength(1);
    expect(blocked[0]!.jobIds.sort()).toEqual(['job-a', 'job-b']);
    expect(reverseCalls).toBe(2);
  });

  it('source conflict group excludes same-folder jobs without EXIF metadata', async () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const withGps = buildJob({ id: 'job-gps' });
    const noGps = buildJob({
      id: 'job-no-gps',
      parsedExif: undefined,
    });
    jobState.addJobs([withGps, noGps]);

    await service.registerSourceConflictGroup(withGps, text, exif);

    const blocked = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    expect(blocked.jobIds).toEqual(['job-gps']);
  });

  it('applyCandidateToGroup source-exif applies only to tray jobIds, not folder siblings without EXIF', () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const onTray = buildJob({ id: 'job-tray' });
    const sibling = buildJob({
      id: 'job-sibling',
      parsedExif: undefined,
      coords: undefined,
      phase: 'resolving_location',
      disambiguationGroupId: undefined,
    });
    jobState.addJobs([onTray, sibling]);

    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey: buildSourceConflictQueryKey('gk-thaliastrasse'),
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [onTray.id],
      candidates: buildSourceConflictCandidates({
        folderAddress: 'Thaliastraße 14, Wien',
        photoAddress: 'Antonsplatz, Wien',
        textCoords: text,
        exifCoords: exif,
      }),
      disambiguationKind: 'source',
    });
    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_EXIF_CANDIDATE_ID);

    expect(jobState.findJob(onTray.id)!.coords).toEqual(exif);
    expect(jobState.findJob(onTray.id)!.locationSourceUsed).toBe('exif');
    const siblingAfter = jobState.findJob(sibling.id)!;
    expect(siblingAfter.coords).toEqual(text);
    expect(siblingAfter.locationSourceUsed).toBe('folder');
  });

  it('applyCandidateToGroup source-text sets coords without titleAddressCoords', () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const job = buildJob({
      titleAddressCoords: undefined,
      coords: undefined,
      disambiguationGroupId: undefined,
    });
    jobState.addJobs([job]);

    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey: buildSourceConflictQueryKey('gk-thaliastrasse'),
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [job.id],
      candidates: [
        {
          id: SOURCE_CONFLICT_TEXT_CANDIDATE_ID,
          addressLabel: 'Thaliastraße 65, Wien',
          displayName: 'Thaliastraße 65, Wien',
          lat: text.lat,
          lng: text.lng,
        },
      ],
      disambiguationKind: 'source',
    });

    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_TEXT_CANDIDATE_ID);

    const updated = jobState.findJob(job.id)!;
    expect(updated.coords).toEqual(text);
    expect(updated.phase).toBe('queued');
    expect(updated.disambiguationGroupId).toBeUndefined();
    expect(updated.issueKind).toBeUndefined();
    expect(service.isSourceConflictResolved('batch-1', 'gk-thaliastrasse')).toBe(true);
  });

  it('does not re-register source group after resolve', async () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const job = buildJob({
      disambiguationGroupId: undefined,
      issueKind: undefined,
      statusLabel: '',
    });
    jobState.addJobs([job]);

    const queryKey = buildSourceConflictQueryKey('gk-thaliastrasse');
    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey,
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [job.id],
      candidates: buildSourceConflictCandidates({
        folderAddress: 'Thaliastraße 65, Wien',
        photoAddress: 'Antonsplatz, Wien',
        textCoords: text,
        exifCoords: exif,
      }),
      disambiguationKind: 'source',
    });
    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_TEXT_CANDIDATE_ID);
    expect(service.isSourceConflictResolved('batch-1', 'gk-thaliastrasse')).toBe(true);

    const blockedBefore = service
      .disambiguationGroups()
      .filter((g) => g.disambiguationKind === 'source' && isGroupBlocked(g)).length;
    await service.registerSourceConflictGroup(job, text, exif);
    const blockedAfter = service
      .disambiguationGroups()
      .filter((g) => g.disambiguationKind === 'source' && isGroupBlocked(g)).length;
    expect(blockedAfter).toBe(blockedBefore);
    expect(blockedAfter).toBe(0);
  });

  /** @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record */
  it('late job replays EXIF choice', () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const jobFirst = buildJob({ id: 'job-first' });
    jobState.addJobs([jobFirst]);

    const queryKey = buildSourceConflictQueryKey('gk-thaliastrasse');
    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey,
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [jobFirst.id],
      candidates: buildSourceConflictCandidates({
        folderAddress: 'Thaliastraße 14, Wien',
        photoAddress: 'Antonsplatz, Wien',
        textCoords: text,
        exifCoords: exif,
      }),
      disambiguationKind: 'source',
    });
    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_EXIF_CANDIDATE_ID);

    const jobLate = buildJob({
      id: 'job-late',
      phase: 'resolving_location',
      coords: undefined,
      disambiguationGroupId: undefined,
    });
    jobState.addJobs([jobLate]);

    const held = service.finalizePlacementForJob(jobLate.id);
    expect(held).toBe(false);
    const updated = jobState.findJob(jobLate.id)!;
    expect(updated.locationSourceUsed).toBe('exif');
    expect(updated.coords).toEqual(exif);
  });

  /** @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record */
  it('late job replays text choice', () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const jobFirst = buildJob({ id: 'job-first' });
    jobState.addJobs([jobFirst]);

    const queryKey = buildSourceConflictQueryKey('gk-thaliastrasse');
    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey,
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [jobFirst.id],
      candidates: buildSourceConflictCandidates({
        folderAddress: 'Thaliastraße 14, Wien',
        photoAddress: 'Antonsplatz, Wien',
        textCoords: text,
        exifCoords: exif,
      }),
      disambiguationKind: 'source',
    });
    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_TEXT_CANDIDATE_ID);

    const jobLate = buildJob({
      id: 'job-late',
      phase: 'resolving_location',
      coords: undefined,
    });
    jobState.addJobs([jobLate]);

    service.finalizePlacementForJob(jobLate.id);
    const updated = jobState.findJob(jobLate.id)!;
    expect(updated.coords).toEqual(text);
    expect(updated.locationSourceUsed).toBe('folder');
  });

  /** @see docs/specs/service/media-upload-service/upload-manager-pipeline.location-routing.supplement.md § Phase 3 — source-conflict resolution record */
  it('late job replays set-later choice', () => {
    const text = { lat: 48.198, lng: 16.335 };
    const exif = { lat: 48.21, lng: 16.37 };
    const jobFirst = buildJob({ id: 'job-first' });
    jobState.addJobs([jobFirst]);

    const queryKey = buildSourceConflictQueryKey('gk-thaliastrasse');
    service.registerDisambiguationGroup({
      batchId: 'batch-1',
      queryKey,
      folderDisplayPath: 'Thaliastraße 14',
      titleAddress: 'Thaliastraße 14',
      jobIds: [jobFirst.id],
      candidates: buildSourceConflictCandidates({
        folderAddress: 'Thaliastraße 14, Wien',
        photoAddress: 'Antonsplatz, Wien',
        textCoords: text,
        exifCoords: exif,
      }),
      disambiguationKind: 'source',
    });
    const group = service
      .disambiguationGroups()
      .find((g) => g.disambiguationKind === 'source' && isGroupBlocked(g))!;
    service.applyCandidateToGroup(group.id, SOURCE_CONFLICT_NONE_CANDIDATE_ID);

    const jobLate = buildJob({
      id: 'job-late',
      phase: 'resolving_location',
      coords: undefined,
    });
    jobState.addJobs([jobLate]);

    service.finalizePlacementForJob(jobLate.id);
    const updated = jobState.findJob(jobLate.id)!;
    expect(updated.phase).toBe('missing_data');
    expect(updated.coords).toBeUndefined();
    expect(updated.issueKind).toBe('missing_gps');
  });
});
