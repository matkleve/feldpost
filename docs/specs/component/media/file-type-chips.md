# File-Type Chips (Upload Area Feature)

> **Architecture parent:** [media-download-service](../service/media-download-service/media-download-service.md)

## Agent entry points (read first)

**Do not** build upload-only chip markup or colors. Reuse the shared primitive and central helpers.

| Concern | Canonical location | Agent rule |
| --- | --- | --- |
| **UI primitive** | `apps/web/src/app/shared/components/chip/` (`app-chip`) | Spec: [chip.md](../filters/chip.md). Pill shape; product name **Chip**, not a separate upload component. |
| **MIME / extension → definition** | `apps/web/src/app/core/media/file-type-registry.ts` | `resolveFileType({ mimeType, fileName, extension })` |
| **Definition → chip `variant`** | `apps/web/src/app/core/media/file-type-chip-variant.ts` | **`chipVariantForFileType(definition)`** — PDF (`id === 'pdf'`) → `filetype-pdf`; Word/docs → `filetype-document`; images → `filetype-image`, etc. |
| **Color tokens** | `apps/web/src/styles.scss` (`--filetype-*` on `:root` / dark palette) | Never invent names; never use raw `chart-3` for image ink (too light). Visual recipe: `chip.component.scss` `chip--filetype-*`. |
| **Upload dropzone chip list** | `upload-panel-file-type-groups.ts` → `DEFAULT_FILE_TYPE_GROUPS` | Six **group** chips in one row; hover/focus opens an **absolute overlay dropdown** of member chips below the group (no layout shift, no transition). Per-extension data still from registry. |
| **Flat extension list (helpers)** | `upload-panel.constants.ts` → `DEFAULT_FILE_TYPE_CHIPS` | Used to build groups; do not render flat list in dropzone. |
| **Pill vs badge inventory** | [ui-primitives.badges-and-chips.md](../ui-primitives/ui-primitives.badges-and-chips.md) | When to use `app-chip` vs `ui-chip`. |

**De-facto color semantics (no industry standard — Adobe/Microsoft conventions):** image = warm orange, PDF = red, Word/docs = blue, spreadsheet = green, presentation = amber, video = purple. Rationale table in § File-Type Categorization below.

**Service mirror:** [media-types-and-file-registry.md](../../service/media/media-types-and-file-registry.md).

## What It Is

Visual chip-based display of the file types present in the current upload batch. Replaces the text-based "JPEG · PNG · HEIC · WebP · MP4 · MOV · WebM · PDF · DOCX · XLSX · PPTX" string with a grid or inline display of compact, color-coded chip elements. Each unique file type in the upload queue is represented by a single chip showing the file-type abbreviation + icon.

## What It Looks Like

Horizontally scrolling (or wrapping) row of small chips below the upload dropzone. Each chip displays a **supported extension label** (static intake list in upload panel, or deduplicated batch in other surfaces). Chips are color-coded by file-type category (see § File-Type Categorization). Icons are Material Icons from the registry (e.g., `image`, `videocam`, `description`, `table_chart`, `slideshow`).
Chips use `app-chip` filetype variants: tinted background (~20%), `--chip-ink` text/icon (accent mixed toward `foreground` for contrast on frosted panels), thin border from the same token.

Example layout:

```
┌──────┬──────┬──────┬──────┬──────┐
│ 🖼️ JPEG│ 📹 MP4│ 📄 PDF│ 📊 XLSX│ 🎨 PPTX│
└──────┴──────┴──────┴──────┴──────┘
```

## Where It Lives

- **Route context**: Any route where `UploadPanelComponent` is rendered
- **Parent component**: `upload-area.component.ts`
- **Placement trigger**: Upload area is visible and `uploadManager.jobs()` contains at least one supported file
- **Layout slot**: Below dropzone and above upload-intake controls (or below "Last upload" when that block is prioritized)

## Actions

