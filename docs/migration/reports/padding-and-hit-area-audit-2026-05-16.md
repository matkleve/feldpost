# Padding and hit-area audit — buttons & inputs (2026-05-16)

## 1. Executive summary

- **Verified:** Shared `hlmBtn` / `hlmInput` directives apply **default horizontal padding via Tailwind utilities** in CVA: labeled `hlmBtn` sizes use **logical** `ps-2` / `pe-2` (maps to **`spacing-2` / 8px** each side in `tailwind.config.js`); `input[hlmInput]` still uses **`px-3`**. No evidence that splitting component SCSS with Sass `@use` (e.g. map-shell pulling in `_map-shell-context-menu.scss`) **changes emitted padding** — `@use` only affects **authoring structure** and compile-time order of rules, not a separate “padding layer.”
- **Trigger vs panel:** Toolbar **dropdown triggers** (`*__menu-trigger` + `hlmBtn` + `justify-content: space-between`) use a **shared Sass partial** that sets **`padding-inline: var(--spacing-3)`** (and chevron / active / open states): `apps/web/src/app/shared/dropdown-trigger/_toolbar-menu-trigger.scss`, `@include`d from **`workspace-toolbar`**, **`media`**, and **`projects`** component SCSS (see §3.5). That **overrides** the **action-interaction kernel** horizontal lock on **`hlmBtn`** (`ps-2`/`pe-2` → `spacing-2`) **only** for this trigger pattern. **Panel / menu content** still uses separate tokens (e.g. `.map-context-menu__items` `padding-inline`, standard dropdown `--std-dropdown-padding-inline`) — fixing the **panel** does not fix a **trigger** that still lacks its companion rule.
- **Still at risk:** (a) **Component SCSS** that sets `padding: 0`, `padding-block: 0`, or `padding-inline: 0` on the **same element** that carries Tailwind padding from `hlmBtn` / `hlmInput`, depending on **source order and specificity**; (b) **`min-w-0 shrink` + `justify-content: space-between`** on triggers — correct for truncation but **reduces perceived** horizontal breathing room if companion `padding-inline` is missing; (c) **`size="icon"`** — CVA uses `h-10 w-10` with **no explicit `px-*`** (square hit box by design); (d) **custom primitives** (e.g. `.panel-trigger`) that use **`padding: 0` base** and only add horizontal padding per `data-layout` variant — easy to regress.
- **Grep snapshot** (2026-05-17 refresh, `apps/web/src/app`): **34** template files contain `hlmBtn` (33 `*.html` + `sorting-controls.component.ts` inline template); **17** `*.html` files reference `hlmInput`. No same-line `hlmBtn` + `px-0` / `p-0` / `px-1` matches; **`min-w-0` near `hlmBtn`** appears in **3** toolbar templates (paired with **`toolbar-menu-trigger-components`** via **`@include`** in sibling SCSS).
- **Heuristic `outline` + `size="sm"` + `hlmBtn`:** Automated scan found **exactly three** `<button>` instances (workspace, media, projects toolbars); each sibling `*.scss` **includes `toolbar-menu-trigger-components`** via Sass **`@include`** (shared partial supplies `padding-inline` for the menu trigger). No orphan outline/sm triggers lacking a companion rule were found by that heuristic.
- **Inputs:** `hlmInput` defaults include **`px-3`**; composite layouts (e.g. map search) add **layout SCSS** on a second class (`.search-bar__input`) that may alter **vertical** padding (`padding-block: 0`) while leaving horizontal padding to utilities — **worth visual QA** when utilities and SCSS both target the same node.
- **Recommendation shape:** Prefer **one owner** for horizontal inset on composed controls (either tokenized utility merge or **explicit `padding-inline` + documented exception**), plus **manual QA** on narrow viewports, keyboard focus rings, and **scrollbar-gutter** for overflowing panels.

## 2. How padding is supposed to work

