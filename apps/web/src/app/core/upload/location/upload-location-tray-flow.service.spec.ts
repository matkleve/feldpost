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
} from './upload-location-area-choice.util';
import { UploadLocationDisambiguationStoreService } from './upload-location-disambiguation-store.service';
import { UploadLocationResolutionService } from './upload-location-resolution.service';
import { UploadLocationTrayFlowService } from './upload-location-tray-flow.service';
import type { UploadJob } from '../upload-manager.types';
import type { UploadGroupResolutionState } from '../address-resolution/upload-address-resolution.types';

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
    deferGroup: ReturnType<typeof vi.fn>;
    applyCandidateToGroup: ReturnType<typeof vi.fn>;
  };
  let geocodingMock: {
    searchStreetHouseNumbers: ReturnType<typeof vi.fn>;
    searchStructuredForward: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    resolutionMock = {
      registerDisambiguationGroup: vi.fn(),
      notifyDisambiguationResolved: vi.fn(),
      applyPreResolveFromOrchestrator: vi.fn().mockResolvedValue('continue'),
      deferGroup: vi.fn(),
      applyCandidateToGroup: vi.fn(),
    };
    geocodingMock = {
      searchStreetHouseNumbers: vi.fn().mockResolvedValue([]),
      searchStructuredForward: vi.fn().mockResolvedValue([]),
    };

    TestBed.configureTestingModule({
      providers: [
        UploadLocationTrayFlowService,
        UploadAddressResolutionOrchestrator,
        UploadJobStateService,
        UploadBatchService,
        UploadLocationDisambiguationStoreService,
        { provide: UploadLocationResolutionService, useValue: resolutionMock },
        { provide: GeocodingService, useValue: geocodingMock },
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

  it('registerAreaConflictGroup registers admin_level_conflict with conflict payload', async () => {
    jobState.addJobs([buildJob()]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAreaResolution')!;
    trayFlow.registerAreaConflictGroup('batch-tray', adminState);

    expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-tray',
        disambiguationKind: 'admin_level_conflict',
        jobIds: adminState.jobIds,
        areaConflicts: expect.arrayContaining([
          expect.objectContaining({ field: 'city' }),
        ]),
      }),
    );
    const input = resolutionMock.registerDisambiguationGroup.mock.calls[0]![0];
    expect(input.candidates.length).toBeGreaterThanOrEqual(2);
    expect(input.queryKey).toBe(adminState.areaConflictQueryKey);
  });

  it('applyAreaConflictChoice clears admin conflict and continues pre-resolve', async () => {
    jobState.addJobs([buildJob()]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAreaResolution')!;
    const conflicts = adminState.areaConflicts ?? [];
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
      queryKey: adminState.areaConflictQueryKey ?? adminState.groupingKey,
      folderDisplayPath: adminState.folderDisplayPath,
      titleAddress: adminState.titleAddressLabel,
      jobIds: [...adminState.jobIds],
      candidates,
      disambiguationKind: 'admin_level_conflict',
    });
    disambiguationStore.patchGroup({
      ...group,
      areaConflicts: conflicts,
    });

    await trayFlow.applyAreaConflictChoice(
      disambiguationStore.groups().find((g) => g.id === group.id)!,
      wienCandidateId,
    );

    const after = orchestrator.listGroupStates('batch-tray');
    expect(after.some((s) => s.status === 'needsAreaResolution')).toBe(false);
    expect(after.some((s) => s.status === 'needsGeocode' || s.status === 'partial')).toBe(true);
    expect(resolutionMock.notifyDisambiguationResolved).toHaveBeenCalled();
    expect(resolutionMock.applyPreResolveFromOrchestrator).toHaveBeenCalledWith('job-1');
  });

  it('applyAreaConflictChoice accepts manual city entry on Wien/Innsbruck street path', async () => {
    jobState.addJobs([
      buildJob({
        relativePath: 'AT/Wien/Innsbruck/Hauptstraße 5/photo.jpg',
      }),
    ]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAreaResolution')!;
    const conflicts = adminState.areaConflicts ?? [];
    const candidates = buildAdminConflictCandidates(conflicts).map((c) => ({
      id: c.id,
      addressLabel: c.addressLabel,
      lat: 0,
      lng: 0,
    }));
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: adminState.areaConflictQueryKey ?? adminState.groupingKey,
      folderDisplayPath: adminState.folderDisplayPath,
      titleAddress: adminState.titleAddressLabel,
      jobIds: [...adminState.jobIds],
      candidates,
      disambiguationKind: 'admin_level_conflict',
    });
    disambiguationStore.patchGroup({
      ...group,
      areaConflicts: conflicts,
    });

    await trayFlow.applyAreaConflictChoice(
      disambiguationStore.groups().find((g) => g.id === group.id)!,
      adminLevelManualCandidateId('city'),
      'Wien',
    );

    const after = orchestrator.listGroupStates('batch-tray');
    expect(after.some((s) => s.status === 'needsAreaResolution')).toBe(false);
    expect(resolutionMock.applyPreResolveFromOrchestrator).toHaveBeenCalledWith('job-1');
  });

  it('G2: cascading re-registration uses buildAdminConflictSignature not field names', async () => {
    jobState.addJobs([
      buildJob({
        id: 'job-cascade',
        relativePath: 'AT/Wien/Innsbruck/Graz/Hauptstraße 5/photo.jpg',
      }),
    ]);
    await orchestrator.classifyBatch('batch-tray');

    const adminState = orchestrator
      .listGroupStates('batch-tray')
      .find((s) => s.status === 'needsAreaResolution')!;
    const conflicts = adminState.areaConflicts ?? [];
    const candidates = buildAdminConflictCandidates(conflicts).map((c) => ({
      id: c.id,
      addressLabel: c.addressLabel,
      lat: 0,
      lng: 0,
    }));
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: adminState.areaConflictQueryKey ?? adminState.groupingKey,
      folderDisplayPath: adminState.folderDisplayPath,
      titleAddress: adminState.titleAddressLabel,
      jobIds: [...adminState.jobIds],
      candidates,
      disambiguationKind: 'admin_level_conflict',
    });
    disambiguationStore.patchGroup({
      ...group,
      areaConflicts: conflicts,
    });

    const cityEntry = conflicts[0]?.entries.find(
      (e) => e.field === 'city' && e.value === 'Wien',
    );
    if (cityEntry) {
      await trayFlow.applyAreaConflictChoice(
        disambiguationStore.groups().find((g) => g.id === group.id)!,
        adminLevelCandidateId(cityEntry),
      );
    }

    const afterStates = orchestrator.listGroupStates('batch-tray');
    const cascaded = afterStates.find((s) => s.status === 'needsAreaResolution');
    if (cascaded) {
      expect(cascaded.areaConflictQueryKey).toContain('adminConflict|');
      expect(cascaded.areaConflictQueryKey).not.toMatch(/^adminConflict\|[a-z_]+(,[a-z_]+)*$/);
    }
  });

  describe('D-11: street corroboration pre-check', () => {
    function hit(city: string, houseNumber?: string): {
      lat: number;
      lng: number;
      displayName: string;
      name: string | null;
      importance: number;
      address: { road?: string; house_number?: string; city?: string };
    } {
      return {
        lat: 47.26,
        lng: 11.39,
        displayName: `Hauptstraße${houseNumber ? ` ${houseNumber}` : ''}, ${city}`,
        name: 'Hauptstraße',
        importance: 0.5,
        address: { road: 'Hauptstraße', house_number: houseNumber, city },
      };
    }

    it('Tier 1 (house number embedded) auto-resolves with the hit\'s own pin, no second geocode', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße 5/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward.mockResolvedValueOnce([hit('Innsbruck', '5')]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      expect(geocodingMock.searchStructuredForward).toHaveBeenCalledTimes(1);
      const states = orchestrator.listGroupStates('batch-tray');
      expect(states.some((s) => s.status === 'needsAreaResolution')).toBe(false);
      const resolved = states.find((s) => s.status === 'resolved');
      expect(resolved?.searchObject.city).toBe('Innsbruck');
      expect(resolved?.candidate?.city).toBe('Innsbruck');
      expect(resolved?.searchObject.areaEvidence?.city?.[0]?.origin).toBe('derived');
      expect(resolutionMock.registerDisambiguationGroup).not.toHaveBeenCalled();
    });

    it('Tier 2 (bare street, no house number) corroborates the city only — geocode runs after', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward.mockResolvedValueOnce([hit('Innsbruck')]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      expect(geocodingMock.searchStructuredForward).toHaveBeenCalledTimes(1);
      const states = orchestrator.listGroupStates('batch-tray');
      expect(states.some((s) => s.status === 'needsAreaResolution')).toBe(false);
      const needsGeocode = states.find((s) => s.status === 'needsGeocode');
      expect(needsGeocode?.searchObject.city).toBe('Innsbruck');
      expect(needsGeocode?.geocodeBranch).toBe('street_locality');
      expect(resolutionMock.registerDisambiguationGroup).not.toHaveBeenCalled();
    });

    it('falls back to Tier 2 when Tier 1 (with house number) comes back with zero hits', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße 5/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([hit('Innsbruck')]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      expect(geocodingMock.searchStructuredForward).toHaveBeenCalledTimes(2);
      const needsGeocode = orchestrator
        .listGroupStates('batch-tray')
        .find((s) => s.status === 'needsGeocode');
      expect(needsGeocode?.searchObject.city).toBe('Innsbruck');
    });

    it('suggests a non-candidate city as an extra tray option, ranked below the folder candidates', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße 5/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward.mockResolvedValueOnce([hit('Salzburg', '5')]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      const adminState = orchestrator
        .listGroupStates('batch-tray')
        .find((s) => s.status === 'needsAreaResolution');
      expect(adminState?.suggestedAreaCandidate?.addressLabel).toContain('Salzburg');
      expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalled();
      const input = resolutionMock.registerDisambiguationGroup.mock.calls.at(-1)![0];
      const suggested = input.candidates.at(-1);
      expect(suggested.addressLabel).toBe(
        'Salzburg — the street was found here, not in Graz or Innsbruck. Did you mean Salzburg?',
      );
      expect(
        input.candidates
          .slice(0, -1)
          .every((c: { addressLabel: string }) => !c.addressLabel.includes('Did you mean')),
      ).toBe(true);
    });

    it('a tie between both candidate cities changes nothing — plain tray as today', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße 5/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward.mockResolvedValueOnce([
        hit('Graz', '5'),
        hit('Innsbruck', '5'),
      ]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      const adminState = orchestrator
        .listGroupStates('batch-tray')
        .find((s) => s.status === 'needsAreaResolution');
      expect(adminState).toBeTruthy();
      expect(adminState?.suggestedAreaCandidate).toBeUndefined();
      expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalled();
    });

    it('zero hits at both tiers leaves the tray open, unchanged', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/Hauptstraße 5/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');
      geocodingMock.searchStructuredForward.mockResolvedValue([]);

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      expect(geocodingMock.searchStructuredForward).toHaveBeenCalledTimes(2);
      expect(
        orchestrator.listGroupStates('batch-tray').some((s) => s.status === 'needsAreaResolution'),
      ).toBe(true);
    });

    it('a group with no street at all is left for the plain tray — nothing to corroborate', async () => {
      jobState.addJobs([buildJob({ relativePath: 'AT/Graz/Innsbruck/photo.jpg' })]);
      await orchestrator.classifyBatch('batch-tray');

      await trayFlow.registerAreaConflictGroupsAfterClassify('batch-tray');

      expect(geocodingMock.searchStructuredForward).not.toHaveBeenCalled();
      expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalled();
    });
  });

  it('G3: registerContainmentCheckGroup registers containment_check disambiguation', async () => {
    const state: UploadGroupResolutionState = {
      status: 'needsTray',
      groupingKey: 'at|wien|1200|wien|hauptstrasse|',
      jobIds: ['job-1'],
      searchObject: {
        country: 'AT',
        state: 'Wien',
        postcode: '1200',
        city: 'Wien',
        street: 'Hauptstraße',
        houseNumber: null,
        staircase: null,
        door: null,
        project: null,
        sources: [],
        sourceDeviations: [],
        postcodeCandidates: [],
        uncertainFields: [],
        groupingKey: 'at|wien|1200|wien|hauptstrasse|',
        relativePath: 'AT/Wien/1200/Hauptstraße',
        fileName: 'photo.jpg',
      },
      folderDisplayPath: 'AT/Wien/1200/Hauptstraße',
      titleAddressLabel: 'Hauptstraße, Wien',
      containmentCheck: true,
      trayStep: '3',
      candidates: [
        { id: 'keep-address', addressLabel: 'Keep: Hauptstraße, Wien', lat: 0, lng: 0 },
        { id: 'enter-different', addressLabel: 'Enter a different address', lat: 0, lng: 0 },
      ],
    };
    jobState.addJobs([buildJob({ id: 'job-1' })]);
    trayFlow.registerContainmentCheckGroup('batch-tray', state);

    expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        batchId: 'batch-tray',
        disambiguationKind: 'containment_check',
        candidates: expect.arrayContaining([
          expect.objectContaining({ id: 'keep-address' }),
          expect.objectContaining({ id: 'enter-different' }),
        ]),
      }),
    );
  });

  it('G3: applyContainmentCheckChoice with keep-address marks jobs partial', () => {
    jobState.addJobs([buildJob({ id: 'job-cc' })]);
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: 'containment|at|wien|1200|wien|hauptstrasse|',
      folderDisplayPath: 'AT/Wien/1200/Hauptstraße',
      titleAddress: 'Hauptstraße, Wien',
      jobIds: ['job-cc'],
      candidates: [
        { id: 'keep-address', addressLabel: 'Keep: Hauptstraße, Wien', lat: 0, lng: 0 },
        { id: 'enter-different', addressLabel: 'Enter a different address', lat: 0, lng: 0 },
      ],
      disambiguationKind: 'containment_check',
    });

    trayFlow.applyContainmentCheckChoice(group, 'keep-address');

    const updatedJob = jobState.findJob('job-cc');
    expect(updatedJob?.resolutionStatus).toBe('resolved');
    expect(updatedJob?.pendingPartialLocation).toBe(true);
    const updatedGroup = disambiguationStore.groups().find((g) => g.id === group.id)!;
    expect(updatedGroup.resolutionStatus).toBe('resolved');
    expect(updatedGroup.selectedCandidateId).toBe('keep-address');
  });

  it('G3: applyContainmentCheckChoice with enter-different opens fallback text tray', async () => {
    jobState.addJobs([
      buildJob({
        id: 'job-defer',
        relativePath: 'AT/Wien/1200/Hauptstraße/photo.jpg',
      }),
    ]);
    await orchestrator.classifyBatch('batch-tray');
    const groupingKey = orchestrator.listGroupStates('batch-tray')[0]?.groupingKey;
    expect(groupingKey).toBeTruthy();
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: `containment|${groupingKey}`,
      folderDisplayPath: 'AT/Wien/Hauptstraße',
      titleAddress: 'Hauptstraße, Wien',
      jobIds: ['job-defer'],
      candidates: [
        { id: 'keep-address', addressLabel: 'Keep', lat: 0, lng: 0 },
        { id: 'enter-different', addressLabel: 'Enter different', lat: 0, lng: 0 },
      ],
      disambiguationKind: 'containment_check',
    });

    trayFlow.applyContainmentCheckChoice(group, 'enter-different');

    expect(resolutionMock.deferGroup).not.toHaveBeenCalled();
    expect(resolutionMock.registerDisambiguationGroup).toHaveBeenCalledWith(
      expect.objectContaining({
        disambiguationKind: 'city_step',
        trayStep: '1a',
        candidates: [],
      }),
    );
  });

  it('NF-18: applyTrayHouseSelection with streetCentroid applies centroid candidate, not deferGroup', async () => {
    jobState.addJobs([buildJob({ id: 'job-house' })]);
    const group = disambiguationStore.createGroup({
      batchId: 'batch-tray',
      queryKey: 'house|at|wien|1010|wien|mariahilfer|',
      folderDisplayPath: 'AT/Wien/Mariahilfer Straße',
      titleAddress: 'Mariahilfer Straße, Wien',
      jobIds: ['job-house'],
      confirmedCity: 'Wien',
      disambiguationKind: 'house_step',
      trayStep: '1b',
      houseNumberCandidates: [
        { id: 'hn-1', addressLabel: 'Mariahilfer Straße 1', lat: 48.1, lng: 16.1, city: 'Wien' },
        { id: 'hn-2', addressLabel: 'Mariahilfer Straße 99', lat: 48.3, lng: 16.3, city: 'Wien' },
      ],
      candidates: [],
    });
    disambiguationStore.patchGroup(group);

    trayFlow.applyTrayHouseSelection(group.id, null, true);
    await Promise.resolve();

    expect(resolutionMock.deferGroup).not.toHaveBeenCalled();
    expect(resolutionMock.applyCandidateToGroup).toHaveBeenCalledWith(group.id, 'street-centroid');
  });
});
