/**
 * Wires the REAL upload pipeline into a headless run for the trace harness.
 *
 * Real, unmodified production code: `UploadManagerService`, `UploadService`, the three
 * pipelines, `UploadAddressResolutionOrchestrator`, `UploadLocationResolutionService`, the
 * queue/job-state/dedup/hash/tray services, and the AT geo assets under `assets/geo`.
 *
 * Substituted: `SupabaseService` (in-memory), `GeocodingService` (stub gazetteer),
 * `AuthService` (fixed user), `LocalGeoDataAdapter` (same JSON, read from disk instead of
 * fetched), and `UploadService.parseExif` (synthetic files carry no real EXIF).
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { Injectable, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { GeocodingService } from '../../geocoding/geocoding.service';
import type { GeocoderSearchResult } from '../../geocoding/geocoding.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { LocalGeoDataAdapter } from '../../location-path-parser/local-geo-data.adapter';
import type { BundeslandRecord, GemeindeRecord, PlzMap } from '../../location-path-parser/local-geo-data.adapter';
import { UploadAddressResolutionOrchestrator } from '../address-resolution/upload-address-resolution.orchestrator';
import { UploadLocationResolutionService } from '../location/upload-location-resolution.service';
import { UploadManagerService } from '../upload-manager.service';
import { UploadService } from '../upload.service';
import type { ParsedExif } from '../upload.types';
import type { UploadJob } from '../upload-manager.types';
import { ACTIVE_PHASES } from '../support/upload-phase-transitions';
import { scenarioToScannedEntry, type UploadTraceScenario } from './upload-trace-fixtures';
import { stubReverse, stubStructuredForward } from './upload-trace-geocoder.stub';
import { buildTraceSupabaseFake, TRACE_USER_ID } from './upload-trace-supabase.fake';
import type { UploadTraceRecorder } from './upload-trace-recorder';

const ASSETS_DIR = path.join(__dirname, '../../../../assets/geo');

export interface RealGeoData {
  states: BundeslandRecord[];
  municipalities: GemeindeRecord[];
  postcodeMap: PlzMap;
}

/** The production geo assets, read from disk instead of fetched — same bytes the app ships. */
export function loadRealGeo(): RealGeoData {
  const read = <T>(file: string): T =>
    JSON.parse(fs.readFileSync(path.join(ASSETS_DIR, file), 'utf-8')) as T;
  return {
    states: read<BundeslandRecord[]>('at-bundeslaender.json'),
    municipalities: read<GemeindeRecord[]>('at-gemeinden-bev.json'),
    postcodeMap: read<PlzMap>('at-plz.json'),
  };
}

/** Injected EXIF, keyed by File identity — synthetic bodies carry no readable EXIF. */
const injectedExif = new WeakMap<File, ParsedExif>();

export function injectExif(file: File, parsed: ParsedExif): void {
  injectedExif.set(file, parsed);
}

/** Real `UploadService` with only `parseExif` substituted. */
@Injectable()
export class TraceUploadService extends UploadService {
  override async parseExif(file: File): Promise<ParsedExif> {
    return injectedExif.get(file) ?? {};
  }
}

function buildGeocodingFake(recorder: UploadTraceRecorder): Partial<GeocodingService> {
  const forward = (
    params: { street: string; city?: string; postcode?: string },
    method: 'searchStructuredForward' | 'searchStructuredForwardBias',
  ): Promise<GeocoderSearchResult[]> => {
    const hits = stubStructuredForward(params);
    recorder.recordGeocode({
      method,
      params: { ...params },
      hitCount: hits.length,
      topLabel: hits[0]?.name ?? undefined,
      topScore: hits[0]?.importance,
    });
    return Promise.resolve(hits);
  };
  return {
    searchStructuredForward: (params) => forward(params, 'searchStructuredForward'),
    searchStructuredForwardBias: (params) => forward(params, 'searchStructuredForwardBias'),
    reverse: (lat: number, lng: number) => {
      recorder.recordGeocode({ method: 'reverse', params: { lat, lng }, hitCount: 1 });
      return Promise.resolve(stubReverse(lat, lng));
    },
    search: () => Promise.resolve([]),
    forward: () => Promise.resolve(null),
    searchStreetHouseNumbers: () => Promise.resolve([]),
  } as Partial<GeocodingService>;
}

export interface TraceHarness {
  manager: UploadManagerService;
  orchestrator: UploadAddressResolutionOrchestrator;
  locationResolution: UploadLocationResolutionService;
  insertedMediaIds: string[];
  dedupHashCount: () => number;
}