### 2.1 `HLM_BUTTON_IMPORTS` / `hlmBtn` CVA

- **Barrel / imports:** `HLM_BUTTON_IMPORTS` is defined in `apps/web/src/app/shared/ui/button/index.ts` (exports `[HlmButtonDirective]`).
- **Directive:** `apps/web/src/app/shared/ui/button/hlm-button.directive.ts` — selector `button[hlmBtn],a[hlmBtn]`; `host: { '[class]': 'hostClass()' }` merges **`buttonVariants({ variant, size, iconPlacement })`** via `twMerge` (see `hostClass` computed, lines **36–52**).
- **CVA (padding-relevant excerpt):** `apps/web/src/app/shared/ui/button/button-variants.ts`

```8:42:apps/web/src/app/shared/ui/button/button-variants.ts
export const buttonVariants = cva(
  // Base row: flex row + gap between icon and label; inline padding uses spacing-2 only (design kernel).
  // @see docs/design/components/action-interaction-kernel.md#button-policy
  'relative inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        // Labeled rows: symmetric `ps-2 pe-2` only (no px); `size="icon"` is square geometry without inline padding utilities.
        default: 'h-10 py-2 ps-2 pe-2',
        sm: 'h-9 rounded-md ps-2 pe-2',
        lg: 'h-11 rounded-md ps-2 pe-2',
        icon: 'h-10 w-10',
      },
      // Semantic hook for icon+label rows; horizontal padding stays spacing-2 for every placement (kernel lock).
      iconPlacement: {
        balanced: '',
        iconStart: '',
        iconEnd: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
      iconPlacement: 'balanced',
    },
  },
);
```

- **Interpretation:** **`default`** → `h-10 py-2 ps-2 pe-2`; **`sm`** / **`lg`** → `ps-2 pe-2` only (no `px-*`); **`icon`** → **no inline padding utilities** (fixed square `h-10 w-10`). **Outline** variant does not add padding — it only adds **border** and surface colors. **`iconPlacement`** (`balanced` | `iconStart` | `iconEnd`) is merged from `hlmBtn`’s `iconPlacement` input (`start`/`end` → CVA keys) for **composition semantics**; all three branches are **empty strings today** — horizontal inset remains the **`ps-2`/`pe-2` lock** until a branch adds classes.
- **Touch utilities (`tailwind.config.js`):** `theme.extend.minHeight` / `minWidth` define **`tap`** = `2.75rem` (**44px**) and **`tap-lg`** = `3rem` (**48px**) — use these names for constitution-aligned floors; **do not** assume a ~38px `min-h-tap` (not defined in this config).

### 2.2 `hlmInput` / field padding defaults

- **Directive:** `apps/web/src/app/shared/ui/input/hlm-input.directive.ts` — lines **14–24** apply `twMerge(inputVariants({ error }))` on `input[hlmInput], textarea[hlmInput]`.
- **CVA:** `apps/web/src/app/shared/ui/input/input-variants.ts` — base string includes **`px-3 py-2`** (horizontal padding **12px** in default Tailwind scale) plus full-width and border treatments:

```12:18:apps/web/src/app/shared/ui/input/input-variants.ts
export const inputVariants = cva(
  'flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50',
  {
    variants: {
      error: {
        true: 'border-destructive focus-visible:ring-destructive',
```

### 2.3 Global `styles.scss` / Preflight

- **Entry:** `apps/web/src/styles.scss` — **lines 19–26** import Tailwind (`@import "tailwindcss";`) and `@source "./**/*.{html,ts,scss}"` so utilities used in templates and CVA strings are generated.
- **Order note (commented in file):** Top `@use` blocks emit **before** Tailwind; typography baseline is loaded **after** Preflight via `meta.load-css('styles/typography-baseline')` (see **lines 8–8** and **line 21** region) — relevant for **headings**, not for resetting button/input padding beyond Preflight.
- **Secondary doc link:** `apps/web/src/styles/_typography-baseline.scss` — global heading/anchor rhythm; **not** the primary owner for control padding.

