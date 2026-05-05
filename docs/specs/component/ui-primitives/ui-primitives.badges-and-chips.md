# UI Primitives — Badges and chips

## What It Is

Badges, pills, and chip-adjacent controls: shared primitives for read-only status emphasis and inline labels—plus the **inventory** of where each shape is used (pill vs toolbar control vs compact operator).

## What It Looks Like

- **Pills** (`--radius-full`): status badges, `app-chip`, quick-info chips, most tags.
- **Rounded controls** (`--container-radius-control`): toolbar triggers for grouping / filter / sort / projects.
- **Compact rounded** (`--radius-sm`): filter-row conjunction control (`Where` / `And` / `Or`).

## Where It Lives

- **Styles:** `apps/web/src/styles/primitives/badge.scss`, `chip.scss`, `dropdown-trigger.scss`, `button.scss`
- **Semantic chip:** `apps/web/src/app/shared/components/chip/`
- **Directives:** `apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts` (`uiStatusBadge*`, `uiChip*`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Focus badge/chip host | Focus ring per primitive (button vs span per feature) |
| 2 | Activate toolbar trigger | Opens dropdown / panel (`ui-dropdown-trigger`) |
| 3 | Activate quick-info chip | Parent handles navigation/context (`chipClicked`) |
| 4 | Remove project tag chip | Toggle membership (`detail-tags__chip`) |

## Component Hierarchy

```text
Primitives (no single Angular host)
├── .ui-status-badge (+ size / semantic modifiers)
├── .ui-chip (+ uiChip* directives)
├── app-chip (semantic chip component)
└── button.ui-button.ui-dropdown-trigger (toolbar menus)
```

---

## Canonical geometry — single chip height (product)

Feldpost does **not** use a small / medium / large chip scale in the product language. There is **one** comfortable inline height for content chips (`app-chip`) and pill-shaped metadata:

- **Target height:** **2rem (32px)** minimum height on the chip body (equivalent to the former “large” row in the chip spec — dense enough for grids, large enough for legibility).
- **Not** **16px** tall chips as the default: that is below practical touch and label readability for primary UI (dense exceptions must cite accessibility review).
- **Not** **4rem** tall “chips”: that reads as a **button** or **field**, not an inline chip.

Implementation may still expose a `size` input on `ChipComponent` during convergence; **new UI** should use the **default canonical height** only and must not introduce alternate chip scales without a new design-system decision.

Icon-only chips remain **square** at the same **outer** dimension as the single chip height (width = height).

---

## Shape language — pill vs rounded-rectangle

Not everything that behaves like a “chip” is **pill-shaped** (`border-radius: var(--radius-full)`). Feldpost uses two families:

| Shape | Typical token | Reads as | Examples |
| ----- | ------------- | -------- | -------- |
| **Pill** | `var(--radius-full)` | Soft tag, category, file kind, status lozenge | `app-chip` on media/upload, `ui-status-badge` / `uiStatusPill`, quick-info chips, project tag chips in media detail, many badges |
| **Rounded control** | `var(--container-radius-control)` (`--radius-md` bridge) | Toolbar / operator control aligned with **buttons** | **Grouping**, **Filter**, **Sort**, **Projects** dropdown triggers (`ui-button` + `ui-dropdown-trigger`) on map workspace and projects toolbars |
| **Compact rounded** | `var(--radius-sm)` | Dense operator inside a panel row | **Filter rule conjunction** control (`Where` / `And` / `Or`) — `filter-rule__conj` in filter dropdown |

**Segmented controls** (`app-segmented-switch`): the **track** is pill-outlined; **segments** are pill-shaped buttons inside the track. That is a **selection control**, not the same component family as `app-chip`, but shares the pill outline language.

---

## Where each pill / chip is used and why

| UI | Location (route / panel) | Primitive / classes | Shape | Purpose |
| -- | ------------------------ | -------------------- | ----- | -------- |
| **File-type chip** | Map grid items, upload dropzone + file rows | `app-chip`, filetype variants | **Pill** | Shows normalized file category (image/video/office…) at a glance; optional icon + label |
| **Project / meta chip (legacy grid)** | Archive media card large variant | `app-chip` text-only or file-type | **Pill** | Compact project name + type on card |
| **Quick-info chips** | Workspace media detail | `app-quick-info-chips` + `uiChip` / `uiChipAction` + local `.chip` | **Pill** | Actionable shortcuts (e.g. capture date, GPS); icon + label |
| **Media kind / type label** | Media detail header | `uiStatusPill` + `.detail-kind-chip` | **Pill** | Read-only file kind next to title |
| **Account labels** | Account page identity | `uiStatusPill` | **Pill** | Role and assurance level |
| **Project status** | Projects table | `uiStatusBadge` + semantic modifiers | **Pill** | Active vs archived (etc.) |
| **Invite status** | Settings → invite management | `uiStatusBadge` + `.invite-section__status-chip` | **Pill** | Invite lifecycle + icon |
| **Universal media badge** | Thumbnails / grid slots | `.universal-media__badge` | **Pill** (overlay) | Short overlay label from orchestrator (not interactive) |
| **Project tags (remove)** | Media detail → projects edit row | `button.detail-tags__chip` | **Pill** | Selected project with remove affordance |
| **Correction badge** | Media detail | `.detail-correction-badge` | **Pill** | Read-only “corrected” semantics |
| **Toolbar menu triggers** | Map workspace toolbar, Projects toolbar | `uiDropdownTrigger` → `ui-button ui-dropdown-trigger` | **Rounded control** (not full pill) | Open grouping / filter / sort / projects menus — same radius family as buttons |
| **Filter conjunction / operator** | Filter dropdown panel | `.filter-rule__conj` | **Compact rounded** | Toggle Where / And / Or per rule row |
| **Lane / status / thumbnail segments** | Upload panel, projects toolbar, toolbars | `app-segmented-switch` | **Pill group** | Mutually exclusive mode (lanes, status scope, thumb size) |

---

## Primitive reference — when to use which

| Need | Use |
| ---- | --- |
| Table or header **status** (read-only) | `uiStatusBadge` / `uiStatusPill` → `.ui-status-badge*` |
| **Toolbar** affordance that opens a menu (filter / grouping / …) | `uiDropdownTrigger` + button primitives — **rounded control**, do not force `radius-full` |
| Inline **dismissible**, **file-type**, or rich tint | `app-chip` — [ui-primitives.chip.md](./ui-primitives.chip.md) → [chip.md](../filters/chip.md) |
| **Quick actions** in detail header row | `app-quick-info-chips` + `uiChip` — [quick-info-chips.md](../workspace/quick-info-chips.md) |
| **Numeric count-only** lozenge (tabs, counters) | Reserved: `.ui-chip--count` in `chip.scss` (wire deliberately; prefer tokens) |

---

## Visual behavior contract (summary)

| Surface | Geometry owner | Notes |
| ------- | -------------- | ----- |
| Status badge | host (`span`) | Non-interactive unless a feature spec adds behavior |
| `ui-chip` host | host | Interactive chips: prefer **`button`** for focus semantics |
| Dropdown trigger | `button.ui-dropdown-trigger` | Focus ring on button; chevron is decorative |
| `app-chip` | `.chip` root | Dismiss control: inner **button** owns its own hit area and focus |

---

## File map

| File | Purpose |
| ---- | ------- |
| `badge.scss` | Status / pill chrome |
| `chip.scss` | `uiChip` toolbar chip chrome + modifiers (`--action`, `--count`, …) |
| `dropdown-trigger.scss` | Chevron + open state on **button** hosts |
| `button.scss` | Shared **rounded control** radius for toolbar triggers |

---

## Acceptance criteria

- [ ] New UI picks the correct row in **Where each pill / chip is used** and the correct shape row (**pill** vs **rounded control** vs **compact rounded**).
- [ ] Toolbar filter/grouping/sort/projects controls use **control radius**, not forced full pill, unless design system explicitly changes.
- [ ] Content chips target **one** canonical height (**2rem**); no new sm/md/lg product variants without DS sign-off.
- [ ] Glossary terms stay aligned with `docs/glossary.md`.

## Related specs

- [chip.md](../filters/chip.md) — `app-chip` component contract (semantic variants, dismiss)
- [ui-primitives.chip.md](./ui-primitives.chip.md) — stub entry for `app-chip`
- [quick-info-chips.md](../workspace/quick-info-chips.md)
- [filter-dropdown.md](../filters/filter-dropdown.md) — conjunction control behavior
