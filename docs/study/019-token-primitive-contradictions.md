---
id: STUDY-019
type: review
status: partially-remediated
supersedes: none
corrected-by: none
---

# Tokens, primitives, and where they contradict

Measured **2026-09-23** on branch `cursor/grid-shell-preview-c5a8` at `2216b03f`. Method: static read of `apps/web/src/styles.scss`, `apps/web/src/styles/_typography-baseline.scss`, `apps/web/src/styles/_frosted-chrome.scss`, the `hlm*` variant files under `apps/web/src/app/shared/ui/`, and the design docs that claim to own those values (`docs/design/tokens.md`, `token-layers.md`, `agent-css-variable-contract.md`, `state-visuals.md`, `constitution.md`, `motion.md`, `design-system/primitive-variants-registry.md`). No browser pass. Nothing here was executed.

This is a review of contradictions and simplifications. It is **not** permission to restyle the product. Every `[D]` is a choice the owner can reject. Trust order stays owner → spec → live code → this file.

## What already agrees — leave it

- [A] Sandstone sets `--primary` to `var(--brand-gold)` and keeps `--interaction-selected-ink` on cool blue (`styles.scss` around the sandstone block, `--interaction-selected-ink: oklch(0.50 0.10 245)`). That split is the contract in `state-visuals.md` § Interaction emphasis.
- [A] The two touch-target floors in `docs/design/constitution.md` § Sizes & Touch (field 44/48px, dense chrome 24px) are an owner amendment dated 2026-09-08. `hlmBtn` `size="icon"` is 40px on purpose. Do not "fix" dense chrome up to 48px.
- [A] `--layout-box-shadow` and the `--shadow-*` ladder are different jobs. `shell-box` is allowed to be stronger and shorter than map chrome (`styles.scss` comment above `--layout-box-shadow`; `_frosted-chrome.scss` `shell-box`).

## Findings

