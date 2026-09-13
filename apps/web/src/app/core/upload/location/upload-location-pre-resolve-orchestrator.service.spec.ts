/**
 * A resolved group applies one geocode to every job in it. One job being held for a source-conflict
 * tray is that job's business — it must not decide the outcome of the job asking, and it must not
 * stop the candidate reaching the rest of the group.
 *
 * @see docs/study/005-upload-pipeline-trace-findings.md#f-16
 */
import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi } from 'vitest';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadJobStateService } from '../support/upload-job-state.service';
import { UploadLocationGeocodeGroupService } from './upload-location-geocode-group.service';
import { UploadLocationPlacementService } from './upload-location-placement.service';
import { UploadLocationPreResolveOrchestratorService } from './upload-location-pre-resolve-orchestrator.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { UploadLocationTrayFlowService } from './upload-location-tray-flow.service';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';
import type { UploadJob } from '../upload-manager.types';

const GROUPING_KEY = 'at|wien|1010|wien|karntner straße|4';

function job(id: string): UploadJob {
  return {
    id,
    batchId: 'batch-1',
    file: new File(['bytes'], `${id}.jpg`, { type: 'image/jpeg' }),
    phase: 'dedup_check',
    progress: 0,
    statusLabel: 'Checking for duplicates…',
    submittedAt: new Date(),
    mode: 'new',
    groupingKey: GROUPING_KEY,
    titleAddress: 'Kärntner Straße 4',
    titleAddressSource: 'folder',
    relativePath: `AT/Wien/1010/Kärntner Straße 4/${id}.jpg`,
  };
}

const groupState = {
  status: 'resolved',
  groupingKey: GROUPING_KEY,
  jobIds: ['job-with-exif', 'job-without-exif'],
  folderDisplayPath: 'AT/Wien/1010/Kärntner Straße 4',
  candidate: { id: 'candidate-1', addressLabel: 'Kärntner Straße 4, 1010 Wien' },
  // The debug summary reads the Search Object, so the fixture needs one.
  searchObject: {
    country: 'AT',
    city: 'Wien',
    postcode: '1010',
    street: 'Kärntner Straße',
    houseNumber: '4',
    groupingKey: GROUPING_KEY,
    sources: [],
    sourceDeviations: [],
    postcodeCandidates: [],
    uncertainFields: [],
  },
} as unknown as UploadGroupResolutionState;

function setup(): {
  service: UploadLocationPreResolveOrchestratorService;
  applyCandidate: ReturnType<typeof vi.fn>;
} {
  const applyCandidate = vi.fn();
  TestBed.configureTestingModule({
    providers: [
      UploadJobStateService,
      UploadLocationPreResolveOrchestratorService,
      {
        provide: UploadAddressResolutionOrchestrator,
        useValue: { getGroupState: vi.fn().mockReturnValue(groupState) },
      },
      {
        provide: UploadLocationPlacementService,
        useValue: {
          applyGeocodeCandidateToJob: applyCandidate,
          // Only the job carrying both pins is held by the source-conflict tray.
          finalizePlacementForJob: vi.fn((id: string) => id === 'job-with-exif'),
        },
      },
      {
        provide: UploadLocationGeocodeGroupService,
        useValue: { ensureGeocodedGroup: vi.fn() },
      },
      { provide: UploadLocationTrayFlowService, useValue: {} },
      { provide: UploadLocationResolutionService, useValue: { registerDisambiguationGroup: vi.fn() } },
    ],
  });
  TestBed.inject(UploadJobStateService).addJobs([job('job-with-exif'), job('job-without-exif')]);
  return { service: TestBed.inject(UploadLocationPreResolveOrchestratorService), applyCandidate };
}