**Net:** Default padding for Spartan-style controls lives in **CVA strings** processed as Tailwind utilities. Overrides come from **later rules** (component SCSS, other utilities on the same host), not from `@use` file boundaries by themselves.

## 3. Grep inventory (counts & top paths)

**Method:** `rg` from repo root on `apps/web/src/app`; counts are **occurrence totals** (`rg -o … | wc -l` or summed `-c` where noted) or **file counts** (`rg -l`) as stated per table. **Metric freshness:** Counts in §3.1–3.4 were regenerated **2026-05-17**; re-run the listed commands after large template refactors if you use them as release gates.

**Sample refresh commands (repo root):**

```bash
rg -l 'hlmBtn' apps/web/src/app --glob '*.html' | wc -l
{ rg -l 'hlmBtn' apps/web/src/app --glob '*.html'; rg -l 'hlmBtn' apps/web/src/app --glob '*.component.ts'; } | sort -u | wc -l
rg -o 'hlmBtn' apps/web/src/app --glob '*.html' | wc -l
rg --only-matching 'hlmBtn' apps/web/src/app --glob '*.html' | sed 's/:.*//' | sort | uniq -c | sort -rn | head
rg 'hlmBtn.*(px-0|p-0|px-1)|(px-0|p-0|px-1).*hlmBtn' apps/web/src/app --glob '*.{html,ts}' | wc -l
rg --multiline --glob '*.{html,ts}' '(?s)hlmBtn.{0,200}(px-0|p-0|px-1)|(?s)(px-0|p-0|px-1).{0,200}hlmBtn' apps/web/src/app | wc -l
rg --multiline --glob '*.{html,ts}' '(?s)hlmBtn.{0,200}min-w-0|(?s)min-w-0.{0,200}hlmBtn' apps/web/src/app -l
rg --pcre2 --multiline --glob '*.{html,ts}' '(?s)<button(?:(?!</button>).)*?hlmBtn(?:(?!</button>).)*?variant="outline"(?:(?!</button>).)*?size="sm"(?:(?!</button>).)*?>' apps/web/src/app
rg -l 'hlmInput' apps/web/src/app --glob '*.html' | wc -l
rg 'hlmInput.*(px-0|pl-0|pr-0)|(px-0|pl-0|pr-0).*hlmInput' apps/web/src/app --glob '*.html' | wc -l
rg --only-matching 'hlmInput' apps/web/src/app --glob '*.html' | sed 's/:.*//' | sort | uniq -c | sort -rn | head
```

### 3.1 `hlmBtn` in `*.html` and inline templates in `*.component.ts`

| Metric | Value |
| --- | ---: |
| Files with `hlmBtn` (`*.html`) | **33** |
| Files with `hlmBtn` (`*.component.ts` only; includes inline `template:`) | **1** (`sorting-controls.component.ts`; directive file excluded from “template” count) |
| Combined unique template paths (html + ts inline) | **34** |
| Total `hlmBtn` occurrences in `*.html` (`rg -o 'hlmBtn' … \| wc -l`) | **90** |
| Matches in `*.component.ts` templates | **1** |

**Top `*.html` files by `hlmBtn` count (descending):**

| Count | Path |
| ---: | --- |
| 14 | `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.html` |
| 11 | `apps/web/src/app/shared/account/account.component.html` |
| 10 | `apps/web/src/app/features/upload/upload-panel.component.html` |
| 6 | `apps/web/src/app/shared/workspace-pane/footer/workspace-pane-footer/workspace-pane-footer.component.html` |
| 6 | `apps/web/src/app/features/settings-overlay/sections/invite-management-section.component.html` |
| 4 | `apps/web/src/app/features/projects/project-card.component.html` |
| 3 | `apps/web/src/app/features/map/map-shell/map-shell.component.html` |
| 2 | *(several files at 2)* — metadata rows, dialogs, quiet actions, etc. |