| id | Where | What conflicts | Grade | Simplify |
| --- | --- | --- | --- | --- |
| C-01 | Menu and action tokens | Three authorities. Runtime defines `--menu-border-subtle`, `--menu-item-hover`, `--menu-item-text`, `--action-text`, `--action-hover` on dark, light, and sandstone (`styles.scss` 141–145, 263–267, 321–325). `.cursor/rules/token-usage-gate.mdc` §2 requires those names and bans `:host-context([data-theme='sandstone'])`. `token-layers.md` Layer C and `agent-css-variable-contract.md` § Deleted forever say the `--menu-*` / `--action-*` names were removed in Batch 48–49 and tell agents to inline `color-mix` plus `:host-context` sandstone. | [A] | [D] Make the design docs match the runtime and the cursor rule. Delete the "removed, inline the mix" instructions. |
| C-02 | What `--primary` is | `tokens.md` §3.1a table says light `--primary` is gold `#c9a84c`. The same file's § Interaction emphasis, and `styles.scss` `:root` line 164, set light `--primary` to cool blue `oklch(0.50 0.10 245)`. Gold is `--brand-gold` (`styles.scss` 166). Sandstone is the only theme that points `--primary` at gold. | [A] | [D] One sentence in §3.1a: filled CTA ink is `--primary` (blue; gold only on sandstone); high-attention ink is `--brand-gold`. Remove the gold row from the `--primary` table. |
| C-03 | Frosted chrome opacity | `--chrome-surface` is `color-mix(… var(--card) 85% …)` in all three theme blocks (`styles.scss` 49, 163, 296). `tokens.md` § Frosted chrome says 85% and, twenty lines later, "No exceptions: every element floating over the map uses 55%." `_frosted-chrome.scss` lines 1 and 42 still say 55% while the mixins paint `var(--chrome-surface)`. One callsite still hardcodes 55% card: `apps/web/src/app/features/map/map-shell/scss/_map-shell-upload.scss` line 107. | [A] | [D] The token is 85%. Delete the 55% rule and the mixin comments. Point the upload callsite at `--chrome-surface`. |
| C-04 | Hover wash | Three gold washes for "hover". `--menu-item-hover` is gold **8%** (`styles.scss` 142). `hlmBtn` ghost/outline uses gold **10%** hover and **15%** active (`button-variants.ts` `quietInteractionEmphasis`). `--action-hover` and `outline-control-hover` use gold **12%** (`styles.scss` 145; `_frosted-chrome.scss` 66). `state-visuals.md` lists all three as canonical (8% menu, 12% action, ~10% mixin). Destructive `hlmBtn` adds an **18%** active wash (`button-variants.ts` 12) that the same spec's destructive row does not name (it stops at 15%). | [A] | [D] One ladder, owned by `state-visuals.md`. Primitives consume the tokens. Suggested ladder if the owner wants the button recipe: hover 10%, pressed 15%, menu row may stay 8% only if it is a different job (list row vs control). Drop the undocumented 18%. |
| C-05 | Motion | `_typography-baseline.scss` 68–75 ships `--motion-duration-fast` 100ms, `standard` 150ms, `slow` 250ms, `entrance` 300ms, `hover-label` 1000ms, and `--motion-ease-out`. `token-layers.md` and `tokens.md` list only `--motion-duration-fast` and still tell callsites to write `120ms ease-out`. `motion.md` lines 65–80 cite removed `features/media/media-item` paths and prescribe `200ms cubic-bezier(0.4, 0, 0.2, 1)`. Two callsites read a name that is not defined: `var(--motion-standard)` in `upload-shell.component.scss` 153 and `_map-shell-upload.scss` 67. Sampled literals that bypass the scale: 80ms, 120ms, 180ms, 200ms, 220ms, 300ms (upload panel item, map leaflet global, authenticated layout, search bar). | [A] for the token list and the undefined name; [B] for the literal sample (not a full census) | [D] Document the five durations that exist. Stop prescribing 120ms. Replace `--motion-standard` with `--motion-ease-out`. Sweep literals only where a token already matches; do not invent an 80ms token for one family. |
| C-06 | Primitive catalog vs runtime | `docs/design/design-system/primitive-variants-registry.md` marks `ui-button`, `ui-container`, `ui-chip`, `ui-tab`, `app-segmented-switch`, `ui-status-badge` as `implemented`. A filename search for `ui-button` under `apps/web` returns nothing. `rg` for `app-segmented-switch` / `SegmentedSwitch` in `apps/web/src` returns nothing. Shipped controls are `hlmBtn`, `hlmToggleGroup`, `hlmTabs`, `app-chip`, `hlmBadge`. `component-inventory.md` still calls the `ui-button*` family stable. | [A] | [D] Stamp that registry `historical` for the `ui-*` rows and point each row at the `hlm*` / `app-*` selector that actually ships. One catalog: `docs/specs/component/registry.md`. |
| C-07 | Chip and badge | `app-chip` carries file-type and status chips (upload, billing, media item). `hlmBadge` carries account role and quick-info chips. `badge-variants.ts` lines 6–7 says the chip variants stay on component SCSS until a design pass maps them. The primitive registry lists both `ui-status-badge` and `ui-chip` as implemented. `badgeVariants` also duplicates `muted` and `neutral` as the same classes (lines 24–26). | [A] | [D] One status pill. File-type colors (`--filetype-*` in `styles.scss` 112–116) can stay on `app-chip` until they have badge variants. Delete the `neutral` alias or make it the only muted status name. |
| C-08 | `--color-clay` still named | Runtime and `agent-css-variable-contract.md` forbid `var(--color-clay)`. `docs/design/constitution.md` line 55 still says clay is the reserved warm accent. `docs/design/components/action-interaction-standard.md` line 86 and `docs/specs/component/map/radius-selection.md` lines 11 and 147 still specify a clay stroke. `tokens.md` line 266 still lists `--color-clay` as a deprecated alias. The warm accent that ships is `--brand-gold`. | [A] | [D] Replace the live-doc name with `--brand-gold`. Leave archive files alone. |
| C-09 | Two focus rings | `hlmBtn` base uses Tailwind `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2` (`button-variants.ts` 22). Other controls use `--interactive-focus-ring`, which is a 0.1875rem `color-mix` of `--primary` at 15% in light and 25% in dark (`_typography-baseline.scss` 79 and 85). | [A] | [D] One focus recipe. Prefer the token on `hlmBtn` so sandstone and dark do not depend on Tailwind `ring-ring` plus a second shadow recipe. |
| C-10 | Spacing names | The names are not the step index. `--spacing-1`…`--spacing-4` are 1–4 × 0.25rem. `--spacing-5` is ×6, `--spacing-6` is ×8, `--spacing-8` is ×16, and there is no `--spacing-7` (`_typography-baseline.scss` 10–16). `token-layers.md` still describes a removed 12×4px step as `calc(0.25rem * 12)` at callsites. | [A] | [D] Print the rem value next to each name in `tokens.md`. Do not rename the variables; every callsite would move. |
| C-11 | Button size API | `iconPlacement` `balanced` / `iconStart` / `iconEnd` are empty strings (`button-variants.ts` 60–64). `size="icon"` is `rounded-full`; `icon-sm`, `icon-xs`, and `icon-md` are not (lines 54–56). | [A] | [D] Delete the empty placement axis, or give it padding. Give icon sizes one radius. |
| C-12 | Shadow include-then-override | `shell-box` `@include`s `panel` (which sets `--shadow-md`) and then sets `--layout-box-shadow` (`_frosted-chrome.scss` 36–39). The second shadow is the one that paints. | [A] | [D] Keep both tokens. Move the shell shadow into `shell-box` without inheriting `panel`'s shadow, so the mixin does not set a property it immediately replaces. |
| C-13 | Z-index off the product ladder | Documented product planes are 0 / 100 / 200 / 300 / 302 / 400 / 500 / 501 (`token-usage-gate.mdc` §2). Local stacking inside a component (1–6 on media item, toast layers) is a different job. Off-ladder values that sit on product surfaces: `workspace-projects-panel.component.scss` 234 (`50`) and 377 (`100` — 100 is on the ladder, 50 is not), `upload-panel.component.scss` 324 and 370 (`10`). | [A] for the cited lines; [B] not a full z-index census | [D] Local 1–6 stays. Product overlays use the ladder. Map 50 and 10 onto the nearest plane or document them as component-local. |
| C-14 | Disabled text mix | Light `--text-disabled` mixes muted foreground at **48%** (`styles.scss` 110). Dark mixes at **55%** (`styles.scss` 228). | [A] | [D] One percentage in both themes unless a contrast check requires the split. |
| C-15 | `--primary-hover` unused by the button | The token exists (`styles.scss` 109 light, delta −0.04; line 227 dark, delta −0.05). `hlmBtn` `default` uses `hover:bg-primary/90` (`button-variants.ts` 37). | [A] | [D] The filled button consumes `--primary-hover`, or the token is deleted. One lightness step in both themes. |
| C-16 | `--section-text` | `token-layers.md` § Layer C.4 says `--section-text` was removed in Batch 40. `styles.scss` still defines it (146, and sandstone 326). One consumer: `media-detail-inline-section.component.scss` 421. | [A] | [D] Put the name back in the layer doc, or replace the one consumer with `var(--muted-foreground)` and delete the token. |
| C-17 | Blur literals | Panel blur is 16px, outline-control blur is 12px, both written in the mixin (`_frosted-chrome.scss` 11 and 58). No token. | [A] | [D] Leave them until a third blur appears. A token for two values is a rename, not a simplification. |
| C-18 | Tailwind `dark:` | `tokens.md` § Phase 7 handoff: `dark:` matches `[data-theme="dark"]` only, not system dark. Semantic `var(--*)` tracks system dark. | [A] | [D] No code change. Agents keep using semantic variables for theme color. The doc is already right; C-02 is the part of that page that is not. |

