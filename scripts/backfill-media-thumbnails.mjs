/**
 * Backfill server-side thumbnails for worker-eligible media_items (PDF + Office).
 *
 * Usage:
 *   export SUPABASE_URL=https://YOUR_PROJECT.supabase.co
 *   export SUPABASE_SERVICE_ROLE_KEY=...
 *   export THUMBNAIL_WORKER_URL=https://178-105-242-74.sslip.io/generate
 *   node scripts/backfill-media-thumbnails.mjs
 *   node scripts/backfill-media-thumbnails.mjs --dry-run
 *
 * @see docs/playbooks/remote-thumbnail-worker.md
 */

import { createClient } from '@supabase/supabase-js';

const WORKER_ELIGIBLE_EXTENSIONS = new Set([
  'pdf',
  'doc',
  'docx',
  'odt',
  'odg',
  'txt',
  'xls',
  'xlsx',
  'ods',
  'csv',
  'ppt',
  'pptx',
  'odp',
]);

const BATCH_SIZE = 100;
const DELAY_MS = 2000;

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const workerUrl = process.env.THUMBNAIL_WORKER_URL?.trim();
const dryRun = process.argv.includes('--dry-run');

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(1);
}
if (!workerUrl && !dryRun) {
  console.error('Set THUMBNAIL_WORKER_URL (e.g. https://178-105-242-74.sslip.io/generate).');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function extensionFromPath(storagePath) {
  const base = storagePath.split('/').pop() ?? storagePath;
  const dot = base.lastIndexOf('.');
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : '';
}

function isWorkerEligible(row) {
  if (!row.storage_path?.trim()) {
    return false;
  }
  const mime = (row.mime_type ?? '').split(';')[0].trim().toLowerCase();
  if (mime.startsWith('image/') || mime.startsWith('video/')) {
    return false;
  }
  if (mime === 'application/pdf') {
    return true;
  }
  return WORKER_ELIGIBLE_EXTENSIONS.has(extensionFromPath(row.storage_path));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchEligibleRows() {
  const rows = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from('media_items')
      .select(
        'id, storage_path, mime_type, organization_id, created_by, thumbnail_path, preview_generation_status',
      )
      .is('thumbnail_path', null)
      .not('storage_path', 'is', null)
      .in('preview_generation_status', ['idle', 'failed'])
      .range(from, from + BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message);
    }
    if (!data?.length) {
      break;
    }

    for (const row of data) {
      if (isWorkerEligible(row)) {
        rows.push(row);
      }
    }

    if (data.length < BATCH_SIZE) {
      break;
    }
    from += BATCH_SIZE;
  }

  return rows;
}

async function enqueueWorker(row) {
  const response = await fetch(workerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      mediaId: row.id,
      storagePath: row.storage_path,
      mimeType: row.mime_type ?? '',
      organizationId: row.organization_id,
      userId: row.created_by,
    }),
  });

  if (!response.ok && response.status !== 202) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status}: ${text.slice(0, 200)}`);
  }
}

async function main() {
  const eligible = await fetchEligibleRows();
  console.info(`Found ${eligible.length} worker-eligible row(s) without thumbnail_path.`);

  if (dryRun) {
    for (const row of eligible.slice(0, 20)) {
      console.info(`  ${row.id}  ${row.storage_path}`);
    }
    if (eligible.length > 20) {
      console.info(`  … and ${eligible.length - 20} more`);
    }
    return;
  }

  let ok = 0;
  let fail = 0;

  for (const row of eligible) {
    try {
      await enqueueWorker(row);
      ok += 1;
      console.info(`[${ok + fail}/${eligible.length}] queued ${row.id}`);
    } catch (err) {
      fail += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`[${ok + fail}/${eligible.length}] failed ${row.id}: ${message}`);
    }
    await sleep(DELAY_MS);
  }

  console.info(`Done. queued=${ok} failed=${fail}`);
}

await main();