### 3.2 `hlmBtn` + stripping / tight utilities (same-line & short-range multiline)

| Pattern | Count / result |
| --- | --- |
| Same-line `hlmBtn` + `px-0` / `p-0` / `px-1` | **0** |
| Multiline (≤200 chars between) `hlmBtn` + `px-0` / `p-0` / `px-1` | **0** |
| Multiline `hlmBtn` + `min-w-0` (≤200 chars, either order) | **3** files (`workspace-toolbar`, `media`, `projects-toolbar` templates); **`rg --multiline` prints ~15 lines total** (~5 lines per file — one match region per toolbar, spanning the full `<button …>` opening block) |

### 3.3 Heuristic: `variant="outline"` + `size="sm"` on same `<button hlmBtn…>` vs companion `.scss` containing `padding-inline`

**Automated rule:** Parse `*.html` / `*.component.ts` for `<button…hlmBtn…>` tags containing both `variant="outline"` and `size="sm"`; check sibling `*.scss` for substring `padding-inline` **or** `@include` of `toolbar-menu-trigger-components` (shared partial owns `padding-inline` for this pattern).

| Rows (cap 25) | Component | Companion `*.scss` wires menu-trigger padding? |
| --- | --- | --- |
| 1 | `workspace-toolbar.component.html` | **Yes** — `_toolbar-menu-trigger.scss` (`@include` in `workspace-toolbar.component.scss`) |
| 2 | `media.component.html` | **Yes** — same partial (`@include` in `media.component.scss`) |
| 3 | `projects-toolbar.component.html` | **Yes** — same partial (`@include` in `projects-toolbar.component.scss`) |

**Result:** **3 / 3** pass. No additional rows to list under this exact heuristic.

### 3.4 `hlmInput` / horizontal padding risk

| Metric | Value |
| --- | ---: |
| `*.html` files with at least one `hlmInput` | **17** |
| Same-line `hlmInput` + (`px-0` / `pl-0` / `pr-0`) | **0** |

**Top `*.html` files by `hlmInput` count:**

| Count | Path |
| ---: | --- |
| 7 | `apps/web/src/app/shared/account/account.component.html` |
| 5 | `apps/web/src/app/features/auth/register/register.component.html` |
| 2 | `apps/web/src/app/shared/workspace-pane/media-detail/media-detail-inline-section/media-detail-inline-section.component.html`, `apps/web/src/app/shared/workspace-pane/media-detail/editable-property-row.component.html`, `apps/web/src/app/shared/workspace-pane/media-detail/captured-date-editor.component.html`, `apps/web/src/app/features/settings-overlay/settings-overlay.component.html`, `apps/web/src/app/features/auth/update-password/update-password.component.html`, `apps/web/src/app/features/auth/login/login.component.html` |

**`w-full` without explicit `px-*` on the same tag (manual spot-check, not exhaustive):** `search-bar.component.html` uses `hlmInput` + `class="search-bar__input"` (no `px-*` in template). Horizontal padding then depends on **`inputVariants` utilities** vs `.search-bar__input` SCSS (see §4 — `padding-block: 0` only; no `padding-inline: 0`).

### 3.5 `__menu-trigger` / `menu-trigger` / `panel-trigger` in SCSS — `padding-inline` vs omit

| Selector / file | Sets `padding-inline`? | Notes |
| --- | --- | --- |
| `.workspace-toolbar__menu-trigger` / `.media-toolbar__menu-trigger` / `.projects-toolbar__menu-trigger` | **Yes** (`var(--spacing-3)`) | **Single authoring source:** `_toolbar-menu-trigger.scss` (`toolbar-menu-trigger-components` / `toolbar-menu-trigger-states`); each toolbar `*.component.scss` calls those mixins with its BEM block name; also `justify-content: space-between`; chevron `transition` uses **`--motion-duration-fast`** / **`--motion-ease-out`** |
| `.panel-trigger` — `panel-trigger.component.scss` | **Yes (base)** | `.panel-trigger`: **`padding-block: 0`**, **`padding-inline: var(--spacing-2)`**, responsive **`min-height`** (`3rem` default, `2.75rem` from `md`); **`data-layout='text-action'`** overrides to asymmetric `pl`/`pr` (`spacing-2` / `spacing-1`) |

