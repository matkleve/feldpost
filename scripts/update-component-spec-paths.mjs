/**
 * One-off: after moving docs/specs/component/*.md into subfolders,
 * replace `docs/specs/component/<file>` and `specs/component/<file>` with nested paths.
 */
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

/** Flat filename -> path under component/ (subfolder/file) */
const MAP = new Map([
  ["upload-panel.layout-and-states.md", "upload/upload-panel.layout-and-states.md"],
  ["upload-panel.lane-and-row-actions.md", "upload/upload-panel.lane-and-row-actions.md"],
  ["upload-panel.feedback-triage.md", "upload/upload-panel.feedback-triage.md"],
  ["upload-panel.acceptance-criteria.md", "upload/upload-panel.acceptance-criteria.md"],
  ["upload-panel.md", "upload/upload-panel.md"],
  ["upload-button-zone.md", "upload/upload-button-zone.md"],
  ["item-grid.visual-behavior-and-scss.md", "item-grid/item-grid.visual-behavior-and-scss.md"],
  ["item-grid.state-and-fsm.md", "item-grid/item-grid.state-and-fsm.md"],
  ["item-grid.migration-acceptance-and-gates.md", "item-grid/item-grid.migration-acceptance-and-gates.md"],
  ["item-grid.md", "item-grid/item-grid.md"],
  ["item-state-frame.md", "item-grid/item-state-frame.md"],
  ["item-grid-filter-operator.md", "filters/item-grid-filter-operator.md"],
  ["grouping-dropdown.drag-and-state-machine.supplement.md", "filters/grouping-dropdown.drag-and-state-machine.supplement.md"],
  ["grouping-dropdown.md", "filters/grouping-dropdown.md"],
  ["dropdown-system.class-library.supplement.md", "filters/dropdown-system.class-library.supplement.md"],
  ["dropdown-system.md", "filters/dropdown-system.md"],
  ["file-type-chips.lookup-table.supplement.md", "media/file-type-chips.lookup-table.supplement.md"],
  ["file-type-chips.md", "media/file-type-chips.md"],
  ["media-display.rendering-matrix.supplement.md", "media/media-display.rendering-matrix.supplement.md"],
  ["media-item-upload-overlay.md", "media/media-item-upload-overlay.md"],
  ["media-item-quiet-actions.md", "media/media-item-quiet-actions.md"],
  ["media-item.md", "media/media-item.md"],
  ["media-display.md", "media/media-display.md"],
  ["media-content.md", "media/media-content.md"],
  ["media.component.md", "media/media.component.md"],
  ["media-page-header.md", "media/media-page-header.md"],
  ["media-toolbar.md", "media/media-toolbar.md"],
  ["user-location-marker.md", "map/user-location-marker.md"],
  ["radius-selection.md", "map/radius-selection.md"],
  ["placement-mode.md", "map/placement-mode.md"],
  ["map-context-menu.md", "map/map-context-menu.md"],
  ["map-zone.md", "map/map-zone.md"],
  ["gps-button.md", "map/gps-button.md"],
  ["auth-map-background.md", "map/auth-map-background.md"],
  ["projects-dropdown.md", "project/projects-dropdown.md"],
  ["project-details-view.md", "project/project-details-view.md"],
  ["project-color-picker.md", "project/project-color-picker.md"],
  ["project-item.md", "project/project-item.md"],
  ["sort-dropdown.md", "filters/sort-dropdown.md"],
  ["segmented-switch.md", "filters/segmented-switch.md"],
  ["filter-dropdown.md", "filters/filter-dropdown.md"],
  ["captured-date-editor.md", "filters/captured-date-editor.md"],
  ["chip.md", "filters/chip.md"],
  ["active-filter-chips.md", "filters/active-filter-chips.md"],
  ["sidebar.md", "workspace/sidebar.md"],
  ["group-tab-bar.md", "workspace/group-tab-bar.md"],
  ["drag-divider.md", "workspace/drag-divider.md"],
  ["active-selection-view.md", "workspace/active-selection-view.md"],
]);

const sorted = [...MAP.entries()].sort((a, b) => b[0].length - a[0].length);

const EXT = new Set([".md", ".mjs", ".ts", ".html", ".scss", ".json", ".yml", ".yaml"]);

function* walk(dir) {
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return;
  }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.name === ".git" || e.name === "node_modules" || e.name === "dist") continue;
    if (e.isDirectory()) yield* walk(p);
    else {
      const dot = e.name.lastIndexOf(".");
      const ext = dot >= 0 ? e.name.slice(dot) : "";
      if (EXT.has(ext)) yield p;
    }
  }
}

function applyReplacements(text) {
  let out = text;
  for (const [flat, nested] of sorted) {
    out = out.replaceAll(`docs/specs/component/${flat}`, `docs/specs/component/${nested}`);
    out = out.replaceAll(`specs/component/${flat}`, `specs/component/${nested}`);
    // Relative markdown and shorthand paths: `../component/foo.md`, `component/foo.md` in tables
    out = out.replaceAll(`component/${flat}`, `component/${nested}`);
  }
  return out;
}

let filesChanged = 0;
for (const file of walk(ROOT)) {
  const rel = relative(ROOT, file).replace(/\\/g, "/");
  const orig = readFileSync(file, "utf8");
  const text = applyReplacements(orig);
  if (text !== orig) {
    writeFileSync(file, text, "utf8");
    filesChanged++;
    console.log(rel);
  }
}
console.error(`Updated ${filesChanged} files.`);