## Order, if the owner wants a pass

1. **Docs only (C-01, C-02, C-03, C-08, C-10, C-16).** Stops the next agent from reintroducing inline mixes and `:host-context` sandstone, or from painting map chrome at 55%.
2. **One hover ladder (C-04) and one focus recipe (C-09).** This is the visual change. Needs a look in light, dark, and sandstone before it ships.
3. **Catalog (C-06, C-07).** Mark the `ui-*` registry historical. Decide chip vs badge before adding another pill.
4. **Token hygiene (C-05 undefined `--motion-standard`, C-11, C-12, C-14, C-15).** Small, mechanical, after the ladder is chosen so the button is not edited twice.

## What this study could not prove

- [C] Whether 8%, 10%, and 12% gold washes are distinguishable on a field display. A screenshot pass in three themes would settle C-04.
- [C] Whether every hardcoded duration is a bug. The sample in C-05 is not a census.
- No contrast measurement was run for C-14.

## Not in scope

Shell grid geometry and rail width live in [STUDY-015](./015-shell-grid-layout-change-plan.md). Instruction-layer duplication lives in [STUDY-004](./004-organizational-redundancy-audit.md). This file does not repeat them.

## Update 2026-09-23

Owner asked to apply the recommendations. Applied on the same branch. The graded claims above are unchanged.

