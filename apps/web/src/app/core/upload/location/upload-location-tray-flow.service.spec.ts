import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { GeocodingService } from '../../geocoding/geocoding.service';
import { LocalGeoDataAdapter } from '../../location-path-parser/local-geo-data.adapter';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadLocationLookupAdapter } from '../adapters/upload-location-lookup.adapter';
import { UploadProjectLocationsAdapter } from '../adapters/upload-project-locations.adapter';
import { UploadBatchService } from '../support/upload-batch.service';
import { UploadJobStateService } from '../support/upload-job-state.service';
import {
  adminLevelCandidateId,
  adminLevelManualCandidateId,
  buildAdminConflictCandidates,
} from './upload-location-admin-level-choice.util';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { UploadLocationTrayFlowService } from './upload-location-tray-flow.service';
import type { UploadJob } from '../upload-manager.types';

const geo = {
  states: [
    { n: 'Wien', a: ['vienna'] },
    { n: 'Steiermark', a: [] },
    { n: 'Tirol', a: [] },
  ],
  municipalities: [
    { n: 'Wien', b: 'Wien', a: ['vienna'] },
    { n: 'Graz', b: 'Steiermark', a: [] },
    { n: 'Innsbruck', b: 'Tirol', a: [] },
  ],
  postcodeMap: { '1010': ['Wien'], '6020': ['Innsbruck'] },
};

function buildJob(overrides: Partial<UploadJob> = {}): UploadJob {
  return {
    id: overrides.id ?? 'job-1',
    batchId: 'batch-tray',
    file: new File([], 'photo.jpg', { type: 'image/jpeg' }),
    phase: 'awaiting_disambiguation',
    progress: 0,
    statusLabel: 'Choose address',
    submittedAt: new Date(),
    mode: 'new',
    relativePath: 'AT/Wien/Graz/Hauptstraße 5/photo.jpg',
    ...overrides,
  };
}

