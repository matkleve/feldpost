#!/usr/bin/env node
/**
 * Gate: a graded claim is not deleted from a study by accident.
 *
 * `STUDY-FORMAT.md` § Correcting a study says an `## Update` may add to a study
 * and must not delete a graded claim — `[A] the RPCs are absent` and `[A] the
 * RPCs are present, 2026-09-22` are both true of different days, and the pair is
 * the record. The rule had been in the file for twelve days when a careful agent
 * broke it: `bcd3012` removed an `[A]` from STUDY-006 and replaced it with a
 * newer one, naming what it superseded but deleting the text. Nothing noticed,
 * because nothing was looking at diffs.
 *
 * **This gate does not judge.** Whether a removal was a legitimate correction or
 * a rewrite-into-agreement needs a reader. What a machine can do is make the
 * removal deliberate and reviewable: a change that deletes a graded line from
 * `docs/study/` must say so in its commit body, with a
 *
 *     study-correction: <why the claim was removed rather than superseded>
 *
 * trailer. The trailer is not a permission slip — it is the sentence a reviewer
 * reads first. A change that only adds graded lines, or touches no study, passes
 * silently.
 *
 * **Scope.** It compares the working tree against a base ref, so it is a
 * pre-merge check, not a history audit. With no base resolvable — a shallow
 * clone, a detached checkout with no `origin` — it prints why and passes rather
 * than failing on something it cannot see. A gate that fails for lack of a ref
 * teaches people to skip it, which is the failure `verify.mjs` exists to end.
 *
 * Usage: `node scripts/check-study-claim-deletion.mjs [--base <ref>]`
 *
 * @see docs/study/STUDY-FORMAT.md § Correcting a study
 * @see docs/study/012-study-system-audit.md § S-04
 */

import { execFileSync } from "node:child_process";
import { resolve } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");

/** A line carrying an evidence grade. Grades appear inline, so anywhere in the line counts. */
const GRADED = /\[[ABCD]\]/;

/**
 * The trailer that makes a deletion deliberate. Case-insensitive, anywhere in a commit body.
 *
 * The `[^<\s]` is not decoration. The first version of this gate accepted
 * `\S`, and the very first commit it judged was the one that *introduced* it —
 * whose message quotes the trailer's own placeholder as documentation:
 *
 *     study-correction: <why this claim was removed rather than superseded>
 *
 * The gate passed itself on its own example text. A placeholder is the one
 * string guaranteed to appear in every document, template and commit that
 * explains this rule, so it is the one string that must not satisfy it.
 */
const TRAILER = /^\s*study-correction:[ \t]*[^<\s][^\n]*$/im;

const git = (...args) => execFileSync("git", args, { cwd: ROOT, encoding: "utf8" });

/** Resolve a base to diff against: an explicit --base, else the upstream, else origin/main. */
function resolveBase() {
  const flag = process.argv.indexOf("--base");
  const candidates =
    flag !== -1 && process.argv[flag + 1]
      ? [process.argv[flag + 1]]
      : ["@{upstream}", "origin/main", "origin/HEAD"];

  for (const ref of candidates) {
    try {
      const sha = git("rev-parse", "--verify", "--quiet", `${ref}^{commit}`).trim();
      if (!sha) continue;
      // A merge base is what a PR is actually reviewed against; without one the
      // diff would also flag everything the base branch removed since we forked.
      try {
        return { ref, sha: git("merge-base", sha, "HEAD").trim() };
      } catch {
        return { ref, sha };
      }
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

const base = resolveBase();

if (!base) {
  console.log(
    "✓ study-claim-deletion: skipped — no base ref to diff against " +
      "(no upstream, no origin/main). Pass one with --base <ref>.",
  );
  process.exit(0);
}

// Working tree against the base, so an uncommitted deletion is caught before it
// is committed rather than after.
//
// Studies only — `docs/study/README.md` is deliberately out of scope. Its index
// rows quote grades from the studies they summarise, so every ordinary row edit
// would read as a deleted claim; a gate that fires on routine work is a gate
// people learn to pass with a boilerplate trailer. The rows are guarded instead
// by `check-study-format.mjs`, which requires one row per study with a matching
// status — a summary cannot drift from its source without that failing.
const diff = git("diff", "--unified=0", "--no-color", base.sha, "--", "docs/study");

/** A study file, not the index or the format doc: `docs/study/NNN-slug.md`. */
const isStudy = (path) => /^docs\/study\/\d{3}-.+\.md$/.test(path);

/** Removed graded lines, grouped by file. `-` lines that are not `---` file headers. */
const removals = new Map();
let file = null;

for (const line of diff.split("\n")) {
  if (line.startsWith("+++ b/")) {
    file = line.slice(6);
    continue;
  }
  if (line.startsWith("--- ") || line.startsWith("+")) continue;
  if (!line.startsWith("-") || !file || !isStudy(file)) continue;

  const text = line.slice(1);
  if (!GRADED.test(text)) continue;
  if (!removals.has(file)) removals.set(file, []);
  removals.get(file).push(text.trim());
}

if (removals.size === 0) {
  console.log(
    `✓ study-claim-deletion: no graded claim removed from docs/study/ against ${base.ref}`,
  );
  process.exit(0);
}

// Every commit this branch adds, plus any staged/unstaged work's eventual commit
// (which has no message yet — so an uncommitted deletion always needs the
// trailer added when it is committed, and the gate says so).
const messages = git("log", "--format=%B", `${base.sha}..HEAD`);
const justified = TRAILER.test(messages);

const total = [...removals.values()].reduce((n, lines) => n + lines.length, 0);

if (justified) {
  console.log(
    `✓ study-claim-deletion: ${total} graded claim(s) removed from ${removals.size} study file(s), ` +
      `declared with a \`study-correction:\` trailer`,
  );
  process.exit(0);
}

for (const [path, lines] of removals) {
  console.error(`✗ ${path}  removes ${lines.length} graded claim(s):`);
  for (const line of lines.slice(0, 5)) {
    console.error(`    - ${line.length > 110 ? `${line.slice(0, 110)}…` : line}`);
  }
  if (lines.length > 5) console.error(`    … and ${lines.length - 5} more`);
}

console.error(
  `\n✗ study-claim-deletion: ${total} graded claim(s) removed from docs/study/ ` +
    `without a \`study-correction:\` trailer (base: ${base.ref})\n` +
    "\n" +
    "  A study is never rewritten into agreement. A claim that turned out wrong\n" +
    "  stays, and the correction is appended beside it — see STUDY-FORMAT.md\n" +
    "  § Correcting a study. If the removal is right anyway (a typo, a moved\n" +
    "  section, a claim split in two), say so in the commit body:\n" +
    "\n" +
    "      study-correction: <why this claim was removed rather than superseded>\n",
);
process.exit(1);