| #   | User Action                                         | System Response                                                            | Notes                                  |
| --- | --------------------------------------------------- | -------------------------------------------------------------------------- | -------------------------------------- |
| 1   | User opens upload panel with no queued files        | File-type chip container is hidden                                         | Empty state                            |
| 2   | User adds files via dropzone/picker/folder          | Chip list is computed from unique normalized extensions                    | Trigger: `uploadManager.jobs()` change |
| 3   | Batch includes duplicate extensions (`jpg`, `jpeg`) | Single normalized chip (`JPEG`) is shown                                   | Deduplication contract                 |
| 4   | Batch contains multiple categories                  | Chips are sorted by category order and rendered with category token colors | Deterministic rendering                |
| 5   | User removes files from queue                       | Chip list recomputes and removed types disappear                           | Reactive update                        |
| 6   | Unsupported extension only                          | No unknown chip is rendered                                                | `filter(Boolean)` path                 |
| 7   | Small viewport width                                | Chip row wraps or scrolls horizontally without overflow                    | Mobile behavior                        |

## Component Hierarchy

**STRICT PRIMITIVE REQUIREMENT:** The section must use shared layout primitives from `src/styles/primitives/container.scss`. The chips host should be a `.ui-container` variant and repeated chip rows should rely on `.ui-item` semantics where applicable. Do not add extra wrapper `div`s for spacing-only behavior.

```
UploadAreaComponent
└── FileTypeChipsSection
  ├── FileTypeChipList
  │   └── ChipComponent x N (deduplicated by normalized type)
  └── [optional] EmptyState (hidden when no jobs)
```

## Data

| Source                 | Contract                                                         | Operation               |
| ---------------------- | ---------------------------------------------------------------- | ----------------------- |
| `uploadManager.jobs()` | Upload job list with `file.name` and MIME context                | Read/reactive recompute |
| `FILE_TYPE_MAP`        | Extension -> chip metadata (`type`, `icon`, `category`, `color`) | Pure lookup             |
| `CATEGORY_ORDER`       | Deterministic category ordering                                  | Pure sort               |

No direct Supabase calls are required for this feature; chips are derived from in-memory upload queue state.

## File-Type Categorization & Color Mapping

| Category           | File Types                                          | Icon          | Primary Token             | Variant               | Notes                                               |
| ------------------ | --------------------------------------------------- | ------------- | ------------------------- | --------------------- | --------------------------------------------------- |
| **Image**          | JPEG, JPG, PNG, HEIC, HEIF, WebP, TIFF              | `image`       | `--filetype-image`        | filetype-image        | Warm orange (photo); de-facto gallery tone          |
| **Video**          | MP4, MOV, WebM, AVI, MKV                            | `videocam`    | `--filetype-video`        | filetype-video        | Purple; distinct from image                         |
| **PDF**            | PDF                                                   | `description` | `--filetype-pdf`          | filetype-pdf          | Red (Adobe Reader convention)                       |
| **Document**       | DOCX, DOC, ODT, ODG, TXT (not PDF)                  | `description` | `--filetype-document`     | filetype-document     | Blue (Microsoft Word convention)                    |
| **Spreadsheet**    | XLSX, XLS, ODS, CSV                                 | `table_chart` | `--filetype-spreadsheet`  | filetype-spreadsheet  | Green, aligned with spreadsheet mental model        |
| **Presentation**   | PPTX, PPT, ODP                                      | `bar_chart`   | `--filetype-presentation` | filetype-presentation | Warm amber/orange; avoids red error signal          |
| **Office Generic** | DOCX, DOC, ODT, ODG, XLSX, XLS, ODS, PPTX, PPT, ODP | `article`     | `--filetype-office`       | custom                | Fallback if type-specific mapping unavailable       |

**Rationale:**