**`menu-trigger` substring:** toolbar selectors are emitted via the **shared partial** above (not duplicated per-file rules). No additional generic `menu-trigger` SCSS hits beyond that partial and panel-trigger naming.

### 3.6 Related: `padding-inline: 0` / `padding: 0` hot spots (secondary signal)

Examples useful for §4 hypotheses (not exhaustive): `grouping-dropdown.component.scss` (`.grouping-section { padding-inline: 0; }`), `chip.component.scss` (`padding-inline: 0` in a state), `panel-trigger.component.scss` (base `padding: 0`), multiple `padding: 0` resets in `search-bar`, `map-shell`, `nav`, upload, and media-detail SCSS — each needs **context** (wrapper vs interactive surface).

## 4. Root-cause hypotheses (numbered)

1. **Template / SCSS overrides CVA utilities** — Extra `class="..."` on `button[hlmBtn]` or `input[hlmInput]` plus component SCSS can set `padding`, `padding-inline`, or `padding-block` with equal or higher specificity than utilities, **removing** effective horizontal inset.
2. **Composite flex layouts (`justify-content: space-between`)** — Chevron + label rows **feel** “flush” unless **`padding-inline`** (or inner label padding) is applied on the **trigger**; even with CVA **`ps-2`/`pe-2`**, long labels + **`min-w-0 shrink`** can still **read** as tight without a documented companion inset.
3. **`min-w-0 shrink` on the button** — Legitimate for **truncate** flows; combined with (2), users perceive “no horizontal padding” even when **some** padding exists.
4. **`size="icon"`** — No `px-*` in CVA; designers may expect **inner icon padding** that is actually implemented via **child** layout (e.g. nested spans) — if missing, icon touches edges inside the square.
5. **`w-full` + `overflow: hidden` on an ancestor** — Focus rings or text can clip; separate from padding math but **feels** like “no room.”
6. **Custom BEM surfaces parallel to `hlmBtn`** — Primitives like `.panel-trigger` historically used **`padding: 0`**; current base uses **tokenized** `padding-inline` + responsive **`min-height`**, but **`data-layout`** branches still override — audit those paths when adding layouts.
7. **Icon-only / clear controls** — e.g. search bar clear slot uses **`padding: 0`** on a **non-`hlmBtn`** button (`.search-bar__clear`) — acceptable for square targets but easy to confuse with “broken padding” when auditing quickly.

## 5. Prioritized fix playbook

| Priority | Action | Rationale |
| --- | --- | --- |
| **P0** | **Visual QA matrix** for: toolbar dropdown triggers, map search input, panel-trigger each `data-layout`, upload intake `hlmBtn` rows | Confirms real vs perceived padding issues before token churn |
| **P0** | Where SCSS targets **`button[hlmBtn]`** or **`input[hlmInput]`**, assert **either** (a) no `padding` reset on that node, **or** (b) explicit `padding-inline` / `padding-block` contract in the same spec slice | Stops specificity roulette |
| **P1** | **Done (2026-05-17):** Shared Sass partial **`_toolbar-menu-trigger.scss`** + `@include` from workspace / media / projects toolbars — documents `padding-inline`, chevron, active, open states once (`ui-primitives.dropdown-trigger.md`) | Former “Consider … mixin” row |
| **P1** | Optional design token **`--hlm-btn-padding-inline`** (or per-size tokens) consumed from CVA **if** product wants **wider** labeled buttons than the current **`ps-2`/`pe-2` (`spacing-2`)** kernel | Avoids one-off SCSS on every page |
| **P2** | **Lint / guard idea:** warn when `hlmBtn` shares a host with `padding: 0` / `padding-inline: 0` in the same component SCSS without a compensating `padding-inline` on a documented child | No implementation in this audit |
| **P2** | Storybook or **Playwright** screenshot diffs for toolbar + search bar at **320–390px** width | Catches scrollbar + truncation interactions |

