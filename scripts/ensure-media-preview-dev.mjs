/**
 * Ensures local Office preview dependencies: Edge Function route + Gotenberg.
 * Wired into apps/web npm start via scripts/start-web-dev.mjs
 */
import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runCli = path.join(repoRoot, 'scripts/run-supabase-cli.mjs');
const LOCAL_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0';
const PREVIEW_URL = 'http://127.0.0.1:54321/functions/v1/generate-media-preview';
const GOTENBERG_HEALTH = 'http://127.0.0.1:3000/health';

async function probePreviewFunction() {
  try {
    const response = await fetch(PREVIEW_URL, {
      method: 'POST',
      headers: {
        apikey: LOCAL_ANON_KEY,
        Authorization: `Bearer ${LOCAL_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ mediaId: '00000000-0000-0000-0000-000000000000' }),
    });
    const text = await response.text();
    if (text.includes('Function not found')) {
      return 'missing';
    }
    return 'ok';
  } catch {
    return 'unreachable';
  }
}

async function probeGotenberg() {
  try {
    const response = await fetch(GOTENBERG_HEALTH, { method: 'GET' });
    return response.ok ? 'ok' : 'down';
  } catch {
    return 'down';
  }
}

function startFunctionsServe() {
  const child = spawn(process.execPath, [runCli, 'functions', 'serve'], {
    cwd: repoRoot,
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}

function startGotenberg() {
  spawnSync(
    'docker',
    ['compose', '-f', 'supabase/gotenberg/docker-compose.yml', 'up', '-d'],
    { cwd: repoRoot, stdio: 'inherit' },
  );
}

async function main() {
  let preview = await probePreviewFunction();
  if (preview === 'missing') {
    console.info('[feldpost] Starting supabase functions serve (generate-media-preview was missing)…');
    startFunctionsServe();
    await new Promise((resolve) => setTimeout(resolve, 4000));
    preview = await probePreviewFunction();
  }

  if (preview === 'ok') {
    console.info('[feldpost] generate-media-preview Edge Function is reachable');
  } else {
    console.warn(
      `[feldpost] generate-media-preview not ready (${preview}). Run: node scripts/run-supabase-cli.mjs functions serve`,
    );
  }

  let gotenberg = await probeGotenberg();
  if (gotenberg === 'down') {
    console.info('[feldpost] Starting Gotenberg for Office previews…');
    startGotenberg();
    await new Promise((resolve) => setTimeout(resolve, 3000));
    gotenberg = await probeGotenberg();
  }

  if (gotenberg === 'ok') {
    console.info('[feldpost] Gotenberg is ready on :3000');
  } else {
    console.warn(
      '[feldpost] Gotenberg is not running — Office thumbnails will stay icon-only. Run: docker compose -f supabase/gotenberg/docker-compose.yml up -d',
    );
  }
}

await main();
