/**
 * Assembles and prints the trace report. Printing is opt-in so the harness stays a quiet
 * regression test in CI.
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import { resolveLayersForJob } from '../../location-path-parser/upload-search-object.layer-map';
import { deriveFolderDisplayPath } from '../location/upload-location-resolution.helpers';
import type { UploadJob } from '../upload-manager.types';
import type { UploadTraceScenario } from './upload-trace-fixtures';
import type { RealGeoData, TraceRunResult } from './upload-trace-harness';
import type { UploadTraceRecorder } from './upload-trace-recorder';
import { REAL_VS_MOCK_LEGEND } from './upload-trace-legend';
import { computeTraceFindings, renderFindings, type FindingInput } from './upload-trace-findings';
import type { TrayAnswerSummary } from './upload-trace-tray-answers';
import {
  renderPayloadSamples,
  renderGeocodeLog,
  renderGroupTable,
  renderHeading,
  renderLaneSummary,
  renderScenarioTimeline,
  renderSearchObject,
  renderSupabaseSummary,
} from './upload-trace-render';

export interface TraceReportOptions {
  seed: number;
  /** How many files get a full per-file section; the rest only appear in the aggregates. */
  detail: number;
  emit: (text: string) => void;
  /** Result of auto-answering trays, when the run did that. */
  trayAnswers?: TrayAnswerSummary;
}

/** Search objects for the whole corpus, built with the production function. */
export function buildFindingInputs(
  scenarios: readonly UploadTraceScenario[],
  run: TraceRunResult,
  geo: RealGeoData,
): FindingInput[] {
  const jobByPath = jobsByPath(run);
  return scenarios.map((scenario) => ({
    scenario,
    searchObject: resolveLayersForJob(
      scenario.relativePath,
      scenario.relativePath.split('/').pop() ?? '',
      geo,
      deriveFolderDisplayPath(scenario.relativePath),
    ).searchObject,
    job: jobByPath.get(scenario.relativePath),
  }));
}

function reportPerFile(
  scenarios: readonly UploadTraceScenario[],
  recorder: UploadTraceRecorder,
  jobByPath: ReadonlyMap<string, UploadJob>,
  geo: RealGeoData,
  options: TraceReportOptions,
): void {
  const { emit, detail } = options;
  emit(renderHeading('STEP 1–2 · INTAKE + SEARCH OBJECT (per file)'));
  emit(
    '  The Search Object below is produced by the same production function classifyBatch calls\n' +
      '  (resolveLayersForJob), re-run on the same path so per-file fields can be shown; the\n' +
      '  pipeline itself keeps one Search Object per group.',
  );
  for (const scenario of scenarios.slice(0, detail)) {
    const layers = resolveLayersForJob(
      scenario.relativePath,
      scenario.relativePath.split('/').pop() ?? '',
      geo,
      deriveFolderDisplayPath(scenario.relativePath),
    );
    emit(renderScenarioTimeline(scenario, recorder, jobByPath.get(scenario.relativePath)));
    emit(renderSearchObject(scenario, layers.searchObject));
    const packages =
      layers.layers
        .map((layer) => `${layer.layerKey}→${JSON.stringify(layer.parsed)}`)
        .join(' | ') || '(none)';
    emit(`  layer packages: ${packages}`);
    emit(
      `  package conflict: ${layers.packageConflict ? layers.packageConflict.layerConflictQueryKey : 'none'}`,
    );
  }
  if (scenarios.length > detail) {
    emit(`\n  … ${scenarios.length - detail} further files omitted from the per-file section.`);
  }
}

function reportTrays(run: TraceRunResult, emit: (text: string) => void): void {
  emit(renderHeading('STEP 5 · RESOLVER TRAYS OPENED (user has to answer these)'));
  const trays = run.harness.locationResolution.disambiguationGroups();
  if (!trays.length) {
    emit('  (no tray — every group resolved without asking the user)');
    return;
  }
  for (const tray of trays) {
    emit(
      `  ${tray.disambiguationKind ?? 'geocode'} step=${tray.trayStep ?? '—'} gate=${tray.resolutionGateOpen} jobs=${tray.jobIds.length} candidates=${tray.candidates.length} — ${tray.titleAddress}`,
    );
  }
}

