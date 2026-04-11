import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const migrationsDir = path.join(repoRoot, "supabase", "migrations");

function listMigrationFiles(dirPath) {
  return readdirSync(dirPath)
    .filter((name) => /^\d+.*\.sql$/i.test(name))
    .sort();
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractFunctionBodies(sql, functionName) {
  const result = [];
  const signatureRegex = new RegExp(
    `create\\s+or\\s+replace\\s+function\\s+public\\.${functionName}\\s*\\(`,
    "gi",
  );

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

    result.push(sql.slice(bodyStart, bodyEnd));
  }

  return result;
}

function extractPhotolessIndexPredicates(sql) {
  const result = [];
  const indexRegex =
    /create\s+index(?:\s+if\s+not\s+exists)?\s+idx_media_items_photoless_lookup[\s\S]*?where\s+([^;]+);/gi;

  let match;
  while ((match = indexRegex.exec(sql)) !== null) {
    result.push(match[1]);
  }

  return result;
}

const files = listMigrationFiles(migrationsDir);
let latestFunctionBody = null;
let latestFunctionFile = null;
let latestIndexPredicate = null;
let latestIndexFile = null;

for (const fileName of files) {
  const fullPath = path.join(migrationsDir, fileName);
  const sql = readFileSync(fullPath, "utf8");

  const functionBodies = extractFunctionBodies(sql, "find_photoless_conflicts");
  for (const body of functionBodies) {
    latestFunctionBody = body;
    latestFunctionFile = fileName;
  }

  const predicates = extractPhotolessIndexPredicates(sql);
  for (const predicate of predicates) {
    latestIndexPredicate = predicate;
    latestIndexFile = fileName;
  }
}

const errors = [];

if (!latestFunctionBody) {
  errors.push(
    "No CREATE OR REPLACE FUNCTION public.find_photoless_conflicts(...) definition found in supabase/migrations.",
  );
} else {
  const fn = latestFunctionBody.toLowerCase();
  if (!/media_type\s*=\s*'photo'/.test(fn)) {
    errors.push(
      `Latest find_photoless_conflicts definition (${latestFunctionFile}) does not filter media_type = 'photo'.`,
    );
  }
  if (/media_type\s*=\s*'image'/.test(fn)) {
    errors.push(
      `Latest find_photoless_conflicts definition (${latestFunctionFile}) still contains media_type = 'image'.`,
    );
  }
}

if (!latestIndexPredicate) {
  errors.push(
    "No idx_media_items_photoless_lookup CREATE INDEX statement found in supabase/migrations.",
  );
} else {
  const predicate = latestIndexPredicate.toLowerCase();
  if (!/media_type\s*=\s*'photo'/.test(predicate)) {
    errors.push(
      `Latest idx_media_items_photoless_lookup predicate (${latestIndexFile}) does not filter media_type = 'photo'.`,
    );
  }
  if (/media_type\s*=\s*'image'/.test(predicate)) {
    errors.push(
      `Latest idx_media_items_photoless_lookup predicate (${latestIndexFile}) still contains media_type = 'image'.`,
    );
  }
}

if (errors.length > 0) {
  console.error("[supabase-smoke] photoless media_type contract check failed");
  for (const err of errors) {
    console.error(`- ${err}`);
  }
  process.exit(1);
}

console.log("[supabase-smoke] photoless media_type contract check passed");
console.log(
  `[supabase-smoke] find_photoless_conflicts source: ${latestFunctionFile}`,
);
console.log(
  `[supabase-smoke] idx_media_items_photoless_lookup source: ${latestIndexFile}`,
);
console.log(
  `[supabase-smoke] latest index predicate: ${normalizeWhitespace(latestIndexPredicate)}`,
);
