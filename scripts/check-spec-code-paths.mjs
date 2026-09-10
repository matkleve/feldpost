#!/usr/bin/env node
/**
 * Gate: every code path referenced in docs/specs/** resolves on disk.
 *
 * A spec's File Map is the index a reader trusts to find the implementation.
 * The 2026-09-08 upload-process audit found 60 stale paths across 9 files —
 * a `manager/`/`support/`/`pipelines/` reorganisation moved a dozen services
 * and no spec was updated. Nothing catches that by review; you only find it
 * by resolving every path, so this does it mechanically instead.
 *
 * Scope: inline-code spans (`` `...` ``) inside docs/specs/**.md that look
 * like a source file — contain a `/` and end in a known code extension,
 * optionally with a trailing `:123` or `:123-456` line reference. Shorthand
 * roots (`core/`, `features/`, `shared/`, `layout/`) expand to
 * `apps/web/src/app/…`, matching spec convention; `apps/`, `supabase/`,
 * `scripts/`, `docs/` are checked as repo-relative. Anything else (bare
 * identifiers, glob patterns with `*`, URLs) is not a path and is skipped.
 *
 * A line ending `<!-- planned -->` is exempt — some specs intentionally
 * describe code that ships later (see `AGENTS.md` § spec-ahead-of-code).
 */

import { existsSync, readFileSync } from "node:fs";
import { extname, join, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");
const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".html", ".scss", ".sql", ".mjs", ".cjs"]);
const SHORTHAND_ROOTS = ["core/", "features/", "shared/", "layout/"];
const REPO_RELATIVE_ROOTS = ["apps/", "supabase/", "scripts/", "docs/"];

const files = execFileSync("git", ["ls-files", "-z", "docs/specs"], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter((f) => f.endsWith(".md"));

// Inline code spans: `text` (not fenced ``` blocks — those are usually snippets, not path tables).
const CODE_SPAN = /`([^`\n]+)`/g;
const LINE_REF = /:\d+(-\d+)?$/;

function resolvePath(raw) {
  const path = raw.replace(LINE_REF, "");
  if (SHORTHAND_ROOTS.some((root) => path.startsWith(root))) {
    return join(ROOT, "apps/web/src/app", path);
  }
  if (REPO_RELATIVE_ROOTS.some((root) => path.startsWith(root))) {
    return join(ROOT, path);
  }
  return null;
}

const problems = [];

for (const file of files) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");
  lines.forEach((line, i) => {
    if (line.includes("<!-- planned -->")) return;
    for (const match of line.matchAll(CODE_SPAN)) {
      const raw = match[1].trim();
      if (!raw.includes("/") || raw.includes("*") || raw.includes(" ")) continue;
      const ext = extname(raw.replace(LINE_REF, ""));
      if (!CODE_EXTS.has(ext)) continue;
      const resolved = resolvePath(raw);
      if (resolved === null) continue;
      if (existsSync(resolved)) continue;
      problems.push(`✗ ${file}:${i + 1}  ${raw}`);
    }
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ spec-code-paths: ${problems.length} broken code path(s) in ${files.length} spec files`);
  process.exit(1);
}

console.log(`✓ spec-code-paths: every code path in ${files.length} spec files resolves`);
