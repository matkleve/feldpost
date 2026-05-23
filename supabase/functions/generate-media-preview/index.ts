/**
 * generate-media-preview — rasterize Office documents to PNG thumbnail_path via Gotenberg.
 *
 * POST { mediaId: string }
 * Requires Authorization JWT. Uses service role after row access check.
 *
 * @see docs/architecture/media-preview-converter.md
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const OFFICE_EXTENSIONS = new Set([
  "doc",
  "docx",
  "odt",
  "odg",
  "txt",
  "xls",
  "xlsx",
  "ods",
  "csv",
  "ppt",
  "pptx",
  "odp",
]);

type PreviewGenerationStatus = "idle" | "pending" | "ready" | "failed";

type MediaItemRow = {
  id: string;
  organization_id: string;
  storage_path: string;
  thumbnail_path: string | null;
  preview_generation_status: PreviewGenerationStatus;
  file_name: string;
};

function jsonResponse(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function extensionFromPath(path: string): string {
  const base = path.split("/").pop() ?? path;
  const dot = base.lastIndexOf(".");
  return dot >= 0 ? base.slice(dot + 1).toLowerCase() : "";
}

function buildThumbPath(storagePath: string, organizationId: string): string {
  const parts = storagePath.split("/").filter(Boolean);
  const fileName = parts[parts.length - 1] ?? "file";
  const stem = fileName.includes(".")
    ? fileName.slice(0, fileName.lastIndexOf("."))
    : fileName;
  const userId = parts.length >= 2 ? parts[1] : "unknown";
  return `${organizationId}/${userId}/${stem}_thumb.png`;
}

async function convertOfficeToPng(
  gotenbergUrl: string,
  fileBytes: Uint8Array,
  fileName: string,
): Promise<Uint8Array> {
  const base = gotenbergUrl.replace(/\/$/, "");

  const officeForm = new FormData();
  officeForm.append(
    "files",
    new Blob([fileBytes]),
    fileName.includes(".") ? fileName : `${fileName}.bin`,
  );

  const pdfResponse = await fetch(`${base}/forms/libreoffice/convert`, {
    method: "POST",
    body: officeForm,
  });

  if (!pdfResponse.ok) {
    const detail = await pdfResponse.text();
    throw new Error(`LibreOffice convert failed (${pdfResponse.status}): ${detail.slice(0, 200)}`);
  }

  const pdfBytes = new Uint8Array(await pdfResponse.arrayBuffer());

  const pngForm = new FormData();
  pngForm.append("files", new Blob([pdfBytes], { type: "application/pdf" }), "document.pdf");
  pngForm.append("format", "png");
  pngForm.append("page", "1");

  const pngResponse = await fetch(`${base}/forms/pdfengines/convert`, {
    method: "POST",
    body: pngForm,
  });

  if (!pngResponse.ok) {
    const detail = await pngResponse.text();
    throw new Error(`PDF to PNG failed (${pngResponse.status}): ${detail.slice(0, 200)}`);
  }

  return new Uint8Array(await pngResponse.arrayBuffer());
}

async function markStatus(
  admin: ReturnType<typeof createClient>,
  mediaId: string,
  status: PreviewGenerationStatus,
  thumbnailPath?: string | null,
): Promise<void> {
  const patch: Record<string, unknown> = { preview_generation_status: status };
  if (thumbnailPath !== undefined) {
    patch.thumbnail_path = thumbnailPath;
  }
  const { error } = await admin.from("media_items").update(patch).eq("id", mediaId);
  if (error) {
    console.error("[generate-media-preview] status update failed", error.message);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  const gotenbergUrl = Deno.env.get("GOTENBERG_URL")?.trim();
  const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim();
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")?.trim();
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")?.trim();

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return jsonResponse({ error: "Supabase env not configured" }, 500);
  }

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  let body: { mediaId?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const mediaId = body.mediaId?.trim();
  if (!mediaId) {
    return jsonResponse({ error: "mediaId is required" }, 400);
  }

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: row, error: readError } = await userClient
    .from("media_items")
    .select(
      "id, organization_id, storage_path, thumbnail_path, preview_generation_status, file_name",
    )
    .eq("id", mediaId)
    .maybeSingle();

  if (readError) {
    return jsonResponse({ error: readError.message }, 500);
  }

  if (!row) {
    return jsonResponse({ error: "Media item not found" }, 404);
  }

  const item = row as MediaItemRow;

  if (item.thumbnail_path?.trim()) {
    return jsonResponse({ ok: true, skipped: "thumbnail_exists" }, 200);
  }

  const ext = extensionFromPath(item.storage_path);
  if (!OFFICE_EXTENSIONS.has(ext)) {
    return jsonResponse({ ok: true, skipped: "not_office" }, 200);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey);

  if (!gotenbergUrl) {
    await markStatus(admin, mediaId, "failed");
    return jsonResponse({ error: "GOTENBERG_URL not configured" }, 503);
  }

  await markStatus(admin, mediaId, "pending");

  try {
    const { data: fileBlob, error: downloadError } = await admin.storage
      .from("media")
      .download(item.storage_path);

    if (downloadError || !fileBlob) {
      throw new Error(downloadError?.message ?? "Storage download failed");
    }

    const fileBytes = new Uint8Array(await fileBlob.arrayBuffer());
    const pngBytes = await convertOfficeToPng(
      gotenbergUrl,
      fileBytes,
      item.file_name || `file.${ext}`,
    );

    const thumbPath = buildThumbPath(item.storage_path, item.organization_id);

    const { error: uploadError } = await admin.storage.from("media").upload(thumbPath, pngBytes, {
      contentType: "image/png",
      upsert: true,
    });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    await markStatus(admin, mediaId, "ready", thumbPath);

    return jsonResponse({ ok: true, thumbnailPath: thumbPath }, 200);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[generate-media-preview]", mediaId, message);
    await markStatus(admin, mediaId, "failed");
    return jsonResponse({ error: message }, 500);
  }
});
