# UI Primitives — Badges and chips

## What It Is

Badges, pills, and chip-adjacent controls: shared primitives for read-only status emphasis and inline labels—plus the **inventory** of where each shape is used (pill vs toolbar control vs compact operator).

## What It Looks Like

- **Pills** (`--radius-full`): status badges, `app-chip`, quick-info chips, most tags.
- **Rounded controls** (`--container-radius-control`): toolbar triggers for grouping / filter / sort / projects.
- **Compact rounded** (`--radius-sm`): filter-row conjunction control (`Where` / `And` / `Or`).

## Where It Lives

- **Styles:** global **`styles/primitives/*.scss`** for badges/chips **removed** (Phase 5) — use **`hlmBadge`** CVA / Tailwind; toolbar trigger chrome lives on **`hlmBtn`** + per-toolbar SCSS.
- **Semantic chip:** `apps/web/src/app/shared/components/chip/`
- **Directives:** ~~`apps/web/src/app/shared/ui-primitives/ui-primitives.directive.ts`~~ **removed (2026-05-16)** — use **`hlmBadge`** / **`HLM_BADGE_IMPORTS`** (`Phase 5`)

## Actions

| # | User action | System response |
| - | ----------- | ---------------- |
| 1 | Focus badge/chip host | Focus ring per primitive (button vs span per feature) |
| 2 | Activate toolbar trigger | Opens dropdown / panel (`hlmBtn` + `DropdownShellComponent`; Phase 5 Group D) |
| 3 | Activate quick-info chip | Parent handles navigation/context (`chipClicked`) |
| 4 | Remove project tag chip | Toggle membership (`detail-tags__chip`) |

## Component Hierarchy

```text
Primitives (no single Angular host)
├── .ui-status-badge (+ size / semantic modifiers)
├── .ui-chip (+ uiChip* directives)
├── app-chip (semantic chip component)
└── button [hlmBtn] + toolbar menu-trigger class (toolbar menus)
```

---

## Canonical geometry — `app-chip` vs other primitives

**`app-chip` (semantic chip component):** Figma component set **`96:74`** is the source of truth for default chrome. Chip body height **`var(--spacing-4)` (16px)**, pill radius, **primary ladder stops 95 / 90** (default / hover fills — `docs/design/tokens.md` §3.1a), and label typography **`--fp-sys-typescale-label-small-*`** (`docs/design/tokens.md` §3.1e) with text color **`--fp-sys-color-on-surface`**. `ChipComponent` has **no** `size` input — one geometry scale.

**`ui-chip` (directive primitive + quick-info chips):** Uses [chip.scss](apps/web/src/styles/primitives/chip.scss) sizing (`ui-chip--sm` / `md` / `lg`) and interaction emphasis — **different** host and contracts from `app-chip`. Do not assume the same pixel height as Figma `app-chip` without checking that primitive’s spec.

Icon-only **`app-chip`** remains **square** at the same outer dimension as the chip height (16px).

---

## Shape language — pill vs rounded-rectangle

Not everything that behaves like a “chip” is **pill-shaped** (`border-radius: var(--radius-full)`). Feldpost uses two families:

| Shape | Typical token | Reads as | Examples |
| ----- | ------------- | -------- | -------- |
| **Pill** | `var(--radius-full)` | Soft tag, category, file kind, status lozenge | `app-chip` on media/upload, `ui-status-badge` / `uiStatusPill`, quick-info chips, project tag chips in media detail, many badges |
| **Rounded control** | `var(--container-radius-control)` → **`var(--radius-md)`** — spacing/radius scale: [`docs/design/tokens.md`](../../../design/tokens.md); layer buckets: [`docs/design/token-layers.md`](../../../design/token-layers.md); toolbar menu shell: [`dropdown-system.md`](../filters/dropdown-system.md) | Toolbar / operator control aligned with **buttons** | **Grouping**, **Filter**, **Sort**, **Projects** dropdown triggers (`hlmBtn` + toolbar menu-trigger classes) on map workspace and projects toolbars |
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
| **Toolbar menu triggers** | Map workspace toolbar, Projects toolbar, Media toolbar | `hlmBtn` outline + `*__menu-trigger` classes | **Rounded control** (not full pill) | Open grouping / filter / sort / projects menus — same radius family as buttons |
| **Filter conjunction / operator** | Filter dropdown panel | `.filter-rule__conj` | **Compact rounded** | Toggle Where / And / Or per rule row |
| **Lane / status / thumbnail segments** | Upload panel, projects toolbar, toolbars | `app-segmented-switch` | **Pill group** | Mutually exclusive mode (lanes, status scope, thumb size) |

---

## Primitive reference — when to use which

| Need | Use |
| ---- | --- |
| Table or header **status** (read-only) | `uiStatusBadge` / `uiStatusPill` → `.ui-status-badge*` |
| **Toolbar** affordance that opens a menu (filter / grouping / …) | **`hlmBtn`** + toolbar menu-trigger SCSS — **rounded control**, do not force `radius-full` |
| Inline **dismissible**, **file-type**, or rich tint | `app-chip` — [ui-primitives.chip.md](./ui-primitives.chip.md) → [chip.md](../filters/chip.md) |
| **Quick actions** in detail header row | `app-quick-info-chips` + `uiChip` — [quick-info-chips.md](../workspace/quick-info-chips.md) |
| **Numeric count-only** lozenge (tabs, counters) | Reserved: `.ui-chip--count` in `chip.scss` (wire deliberately; prefer tokens) |

---

## Visual behavior contract (summary)

| Surface | Geometry owner | Notes |
| ------- | -------------- | ----- |
| Status badge | host (`span`) | Non-interactive unless a feature spec adds behavior |
| `ui-chip` host | host | Interactive chips: prefer **`button`** for focus semantics |
| Dropdown trigger | `button` + `[hlmBtn]` + toolbar `*__menu-trigger` | Focus ring on button; chevron is decorative |
| `app-chip` | `.chip` root | Dismiss control: inner **button** owns its own hit area and focus |

---

## File map

| File | Purpose |
| ---- | ------- |
| `badge.scss` | Status / pill chrome |
| `chip.scss` | `uiChip` toolbar chip chrome + modifiers (`--action`, `--count`, …) |
| ~~`dropdown-trigger.scss`~~ | **Deleted (2026-05-16)** — chevron / open rules moved to **`media.component.scss`**, **`projects-toolbar.component.scss`**, **`workspace-toolbar.component.scss`** |
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
