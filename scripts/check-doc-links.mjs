#!/usr/bin/env node
/**
 * Gate: every relative link in the documentation resolves.
 *
 * A doc that points at a file someone renamed is worse than no doc, because
 * people trust it. Two live examples from the day this gate was written:
 * CONTRIBUTING.md sent every contributor to `docs/design-system/master-spec.md`
 * (the folder is `docs/design/design-system/`), and `docs/audits/README.md`
 * stated that `docs/implementation-blueprints/` was gone while the folder was
 * still in the tree. Neither is catchable by review — you only find them by
 * following the link, and nobody follows every link.
 *
 * Scope note: `docs/archive/**` is deliberately frozen (see AGENTS.md § Dead
 * code) and is neither scanned nor required to resolve. Links *into* the
 * archive from live docs still have to point at something that exists.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { basename, dirname, join, normalize, relative, resolve } from "node:path";
import { execFileSync } from "node:child_process";

const ROOT = resolve(import.meta.dirname, "..");

/** Roots we scan. Everything else (node_modules, apps/web/src) is code. */
const SCAN = ["AGENTS.md", "CONTRIBUTING.md", "docs", ".github", "apps/web/AGENTS.md", "supabase/AGENTS.md"];

/** Frozen trees: not scanned, and not linted for what they point at. */
const FROZEN = [/^docs\/archive\//, /^docs\/[^/]*\/archive\//, /\/archive\//];

const isFrozen = (file) => FROZEN.some((re) => re.test(file));

/** `git ls-files` so untracked scratch files never fail the gate. */
const tracked = execFileSync("git", ["ls-files", "-z", ...SCAN], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const files = tracked.filter((f) => f.endsWith(".md") && !isFrozen(f));

/** Every tracked path, for the "did you mean" hint. */
const allTracked = execFileSync("git", ["ls-files", "-z"], { cwd: ROOT, encoding: "utf8" })
  .split("\0")
  .filter(Boolean);

const byBasename = new Map();
for (const path of allTracked) {
  const key = basename(path);
  if (!byBasename.has(key)) byBasename.set(key, []);
  byBasename.get(key).push(path);
}

// Inline links and images: [text](target) / ![alt](target). Angle-bracket and
// title forms are normalised before the target is read.
const LINK = /!?\[[^\]]*\]\(\s*(<[^>]*>|[^()\s]+(?:\([^()]*\)[^()\s]*)*)(?:\s+"[^"]*")?\s*\)/g;

const problems = [];

for (const file of files) {
  const lines = readFileSync(join(ROOT, file), "utf8").split("\n");

  lines.forEach((line, i) => {
    for (const match of line.matchAll(LINK)) {
      let target = match[1].replace(/^<|>$/g, "").trim();

      if (/^(https?:|mailto:|tel:|data:|#)/.test(target)) continue;
      if (target === "") continue;

      // Strip the fragment; we check that the file exists, not the anchor.
      const path = target.split("#")[0];
      if (path === "") continue;

      // Absolute-from-repo-root links are rare here but legal.
      const resolved = path.startsWith("/")
        ? join(ROOT, path.slice(1))
        : join(ROOT, normalize(join(dirname(file), path)));

      if (existsSync(resolved)) continue;

      // A directory link written without the trailing slash still resolves.
      if (existsSync(resolved.replace(/\/$/, "")) && statSync(resolved.replace(/\/$/, "")).isDirectory()) continue;

      const candidates = byBasename.get(basename(path)) ?? [];
      const hint =
        candidates.length === 1
          ? `  → did you mean ${relative(dirname(join(ROOT, file)), join(ROOT, candidates[0]))} ?`
          : candidates.length > 1
            ? `  → ${candidates.length} files share that name: ${candidates.slice(0, 3).join(", ")}`
            : "  → no file with that name exists anywhere in the repo";

      problems.push(`✗ ${file}:${i + 1}  broken link (${target})\n${hint}`);
    }
  });
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ doc-links: ${problems.length} broken link(s) in ${files.length} files`);
  process.exit(1);
}

console.log(`✓ doc-links: every relative link in ${files.length} documents resolves`);