- **Image (orange)**: warm photo tone; readable chip ink via `--chip-ink` mix
- **PDF (red)**: Adobe Reader de-facto; separate from Word/document blue
- **Video (purple)**: distinct from static image category
- **Document (indigo/blue-grey)**: office/work semantics without warning signal
- **Spreadsheet (green)**: strong global association with Excel/Sheets
- **Presentation (amber)**: aligns with common PPT visual language, avoids panic/red semantics

## Color Token Contract

**Runtime source of truth:** Dedicated **`--filetype-*`** custom properties are defined once in **`apps/web/src/styles.scss`** on the tweakcn **`:root` / `html[data-theme]`** semantic blocks — not in feature SCSS. The legacy bridge file **`apps/web/src/styles/_legacy-design-tokens.scss`** is **absent** from **`apps/web`** (Phase 7 Batch 50). Layering: [`docs/design/token-layers.md`](../../../design/token-layers.md); naming: [`docs/design/tokens.md`](../../../design/tokens.md). **Verify** live values in `styles.scss` when authoring; the excerpt below matches the light-mode block as of the Phase 7 consolidation.

Keep status colors (`--color-success`, `--color-warning`, `--color-danger`) exclusively for real status feedback.

```scss
// apps/web/src/styles.scss — :root semantic extension (illustrative; confirm in repo)
  --filetype-image: oklch(0.55 0.13 68);
  --filetype-pdf: oklch(0.52 0.17 25);
  --filetype-video: oklch(0.52 0.16 25);
  --filetype-document: oklch(0.5 0.1 245);
  --filetype-spreadsheet: var(--success);
  --filetype-presentation: oklch(0.56 0.15 42);
  --filetype-office: color-mix(in oklch, var(--muted-foreground) 82%, var(--foreground));
```

Visual recipe for all file-type chips (matches **`chip.component.scss`** `chip--filetype-*`):

- Background: `color-mix(in srgb, <filetype-token> 20%, var(--background))` (dark: 24% with `var(--card)`)
- Text/Icon: `color-mix(in oklch, <filetype-token> 58%, var(--foreground))` as `--chip-ink` (dark: 72%)
- Border: `1px solid color-mix(in srgb, <filetype-token> 40%, var(--border))`

## Deduplication Logic

**Input**: Batch of upload jobs, each with `file.type` (MIME) and `file.name` (extension).

**Process:**

1. Extract unique file extensions from batch (e.g., `['jpg', 'png', 'mov', 'pdf']`)
2. Map each extension to its category + icon + color
3. Filter out duplicates: if batch has both `.jpg` and `.jpeg`, show only one "JPEG" chip
4. Sort by category (images first, then video, document, spreadsheet, presentation)
5. Render as chip row; if >6 unique types, wrap or scroll

**Example Pseudocode:**

```typescript
// In upload-area.component.ts
const getUniqueFileTypes = () => {
  const jobs = uploadManager.jobs();
  const extensions = new Set(
    jobs.map((job) => job.file.name.split(".").pop()?.toLowerCase()),
  );

  return Array.from(extensions)
    .map((ext) => FILE_TYPE_MAP[ext]) // lookup icon, color, category
    .filter(Boolean) // remove unknowns
    .sort(
      (a, b) =>
        CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    )
    .reduce((unique, type) => {
      // Deduplicate by category+icon
      if (!unique.some((t) => t.icon === type.icon)) {
        unique.push(type);
      }
      return unique;
    }, []);
};
```

## Component Architecture

**Parent**: `UploadPanelComponent` (`upload-panel.component.ts`)  
**Child**: `app-chip` — variant from `chipVariantForFileType()`, never `[variant]="'custom'"` for known file types.

```typescript
// Shipped pattern (upload panel + file rows)
const definition = resolveFileType({ mimeType: file.type, fileName: file.name });
// or: resolveFileType({ extension: 'pdf' })

<app-chip
  [icon]="definition.icon"
  [text]="fileTypeBadge({ extension }) ?? label"
  [variant]="chipVariantForFileType(definition)"
/>
```

