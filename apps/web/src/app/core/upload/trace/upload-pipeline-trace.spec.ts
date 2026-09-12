/**
 * Upload pipeline trace harness.
 *
 * Pushes a synthetic batch through the REAL upload pipeline and reports what happened at every
 * step — intake, Search Object creation and filling, grouping, dedup, geocode, placement,
 * persistence — with an explicit real-vs-mock legend at the end.
 *
 * Two runs, because the pipeline has two genuinely different shapes:
 *   A. location required — the full address pipeline: Search Object → groups → geocode → trays.
 *   B. location optional — the panel's "upload without location" mode: hash → dedup → upload →
 *      media_items insert. This is the run that shows the server payloads.
 *
 * Quiet by default (assertions only) so it doubles as a regression test — run it with
 * `npx vitest run src/app/core/upload/trace/upload-pipeline-trace.spec.ts`. Print the trace with:
 *
 *   npm run trace:upload                       # 15 curated files
 *   npm run trace:upload -- --count=150        # + generated corpus
 *   npm run trace:upload -- --count=150 --seed=7 --detail=20 --answer-trays
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import { appendFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { ACTIVE_PHASES } from '../support/upload-phase-transitions';
import { clearInflightDedupRegistryForTests } from '../support/upload-inflight-dedup.registry';
import { clearHeicConversionRegistryForTests } from '../support/upload-heic-prepare.util';
import { TRACE_SCENARIOS, type UploadTraceScenario } from './upload-trace-fixtures';
import { buildGeneratedScenarios } from './upload-trace-generator';
import { UploadTraceRecorder } from './upload-trace-recorder';
import { loadRealGeo, runTraceBatch, waitForBatchSettled } from './upload-trace-harness';
import { autoAnswerTrays } from './upload-trace-tray-answers';
import { jobsByPath, printPersistReport, printTraceReport } from './upload-trace-report';
import { renderHeading } from './upload-trace-render';

const PRINT = process.env['UPLOAD_TRACE'] === '1';
const DEFAULT_SEED = 7;
const COUNT = Number(process.env['UPLOAD_TRACE_COUNT'] ?? TRACE_SCENARIOS.length);
const SEED = Number(process.env['UPLOAD_TRACE_SEED'] ?? DEFAULT_SEED);
const DETAIL = Number(process.env['UPLOAD_TRACE_DETAIL'] ?? TRACE_SCENARIOS.length);
/** Off by default: answering every tray with the first candidate is an exploration, not truth. */
const ANSWER_TRAYS = process.env['UPLOAD_TRACE_ANSWER_TRAYS'] === '1';
const TRACE_TIMEOUT_MS = 300_000;

function buildCorpus(): UploadTraceScenario[] {
  if (COUNT <= TRACE_SCENARIOS.length) {
    return TRACE_SCENARIOS.slice(0, COUNT);
  }
  return [...TRACE_SCENARIOS, ...buildGeneratedScenarios(COUNT - TRACE_SCENARIOS.length, SEED)];
}

/** Optional file sink — the runner script uses it to print a clean report. */
const OUT_FILE = process.env['UPLOAD_TRACE_OUT'];

function emit(text: string): void {
  if (!PRINT) {
    return;
  }
  if (OUT_FILE) {
    appendFileSync(OUT_FILE, `${text}\n`);
    return;
  }
  console.log(text);
}

async function runLocationRequiredTrace(): Promise<void> {
  const scenarios = buildCorpus();
  const recorder = new UploadTraceRecorder();
  const run = await runTraceBatch(scenarios, recorder, { locationRequirementMode: 'required' });

  const trayAnswers = ANSWER_TRAYS ? await autoAnswerTrays(run.harness, recorder) : undefined;
  if (trayAnswers) {
    await waitForBatchSettled(run.harness.manager);
  }
  const settled = { ...run, jobs: run.harness.manager.jobs() };

  printTraceReport(scenarios, recorder, settled, loadRealGeo(), {
    seed: SEED,
    detail: DETAIL,
    emit,
    trayAnswers,
  });

  expect(settled.jobs.length).toBe(scenarios.length);
  expect(jobsByPath(settled).size).toBe(scenarios.length);
  // Every job carried its immutable relativePath into the pipeline.
  expect(settled.jobs.every((job) => !!job.relativePath)).toBe(true);
  // Every classified group holds at least one job — an orphan group is a leak.
  for (const group of recorder.groups()) {
    expect(group.jobIds.length, `group ${group.groupingKey} has no jobs`).toBeGreaterThan(0);
  }
}