[A] C-01, C-02, C-03, C-05 (docs + the undefined `--motion-standard` callsites), C-06, C-08, C-10, C-12, C-16 landed in the design docs, `styles.scss`, and `_frosted-chrome.scss`. The upload active state now includes `outline-control-selected` instead of a 55% card mix.

[A] C-04: `--action-hover` is gold 10% in light and dark. Sandstone `--sandstone-action-hover` is 10% of its own gold. `outline-control-hover` tints `--chrome-surface` with gold 10%. Menu rows stay 8% (`--menu-item-hover`). Destructive `hlmBtn` active wash is 15%, matching `state-visuals.md`. The 18% wash is gone.

[A] C-09: `hlmBtn`, `hlmInput`, select, tabs, toggle-group, switch, and `hlmBadge` use `focus-visible:shadow-[var(--interactive-focus-ring)]`. Toggle and tab `shadow-none` on the selected state is `not-focus-visible`, so the ring still shows while focused.

[A] C-14 correction to the table above: line 110 is the **dark** mixin (48%, hover delta −0.04) and line 228 was the **light** `:root` (55%, delta −0.05). The themes were swapped in that row. Both are now 48% and −0.04. `hlmBtn` `variant="default"` hover uses `--primary-hover` (C-15).

[A] C-07: `hlmBadge` no longer has a `neutral` variant that duplicated `muted`. `app-chip` keeps its own `neutral`. File-type colors stay on the chip.

[A] C-13: `z-index: 50` on the project color picker and `z-index: 10` on the upload file-type group are commented as component-local. They were not moved onto the product ladder.

[A] C-08 radius circle: the spec now says `--primary`, which is what `radius-visuals.service.ts` paints. Constitution and the action standard name `--brand-gold` as the warm accent.

[D] C-11 was not applied. `docs/specs/component/ui-primitives/ui-primitives.button.md` and `action-interaction-kernel.md` already lock `icon-sm` / `icon-xs` / `icon-md` to `rounded-md`, and `iconPlacement` is a semantic input whose CVA classes are empty because padding is locked to spacing-2. Changing that would contradict the spec.

[D] C-17 and C-18 were left as written: two blur values, and no change to Tailwind `dark:`.

[C] No browser pass in light, dark, and sandstone. The focus shadow and the 10% wash need that look before this is called visually confirmed.
