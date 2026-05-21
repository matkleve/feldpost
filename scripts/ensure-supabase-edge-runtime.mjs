/**
 * Ensures the local Supabase Edge Runtime container is running so `geocode` (and other
 * Edge Functions) return 200 instead of Kong 503.
 *
 * Use: node scripts/ensure-supabase-edge-runtime.mjs
 * Wired into `npm start` (apps/web) via scripts/start-web-dev.mjs.
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runCli = path.join(repoRoot, 'scripts/run-supabase-cli.mjs');
const configToml = path.join(repoRoot, 'supabase/config.toml');

const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const LOCAL_API_URL = 'http://127.0.0.1:54321';
const GEOCODE_URL = `${LOCAL_API_URL}/functions/v1/geocode`;

function readProjectId() {
  const raw = readFileSync(configToml, 'utf8');
  const match = raw.match(/^project_id\s*=\s*"([^"]+)"/m);
  return match?.[1] ?? 'feldpost';
}

function runSupabaseStatus() {
  const result = spawnSync(process.execPath, [runCli, 'status'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });
  return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
}

function edgeRuntimeContainerName(projectId) {
  return `supabase_edge_runtime_${projectId}`;
}

function parseStoppedEdgeRuntime(statusOutput) {
  const line = statusOutput
    .split('\n')
    .find((row) => row.includes('Stopped services') && row.includes('edge_runtime'));
  if (!line) {
    return false;
  }
  return line.includes('edge_runtime');
}

function dockerStart(containerName) {
  const result = spawnSync('docker', ['start', containerName], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    const message = (result.stderr || result.stdout || '').trim();
    throw new Error(message || `docker start ${containerName} failed`);
  }
}

async function probeGeocode() {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(GEOCODE_URL, {
      method: 'POST',
      headers: {
        apikey: LOCAL_ANON_KEY,
        Authorization: `Bearer ${LOCAL_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'forward', q: 'Zurich', limit: 1 }),
      signal: controller.signal,
    });
    return response.status;
  } catch {
    return null;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForGeocodeReady(maxAttempts = 15) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const status = await probeGeocode();
    if (status != null && status !== 503 && status !== 502) {
      return status;
    }
    await new Promise((resolve) => setTimeout(resolve, 400));
  }
  return null;
}

async function main() {
  const { stdout, stderr, status } = runSupabaseStatus();
  const combined = `${stdout}\n${stderr}`;

  if (status !== 0 || !combined.includes('supabase local development setup is running')) {
    console.warn(
      '[feldpost] Local Supabase is not running. Start it with: supabase start (from repo root)',
    );
    process.exit(0);
  }

  const projectId = readProjectId();
  const containerName = edgeRuntimeContainerName(projectId);
  let initialStatus = await probeGeocode();

  if (initialStatus === 503 || initialStatus === null) {
    if (parseStoppedEdgeRuntime(combined)) {
      console.info(`[feldpost] Starting stopped Edge Runtime (${containerName})…`);
      try {
        dockerStart(containerName);
      } catch (error) {
        console.error(
          `[feldpost] Could not start Edge Runtime: ${error instanceof Error ? error.message : error}`,
        );
        console.error('[feldpost] Try: supabase stop && supabase start');
        process.exit(1);
      }
    } else if (initialStatus === 503) {
      console.info(`[feldpost] Geocode returned 503; attempting docker start ${containerName}…`);
      try {
        dockerStart(containerName);
      } catch {
        // Container may already be running; continue to probe loop.
      }
    }

    initialStatus = await waitForGeocodeReady();
    if (initialStatus == null || initialStatus === 503) {
      console.error(
        '[feldpost] Edge Functions still unavailable (geocode 503). Run: supabase stop && supabase start',
      );
      process.exit(1);
    }
  }

  console.info(`[feldpost] Edge Functions ready (geocode probe HTTP ${initialStatus})`);
}

await main();