export function printTraceReport(
  scenarios: readonly UploadTraceScenario[],
  recorder: UploadTraceRecorder,
  run: TraceRunResult,
  geo: RealGeoData,
  options: TraceReportOptions,
): void {
  const { emit } = options;
  const jobByPath = new Map(
    run.jobs.map((job) => [job.relativePath ?? job.file.name, job] as const),
  );

  emit(renderHeading(`UPLOAD PIPELINE TRACE — ${scenarios.length} files, seed ${options.seed}`));
  emit(`  batch: ${run.batchId}\n  settled: ${run.settled}`);

  reportPerFile(scenarios, recorder, jobByPath, geo, options);

  emit(renderHeading('STEP 3 · GROUPS (one geocode per group, not per file)'));
  emit(renderGroupTable(recorder));

  emit(renderHeading('STEP 4 · GEOCODER CALLS (stub Photon)'));
  emit(renderGeocodeLog(recorder));

  reportTrays(run, emit);

  if (options.trayAnswers) {
    emit(renderHeading('STEP 5b · TRAYS AUTO-ANSWERED (first candidate each time)'));
    emit(`  answered: ${options.trayAnswers.answered}`);
    emit(
      options.trayAnswers.stalled.length
        ? `  still gated after answering: ${options.trayAnswers.stalled.join(' | ')}`
        : '  still gated after answering: none',
    );
  }

  emit(renderHeading('STEP 6 · SERVER CALLS (in-memory Supabase)'));
  emit(renderSupabaseSummary(recorder));
  emit(`  media_items rows inserted: ${run.harness.insertedMediaIds.length}`);
  emit(`  dedup_hashes registered:   ${run.harness.dedupHashCount()}`);

  emit(renderHeading('OUTCOME'));
  emit(renderLaneSummary(run.jobs));

  emit(renderHeading('FINDINGS (observations, not assertions)'));
  emit(
    renderFindings(
      computeTraceFindings(
        buildFindingInputs(scenarios, run, geo),
        run.harness.locationResolution.disambiguationGroups().length,
        recorder.geocodeCalls().length,
      ),
    ),
  );

  emit(REAL_VS_MOCK_LEGEND);
}

/** Run B: the persistence-side report — hashes, storage keys, media_items and RPC payloads. */
export function printPersistReport(
  scenarios: readonly UploadTraceScenario[],
  recorder: UploadTraceRecorder,
  run: TraceRunResult,
  options: TraceReportOptions,
): void {
  const { emit } = options;
  const byPath = jobsByPath(run);

  emit(
    renderHeading(
      `RUN B · LOCATION OPTIONAL — ${scenarios.length} files (address pipeline skipped)`,
    ),
  );
  emit(`  batch: ${run.batchId}\n  settled: ${run.settled}`);

  emit(renderHeading('STEP 7 · PER-FILE PHASE TRACK (hash → dedup → upload → save)'));
  for (const scenario of scenarios.slice(0, options.detail)) {
    emit(renderScenarioTimeline(scenario, recorder, jobFor(byPath, scenario)));
  }
  if (scenarios.length > options.detail) {
    emit(`\n  … ${scenarios.length - options.detail} further files omitted.`);
  }

  emit(renderHeading('STEP 8 · WHAT REACHED THE SERVER'));
  emit(renderSupabaseSummary(recorder));
  emit(`  media_items rows inserted: ${run.harness.insertedMediaIds.length}`);
  emit(`  dedup_hashes registered:   ${run.harness.dedupHashCount()}`);
  emit(renderPayloadSamples(recorder));

  emit(renderHeading('OUTCOME'));
  emit(renderLaneSummary(run.jobs));
  emit(REAL_VS_MOCK_LEGEND);
}

/** Job → path map, exposed so the spec can assert on the same view the report printed. */
export function jobsByPath(run: TraceRunResult): Map<string, UploadJob> {
  return new Map(run.jobs.map((job) => [job.relativePath ?? job.file.name, job] as const));
}

/** Flat multi-file submit keeps only the leaf name, so look the scenario up both ways. */
function jobFor(
  byPath: ReadonlyMap<string, UploadJob>,
  scenario: UploadTraceScenario,
): UploadJob | undefined {
  return (
    byPath.get(scenario.relativePath) ??
    byPath.get(scenario.relativePath.split('/').pop() ?? scenario.relativePath)
  );
}