describe('UploadLocationTrayFlowService — admin_level_conflict', () => {
  let trayFlow: UploadLocationTrayFlowService;
  let orchestrator: UploadAddressResolutionOrchestrator;
  let jobState: UploadJobStateService;
  let disambiguationStore: UploadLocationDisambiguationStoreService;
  let resolutionMock: {
    registerDisambiguationGroup: ReturnType<typeof vi.fn>;
    notifyDisambiguationResolved: ReturnType<typeof vi.fn>;
    applyPreResolveFromOrchestrator: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resolutionMock = {
      registerDisambiguationGroup: vi.fn(),
      notifyDisambiguationResolved: vi.fn(),
      applyPreResolveFromOrchestrator: vi.fn().mockResolvedValue('continue'),
    };

    TestBed.configureTestingModule({
      providers: [
        UploadLocationTrayFlowService,
        UploadAddressResolutionOrchestrator,
        UploadJobStateService,
        UploadBatchService,
        UploadLocationDisambiguationStoreService,
        { provide: UploadLocationResolutionService, useValue: resolutionMock },
        {
          provide: GeocodingService,
          useValue: { searchStreetHouseNumbers: vi.fn().mockResolvedValue([]) },
        },
        {
          provide: LocalGeoDataAdapter,
          useValue: {
            getBundeslaender: vi.fn().mockResolvedValue(geo.states),
            getGemeinden: vi.fn().mockResolvedValue(geo.municipalities),
            getPlzMap: vi.fn().mockResolvedValue(geo.postcodeMap),
          },
        },
        {
          provide: UploadLocationLookupAdapter,
          useValue: { findBySearchObject: vi.fn().mockResolvedValue(null) },
        },
        {
          provide: UploadProjectLocationsAdapter,
          useValue: {
            listProjectLocations: vi.fn().mockResolvedValue([]),
            pickCentroid: vi.fn().mockReturnValue(null),
          },
        },
      ],
    });

    trayFlow = TestBed.inject(UploadLocationTrayFlowService);
    orchestrator = TestBed.inject(UploadAddressResolutionOrchestrator);
    jobState = TestBed.inject(UploadJobStateService);
    disambiguationStore = TestBed.inject(UploadLocationDisambiguationStoreService);

    for (const job of [...jobState.jobs()]) {
      jobState.removeJob(job.id);
    }
    orchestrator.clearBatch('batch-tray');
    disambiguationStore.removeGroupsForBatch('batch-tray');
  });

  it('registerAdminLevelConflictGroup registers admin_level_conflict with conflict payload', async () => {
    jobState.addJobs([buildJob()]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAdminLevelResolution')!;
    trayFlow.registerAdminLevelConflictGroup('batch-tray', adminState);

    expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-tray',
        disambiguationKind: 'admin_level_conflict',
        jobIds: adminState.jobIds,
        adminLevelConflicts: expect.arrayContaining([
          expect.objectContaining({ field: 'city' }),
        ]),
      }),
    );
    const input = resolutionMock.registerDisambiguationGroup.mock.calls[0]![0];
    expect(input.candidates.length).toBeGreaterThanOrEqual(2);
    expect(input.queryKey).toBe(adminState.adminConflictQueryKey);
  });

  it('applyAdminLevelConflictChoice clears admin conflict and continues pre-resolve', async () => {
    jobState.addJobs([buildJob()]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAdminLevelResolution')!;
    const conflicts = adminState.adminLevelConflicts ?? [];
    const candidates = buildAdminConflictCandidates(conflicts).map((c) => ({
      id: c.id,
      addressLabel: c.addressLabel,
      lat: 0,
      lng: 0,
    }));
    const wienCityEntry = conflicts[0]!.entries.find(
      (e) => e.field === 'city' && e.value === 'Wien',
    )!;
    const wienCandidateId = adminLevelCandidateId(wienCityEntry);

    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: adminState.adminConflictQueryKey ?? adminState.groupingKey,
      folderDisplayPath: adminState.folderDisplayPath,
      titleAddress: adminState.titleAddressLabel,
      jobIds: [...adminState.jobIds],
      candidates,
      disambiguationKind: 'admin_level_conflict',
    });
    disambiguationStore.patchGroup({
      ...group,
      adminLevelConflicts: conflicts,
    });

    await trayFlow.applyAdminLevelConflictChoice(
      disambiguationStore.groups().find((g) => g.id === group.id)!,
      wienCandidateId,
    );

    const after = orchestrator.listGroupStates('batch-tray');
    expect(after.some((s) => s.status === 'needsAdminLevelResolution')).toBe(false);
    expect(after.some((s) => s.status === 'needsGeocode' || s.status === 'partial')).toBe(true);
    expect(resolutionMock.notifyDisambiguationResolved).toHaveBeenCalled();
    expect(resolutionMock.applyPreResolveFromOrchestrator).toHaveBeenCalledWith('job-1');
  });

  it('applyAdminLevelConflictChoice accepts manual city entry on Wien/Innsbruck street path', async () => {
    jobState.addJobs([
      buildJob({
        relativePath: 'AT/Wien/Innsbruck/Hauptstraße 5/photo.jpg',
      }),
    ]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAdminLevelResolution')!;
    const conflicts = adminState.adminLevelConflicts ?? [];
    const candidates = buildAdminConflictCandidates(conflicts).map((c) => ({
      id: c.id,
      addressLabel: c.addressLabel,
      lat: 0,
      lng: 0,
    }));
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: adminState.adminConflictQueryKey ?? adminState.groupingKey,
      folderDisplayPath: adminState.folderDisplayPath,
      titleAddress: adminState.titleAddressLabel,
      jobIds: [...adminState.jobIds],
      candidates,
      disambiguationKind: 'admin_level_conflict',
    });
    disambiguationStore.patchGroup({
      ...group,
      adminLevelConflicts: conflicts,
    });

    await trayFlow.applyAdminLevelConflictChoice(
      disambiguationStore.groups().find((g) => g.id === group.id)!,
      adminLevelManualCandidateId('city'),
      'Wien',
    );

    const after = orchestrator.listGroupStates('batch-tray');
    expect(after.some((s) => s.status === 'needsAdminLevelResolution')).toBe(false);
    expect(resolutionMock.applyPreResolveFromOrchestrator).toHaveBeenCalledWith('job-1');
  });
});