**Explicit non-goals (this audit):** No refactors, no token implementation, no mass template edits.

## 6. Verification protocol

### 6.1 Manual (required)

- **Toolbar triggers (3 surfaces):** Open each dropdown; confirm **closed** trigger shows symmetric inset (label not flush to left border); **focus-visible** ring fully visible L/R.
- **Map search:** Type until dropdown opens; verify **input text** not underlap with search icon column; **clear** control remains square and centered; **scrollbar** inside results does not eat label padding awkwardly.
- **Panel trigger:** Cycle layouts / routes using `app-panel-trigger`; verify **each** `data-layout` has expected horizontal inset.
- **Icon buttons:** Map upload / GPS (`size="icon"`) — confirm **44px-class** target still meets product hit-area policy (icon optically centered).
- **Keyboard:** Tab through dense toolbars; ensure **no clipped** focus ring from `overflow: hidden` parents.

### 6.2 Optional (`ng serve`)

- Run **`cd apps/web && ng serve`**; repeat §6.1 on **Chrome + Firefox**, **light + dark**, **mobile width** (dev tools 360px).
- Toggle **`scrollbar-gutter: stable`** surfaces (search results, long menus) and confirm **no horizontal jump** that hides padding.

---

## Appendix: Implemented follow-ups (2026-05-16)

- **`styles/reset.scss`:** Wrapped the universal reset in **`@layer base`**. Previously **`*, *::before, *::after { padding: 0 }`** was **unlayered** (emitted before `@import "tailwindcss"`), so it **beat `@layer utilities`** (e.g. `.ps-2`, `.px-3`) in the cascade — utilities looked “dead” in DevTools. Layered reset restores **utilities > base**.
- **`button-variants.ts`:** Labeled sizes use **only** **`ps-2`/`pe-2`** (Tailwind **`spacing-2`**) for horizontal inset; **`iconPlacement`** CVA axis is wired from **`hlmBtn`** for **`balanced` / `iconStart` / `iconEnd`** with **no extra classes yet** (padding lock documented in CVA comments + `action-interaction-kernel.md`). **No** `compoundVariants` for `outline`+`sm` and **no** special `px-4` merge.
- **`panel-trigger.component.scss`:** Base `.panel-trigger` uses **`padding-block: 0`**, **`padding-inline: var(--spacing-2)`**, and responsive **`min-height`** (mobile **48px** / desktop **44px**), replacing a flush **`padding: 0`** baseline; **`text-action`** overrides with asymmetric `padding-left` / `padding-right`.

## Appendix: Implemented follow-ups (2026-05-17)

- **`_toolbar-menu-trigger.scss`:** Toolbar **`*__menu-trigger`** closed-trigger + state chrome consolidated here; **`padding-inline: var(--spacing-3)`** overrides **`hlmBtn`** kernel for this pattern only; chevron **`transition`** uses **`--motion-duration-fast`** / **`--motion-ease-out`**. Consumed via **`@use` / `@include`** from **`workspace-toolbar`**, **`media`**, and **`projects`** `*.component.scss` (see §3.5).

## Appendix: `lint-specs.mjs` scope

`node scripts/lint-specs.mjs` (default) walks **`docs/specs`** per `resolveDefaultSpecDir` in `scripts/lint-specs.mjs` — **this report path is not element-spec linted**. Adding files under `docs/migration/reports/` does not engage spec section rules unless a custom glob is passed.
