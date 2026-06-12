import { TestBed } from '@angular/core/testing';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { UploadResolverTrayOrchestratorService } from './upload-resolver-tray-orchestrator.service';
import {
  PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS,
  PRESENTATION_BUNDLE_WINDOW_MS,
} from './upload-resolver-tray-orchestrator.types';

describe('UploadResolverTrayOrchestratorService', () => {
  let service: UploadResolverTrayOrchestratorService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [UploadResolverTrayOrchestratorService],
    });
    service = TestBed.inject(UploadResolverTrayOrchestratorService);
    service.resetAll();
  });

  afterEach(() => {
    vi.useRealTimers();
    service.resetAll();
  });

  const baseItem = {
    dialogueUnitId: 'unit-base',
    producerId: 'upload-location-resolution',
    batchId: 'batch-1',
    questionKey: 'upload.resolver.question.city',
    options: [
      { id: 'c1', label: 'Bern' },
      { id: 'c2', label: 'Zürich' },
    ],
    jobIds: ['job-1'],
  };

  it('presents bundle early on scanIdle before max window', () => {
    service.enqueueItem(baseItem);
    expect(service.hasActivePresentation()).toBe(false);
    service.notifyScanIdle('batch-1');
    expect(service.hasActivePresentation()).toBe(true);
    expect(service.activeItems().length).toBe(1);
  });

  it('waits up to presentationBundleWindowMs when scan not idle', () => {
    service.enqueueItem(baseItem);
    vi.advanceTimersByTime(PRESENTATION_BUNDLE_WINDOW_MS - 1);
    expect(service.hasActivePresentation()).toBe(false);
    vi.advanceTimersByTime(1);
    expect(service.hasActivePresentation()).toBe(true);
  });

  it('resolveItem emits itemResolved$ immediately', () => {
    const events: unknown[] = [];
    service.itemResolved$.subscribe((event) => events.push(event));
    service.enqueueItem(baseItem);
    service.notifyScanIdle('batch-1');
    const itemId = service.activeItem()?.id;
    service.resolveItem(itemId!, { optionId: 'c1' });
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({ answer: { optionId: 'c1' }, skipped: false });
  });

  it('closes collecting and starts new bundle when dialogue unit cap exceeded', () => {
    for (let i = 0; i < PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS; i++) {
      service.enqueueItem({
        ...baseItem,
        dialogueUnitId: `unit-${i}`,
        questionKey: `q-${i}`,
      });
    }
    service.enqueueItem({
      ...baseItem,
      dialogueUnitId: 'unit-overflow',
      questionKey: 'q-overflow',
    });
    service.notifyScanIdle('batch-1');
    expect(service.hasActivePresentation()).toBe(true);
    expect(service.activeItems().length).toBeLessThanOrEqual(
      PRESENTATION_BUNDLE_MAX_DIALOGUE_UNITS + 1,
    );
  });

  it('emits bundleCompleted$ when all items terminal', () => {
    const completed: unknown[] = [];
    service.bundleCompleted$.subscribe((event) => completed.push(event));
    service.presentBundleImmediately('batch-1', [baseItem]);
    const itemId = service.activeItem()?.id;
    service.resolveItem(itemId!, { optionId: 'c1' });
    expect(completed).toHaveLength(1);
    expect(service.hasActivePresentation()).toBe(false);
  });
});
