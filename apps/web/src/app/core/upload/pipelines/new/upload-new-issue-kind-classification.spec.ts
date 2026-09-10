/**
 * Compares the two independent "no location, route to Issues" classifiers in
 * the `new` pipeline: `routeJobToMissingData` (Branch A — no EXIF, no title
 * candidate) and the classifier inside `finalizeNewUploadPhase` for a failed
 * forward-geocode (`routeUnresolvedAfterFailedGeocode`, private). Both decide
 * `issueKind: 'document_unresolved' | 'missing_gps'` for the same job shape,
 * but from two different signals:
 *  - `routeJobToMissingData` asks `UploadService.resolveMediaType()`, which
 *    normalizes MIME with an extension fallback.
 *  - `routeUnresolvedAfterFailedGeocode` reads `job.file.type` directly, with
 *    no fallback.
 *
 * @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 T16
 * @see docs/audits/upload-process-analysis-2026-09-08/07-failure-modes.md F6
 */
import { describe, expect, it, vi } from 'vitest';
import { routeJobToMissingData } from './upload-new-prepare-route.util';
import { finalizeNewUploadPhase } from './upload-new-post-save.util';
import { resolveUploadMediaType, resolveUploadMimeType } from '../../support/upload.service.util';
import type { UploadJob } from '../../upload-manager.types';
import type { PipelineContext } from '../../upload-manager.types';

/** A document whose browser-reported MIME is empty — common for some platforms/pickers. */
function emptyMimeDocumentFile(): File {
  return new File(['%PDF-1.4'], 'Grundbuchauszug.pdf', { type: '' });
}

describe('issueKind classification: routeJobToMissingData vs. failed-geocode routing', () => {
  // @see docs/audits/upload-process-analysis-2026-09-08/09-coverage.md § 4 T16
  // Known divergence, not fixed here — issueKind assignment is P6b territory
  // (out of this task's scope; being reworked concurrently elsewhere). This
  // documents the current (diverging) behavior so the eventual P6b fix can
  // flip it from `.fails` to a normal `it`.
  it.fails('both classifiers produce the same issueKind for the same empty-MIME document', async () => {
    const file = emptyMimeDocumentFile();

    // Sanity check: the file really does resolve to 'document' once MIME
    // sniffing (with extension fallback) runs on it.
    expect(resolveUploadMediaType(resolveUploadMimeType(file))).toBe('document');

    // Path 1: routeJobToMissingData (Branch A, no EXIF/no title candidate).
    let jobA: UploadJob = {
      id: 'job-a',
      batchId: 'batch-1',
      file,
      phase: 'extracting_title',
      progress: 0,
      statusLabel: 'Checking filename…',
      submittedAt: new Date(),
      mode: 'new',
    };
    const depsA = {
      jobState: {
        findJob: vi.fn(() => jobA),
        updateJob: vi.fn((_id: string, patch: Partial<UploadJob>) => {
          jobA = { ...jobA, ...patch };
        }),
        setPhase: vi.fn((_id: string, phase: UploadJob['phase']) => {
          jobA = { ...jobA, phase };
        }),
      },
      queue: { markDone: vi.fn() },
      uploadService: {
        resolveMediaType: (f: File) => resolveUploadMediaType(resolveUploadMimeType(f)),
      },
    };
    const ctxA = {
      emitMissingData: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
    } as unknown as PipelineContext;

    routeJobToMissingData(
      depsA as unknown as Parameters<typeof routeJobToMissingData>[0],
      jobA.id,
      jobA,
      ctxA,
    );
    const issueKindFromMissingData = jobA.issueKind;

    // Path 2: finalizeNewUploadPhase's failed-forward-geocode routing.
    let jobB: UploadJob = {
      id: 'job-b',
      batchId: 'batch-1',
      file,
      phase: 'saving_record',
      progress: 100,
      statusLabel: 'Saving',
      submittedAt: new Date(),
      mode: 'new',
      mediaId: 'media-1',
      titleAddress: 'Rennweg 6, Wien',
      locationRequirementMode: 'required',
      coords: undefined,
    };

    await finalizeNewUploadPhase({
      jobId: jobB.id,
      isCancelled: () => false,
      findJob: () => jobB,
      setPhase: vi.fn(),
      updateJob: (patch) => {
        jobB = { ...jobB, ...patch };
      },
      markDone: vi.fn(),
      emitBatchProgress: vi.fn(),
      drainQueue: vi.fn(),
      enrichWithReverseGeocode: vi.fn(),
      enrichWithForwardGeocode: vi.fn().mockResolvedValue(undefined),
      geocodeTitleAddress: vi.fn().mockResolvedValue(undefined),
      mismatchToleranceMeters: 15,
      setLocalUrl: vi.fn(),
      emitImageUploaded: vi.fn(),
    });
    const issueKindFromFailedGeocode = jobB.issueKind;

    expect(issueKindFromFailedGeocode).toBe(issueKindFromMissingData);
  });
});
