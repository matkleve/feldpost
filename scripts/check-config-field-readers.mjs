#!/usr/bin/env node
/**
 * Gate: every tuning-config field is read by something.
 *
 * A config field is the worst possible carrier for dead code. A reader who greps one finds a
 * name, a default value and a spec row all agreeing — which reads as three independent
 * confirmations, when it is one declaration copied twice. Nothing else in the build notices,
 * because an unread field is not a compile error; it is a light switch wired to nothing.
 *
 * Three of `UploadLocationConfig`'s 37 fields were exactly that, found by hand on 2026-09-21:
 *
 *   presentationBundleMaxDialogueUnits  a duplicate of a live constant in another module
 *   exifContextCheck                    a `true` flag for a check that runs unconditionally
 *   clusterAssistWeight                 weights for a ranking that weights other things
 *
 * All three were removed (#230, #237). This is the check that would have caught them the day
 * they were written.
 *
 * **What counts as read.** One reference to `.fieldName` anywhere under `apps/web/src` that is
 * not the defining file and not a `*.spec.ts`. A field read only by its own tests is not wired
 * to the product, which is the thing being asserted.
 *
 * **What this cannot catch.** A field with a genuine reader that is nonetheless a duplicate of a
 * live constant elsewhere — #230's shape. For that, flip the value and re-run the trace; see
 * TRAP-010.
 *
 * Usage: node scripts/check-config-field-readers.mjs
 * Exit 0 when every field has a reader; 1 otherwise.
 */

import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SRC = "apps/web/src";

/**
 * The configs this gate guards, by the `const` that holds their defaults.
 *
 * An explicit list rather than discovery: "an exported object of constants" also describes
 * plenty of things that are not tuning configs, and a gate that sweeps those in gets disabled
 * rather than fixed. Add a config here when it becomes a place people look for behaviour.
 */
const GUARDED = [
  {
    file: `${SRC}/app/core/upload/location/upload-location-config.ts`,
    constName: "DEFAULT_UPLOAD_LOCATION_CONFIG",
    maxUnread: 0,
  },
  {
    file: `${SRC}/app/core/search/search-tuning.defaults.ts`,
    constName: "SEARCH_TUNING_SYSTEM_DEFAULTS",
    /**
     * Ratchet, not an exemption. Nine fields here are declared in `search-tuning.types.ts`,
     * defaulted, and referenced nowhere else — measured 2026-09-21, the day this gate was
     * written. None is exposed in the Search Tuning settings section, so no user can set one and
     * watch it do nothing; they are dead config rather than a broken control. Tracked in #238.
     *
     * The number may only go down. A tenth fails the gate, which is the point: existing debt is
     * not a licence to add more.
     */
    maxUnread: 9,
  },
  {
    file: `${SRC}/app/core/search/search.models.ts`,
    constName: "DEFAULT_SEARCH_ENGINE_OPTIONS",
    maxUnread: 0,
  },
  {
    file: `${SRC}/app/core/search/search.models.ts`,
    constName: "DEFAULT_SEARCH_ORCHESTRATOR_OPTIONS",
    maxUnread: 0,
  },
];

/**
 * Fields that are unread on purpose. Each needs a reason and an issue — "unused for now" without
 * a tracked decision behind it is the thing this gate exists to stop.
 */
const ALLOWED_UNREAD = [
  {
    field: "exifHouseNumberRadiusMeters",
    reason:
      "D-09 is deliberately inert until the radius is chosen; a guessed default would be the invented precision the rule prevents",
    issue: "#221",
  },
];

/** Collect every key of an object literal, at any nesting depth, by walking braces. */
function fieldsOfDefaultObject(source, constName) {
  const start = source.indexOf(`export const ${constName}`);
  if (start === -1) {
    return null;
  }
  const open = source.indexOf("{", start);
  if (open === -1) {
    return null;
  }

  const fields = [];
  let depth = 0;
  let index = open;
  for (; index < source.length; index += 1) {
    const char = source[index];
    if (char === "{") {
      depth += 1;
      continue;
    }
    if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        break;
      }
      continue;
    }
    if (char === "\n") {
      // A key is the first token on its line: `  someKey: value,`
      const line = source.slice(index + 1, source.indexOf("\n", index + 1));
      const match = /^\s*([A-Za-z_$][\w$]*)\s*:/.exec(line ?? "");
      if (match) {
        fields.push(match[1]);
      }
    }
  }
  return fields;
}

function readerCount(field, definingFile) {
  let out = "";
  try {
    out = execFileSync(
      "grep",
      ["-rn", "--include=*.ts", `\\.${field}\\b`, join(ROOT, SRC)],
      { encoding: "utf8" },
    );
  } catch {
    return 0; // grep exits 1 when nothing matches
  }
  return out
    .split("\n")
    .filter(Boolean)
    .filter((line) => !line.includes(definingFile.replace(`${SRC}/`, "")))
    .filter((line) => !/\.spec\.ts:/.test(line)).length;
}

const allowed = new Map(ALLOWED_UNREAD.map((entry) => [entry.field, entry]));
const problems = [];
const exempted = [];
const ratcheted = [];
let checked = 0;

for (const config of GUARDED) {
  const source = readFileSync(join(ROOT, config.file), "utf8");
  const unread = [];
  const fields = fieldsOfDefaultObject(source, config.constName);
  if (!fields) {
    problems.push(
      `✗ ${config.file}\n  → no object literal found for ${config.constName}; the gate cannot read this config`,
    );
    continue;
  }

  for (const field of fields) {
    checked += 1;
    if (readerCount(field, config.file) > 0) {
      continue;
    }
    const exemption = allowed.get(field);
    if (exemption) {
      exempted.push(`${field} (${exemption.issue})`);
      continue;
    }
    unread.push(field);
  }

  const budget = config.maxUnread ?? 0;
  if (unread.length > budget) {
    for (const field of unread) {
      problems.push(
        `✗ ${config.constName}.${field} — declared in ${config.file}, read by nothing\n` +
          `  → wire it up, or delete the field, its default and its spec row together\n` +
          `  → deliberately unread? add it to ALLOWED_UNREAD with a reason and an issue`,
      );
    }
    if (budget > 0) {
      problems.push(
        `  → ${config.constName} carries a ratchet of ${budget} known-unread field(s) and now has ` +
          `${unread.length}. The ratchet may only go down.`,
      );
    }
  } else if (unread.length) {
    ratcheted.push(`${config.constName}: ${unread.length}/${budget}`);
  }
}

if (problems.length) {
  console.error(problems.join("\n"));
  console.error(`\n✗ config-field-readers: ${problems.length} field(s) nothing reads`);
  process.exit(1);
}

console.log(
  `✓ config-field-readers: ${checked} fields across ${GUARDED.length} configs` +
    (exempted.length ? `; ${exempted.length} exempt (${exempted.join(", ")})` : "") +
    (ratcheted.length ? `; known debt at ratchet (${ratcheted.join(", ")})` : ""),
);
