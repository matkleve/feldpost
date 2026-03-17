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

const limitArg = Number(process.argv[2] ?? "1000");
const limit =
  Number.isFinite(limitArg) && limitArg > 0 ? Math.floor(limitArg) : 1000;

async function main() {
  const { data: runRow, error: runInsertError } = await supabase
    .from("storage_cleanup_runs")
    .insert({})
    .select("id")
    .single();

  if (runInsertError || !runRow?.id) {
    throw new Error(
      `Failed to create cleanup run row: ${runInsertError?.message ?? "unknown error"}`,
    );
  }

  const runId = runRow.id;

  try {
    const { data: orphanRows, error: orphanError } = await supabase.rpc(
      "list_orphaned_storage_paths",
      {
        p_limit: limit,
      },
    );

    if (orphanError) {
      throw new Error(
        `Failed to list orphaned storage paths: ${orphanError.message}`,
      );
    }

    const objectPaths = (orphanRows ?? [])
      .map((row) => row?.object_name)
      .filter((value) => typeof value === "string" && value.length > 0);

    let deletedCount = 0;

    if (objectPaths.length > 0) {
      const { error: removeError } = await supabase.storage
        .from("images")
        .remove(objectPaths);
      if (removeError) {
        throw new Error(
          `Failed to delete orphaned objects via Storage API: ${removeError.message}`,
        );
      }
      deletedCount = objectPaths.length;
    }

    const { error: finalizeError } = await supabase
      .from("storage_cleanup_runs")
      .update({
        finished_at: new Date().toISOString(),
        deleted_count: deletedCount,
        status: "success",
        error_message: null,
      })
      .eq("id", runId);

    if (finalizeError) {
      throw new Error(
        `Failed to finalize cleanup run: ${finalizeError.message}`,
      );
    }

    console.log(
      JSON.stringify(
        { run_id: runId, deleted_count: deletedCount, scanned_limit: limit },
        null,
        2,
      ),
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown cleanup error";

    await supabase
      .from("storage_cleanup_runs")
      .update({
        finished_at: new Date().toISOString(),
        deleted_count: 0,
        status: "error",
        error_message: message.slice(0, 1000),
      })
      .eq("id", runId);

    throw error;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
