#!/usr/bin/env node
/**
 * Runs the upload pipeline trace harness and prints its report.
 *
 * The harness itself is a Vitest spec (`apps/web/src/app/core/upload/trace/
 * upload-pipeline-trace.spec.ts`) so it drives the real Angular services. This wrapper only
 * translates CLI flags into the environment variables the spec reads, and prints the report
 * file the spec writes, so the output is not interleaved with Vitest's own reporting.
 *
 * Usage:
 *   npm run trace:upload
 *   npm run trace:upload -- --count=150 --seed=7 --detail=20
 *   npm run trace:upload -- --answer-trays
 *   npm run trace:upload -- --out=trace.txt
 *
 * @see docs/playbooks/upload-pipeline-trace.md
 */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB_DIR = join(REPO_ROOT, 'apps', 'web');
const SPEC = 'src/app/core/upload/trace/upload-pipeline-trace.spec.ts';

function flag(name) {
  const hit = process.argv.slice(2).find((arg) => arg === `--${name}` || arg.startsWith(`--${name}=`));
  if (!hit) {
    return undefined;
  }
  const [, value] = hit.split('=');
  return value ?? 'true';
}

const requestedOut = flag('out');
const tempDir = requestedOut ? null : mkdtempSync(join(tmpdir(), 'feldpost-trace-'));
const outFile = requestedOut ? resolve(process.cwd(), requestedOut) : join(tempDir, 'trace.txt');
writeFileSync(outFile, '');

const env = { ...process.env, UPLOAD_TRACE: '1', UPLOAD_TRACE_OUT: outFile };
const count = flag('count');
const seed = flag('seed');
const detail = flag('detail');
if (count) env.UPLOAD_TRACE_COUNT = count;
if (seed) env.UPLOAD_TRACE_SEED = seed;
if (detail) env.UPLOAD_TRACE_DETAIL = detail;
if (flag('answer-trays')) env.UPLOAD_TRACE_ANSWER_TRAYS = '1';

const result = spawnSync('npx', ['vitest', 'run', SPEC], {
  cwd: WEB_DIR,
  env,
  stdio: ['inherit', 'pipe', 'inherit'],
  encoding: 'utf8',
  shell: process.platform === 'win32',
});

let report = '';
try {
  report = readFileSync(outFile, 'utf8');
} catch {
  report = '';
}

if (report.trim()) {
  process.stdout.write(report);
} else {
  process.stdout.write(result.stdout ?? '');
  process.stdout.write('\n(no report written — see the Vitest output above)\n');
}

if (requestedOut) {
  process.stdout.write(`\nreport written to ${outFile}\n`);
} else if (tempDir) {
  rmSync(tempDir, { recursive: true, force: true });
}

process.exit(result.status ?? 1);
