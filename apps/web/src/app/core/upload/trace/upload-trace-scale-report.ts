/**
 * Renders the database-scale section of the trace report, including the extrapolation to sizes
 * too large to run.
 *
 * Extrapolation is labelled as such everywhere it appears. Both measured costs grow at least
 * linearly, so a linear projection is the optimistic bound, not the expected value.
 *
 * @see docs/playbooks/upload-pipeline-trace.md § Database scale
 */

import { renderHeading } from './upload-trace-render';
import {
  JOB_STORE_WRITES_PER_JOB,
  type ClassifyScaleResult,
  type JobStoreScaleSample,
} from './upload-trace-scale';

const MS_PER_MINUTE = 60_000;
const MS_PER_S = 1000;
const KEY_COL = 60;
const SIZE_COL = 9;
const MS_COL = 11;
const COUNT_COL = 7;
const MS_DECIMALS = 4;
const MS_PER_FILE_DECIMALS = 3;
const PERCENT = 100;

const TEN_THOUSAND = 10_000;
const HUNDRED_THOUSAND = 100_000;
const ONE_MILLION = 1_000_000;

/** Sizes a company-wide upload plausibly reaches. */
export const PROJECTION_SIZES: readonly number[] = [TEN_THOUSAND, HUNDRED_THOUSAND, ONE_MILLION];

function duration(ms: number): string {
  if (ms < MS_PER_S) {
    return `${ms.toFixed(0)} ms`;
  }
  if (ms < MS_PER_MINUTE) {
    return `${(ms / MS_PER_S).toFixed(1)} s`;
  }
  return `${(ms / MS_PER_MINUTE).toFixed(1)} min`;
}

function shorten(value: string): string {
  return value.length > KEY_COL ? `${value.slice(0, KEY_COL)}…` : value;
}

export function renderClassifyScale(result: ClassifyScaleResult): string {
  const outcomes = [...result.outcomes.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([outcome, count]) => `${outcome}=${count}`)
    .join('  ');

  const trayShare = ((result.trayGroups / result.distinctGroups) * PERCENT).toFixed(0);
  const lines = [
    `  measured on ${result.files.toLocaleString('en-US')} generated paths, ${result.naming} file naming`,
    `    classification total: ${duration(result.totalMs)}  (${result.msPerFile.toFixed(MS_PER_FILE_DECIMALS)} ms/file)`,
    `    heap after run:       ${result.heapUsedMb.toFixed(0)} MB (counters only — no jobs, no File handles)`,
    `    distinct groups:      ${result.distinctGroups.toLocaleString('en-US')}  → geocoder calls, one per group`,
    `    groups needing a tray: ${result.trayGroups.toLocaleString('en-US')} (${trayShare}% of groups) → questions before any upload starts`,
    `    outcomes:             ${outcomes}`,
    '    largest groups (files covered by one geocode):',
    ...result.largestGroups.map((group) => `      ${String(group.files).padStart(COUNT_COL)} × ${shorten(group.key)}`),
    '',
    '  extrapolated at the measured rate (linear — the optimistic bound):',
    ...PROJECTION_SIZES.map((size) => {
      const ms = result.msPerFile * size;
      const groups = Math.round((result.distinctGroups / result.files) * size);
      const trays = Math.round((result.trayGroups / result.files) * size);
      return `    ${size.toLocaleString('en-US').padStart(SIZE_COL)} files → classify ${duration(ms).padStart(SIZE_COL)}, ${groups.toLocaleString('en-US')} geocodes, ${trays.toLocaleString('en-US')} tray questions`;
    }),
  ];
  return lines.join('\n');
}

export function renderJobStoreScale(samples: readonly JobStoreScaleSample[]): string {
  const header = `  ${'jobs held'.padStart(SIZE_COL)}  ${'updateJob'.padStart(MS_COL)}  ${'findJob'.padStart(MS_COL)}  whole batch (${JOB_STORE_WRITES_PER_JOB} writes/job)`;
  const rows = samples.map(
    (sample) =>
      `  ${sample.jobs.toLocaleString('en-US').padStart(SIZE_COL)}  ${`${sample.updateMs.toFixed(MS_DECIMALS)} ms`.padStart(MS_COL)}  ${`${sample.findMs.toFixed(MS_DECIMALS)} ms`.padStart(MS_COL)}  ${duration(sample.projectedSeconds * MS_PER_S)}`,
  );

  const last = samples[samples.length - 1];
  const projections = last
    ? PROJECTION_SIZES.map((size) => {
        // updateJob copies the whole job array, so per-write cost scales with the batch size.
        const perWriteMs = (last.updateMs / last.jobs) * size;
        return `    ${size.toLocaleString('en-US').padStart(SIZE_COL)} files → ${duration(perWriteMs * size * JOB_STORE_WRITES_PER_JOB)} in the job store alone`;
      })
    : [];

  return [
    header,
    ...rows,
    '',
    '  extrapolated (per-write cost scales with batch size, so total work is quadratic):',
    ...projections,
  ].join('\n');
}

export function renderScaleHeading(): string {
  return renderHeading('SCALE · WHAT A COMPANY-SIZED UPLOAD COSTS');
}

export const SCALE_CAVEAT = `
  What this tier measures, and what it does not:
    · Measured with real production code: Search Object construction and the local gate
      (classifyBatch's synchronous work), and UploadJobStateService reads/writes.
    · NOT measured here: storage upload, DB inserts, geocoder latency, thumbnailing, rendering
      the panel with N rows, browser memory for N File handles, or IndexedDB/GC behaviour.
      A real run adds all of those on top of the numbers above.
    · Both measured costs are main-thread and synchronous. Classification runs in full before
      the queue drains, so its total is time-to-first-byte, not background work.
`;
