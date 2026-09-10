#!/usr/bin/env node
/**
 * Renders the component-registry supplements from docs/specs/component/registry.json.
 *
 * The catalog used to be 1,370 lines of hand-maintained prose across three
 * supplements. Nothing compared it to the code, so entries outlived the
 * components they described — 10 of the 103 entries pointed at selectors that
 * no longer exist anywhere in `apps/web/src` when this was written. A document
 * the reuse gate depends on cannot be the thing that drifts, so the JSON is now
 * the source and the markdown is output.
 *
 * The format follows the decision already taken one folder over for the
 * design-system registry (docs/design/design-system/registry-format-decision.md):
 * JSON as source, a schema-shaped check over it, markdown for humans.
 *
 * Usage:
 *   node scripts/generate-component-registry.mjs           write the supplements
 *   node scripts/generate-component-registry.mjs --check    exit 1 if stale
 *
 * The render function is imported by scripts/check-component-registry.mjs so
 * that "is it stale?" and "write it" can never disagree about the format.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { join, posix, resolve } from "node:path";

export const ROOT = resolve(import.meta.dirname, "..");
export const SLICE_DIR = "docs/specs/component";
export const REGISTRY_PATH = `${SLICE_DIR}/registry.json`;

const GENERATED_BANNER = [
  "<!-- GENERATED FILE — do not edit by hand.",
  "     Source: docs/specs/component/registry.json",
  "     Regenerate: node scripts/generate-component-registry.mjs -->",
].join("\n");

export function readRegistry() {
  return JSON.parse(readFileSync(join(ROOT, REGISTRY_PATH), "utf8"));
}

/** `docs/specs/component/media/media-item.md` -> ``[`docs/…`](media/media-item.md)`` */
export function renderSpecLink(specPath) {
  return `[\`${specPath}\`](${posix.relative(SLICE_DIR, specPath)})`;
}

/** Heading text for an entry; `heading` overrides it for deprecated/multi-selector rows. */
export function renderEntryHeading(entry) {
  if (entry.heading) return entry.heading;
  const selector = /^[a-z][\w-]*$/.test(entry.selector ?? "")
    ? `<${entry.selector}>`
    : entry.selector;
  return `\`${selector}\` — ${entry.name}`;
}

function renderBullet(label, value, boldColon = false) {
  const head = boldColon ? `- **${label}:**` : `- **${label}**:`;
  // A variant-axis bullet carries its table on the following lines and no value
  // of its own — emitting the separating space would leave trailing whitespace.
  return value.startsWith("\n") || value === "" ? `${head}${value}` : `${head} ${value}`;
}

function renderEntry(entry, entryLevel) {
  const out = [`${"#".repeat(entryLevel)} ${renderEntryHeading(entry)}`, ""];

  // A deprecated entry's "not for" guidance is its status line: the component is
  // gone and the replacement is named. Live entries render it as its own bullet.
  const statusNote = entry.status !== "active" && entry.notFor;
  if (statusNote) out.push(`> **Status:** ${entry.notFor}`, "");

  const bullets = [];
  if (entry.path) {
    const note = entry.pathNote ? ` ${entry.pathNote}` : "";
    bullets.push(renderBullet("File", `\`${entry.path}\`${note}`));
  }
  if (entry.useFor) bullets.push(renderBullet("Purpose", entry.useFor));
  if (!statusNote && entry.notFor) bullets.push(renderBullet("Not for", entry.notFor));

  for (const field of entry.fields ?? []) {
    if (field.position === "after-file") {
      bullets.push(renderBullet(field.label, field.value, field.boldColon));
    }
  }

  if (!entry.specOmitted) {
    const spec = entry.specMarkdown ?? (entry.spec ? renderSpecLink(entry.spec) : "@no-spec");
    bullets.push(renderBullet("Spec", spec));
  }

  for (const field of entry.fields ?? []) {
    if (field.position !== "after-file") {
      bullets.push(renderBullet(field.label, field.value, field.boldColon));
    }
  }

  out.push(...bullets, "");
  return out;
}

export function renderSlice(registry, slice) {
  const out = [`# ${slice.title}`, "", GENERATED_BANNER, "", ...slice.intro, ""];

  for (const section of slice.sections) {
    out.push(`${"#".repeat(section.level)} ${section.heading}`, "");
    if (section.body) out.push(...section.body, "");

    const entries = registry.components.filter(
      (c) => c.slice === slice.id && c.section === section.id,
    );
    entries.forEach((entry, index) => {
      out.push(...renderEntry(entry, slice.entryLevel));
      const isLast = index === entries.length - 1;
      if (!isLast && section.entrySeparator !== false) out.push("---", "");
    });

    if (section.rule !== false) out.push("---", "");
  }

  return `${out.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

export function renderAll(registry) {
  return registry.slices.map((slice) => ({
    file: `${SLICE_DIR}/${slice.file}`,
    contents: renderSlice(registry, slice),
  }));
}

function main() {
  const check = process.argv.includes("--check");
  const registry = readRegistry();
  const rendered = renderAll(registry);

  const stale = [];
  for (const { file, contents } of rendered) {
    const current = readFileSync(join(ROOT, file), "utf8");
    if (current === contents) continue;
    stale.push(file);
    if (!check) writeFileSync(join(ROOT, file), contents, "utf8");
  }

  if (check) {
    if (stale.length) {
      console.error(
        `✗ component-registry: ${stale.length} supplement(s) stale — ${stale.join(", ")}\n` +
          "  Run: node scripts/generate-component-registry.mjs",
      );
      process.exit(1);
    }
    console.log(`✓ component-registry: ${rendered.length} supplements match registry.json`);
    return;
  }

  console.log(
    stale.length
      ? `✓ wrote ${stale.length} supplement(s) from ${REGISTRY_PATH}: ${stale.join(", ")}`
      : `✓ ${rendered.length} supplements already match ${REGISTRY_PATH}`,
  );
}

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  main();
}
