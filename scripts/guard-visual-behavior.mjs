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
  const regex = new RegExp(`${escaped}\\s*\\{([\\s\\S]*?)\\}`, "m");
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
  const agents = readText("AGENTS.md");
  const webAgents = readText("apps/web/AGENTS.md");
  const itemGridSpec = readText("docs/specs/component/item-grid.md");
  const mediaItemSpec = readText("docs/specs/component/media-item.md");

  const mediaContentHtml = readText(
    "apps/web/src/app/features/media/media-content.component.html",
  );
  const mediaItemHtml = readText(
    "apps/web/src/app/features/media/media-item.component.html",
  );
  const mediaItemScss = readText(
    "apps/web/src/app/features/media/media-item.component.scss",
  );
  const renderSurfaceTs = readText(
    "apps/web/src/app/features/media/media-item-render-surface.component.ts",
  );
  const renderSurfaceHtml = readText(
    "apps/web/src/app/features/media/media-item-render-surface.component.html",
  );
  const renderSurfaceScss = readText(
    "apps/web/src/app/features/media/media-item-render-surface.component.scss",
  );
  const stateFrameScss = readText(
    "apps/web/src/app/shared/item-grid/item-state-frame.component.scss",
  );

  // Governance guards.
  expectContains(
    "AGENTS.md",
    agents,
    "### Ownership Matrix (Mandatory)",
    "Missing Ownership Matrix section in Visual Behavior Contract.",
  );
  expectContains(
    "AGENTS.md",
    agents,
    "| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer (z-index/token) | Test Oracle |",
    "Missing required ownership matrix table columns.",
  );
  expectContains(
    "apps/web/AGENTS.md",
    webAgents,
    "behavior-to-CSS ownership matrix",
    "apps/web AGENTS must reference behavior-to-CSS ownership matrix.",
  );

  // Spec guards for the current media/item-grid contract.
  for (const [path, content] of [
    ["docs/specs/component/item-grid.md", itemGridSpec],
    ["docs/specs/component/media-item.md", mediaItemSpec],
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

  // Runtime guards for /media behavior.
  expectContains(
    "apps/web/src/app/features/media/media-content.component.html",
    mediaContentHtml,
    '[slotMode]="itemMode()"',
    "Loading render surface must bind slotMode to itemMode().",
  );

  expectContains(
    "apps/web/src/app/features/media/media-item-render-surface.component.ts",
    renderSurfaceTs,
    "readonly state = input<MediaItemRenderSurfaceState>('loading');",
    "Render surface must expose enum state input.",
  );
  expectNotContains(
    "apps/web/src/app/features/media/media-item-render-surface.component.ts",
    renderSurfaceTs,
    "readonly selected = input(false);",
    "Render surface must not expose legacy selected boolean input.",
  );
  expectContains(
    "apps/web/src/app/features/media/media-item-render-surface.component.html",
    renderSurfaceHtml,
    '[attr.data-state]="state()"',
    "Render surface root must expose data-state visual driver.",
  );
  expectNotContains(
    "apps/web/src/app/features/media/media-item-render-surface.component.html",
    renderSurfaceHtml,
    '[class.media-item-render-surface__media-frame--selected]="selected()"',
    "Render surface must not use legacy selected class binding.",
  );
  expectSelector(
    "apps/web/src/app/features/media/media-item-render-surface.component.scss",
    renderSurfaceScss,
    "[data-state='content-selected'] .media-item-render-surface__media-frame",
    "Missing data-state based selected frame style selector.",
  );

  expectContains(
    "apps/web/src/app/features/media/media-item.component.html",
    mediaItemHtml,
    '[state]="renderSurfaceState()"',
    "Media item must pass enum render-surface state.",
  );
  expectContains(
    "apps/web/src/app/features/media/media-item.component.html",
    mediaItemHtml,
    '[state]="quietActionsState()"',
    "Media item must pass enum quiet-actions state.",
  );
  expectContains(
    "apps/web/src/app/features/media/media-item.component.html",
    mediaItemHtml,
    '[state]="state()"',
    "Media item must pass enum state to item-state-frame.",
  );

  expectNotContains(
    "apps/web/src/app/features/media/media-item.component.html",
    mediaItemHtml,
    "media-item__selected-overlay",
    "Host-level selected overlay element is forbidden; selection must be frame-level.",
  );
  expectNotContains(
    "apps/web/src/app/features/media/media-item.component.scss",
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
      "apps/web/src/app/features/media/media-item.component.scss",
      "Unable to read z-index for .media-item__upload-overlay.",
    );
  }

  if (quietZ === null) {
    fail(
      "apps/web/src/app/features/media/media-item.component.scss",
      "Unable to read z-index for .media-item__quiet-actions.",
    );
  }

  if (uploadZ !== null && quietZ !== null && uploadZ >= quietZ) {
    fail(
      "apps/web/src/app/features/media/media-item.component.scss",
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
