/**
 * generate-media-preview — rasterize Office documents to PNG thumbnail_path via Gotenberg.
 *
 * POST { mediaId: string }
 * Requires Authorization JWT. Uses service role after row access check.
 *
 * @see docs/architecture/media-preview-converter.md
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { createCanvas } from "npm:canvas@2.11.2";
import * as pdfjs from "npm:pdfjs-dist@4.4.168/legacy/build/pdf.mjs";

const DOCUMENT_LONG_EDGE_PX = 512;
const NEUTRAL_PAD = "#f5f3ef";

pdfjs.GlobalWorkerOptions.workerSrc = "";

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
  original_filename: string | null;
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

async function convertOfficeToPdf(
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
  // First slide/page only for presentations and multi-page docs.
  officeForm.append("nativePageRanges", "1");

  const pdfResponse = await fetch(`${base}/forms/libreoffice/convert`, {
    method: "POST",
    body: officeForm,
  });

  if (!pdfResponse.ok) {
    const detail = await pdfResponse.text();
    throw new Error(`LibreOffice convert failed (${pdfResponse.status}): ${detail.slice(0, 200)}`);
  }

  return new Uint8Array(await pdfResponse.arrayBuffer());
}

/** Gotenberg 8 has no PDF→PNG route; rasterize with pdf.js (same approach as client PDF previews). */
async function rasterizePdfFirstPageToPng(pdfBytes: Uint8Array): Promise<Uint8Array> {
  const pdf = await pdfjs.getDocument({
    data: pdfBytes,
    useSystemFonts: true,
    disableFontFace: true,
  }).promise;

  try {
    const page = await pdf.getPage(1);
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = DOCUMENT_LONG_EDGE_PX / Math.max(baseViewport.width, baseViewport.height);
    const viewport = page.getViewport({ scale });
    const width = Math.ceil(viewport.width);
    const height = Math.ceil(viewport.height);
    const canvas = createCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Canvas 2D context unavailable");
    }

    ctx.fillStyle = NEUTRAL_PAD;
    ctx.fillRect(0, 0, width, height);

    await page.render({
      canvasContext: ctx as unknown as CanvasRenderingContext2D,
      viewport,
    }).promise;

    return new Uint8Array(canvas.toBuffer("image/png"));
  } finally {
    await pdf.destroy();
  }
}

async function convertOfficeToPng(
  gotenbergUrl: string,
  fileBytes: Uint8Array,
  fileName: string,
): Promise<Uint8Array> {
  const pdfBytes = await convertOfficeToPdf(gotenbergUrl, fileBytes, fileName);
  return rasterizePdfFirstPageToPng(pdfBytes);
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
      "id, organization_id, storage_path, thumbnail_path, preview_generation_status, original_filename",
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
      item.original_filename?.trim() || `file.${ext}`,
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