export function configureTraceHarness(recorder: UploadTraceRecorder): TraceHarness {
  const supabase = buildTraceSupabaseFake(recorder);
  const geo = loadRealGeo();
  const user = signal({ id: TRACE_USER_ID });

  TestBed.configureTestingModule({
    providers: [
      UploadManagerService,
      { provide: UploadService, useClass: TraceUploadService },
      { provide: SupabaseService, useValue: supabase },
      { provide: GeocodingService, useValue: buildGeocodingFake(recorder) },
      {
        provide: AuthService,
        useValue: {
          user: user.asReadonly(),
          session: signal(null).asReadonly(),
          loading: signal(false).asReadonly(),
        },
      },
      {
        provide: LocalGeoDataAdapter,
        useValue: {
          getBundeslaender: (): Promise<BundeslandRecord[]> => Promise.resolve(geo.states),
          getGemeinden: (): Promise<GemeindeRecord[]> => Promise.resolve(geo.municipalities),
          getPlzMap: (): Promise<PlzMap> => Promise.resolve(geo.postcodeMap),
        },
      },
    ],
  });

  return {
    manager: TestBed.inject(UploadManagerService),
    orchestrator: TestBed.inject(UploadAddressResolutionOrchestrator),
    locationResolution: TestBed.inject(UploadLocationResolutionService),
    insertedMediaIds: supabase.insertedMediaIds,
    dedupHashCount: () => supabase.dedupRegistry.size(),
  };
}

const SETTLE_POLL_MS = 5;
const SETTLE_MAX_POLLS = 2000;

/** A job is settled when it is terminal or parked in a tray / conflict gate. */
function isSettled(job: UploadJob): boolean {
  return !ACTIVE_PHASES.has(job.phase);
}

export async function waitForBatchSettled(
  manager: UploadManagerService,
  maxPolls = SETTLE_MAX_POLLS,
): Promise<boolean> {
  for (let poll = 0; poll < maxPolls; poll += 1) {
    const jobs = manager.jobs();
    if (jobs.length > 0 && jobs.every(isSettled)) {
      return true;
    }
    await new Promise((resolve) => setTimeout(resolve, SETTLE_POLL_MS));
  }
  return false;
}

export interface TraceRunResult {
  harness: TraceHarness;
  batchId: string;
  settled: boolean;
  jobs: readonly UploadJob[];
}

export interface TraceRunOptions {
  rootFolderLabel?: string;
  /** `optional` is the panel's "upload without location" mode. */
  locationRequirementMode?: 'required' | 'optional';
  /**
   * `folder` = webkitdirectory submit, folder segments carry address hints (Action 2).
   * `files` = plain multi-file submit, no folder context at all (Action 1).
   */
  submitMode?: 'folder' | 'files';
}

/** Submit the corpus as one webkitdirectory folder batch and let the pipeline run. */
export async function runTraceBatch(
  scenarios: readonly UploadTraceScenario[],
  recorder: UploadTraceRecorder,
  options: TraceRunOptions = {},
): Promise<TraceRunResult> {
  const harness = configureTraceHarness(recorder);
  const entries = scenarios.map((scenario) => {
    recorder.registerScenario(scenario.relativePath, scenario.id);
    // Plain multi-file submit keeps only the leaf name as relativePath.
    recorder.registerScenario(scenario.relativePath.split('/').pop() ?? scenario.id, scenario.id);
    const entry = scenarioToScannedEntry(scenario);
    if (scenario.exifCoords) {
      injectExif(entry.file, { coords: scenario.exifCoords });
    }
    return entry;
  });

  const phaseSub = harness.manager.jobPhaseChanged$.subscribe((event) => {
    recorder.recordPhase(event.jobId, event.previousPhase, event.currentPhase);
  });

  const submitOptions = { locationRequirementMode: options.locationRequirementMode };
  const batchId =
    options.submitMode === 'files'
      ? await harness.manager.submit(
          entries.map((entry) => entry.file),
          submitOptions,
        )
      : await harness.manager.submitWebkitFolder(
          entries,
          options.rootFolderLabel ?? 'Trace Batch',
          submitOptions,
        );
  for (const job of harness.manager.jobs()) {
    recorder.bindJob(job);
    recorder.record('intake', `job created — ${job.relativePath ?? job.file.name}`, {
      folderHint: job.titleAddress,
      hintSource: job.titleAddressSource,
      projectId: job.projectId,
    }, job.id);
  }

  const settled = await waitForBatchSettled(harness.manager);
  phaseSub.unsubscribe();

  for (const state of harness.orchestrator.listGroupStates(batchId)) {
    recorder.recordGroupState(state);
  }

  return { harness, batchId, settled, jobs: harness.manager.jobs() };
}
