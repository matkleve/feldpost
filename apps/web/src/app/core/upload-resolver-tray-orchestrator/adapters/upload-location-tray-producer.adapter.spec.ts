/**
 * Exercises the real producer adapter (349 LOC, previously 0 tests — only
 * indirectly touched via upload-resolver-tray.component.spec.ts driving the
 * hand-written upload-resolver-tray.mock-orchestrator fixture instead of
 * this adapter). Uses the real UploadResolverTrayOrchestratorService (it has
 * no injected dependencies of its own) so `enqueueItem` / `resolveActiveItem`
 * drive the adapter's `itemResolved$` subscription exactly as production
 * does; UploadLocationResolutionService and UploadManagerService are faked
 * since only a handful of their methods are called here.
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 (P9 "Also:")
 * @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 2 L12
 */
import { TestBed } from '@angular/core/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { UploadLocationResolutionService } from '../../upload/location/upload-location-resolution.service';
import { UploadManagerService } from '../../upload/upload-manager.service';
import type { UploadAddressCandidate, UploadDisambiguationGroup } from '../../upload/upload-manager.types';
import { UploadResolverTrayOrchestratorService } from '../upload-resolver-tray-orchestrator.service';
import { UploadLocationTrayProducerAdapter } from './upload-location-tray-producer.adapter';

function candidate(overrides: Partial<UploadAddressCandidate> = {}): UploadAddressCandidate {
  return {
    id: 'candidate-1',
    addressLabel: 'Rennweg 6, Wien',
    lat: 48.19,
    lng: 16.38,
    city: 'Wien',
    ...overrides,
  };
}

function sourceConflictGroup(overrides: Partial<UploadDisambiguationGroup> = {}): UploadDisambiguationGroup {
  return {
    id: 'group-1',
    batchId: 'batch-1',
    queryKey: 'source|gk-rennweg',
    folderDisplayPath: 'Rennweg 6',
    titleAddress: 'Rennweg 6, Wien',
    jobIds: ['job-1'],
    candidates: [
      candidate({ id: 'source-text', addressLabel: 'Rennweg 6, Wien (folder)' }),
      candidate({ id: 'source-exif', addressLabel: 'Rennweg 8, Wien (EXIF)', lat: 48.191, lng: 16.381 }),
    ],
    collapseStage: 'per_file',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'source',
    ...overrides,
  };
}

function cityStepGroup(overrides: Partial<UploadDisambiguationGroup> = {}): UploadDisambiguationGroup {
  return {
    id: 'group-city',
    batchId: 'batch-1',
    queryKey: 'geocode|gk-thaliastrasse',
    folderDisplayPath: 'Thaliastraße',
    titleAddress: 'Thaliastraße',
    jobIds: ['job-2'],
    candidates: [
      candidate({ id: 'cand-a', city: 'Wien', addressLabel: 'Thaliastraße, Wien' }),
      candidate({ id: 'cand-b', city: 'Graz', addressLabel: 'Thaliastraße, Graz' }),
    ],
    collapseStage: 'city',
    resolutionStatus: 'pending',
    resolutionGateOpen: true,
    disambiguationKind: 'city_step',
    trayStep: '1a',
    ...overrides,
  };
}

describe('UploadLocationTrayProducerAdapter', () => {
  let adapter: UploadLocationTrayProducerAdapter;
  let orchestrator: UploadResolverTrayOrchestratorService;
  let resolution: {
    disambiguationGroups: ReturnType<typeof vi.fn>;
    deferGroup: ReturnType<typeof vi.fn>;
    applyContainmentCheckChoice: ReturnType<typeof vi.fn>;
    applyTrayHouseSelection: ReturnType<typeof vi.fn>;
    confirmTrayCity: ReturnType<typeof vi.fn>;
  };
  let uploadManager: { selectAddressCandidate: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    resolution = {
      disambiguationGroups: vi.fn().mockReturnValue([]),
      deferGroup: vi.fn(),
      applyContainmentCheckChoice: vi.fn(),
      applyTrayHouseSelection: vi.fn(),
      confirmTrayCity: vi.fn().mockResolvedValue(undefined),
    };
    uploadManager = { selectAddressCandidate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        UploadLocationTrayProducerAdapter,
        UploadResolverTrayOrchestratorService,
        { provide: UploadLocationResolutionService, useValue: resolution },
        { provide: UploadManagerService, useValue: uploadManager },
      ],
    });

    adapter = TestBed.inject(UploadLocationTrayProducerAdapter);
    orchestrator = TestBed.inject(UploadResolverTrayOrchestratorService);
  });

  it('maps a source-conflict group to a tray item with the source question key and both candidates as options', () => {
    const group = sourceConflictGroup();

    const itemId = adapter.syncGroupToOrchestrator(group);
    adapter.notifyScanIdle(group.batchId);

    expect(itemId).not.toBe('');
    const activeItem = orchestrator.activeItem();
    expect(activeItem?.questionKey).toBe('upload.resolver.question.source');
    expect(activeItem?.options.map((o) => o.id)).toEqual(['source-text', 'source-exif']);
    expect(activeItem?.jobIds).toEqual(['job-1']);
  });

  it('does not enqueue a second item for the same group and tray step', () => {
    const group = sourceConflictGroup();
    const enqueueSpy = vi.spyOn(orchestrator, 'enqueueItem');

    const first = adapter.syncGroupToOrchestrator(group);
    const second = adapter.syncGroupToOrchestrator(group);

    expect(second).toBe(first);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });

  it('routes a resolved source-conflict answer to UploadManagerService.selectAddressCandidate', () => {
    const group = sourceConflictGroup();
    resolution.disambiguationGroups.mockReturnValue([group]);

    adapter.syncGroupToOrchestrator(group);
    adapter.notifyScanIdle(group.batchId);
    const itemId = orchestrator.activeItem()!.id;

    orchestrator.resolveItem(itemId, { optionId: 'source-exif' });

    expect(uploadManager.selectAddressCandidate).toHaveBeenCalledWith(
      'job-1',
      expect.objectContaining({ id: 'source-exif' }),
    );
  });

  it('defers the group and clears its mapping when the tray item is skipped', () => {
    const group = sourceConflictGroup();
    resolution.disambiguationGroups.mockReturnValue([group]);

    adapter.syncGroupToOrchestrator(group);
    adapter.notifyScanIdle(group.batchId);
    const itemId = orchestrator.activeItem()!.id;

    orchestrator.skipItem(itemId);

    expect(resolution.deferGroup).toHaveBeenCalledWith(group.id);

    // Mapping was cleared — syncing the same group again enqueues a fresh item.
    const enqueueSpy = vi.spyOn(orchestrator, 'enqueueItem');
    adapter.syncGroupToOrchestrator(group);
    expect(enqueueSpy).toHaveBeenCalledTimes(1);
  });

  it('routes a resolved 1a city-step answer to confirmTrayCity', () => {
    const group = cityStepGroup();
    resolution.disambiguationGroups.mockReturnValue([group]);

    adapter.syncGroupToOrchestrator(group);
    adapter.notifyScanIdle(group.batchId);
    const activeItem = orchestrator.activeItem()!;
    expect(activeItem.questionKey).toBe('upload.resolver.question.cityStep');

    orchestrator.resolveItem(activeItem.id, { optionId: 'cand-a' });

    expect(resolution.confirmTrayCity).toHaveBeenCalledWith(group.id, 'Wien');
  });
});