```html
<!-- upload-panel.component.html — grouped supported-types row -->
@for (group of fileTypeGroups; track group.id) {
  <div class="upload-panel__file-type-group">
    <app-chip [icon]="group.icon" [text]="…" [variant]="group.variant"></app-chip>
    <div class="upload-panel__file-type-group-detail">… member chips …</div>
  </div>
}
```

## Display Placement & Styling

**Location in Upload Panel:**

- Inside the dropzone, below the dropzone label (static supported-type groups).
- Member chips open in an **overlay dropdown** (`position: absolute`) and must **not** expand dropzone height or push "Upload folder" / intake controls.

**Group dropdown contract** (`upload-panel.component.scss`):

- Group row: flex wrap, centered; only group chips occupy layout space.
- `upload-panel__file-type-group-detail`: absolute under group chip, `z-index` above intake, **transparent** (no border/background/shadow — only member chips visible), no CSS transition.
- `upload-panel` root: `overflow: visible` so the dropdown can paint over controls below the dropzone.

**Container Styling**:

```scss
.upload-panel__file-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
}
```

## State & Updates

**When to Regenerate Chip List:**

1. User selects new files (via dropzone, file picker, or folder)
2. Upload batch changes (files removed, added)
3. Phase changes occur (might want to show only incomplete batches)

**Triggers:**

- Listen to `uploadManager.jobs()` signal
- Recompute `fileTypeChips` whenever jobs array changes
- Angular's computed property handles this automatically

## File Map

| File                                                              | Purpose                                           |
| ----------------------------------------------------------------- | ------------------------------------------------- |
| `docs/specs/component/media/file-type-chips.md`                           | Contract for upload file-type chip behavior       |
| `apps/web/src/app/features/map/upload/upload-area.component.ts`   | Computes and exposes deduplicated chip view-model |
| `apps/web/src/app/features/map/upload/upload-area.component.html` | Renders chip section and list                     |
| `apps/web/src/app/features/map/upload/upload-area.component.scss` | Chip row layout, wrap/scroll behavior             |
| `apps/web/src/app/shared/chip/chip.component.ts`                  | Shared chip primitive component API               |
| `apps/web/src/app/shared/chip/chip.component.html`                | Shared chip primitive template                    |
| `apps/web/src/app/shared/chip/chip.component.scss`                | Shared chip primitive visual variants             |

## Wiring

### Injected Services

- `UploadManagerService` (or upload facade) - source of upload jobs signal.

### Inputs / Outputs

- Input: current upload jobs via `uploadManager.jobs()`.
- Output: none - derived visual section only.

### Subscriptions

- `fileTypeChips` is recomputed whenever `uploadManager.jobs()` changes.

### Supabase Calls

None - this feature is local to queue visualization.

## Acceptance Criteria

- [x] Spec document created: `docs/specs/component/media/file-type-chips.md`
- [x] File type → color mapping table defined (as above)
- [x] Deduplication logic handles common variants (jpg/jpeg, doc/docx, etc.)
- [x] Chip display placed correctly in upload panel (after dropzone)
- [x] All 5 color categories visible and visually distinct
- [x] Chip grid wraps/scrolls on small screens without overflow
- [ ] Empty state: no chips shown when no jobs in queue
- [x] Chips updated in real-time as batch changes (jobs added/removed)
- [x] Icons render correctly; no missing Material Icon references
- [ ] Accessibility: `aria-label` on container, semantic role
- [x] Visual testing: all 5 color variants render at correct size (sm)
- [x] No new hardcoded text; all labels (type abbreviations) use tokens or constants
- [ ] File-type chips section uses standardized layout primitives (`.ui-container` / `.ui-item`) and keeps DOM hierarchy flat
- [ ] Interactive/hover states do not change chip geometry (height, padding, alignment)

Implementation reference lookup table: **[file-type-chips.lookup-table.supplement.md](./file-type-chips.lookup-table.supplement.md)**.


