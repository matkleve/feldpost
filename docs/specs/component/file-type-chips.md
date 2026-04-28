# File-Type Chips (Upload Area Feature)

> **Architecture parent:** [media-download-service](media-download/media-download-service.md)

## What It Is

Visual chip-based display of the file types present in the current upload batch. Replaces the text-based "JPEG · PNG · HEIC · WebP · MP4 · MOV · WebM · PDF · DOCX · XLSX · PPTX" string with a grid or inline display of compact, color-coded chip elements. Each unique file type in the upload queue is represented by a single chip showing the file-type abbreviation + icon.

## What It Looks Like

Horizontally scrolling (or wrapping) row of small chips below the upload dropzone. Each chip displays a **unique file type only once** (deduplicated). Chips are color-coded by neutral file-type categories: image (blue), video (purple), document (indigo/blue-grey), spreadsheet (green), presentation (amber). Icons are Material Icons matching file type (e.g., `image`, `videocam`, `description`, `table_chart`, `bar_chart`).
Chips follow a subtle visual style: very light tinted background (10-15%), full-color icon/text for legibility, and an optional thin border derived from the same token.

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
| **Image**          | JPEG, JPG, PNG, HEIC, HEIF, WebP, TIFF              | `image`       | `--filetype-image`        | filetype-image        | Neutral technical blue for photos/images            |
| **Video**          | MP4, MOV, WebM, AVI, MKV                            | `videocam`    | `--filetype-video`        | filetype-video        | Distinct from image while staying non-alarmist      |
| **Document**       | PDF, DOCX, DOC, ODT, ODG, TXT                       | `description` | `--filetype-document`     | filetype-document     | Office-style indigo/blue-grey; no warning semantics |
| **Spreadsheet**    | XLSX, XLS, ODS, CSV                                 | `table_chart` | `--filetype-spreadsheet`  | filetype-spreadsheet  | Green, aligned with spreadsheet mental model        |
| **Presentation**   | PPTX, PPT, ODP                                      | `bar_chart`   | `--filetype-presentation` | filetype-presentation | Warm amber/orange; avoids red error signal          |
| **Office Generic** | DOCX, DOC, ODT, ODG, XLSX, XLS, ODS, PPTX, PPT, ODP | `article`     | `--filetype-office`       | custom                | Fallback if type-specific mapping unavailable       |

**Rationale:**

- **Image (blue)**: neutral and technical, not tied to success/warning/error states
- **Video (purple)**: distinct from static image category
- **Document (indigo/blue-grey)**: office/work semantics without warning signal
- **Spreadsheet (green)**: strong global association with Excel/Sheets
- **Presentation (amber)**: aligns with common PPT visual language, avoids panic/red semantics

## Color Token Contract

Define dedicated file-type tokens in the global token system and keep status colors (`--color-success`, `--color-warning`, `--color-danger`) exclusively for real status feedback.

```scss
:root {
  --filetype-image: var(--color-uploading);
  --filetype-video: var(--color-accent);
  --filetype-document: #4f5d95;
  --filetype-spreadsheet: var(--color-success);
  --filetype-presentation: #d97706;
  --filetype-office: color-mix(
    in srgb,
    var(--color-text-secondary) 92%,
    black 8%
  );
}
```

Visual recipe for all file-type chips:

- Background: `color-mix(in srgb, <filetype-token> 12%, var(--color-bg-surface))`
- Text/Icon: `<filetype-token>`
- Border: `1px solid color-mix(in srgb, <filetype-token> 28%, var(--color-border))`

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

**Parent**: `upload-area.component.ts`  
**Child**: `app-chip` (from chip primitive spec)

```typescript
// Data structure passed to template
interface FileTypeChip {
  type: string; // "JPEG", "PDF", "MP4"
  icon: string; // Material Icon name
  category: string; // 'image' | 'video' | 'document' | 'spreadsheet' | 'presentation'
  color: string; // CSS token name, e.g. '--filetype-image'
  count?: number; // Optional: # of files with this type in batch
}

// Signal in component
fileTypeChips = computed(() => {
  return getUniqueFileTypes(); // as above
});
```

```html
<!-- In upload-area.component.html (new section, placed after dropzone) -->
<section
  class="upload-area__file-types"
  aria-label="Supported file types in this batch"
>
  <div class="upload-area__file-type-chips">
    @for (chip of fileTypeChips(); track chip.type) {
    <app-chip
      [icon]="chip.icon"
      [text]="chip.type"
      [variant]="'custom'"
      [color]="chip.color"
      [size]="'sm'"
    ></app-chip>
    }
  </div>
</section>
```

## Display Placement & Styling

**Location in Upload Panel:**

- After dropzone, before "Upload folder" button
- Or: below "Last upload" section if visible

**Container Styling**:

```scss
.upload-area__file-type-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--spacing-2);
  // Optional: max-width constraint + horizontal scroll on mobile
  @media (max-width: 640px) {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    scroll-behavior: smooth;
  }
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
| `docs/specs/component/file-type-chips.md`                           | Contract for upload file-type chip behavior       |
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

- [x] Spec document created: `docs/specs/component/file-type-chips.md`
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