async function runLocationOptionalTrace(): Promise<void> {
  const scenarios = buildCorpus();
  const recorder = new UploadTraceRecorder();
  const run = await runTraceBatch(scenarios, recorder, {
    submitMode: 'files',
    locationRequirementMode: 'optional',
  });
  const settled = { ...run, jobs: run.harness.manager.jobs() };

  printPersistReport(scenarios, recorder, settled, { seed: SEED, detail: DETAIL, emit });

  // Nothing may be left mid-flight: an active phase after settle is a stuck upload.
  expect(run.settled).toBe(true);
  const stuck = settled.jobs
    .filter((job) => ACTIVE_PHASES.has(job.phase))
    .map((job) => `${job.relativePath}=${job.phase}`);
  expect(stuck).toEqual([]);

  // Anything that reached `complete` carries the row and object it wrote.
  const completed = settled.jobs.filter((job) => job.phase === 'complete');
  expect(completed.length).toBeGreaterThan(0);
  for (const job of completed) {
    expect(job.mediaId, `${job.relativePath} completed without mediaId`).toBeTruthy();
    expect(job.storagePath, `${job.relativePath} completed without storagePath`).toBeTruthy();
    expect(job.contentHash, `${job.relativePath} completed without contentHash`).toBeTruthy();
  }
  // One media_items row per completed job — no orphan rows, no missing rows.
  expect(run.harness.insertedMediaIds.length).toBe(completed.length);
  // S14 is byte-identical to S01, so exactly one of the pair may persist.
  expect(settled.jobs.filter((job) => job.phase === 'skipped').length).toBeGreaterThan(0);
}

/**
 * Folder submit with `locationRequirementMode: 'optional'`. The trigger matrix in
 * upload-address-resolution.phases.md says optional skips the address pipeline; this run
 * records what actually happens so the trace reports it instead of assuming it.
 */
async function runLocationOptionalFolderTrace(): Promise<void> {
  const scenarios = buildCorpus();
  const recorder = new UploadTraceRecorder();
  const run = await runTraceBatch(scenarios, recorder, {
    rootFolderLabel: 'Trace Batch (folder, location optional)',
    locationRequirementMode: 'optional',
  });
  const jobs = run.harness.manager.jobs();
  const gated = jobs.filter((job) => job.phase === 'awaiting_disambiguation');

  emit(renderHeading('RUN C · FOLDER SUBMIT WITH locationRequirementMode = optional'));
  emit(`  files: ${jobs.length}`);
  emit(`  parked in awaiting_disambiguation before hashing: ${gated.length}`);
  emit(`  reached complete: ${jobs.filter((job) => job.phase === 'complete').length}`);
  emit(
    '  Trays registered by classifyBatch (layer_package, admin_level_conflict) are not skipped\n' +
      '  by the optional mode; only the per-job geocode step checks it.',
  );

  expect(jobs.length).toBe(scenarios.length);
  const stuck = jobs.filter((job) => ACTIVE_PHASES.has(job.phase));
  expect(stuck.map((job) => `${job.relativePath}=${job.phase}`)).toEqual([]);
}

describe('upload pipeline trace harness', () => {
  beforeEach(() => {
    clearInflightDedupRegistryForTests();
    clearHeicConversionRegistryForTests();
  });

  it(
    'A \u00b7 location required — search object, grouping, geocode and trays',
    runLocationRequiredTrace,
    TRACE_TIMEOUT_MS,
  );

  it(
    'B \u00b7 flat multi-file, location optional — hash, dedup, upload and media_items insert',
    runLocationOptionalTrace,
    TRACE_TIMEOUT_MS,
  );

  it(
    'C \u00b7 folder submit with location optional — what the optional mode actually skips',
    runLocationOptionalFolderTrace,
    TRACE_TIMEOUT_MS,
  );
});
