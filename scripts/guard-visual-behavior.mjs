#!/usr/bin/env node

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = process.cwd();
const errors = [];
const warnings = [];

function fail(path, message) {
  errors.push(`${path}: ${message}`);
}

function warn(path, message) {
  warnings.push(`${path}: ${message}`);
}

function readText(relativePath) {
  const absolutePath = resolve(projectRoot, relativePath);
  if (!existsSync(absolutePath)) {
    fail(relativePath, "File not found.");
    return "";
  }

  return readFileSync(absolutePath, "utf-8").replace(/\r\n/g, "\n");
}

function expectContains(relativePath, content, expected, message) {
  if (!content.includes(expected)) {
    fail(relativePath, message);
  }
}

function expectNotContains(relativePath, content, blocked, message) {
  if (content.includes(blocked)) {
    fail(relativePath, message);
  }
}

function selectorBlock(content, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  // Require the selector to start at the beginning of a line (with optional indentation)
  // to avoid matching compound selectors like `:host(...) .my-class { ... }`.
  const regex = new RegExp(`(?:^|\\n)[ \\t]*${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m");
  const match = content.match(regex);
  return match ? match[1] : null;
}

function expectSelector(relativePath, content, selector, message) {
  if (!selectorBlock(content, selector)) {
    fail(relativePath, message);
  }
}

function expectSelectorNotPresent(relativePath, content, selector, message) {
  if (selectorBlock(content, selector)) {
    fail(relativePath, message);
  }
}

function parseZIndex(block) {
  if (!block) return null;
  const match = block.match(/z-index\s*:\s*([0-9]+)/);
  return match ? Number.parseInt(match[1], 10) : null;
}

function main() {
  const visualBehaviorRule = readText(".cursor/rules/visual-behavior.mdc");
  const webAgents = readText("apps/web/AGENTS.md");
  const itemGridSpec = readText("docs/specs/component/item-grid/item-grid.md");
  const mediaItemSpec = readText("docs/specs/component/media/media-item.md");

  const mediaContentHtml = readText(
    "apps/web/src/app/features/media/media-content.component.html",
  );
  const mediaItemHtml = readText(
    "apps/web/src/app/shared/media-item/media-item.component.html",
  );
  const mediaItemScss = readText(
    "apps/web/src/app/shared/media-item/media-item.component.scss",
  );
  const renderSurfaceTs = readText(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.ts",
  );
  const renderSurfaceHtml = readText(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.html",
  );
  const renderSurfaceScss = readText(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.scss",
  );
  const stateFrameScss = readText(
    "apps/web/src/app/shared/item-grid/item-state-frame.component.scss",
  );
  const mediaItemTs = readText(
    "apps/web/src/app/shared/media-item/media-item.component.ts",
  );

  // Governance guards.
  //
  // These assert the contract in its *owning* document. Until 2026-09-10 they
  // asserted a verbatim copy in AGENTS.md and a restatement in apps/web/AGENTS.md,
  // which made the guard require the duplication that .cursor/rules/*.mdc exists to
  // remove — the root copy was deleted as pure duplication and this check went red.
  // A guard that pins a rule to a stale address blocks the cleanup instead of the bug.
  expectContains(
    ".cursor/rules/visual-behavior.mdc",
    visualBehaviorRule,
    "## Ownership Matrix columns (fixed)",
    "Missing Ownership Matrix columns section.",
  );
  expectContains(
    ".cursor/rules/visual-behavior.mdc",
    visualBehaviorRule,
    "| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |",
    "Missing required ownership matrix table columns.",
  );
  // A pointer satisfies this: the rule file is always-applied, so an apps/web agent
  // already has the matrix loaded. What must not happen is the package file going
  // silent about it.
  expectContains(
    "apps/web/AGENTS.md",
    webAgents,
    ".cursor/rules/visual-behavior.mdc",
    "apps/web AGENTS must point at the Visual Behavior Contract in .cursor/rules/visual-behavior.mdc.",
  );

  // Spec guards for the current media/item-grid contract.
  for (const [path, content] of [
    ["docs/specs/component/item-grid/item-grid.md", itemGridSpec],
    ["docs/specs/component/media/media-item.md", mediaItemSpec],
  ]) {
    expectContains(
      path,
      content,
      "## Visual Behavior Contract",
      "Missing Visual Behavior Contract section.",
    );
    expectContains(
      path,
      content,
      "### Ownership Matrix",
      "Missing Ownership Matrix subsection.",
    );
  }

  // Runtime guards for /media + shared media item contract.
  expectContains(
    "apps/web/src/app/features/media/media-content.component.html",
    mediaContentHtml,
    '[mode]="itemMode()"',
    "Item grid and media items must bind layout mode to itemMode().",
  );

  expectContains(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.ts",
    renderSurfaceTs,
    "readonly state = input<MediaItemRenderSurfaceState>('loading');",
    "Render surface must expose enum state input.",
  );
  expectNotContains(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.ts",
    renderSurfaceTs,
    "readonly selected = input(false);",
    "Render surface must not expose legacy selected boolean input.",
  );
  expectContains(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.ts",
    renderSurfaceTs,
    "'[attr.data-state]': 'state()'",
    "Render surface host must expose data-state visual driver.",
  );
  expectNotContains(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.html",
    renderSurfaceHtml,
    '[class.media-item-render-surface__media-frame--selected]="selected()"',
    "Render surface must not use legacy selected class binding.",
  );
  expectSelector(
    "apps/web/src/app/shared/media-item/media-item-render-surface.component.scss",
    renderSurfaceScss,
    "[data-state='content-selected'] .media-item-render-surface__media-frame",
    "Missing data-state based selected frame style selector.",
  );

  expectContains(
    "apps/web/src/app/shared/media-item/media-item.component.ts",
    mediaItemTs,
    "'[attr.data-state]': 'state()'",
    "Media item host must expose data-state visual driver.",
  );
  expectContains(
    "apps/web/src/app/shared/media-item/media-item.component.html",
    mediaItemHtml,
    '<app-media-display',
    "Media item must delegate delivery to MediaDisplay.",
  );
  expectContains(
    "apps/web/src/app/shared/media-item/media-item.component.html",
    mediaItemHtml,
    '[state]="quietActionsState()"',
    "Media item must pass enum quiet-actions state.",
  );

  expectNotContains(
    "apps/web/src/app/shared/media-item/media-item.component.html",
    mediaItemHtml,
    "media-item__selected-overlay",
    "Host-level selected overlay element is forbidden; selection must be frame-level.",
  );
  expectNotContains(
    "apps/web/src/app/shared/media-item/media-item.component.scss",
    mediaItemScss,
    ".media-item__selected-overlay",
    "Host-level selected overlay style is forbidden; selection must be frame-level.",
  );
  expectSelectorNotPresent(
    "apps/web/src/app/shared/item-grid/item-state-frame.component.scss",
    stateFrameScss,
    ".item-state-frame--selected",
    "Shared state-frame must not render selected ring styling.",
  );

  // Layer sanity checks.
  const uploadLayerBlock = selectorBlock(
    mediaItemScss,
    ".media-item__upload-overlay",
  );
  const quietActionsBlock = selectorBlock(
    mediaItemScss,
    ".media-item__quiet-actions",
  );
  const uploadZ = parseZIndex(uploadLayerBlock);
  const quietZ = parseZIndex(quietActionsBlock);

  if (uploadZ === null) {
    fail(
      "apps/web/src/app/shared/media-item/media-item.component.scss",
      "Unable to read z-index for .media-item__upload-overlay.",
    );
  }

  if (quietZ === null) {
    fail(
      "apps/web/src/app/shared/media-item/media-item.component.scss",
      "Unable to read z-index for .media-item__quiet-actions.",
    );
  }

  if (uploadZ !== null && quietZ !== null && uploadZ >= quietZ) {
    fail(
      "apps/web/src/app/shared/media-item/media-item.component.scss",
      `Upload overlay z-index (${uploadZ}) must be below quiet actions z-index (${quietZ}).`,
    );
  }

  // Soft advisory: selected class on shared frame is now semantic only; flag for future cleanup.
  const stateFrameHtml = readText(
    "apps/web/src/app/shared/item-grid/item-state-frame.component.html",
  );
  if (stateFrameHtml.includes("[class.item-state-frame--selected]")) {
    warn(
      "apps/web/src/app/shared/item-grid/item-state-frame.component.html",
      "Selected class is present without visual owner role. Consider removing or documenting semantic purpose.",
    );
  }

  if (warnings.length > 0) {
    console.log("Visual behavior guard warnings:");
    for (const message of warnings) {
      console.log(`  - ${message}`);
    }
  }

  if (errors.length > 0) {
    console.error("Visual behavior guard failed:");
    for (const message of errors) {
      console.error(`  - ${message}`);
    }
    process.exit(1);
  }

  console.log("Visual behavior guard passed.");
}

main();
