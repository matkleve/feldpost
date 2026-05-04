# Toolbar pane (Pane Toolbar layout primitive)

## What It Is

**Toolbar pane** is the shared **layout-only** row: three projection regions (**left**, **center**, **right**). Selector in code: **`app-pane-toolbar`**. It owns flex distribution and token gaps only—no domain actions, no filter/sort semantics.

## What It Looks Like

Single horizontal bar; optional clusters in left and right (`flex: 1` each), optional centered block (`flex: 0 auto`). Middle-aligned on the cross-axis; gaps use `--spacing-2`. Empty regions collapse (`display: none`). No borders or elevation unless the **parent** or **slotted** components add them.

## Where It Lives

- **Code:** `apps/web/src/app/shared/pane-toolbar/`
- **Canonical spec:** this document (`docs/specs/component/workspace/pane-toolbar.md`)
- **Consumers today:** `/projects` toolbar shell ([projects-toolbar](apps/web/src/app/features/projects/projects-toolbar.component.html)), `/media` toolbar shell ([media.component.html](apps/web/src/app/features/media/media.component.html)), workspace chrome wrapper ([workspace-pane-toolbar](apps/web/src/app/shared/workspace-pane/chrome/workspace-pane-toolbar/workspace-pane-toolbar.component.ts))
- **Related:** Domain bundles (dropdown triggers, segmented switches, etc.) **compose inside slots**—same pattern can repeat across routes without a separate “filter toolbar” primitive.

## Actions

| # | User action | System response | Notes |
| - | ----------- | --------------- | ----- |
| 1 | Parent projects nodes into `slot=left\|center\|right` | Content appears in matching zone | Pure `ng-content` |
| 2 | Resize viewport | Flex reflow within available width | **Today:** no overflow menu |
| 3 | (Future) Narrow viewport | Overflow moves behind menu affordance | See **Responsive roadmap** |

## Component Hierarchy

```text
app-pane-toolbar
├── .pane-toolbar__left   [slot=left]
├── .pane-toolbar__center [slot=center]
└── .pane-toolbar__right  [slot=right]
```

## Data

| Source | Contract |
| ------ | -------- |
| Parent | Arbitrary projected nodes per slot; multiple nodes per slot allowed (e.g. segmented switch + control cluster both `slot="left"`) |

## File Map

| File | Purpose |
| ---- | ------- |
| `apps/web/src/app/shared/pane-toolbar/pane-toolbar.component.ts` | Host + inline template |
| `apps/web/src/app/shared/pane-toolbar/pane-toolbar.component.scss` | Flex geometry |

## Wiring

- Import `PaneToolbarComponent`; assign `slot="left"`, `slot="center"`, or `slot="right"` on projected roots.
- Dropdown **panels** (`app-dropdown-shell`, filter/sort UI) stay **siblings** of the pane row or below it per page pattern—they are not inside the pane toolbar slots unless explicitly specified.

## Relationship to route toolbars

- **`MediaToolbar`** ([media-toolbar.md](../media/media-toolbar.md)) is the **intent boundary** for `/media` operators when implemented; its **visual shell** MUST compose **`app-pane-toolbar`** slots so geometry matches projects/workspace—do not duplicate a second three-column layout primitive.
- **`projects-toolbar`** is the reference **filled** example: left = status + dropdown cluster, right = card variant switch—behavior stays in the feature component; **pane toolbar** stays dumb layout.

## Responsive roadmap (normative target, not shipped)

When viewport width is insufficient to show primary controls without clipping:

1. **Overflow policy:** Secondary operators collapse behind a single **menu affordance** (e.g. icon button with “more” / hamburger) placed by **parent composition** (typically **right** slot or dedicated left slot—product decision in Figma).
2. **Menu surface:** Reuse shared overlay/menu primitives ([dropdown-system.md](../../filters/dropdown-system.md) patterns) with focus management and `aria-expanded` on the opener.
3. **Pane toolbar component** MAY gain optional inputs later (e.g. breakpoint token, `overflowMode`) **or** overflow MAY remain entirely in the parent—either way, **geometry contract** of three slots remains for wide layouts.

Until implemented, narrow layouts rely on parent/CSS only; this does not block shipping primitives elsewhere.

## Visual Behavior Contract

### Ownership Matrix

| Behavior | Visual Geometry Owner | Stacking Context Owner | Interaction Hit-Area Owner | Selector(s) | Layer | Test Oracle |
| -------- | --------------------- | ---------------------- | --------------------------- | ------------- | ----- | ----------- |
| Three-zone row | `:host` / `.pane-toolbar` | `:host` | slotted descendants | `.pane-toolbar`, `.pane-toolbar__*` | content | left/center/right alignment preserved |

### Ownership Triad

| Behavior | Geometry Owner | State Owner | Visual Owner | Same? |
| -------- | -------------- | ----------- | ------------ | ----- |
| Toolbar row | `.pane-toolbar` | N/A | `.pane-toolbar` | ✅ |

### Pseudo-CSS Contract

```css
:host {
  display: block;
}
```

## Acceptance Criteria

### Shipped (today)

- [ ] Three projection slots (`left`, `center`, `right`) render; slot selectors match `[slot=left|center|right]`.
- [ ] Empty slot wrappers do not consume layout space (`:empty` hidden).
- [ ] Component introduces **no** `features/*` imports; layout-only.
- [ ] `ng build` succeeds for all consumers.

### Deferred (responsive overflow — track with Figma + primitives pass)

- [ ] Below agreed breakpoint, overflowing operators do not clip unreadably; excess moves into a **single menu** surface with keyboard access.
- [ ] Menu opener has accessible name and `aria-expanded` tied to panel visibility.
- [ ] Wide layout still matches three-slot mental model after overflow behavior ships.
