import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const args = new Set(process.argv.slice(2));

function readArg(name, fallback = null) {
  const token = [...args].find((arg) => arg.startsWith(`--${name}=`));
  if (!token) return fallback;
  return token.slice(name.length + 3);
}

function readIntArg(name, fallback) {
  const raw = readArg(name, null);
  if (raw == null) return fallback;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.floor(parsed);
}

const dryRun = args.has("--dry-run");
const overwrite = args.has("--overwrite");
const prefix = readArg("prefix", "");
const pageSize = readIntArg("page-size", 500);
const maxCopies = readIntArg("max", Number.MAX_SAFE_INTEGER);

function isAlreadyExistsError(message) {
  const msg = String(message ?? "").toLowerCase();
  return msg.includes("already exists") || msg.includes("duplicate");
}

async function listAllImageObjects() {
  const objects = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    let query = supabase
      .from("storage.objects")
      .select("name, metadata")
      .eq("bucket_id", "images")
      .order("name", { ascending: true })
      .range(from, to);

    if (prefix) {
      // Prefix filtering via range query fallback: keep SQL simple and filter client-side.
      // storage.objects rows are still paginated on server.
      query = query;
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed listing storage.objects: ${error.message}`);
    }

    const rows = (data ?? []).filter(
      (row) => typeof row?.name === "string" && row.name.length > 0,
    );

    if (rows.length === 0) break;

    for (const row of rows) {
      if (!prefix || row.name.startsWith(prefix)) {
        objects.push(row);
      }
    }

    if (rows.length < pageSize) break;
    from += pageSize;
  }

  return objects;
}

async function copyObject(path, contentType) {
  const { data: blob, error: downloadError } = await supabase.storage
    .from("images")
    .download(path);

  if (downloadError || !blob) {
    throw new Error(`download failed: ${downloadError?.message ?? "no data"}`);
  }

  const uploadOptions = {
    upsert: overwrite,
    contentType: contentType || undefined,
  };

  const { error: uploadError } = await supabase.storage
    .from("media")
    .upload(path, blob, uploadOptions);

  if (uploadError) {
    throw new Error(`upload failed: ${uploadError.message}`);
  }
}

async function main() {
  const startedAt = new Date().toISOString();
  const objects = await listAllImageObjects();

  let scanned = 0;
  let copied = 0;
  let skippedExisting = 0;
  const failed = [];

  for (const row of objects) {
    if (copied >= maxCopies) break;
    scanned += 1;

    if (dryRun) continue;

    const contentType =
      typeof row.metadata?.mimetype === "string" ? row.metadata.mimetype : null;

    try {
      await copyObject(row.name, contentType);
      copied += 1;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      if (!overwrite && isAlreadyExistsError(message)) {
        skippedExisting += 1;
        continue;
      }
      failed.push({ path: row.name, error: message });
    }
  }

  const finishedAt = new Date().toISOString();

  const summary = {
    mode: dryRun ? "dry-run" : "copy",
    overwrite,
    prefix,
    page_size: pageSize,
    max: maxCopies,
    started_at: startedAt,
    finished_at: finishedAt,
    objects_discovered: objects.length,
    scanned,
    copied,
    skipped_existing: skippedExisting,
    failed_count: failed.length,
    failed,
  };

  console.log(JSON.stringify(summary, null, 2));

  if (failed.length > 0) {
    process.exit(2);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