describe('applyPreResolveFromOrchestrator — resolved group with one held sibling', () => {
  it('reports continue for a job that is not itself held', async () => {
    const { service } = setup();

    await expect(service.applyPreResolveFromOrchestrator('job-without-exif')).resolves.toBe(
      'continue',
    );
  });

  it('reports held for the job that is held', async () => {
    const { service } = setup();

    await expect(service.applyPreResolveFromOrchestrator('job-with-exif')).resolves.toBe('held');
  });

  it('applies the group candidate to every job, not only up to the held one', async () => {
    const { service, applyCandidate } = setup();

    await service.applyPreResolveFromOrchestrator('job-without-exif');

    expect(applyCandidate.mock.calls.map((call) => call[0])).toEqual([
      'job-with-exif',
      'job-without-exif',
    ]);
  });
});

/**
 * `metadata_only` is a deliberate area-precision result, not a failure — it must place the job
 * as a text-only address with no coordinates and no tray, instead of routing to Issues.
 * @see docs/study/005-upload-pipeline-trace-findings.md#f-19
 */
describe('applyPreResolveFromOrchestrator — metadata_only (area-only) group', () => {
  const AREA_GROUPING_KEY = 'at|niederösterreich|||';

  function areaJob(id: string): UploadJob {
    return {
      id,
      batchId: 'batch-1',
      file: new File(['bytes'], `${id}.jpg`, { type: 'image/jpeg' }),
      phase: 'dedup_check',
      progress: 0,
      statusLabel: 'Checking for duplicates…',
      submittedAt: new Date(),
      mode: 'new',
      groupingKey: AREA_GROUPING_KEY,
      titleAddress: 'IMG_1103.jpg',
      relativePath: `AT/Niederösterreich/${id}.jpg`,
    };
  }

  const areaGroupState = {
    status: 'partial',
    groupingKey: AREA_GROUPING_KEY,
    jobIds: ['area-job-1'],
    folderDisplayPath: 'AT/Niederösterreich',
    titleAddressLabel: 'Niederösterreich, AT',
    geocodeBranch: 'metadata_only',
    searchObject: {
      country: 'AT',
      state: 'Niederösterreich',
      city: null,
      postcode: null,
      street: null,
      houseNumber: null,
      groupingKey: AREA_GROUPING_KEY,
      sources: [],
      sourceDeviations: [],
      postcodeCandidates: [],
      uncertainFields: [],
    },
  } as unknown as UploadGroupResolutionState;

  function setupArea(): { service: UploadLocationPreResolveOrchestratorService } {
    TestBed.configureTestingModule({
      providers: [
        UploadJobStateService,
        UploadLocationPreResolveOrchestratorService,
        {
          provide: UploadAddressResolutionOrchestrator,
          useValue: { getGroupState: vi.fn().mockReturnValue(areaGroupState) },
        },
        { provide: UploadLocationPlacementService, useValue: {} },
        { provide: UploadLocationGeocodeGroupService, useValue: { ensureGeocodedGroup: vi.fn() } },
        { provide: UploadLocationTrayFlowService, useValue: {} },
        { provide: UploadLocationResolutionService, useValue: {} },
      ],
    });
    TestBed.inject(UploadJobStateService).addJobs([areaJob('area-job-1')]);
    return { service: TestBed.inject(UploadLocationPreResolveOrchestratorService) };
  }

  it('reports continue rather than partial', async () => {
    const { service } = setupArea();

    await expect(service.applyPreResolveFromOrchestrator('area-job-1')).resolves.toBe('continue');
  });

  it('places the job at area precision with no coordinates and no open tray', async () => {
    const { service } = setupArea();
    await service.applyPreResolveFromOrchestrator('area-job-1');

    const jobState = TestBed.inject(UploadJobStateService);
    const job = jobState.findJob('area-job-1')!;
    expect(job.coords).toBeUndefined();
    expect(job.areaOnlyLocation).toBe(true);
    expect(job.titleAddress).toBe('Niederösterreich, AT');
    expect(job.locationSourceUsed).toBe('folder');
    expect(job.resolutionStatus).toBe('resolved');
    expect(job.pendingPartialLocation).toBe(false);
    expect(job.disambiguationGroupId).toBeUndefined();
  });
});
