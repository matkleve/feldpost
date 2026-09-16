import { describe, expect, it, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { UploadLocationDisambiguationRegistrationService } from './upload-location-disambiguation-registration.service';
import { UploadJobStateService } from '../support/upload-job-state.service';
import type { UploadJob } from '../upload-manager.types';

/**
 * Archive import must never register a disambiguation group.
 * @see docs/specs/service/media-upload-service/upload-archive-import-mode.fsm.supplement.md
 */

function makeJob(id: string, importMode: UploadJob['importMode']): UploadJob {
  return {
    id,
    batchId: 'batch-1',
    file: new File(['x'], `${id}.jpg`, { type: 'image/jpeg' }),
    phase: 'resolving_location',
    progress: 0,
    statusLabel: '',
    submittedAt: new Date(),
    importMode,
  } as UploadJob;
}

function setup(importMode: UploadJob['importMode']) {
  const jobState = TestBed.inject(UploadJobStateService);
  jobState.addJobs([makeJob('job-1', importMode), makeJob('job-2', importMode)]);
  const service = TestBed.inject(UploadLocationDisambiguationRegistrationService);
  return { jobState, service };
}

const INPUT = {
  batchId: 'batch-1',
  queryKey: 'wien|thalistrasse 4',
  folderDisplayPath: 'Wien/Thalistraße 4',
  titleAddress: 'Thalistraße 4, Wien',
  jobIds: ['job-1', 'job-2'],
  candidates: [
    { id: 'c1', addressLabel: 'Thalistraße 4, Wien', lat: 48.2, lng: 16.3 },
    { id: 'c2', addressLabel: 'Thalistraße 4, Graz', lat: 47.0, lng: 15.4 },
  ],
  disambiguationKind: 'geocode' as const,
};

describe('archive import · no disambiguation group is registered', () => {
  it('interactive mode registers the group and parks its jobs (control)', () => {
    TestBed.resetTestingModule();
    const { jobState, service } = setup('interactive');

    service.registerDisambiguationGroup(INPUT);

    expect(jobState.findJob('job-1')?.phase).toBe('awaiting_disambiguation');
  });

  it('archive mode registers nothing, so no job reaches awaiting_disambiguation', () => {
    TestBed.resetTestingModule();
    const { jobState, service } = setup('archive');

    service.registerDisambiguationGroup(INPUT);

    // The phase this mode forbids. Holding only the tray's *presentation* would still leave the
    // jobs here, waiting on a user who has nothing to answer — TRAP-021's shape.
    expect(jobState.findJob('job-1')?.phase).not.toBe('awaiting_disambiguation');
    expect(jobState.findJob('job-2')?.phase).not.toBe('awaiting_disambiguation');
  });

  it('archive mode routes those jobs to Issues as address_deferred', () => {
    TestBed.resetTestingModule();
    const { jobState, service } = setup('archive');

    service.registerDisambiguationGroup(INPUT);

    for (const id of ['job-1', 'job-2']) {
      const job = jobState.findJob(id);
      expect(job?.phase).toBe('missing_data');
      expect(job?.issueKind).toBe('address_deferred');
    }
  });

  it('a job with no importMode behaves as interactive', () => {
    TestBed.resetTestingModule();
    const { jobState, service } = setup(undefined);

    service.registerDisambiguationGroup(INPUT);

    expect(jobState.findJob('job-1')?.phase).toBe('awaiting_disambiguation');
  });
});
