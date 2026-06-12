import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

function listMigrationFiles(dirPath) {
  return readdirSync(dirPath)
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort();
}

function extractLatestFunctionBody(fileNames, functionName) {
  let latestBody = null;
  let latestFile = null;

  const signatureRegex = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\s*\\(`,
    "gi",
  );

  for (const fileName of fileNames) {
    const fullPath = path.join(migrationsDir, fileName);
    const sql = readFileSync(fullPath, "utf8");

    let match;
    while ((match = signatureRegex.exec(sql)) !== null) {
      const start = match.index;
      const tail = sql.slice(start);
      const asDollar = /as\s+\$\$/i.exec(tail);
      if (!asDollar) {
        continue;
      }

      const bodyStart = start + asDollar.index + asDollar[0].length;
      const bodyEnd = sql.indexOf("$$;", bodyStart);
      if (bodyEnd === -1) {
        continue;
      }

      latestBody = sql.slice(bodyStart, bodyEnd);
      latestFile = fileName;
    }
  }

  return { latestBody, latestFile };
}

const files = listMigrationFiles(migrationsDir);

const cleanupFn = extractLatestFunctionBody(
  files,
  "cleanup_orphaned_storage_objects",
);
const runnerFn = extractLatestFunctionBody(files, "run_storage_cleanup_job");

const errors = [];

if (!cleanupFn.latestBody) {
  errors.push(
    "No CREATE OR REPLACE FUNCTION public.cleanup_orphaned_storage_objects(...) definition found in supabase/migrations.",
  );
} else {
  const body = cleanupFn.latestBody.toLowerCase();

  if (!/raise\s+exception/.test(body)) {
    errors.push(
      `Latest cleanup_orphaned_storage_objects definition (${cleanupFn.latestFile}) must raise an exception in API-only mode.`,
    );
  }

  if (!/cleanup-storage-orphans\.mjs/.test(body)) {
    errors.push(
      `Latest cleanup_orphaned_storage_objects definition (${cleanupFn.latestFile}) must reference scripts/cleanup-storage-orphans.mjs.`,
    );
  }

  if (/delete\s+from\s+storage\.objects/.test(body)) {
    errors.push(
      `Latest cleanup_orphaned_storage_objects definition (${cleanupFn.latestFile}) still performs direct DELETE FROM storage.objects.`,
    );
  }
}

if (!runnerFn.latestBody) {
  errors.push(
    "No CREATE OR REPLACE FUNCTION public.run_storage_cleanup_job(...) definition found in supabase/migrations.",
  );
} else {
  const body = runnerFn.latestBody.toLowerCase();

  if (!/insert\s+into\s+public\.storage_cleanup_runs/.test(body)) {
    errors.push(
      `Latest run_storage_cleanup_job definition (${runnerFn.latestFile}) must write an audit row into public.storage_cleanup_runs.`,
    );
  }

  if (
    !/api-only mode/.test(body) ||
    !/cleanup-storage-orphans\.mjs/.test(body)
  ) {
    errors.push(
      `Latest run_storage_cleanup_job definition (${runnerFn.latestFile}) must include API-only guidance to scripts/cleanup-storage-orphans.mjs.`,
    );
  }

  if (/cleanup_orphaned_storage_objects\s*\(/.test(body)) {
    errors.push(
      `Latest run_storage_cleanup_job definition (${runnerFn.latestFile}) must not call cleanup_orphaned_storage_objects in API-only mode.`,
    );
  }
}

if (errors.length > 0) {
  console.error(
    "[supabase-smoke] storage cleanup API-only contract check failed",
  );
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("[supabase-smoke] storage cleanup API-only contract check passed");
console.log(
  `[supabase-smoke] cleanup_orphaned_storage_objects source: ${cleanupFn.latestFile}`,
);
console.log(
  `[supabase-smoke] run_storage_cleanup_job source: ${runnerFn.latestFile}`,
);
