import { describe, expect, it, vi } from 'vitest';
import { submitUploadManagerWebkitFolder } from './upload-manager-submit.util';
import type { UploadJob } from '../upload-manager.types';

/**
 * Guarantees of the chunked-classification contract.
 * @see docs/specs/service/media-upload-service/upload-manager-pipeline.chunked-classification.supplement.md
 */

function makeEntries(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    file: new File(['x'], `IMG_${i}.jpg`, { type: 'image/jpeg' }),
    relativePath: `Wien/Thalistraße 4/IMG_${i}.jpg`,
    directorySegments: ['Wien', 'Thalistraße 4'],
  }));
}

/** A deps double that records the order of the calls the contract is about. */
function makeDeps(count: number) {
  const events: string[] = [];
  const added: string[] = [];
  const classified: string[] = [];
  const deps = {
    addBatch: vi.fn(),
    updateBatch: vi.fn(),
    createImmediatePreviewUrl: vi.fn(() => undefined),
    extractAddressFromFolderPathSegments: vi.fn(() => undefined),
    getLocationConfig: vi.fn(() => ({
      maxDirectorySegmentsForHint: 2,
      folderHierarchyTraversalOrder: 'deepest-first',
      folderHintRequireHighConfidence: false,
      folderHintUseRootFallback: true,
    })),
    addJobs: vi.fn((jobs: UploadJob[]) => {
      events.push(`add:${jobs.length}`);
      for (const j of jobs) added.push(j.id);
    }),
    hydrateDeferredPreviews: vi.fn(),
    drainQueue: vi.fn(() => {
      events.push(`drain:${added.length}/${classified.length}`);
    }),
    classifyBatch: vi.fn(async (_batchId: string, options?: { jobIds?: ReadonlySet<string> }) => {
      const ids = [...(options?.jobIds ?? [])];
      events.push(`classify:${ids.length}`);
      classified.push(...ids);
    }),
    beginBatchClassification: vi.fn((_batchId: string, total: number) => {
      events.push(`begin:${total}`);
    }),
    finalizeBatchClassification: vi.fn(async () => {
      events.push('finalize');
    }),
    extractAddressFromFolderName: vi.fn(() => undefined),
    queuedLabel: '',
  } as unknown as Parameters<typeof submitUploadManagerWebkitFolder>[3];

  return { deps, events, added, classified, count };
}

describe('submit · chunked classification', () => {
  it('G2: a batch larger than one chunk is classified in several chunks, not one', async () => {
    const { deps, events } = makeDeps(600);

    await submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps);

    const classifyCalls = events.filter((e) => e.startsWith('classify:'));
    expect(classifyCalls.length).toBeGreaterThan(1);
  });

  it('G1: every drain happens with all added jobs already classified', async () => {
    const { deps, events } = makeDeps(600);

    await submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps);

    // `drain:<added>/<classified>` — a job must never be drainable before its chunk classified.
    for (const event of events.filter((e) => e.startsWith('drain:'))) {
      const [added, classified] = event.slice('drain:'.length).split('/').map(Number);
      expect(classified).toBe(added);
    }
  });

  it('G1: uploading starts before the whole batch is classified', async () => {
    const { deps, events } = makeDeps(600);

    await submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps);

    const firstDrain = events.findIndex((e) => e.startsWith('drain:'));
    const lastClassify = events.map((e) => e.startsWith('classify:')).lastIndexOf(true);
    expect(firstDrain).toBeGreaterThan(-1);
    expect(firstDrain).toBeLessThan(lastClassify);
  });

  it('G4: tray presentation is armed for the whole batch up front and released at the end', async () => {
    const { deps, events } = makeDeps(600);

    await submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps);

    expect(events[0]).toBe('begin:600');
    expect(events.at(-2)).toBe('finalize');
  });

  it('G6: a chunk that throws does not stop later chunks or the drain', async () => {
    const { deps, events } = makeDeps(600);
    const classify = deps.classifyBatch as unknown as ReturnType<typeof vi.fn>;
    classify.mockImplementationOnce(async () => {
      events.push('classify:boom');
      throw new Error('chunk failed');
    });

    await expect(
      submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps),
    ).resolves.toBeTypeOf('string');

    expect(events.filter((e) => e.startsWith('classify:')).length).toBeGreaterThan(1);
    expect(events.filter((e) => e.startsWith('drain:')).length).toBeGreaterThan(1);
  });

  it('F-05: locationRequirementMode "optional" classifies nothing and asks nothing', async () => {
    const { deps, events, added } = makeDeps(600);

    await submitUploadManagerWebkitFolder(
      makeEntries(600),
      'Wien',
      { locationRequirementMode: 'optional' },
      deps,
    );

    // "Uploads without a location" must mean exactly that: no classification, so no layer
    // packages, no area conflicts, no geocode and no tray.
    expect(events.filter((e) => e.startsWith('classify:'))).toEqual([]);
    expect(deps.beginBatchClassification).not.toHaveBeenCalled();
    // The files still upload.
    expect(added.length).toBe(600);
    expect(events.filter((e) => e.startsWith('drain:')).length).toBeGreaterThan(0);
  });

  it('F-05: "required" still classifies, so the skip is the mode and not the path', async () => {
    const { deps, events } = makeDeps(600);

    await submitUploadManagerWebkitFolder(
      makeEntries(600),
      'Wien',
      { locationRequirementMode: 'required' },
      deps,
    );

    expect(events.filter((e) => e.startsWith('classify:')).length).toBeGreaterThan(0);
  });

  it('classifies every submitted job exactly once across all chunks', async () => {
    const { deps, added, classified } = makeDeps(600);

    await submitUploadManagerWebkitFolder(makeEntries(600), 'Wien', undefined, deps);

    expect(classified.length).toBe(added.length);
    expect(new Set(classified).size).toBe(classified.length);
  });
});
