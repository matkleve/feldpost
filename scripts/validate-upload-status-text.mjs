/**
 * UploadJob.statusLabel / .error are diagnostics, not display text (UP-29).
 *
 * Both hold raw English written by the pipeline — `error` often holds whatever
 * text Supabase or a thrown Error produced. Rendering either one shows English
 * (and sometimes a technical message) to every user regardless of locale.
 * Before UP-29 three places did exactly that: the upload panel's status label,
 * the job-status toast, and the media-item upload overlay.
 *
 * User-facing text comes from resolveUploadStatusText() / resolveUploadPhaseText()
 * in core/upload/support/upload-status-text.util.ts, which resolve i18n keys.
 *
 * This guards the property that matters: those two fields are read only inside
 * core/upload/**, where they are written and used for diagnostics. Note it is
 * deliberately not a "no string literals in these fields" rule — the fields are
 * *supposed* to hold plain English; the bug was displaying them.
 */
import { readdirSync, readFileSync, statSync } from "node:fs";
import { extname, join, relative } from "node:path";

const repoRoot = process.cwd();
const scanRoots = ["apps/web/src/app/features", "apps/web/src/app/shared"];

// A read of .statusLabel / .error on something named like an upload job.
// Narrow on purpose: bare `.error` is everywhere (Supabase responses), so this
// targets the realistic regression — rendering a job's own fields.
const JOB_FIELD_RE = /\b(\w*[Jj]ob\w*)\s*(?:\(\))?\s*[?!]?\.\s*(statusLabel|error)\b/g;

function walk(dir, out = []) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if ([".ts", ".html"].includes(extname(entry.name)) && !entry.name.endsWith(".spec.ts")) {
      out.push(full);
    }
  }
  return out;
}

function stripCommentsAndStrings(source) {
  // Blank out comments so the prose in them cannot trip the scan, preserving
  // offsets so reported line numbers stay accurate.
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "))
    .replace(/\/\/[^\n]*/g, (m) => " ".repeat(m.length))
    .replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, " "));
}

const violations = [];
let scanned = 0;

for (const root of scanRoots) {
  for (const file of walk(join(repoRoot, root))) {
    const raw = readFileSync(file, "utf8");
    if (!raw.includes("statusLabel") && !raw.includes(".error")) continue;
    scanned += 1;
    const source = stripCommentsAndStrings(raw);
    let match;
    JOB_FIELD_RE.lastIndex = 0;
    while ((match = JOB_FIELD_RE.exec(source)) !== null) {
      // Writes are fine; only reads render.
      if (source.slice(match.index + match[0].length).trimStart().startsWith(":")) continue;
      const line = source.slice(0, match.index).split("\n").length;
      violations.push({
        file: relative(repoRoot, file),
        line,
        text: match[0],
        field: match[2],
      });
    }
  }
}

if (violations.length) {
  console.error(`\n✗ upload-status-text: ${violations.length} display read(s) of a diagnostic field\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}  reads ${v.text}`);
  }
  console.error(
    `\n  UploadJob.statusLabel and .error are internal diagnostics holding raw English.\n` +
      `  For user-facing text use resolveUploadStatusText(job, t, issueKind) or\n` +
      `  resolveUploadPhaseText(phase, t) from\n` +
      `  apps/web/src/app/core/upload/support/upload-status-text.util.ts (UP-29).\n`,
  );
  process.exit(1);
}

console.log(
  `✓ upload-status-text: no display reads of UploadJob.statusLabel/.error in features or shared (${scanned} candidate files)`,
);
