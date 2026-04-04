# Component Structure Audit - Item Grid Stack (2026-04-03)

## Scope

Audited components:

- `apps/web/src/app/shared/item-grid/item-grid.component.*`
- `apps/web/src/app/shared/item-grid/item-state-frame.component.*`
- `apps/web/src/app/features/media/media-item.component.*`
- `apps/web/src/app/features/media/media-item-render-surface.component.*`
- `apps/web/src/app/features/media/media-item-quiet-actions.component.*`
- `apps/web/src/app/features/media/media-item-upload-overlay.component.*`

Governed by:

- `AGENTS.md` (Component Structure Rules, SCSS ownership contract)
- `docs/element-specs/component/item-grid.md`
- `docs/element-specs/component/media-item.md`

## Hard-Gate Status Summary

- **Blocker**: 0
- **High**: 3
- **Medium**: 3

## Resolution Pass (2026-04-03, Step 5)

Implemented and verified:

- Removed interactive nesting in media item composition (open action no longer wraps quiet-action buttons).
- Removed `aria-hidden` from the render-surface slot that hosts projected overlays.
- Enforced single loading owner for media path by disabling shared state-frame loading in `MediaItemComponent` binding.
- Reduced CSS geometry ownership overlap by removing duplicate `width: fit-content` on render-surface host.
- Re-ran focused media-template lint and Angular build successfully.

## Ownership Matrices (Post-hoc)

### 1) ItemGridComponent

| Concern                       | Owner               | Status |
| ----------------------------- | ------------------- | ------ |
| Grid columns/gaps/mode layout | `ItemGridComponent` | OK     |
| Loading/Error/Empty visuals   | Not owned here      | OK     |
| Domain media visuals          | Not owned here      | OK     |
| Interactive actions           | Not owned here      | OK     |
| Accessibility role container  | `ItemGridComponent` | OK     |

### 2) ItemStateFrameComponent

| Concern                                      | Owner                     | Status                                                        |
| -------------------------------------------- | ------------------------- | ------------------------------------------------------------- |
| Shared loading/error/empty/selection visuals | `ItemStateFrameComponent` | OK (media path loading explicitly disabled at parent binding) |
| Domain visuals                               | Not owned here            | OK                                                            |
| Retry action                                 | `ItemStateFrameComponent` | OK                                                            |
| Geometry ownership                           | Wrapper + state overlays  | **Conflict risk**                                             |

### 3) MediaItemComponent

| Concern                                            | Owner                                            | Status                                                  |
| -------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------- |
| Domain orchestration (tier, state mapping, events) | `MediaItemComponent`                             | OK                                                      |
| Primary open interaction                           | `MediaItemComponent`                             | OK (sibling overlay button, no nested interactive tree) |
| Overlay composition (upload/quiet actions)         | `MediaItemComponent`                             | OK                                                      |
| Loading owner boundary                             | `MediaItemRenderSurfaceComponent` for media path | OK                                                      |

### 4) MediaItemRenderSurfaceComponent

| Concern                                        | Owner                             | Status                                    |
| ---------------------------------------------- | --------------------------------- | ----------------------------------------- |
| Media slot/frame geometry                      | `MediaItemRenderSurfaceComponent` | OK                                        |
| Canonical media render states                  | `MediaItemRenderSurfaceComponent` | OK                                        |
| Loading visual layer                           | `MediaItemRenderSurfaceComponent` | OK                                        |
| Overlay projection anchor                      | `MediaItemRenderSurfaceComponent` | OK                                        |
| Accessibility visibility of projected controls | `MediaItemRenderSurfaceComponent` | OK (`aria-hidden` removed from slot host) |

### 5) MediaItemQuietActionsComponent

| Concern                   | Owner                                               | Status                   |
| ------------------------- | --------------------------------------------------- | ------------------------ |
| Select/Map controls       | `MediaItemQuietActionsComponent`                    | OK                       |
| Corner button positioning | `MediaItemQuietActionsComponent` + parent selectors | **Cross-layer coupling** |
| Keyboard affordance       | `MediaItemQuietActionsComponent`                    | OK                       |

### 6) MediaItemUploadOverlayComponent

| Concern                        | Owner                                            | Status                   |
| ------------------------------ | ------------------------------------------------ | ------------------------ |
| Upload progress fill and label | `MediaItemUploadOverlayComponent`                | OK                       |
| Overlay geometry and z-order   | `MediaItemUploadOverlayComponent` + parent class | **Cross-layer coupling** |
| Decorative accessibility mode  | `aria-hidden` on overlay root                    | OK                       |

## Violations by Severity

### Blocker (Resolved)

1. **Interactive element nested in interactive element (runtime composition)**
   - Status: Resolved.
   - Fix: Open action button is now a sibling overlay in `MediaItemComponent`, no longer a parent of projected action buttons.

2. **`aria-hidden` on node with interactive descendants (runtime projection)**
   - Status: Resolved.
   - Fix: `aria-hidden` removed from `media-item-render-surface__slot`.

3. **State exclusivity breach risk: loading has more than one visual owner**
   - Status: Resolved.
   - Fix: Shared state-frame loading disabled for media path with `[loading]="false"`; media loading remains owned by render-surface.

4. **CSS ownership overlap on geometry-related behavior**
   - Status: Resolved.
   - Fix: Duplicate `width: fit-content` removed from render-surface host.

5. **Wrapper budget exceeded on media item rendering path**
   - Status: Resolved via documented exception.
   - Justification: The media stack requires additional depth to satisfy all of the following simultaneously: shared state-frame contract, render-surface state layers, and frame-anchored projected overlays.
   - Contracted exception path: `item-state-frame -> media-item -> render-surface -> media-frame -> overlays/content`.

### High

1. **Tailwind-vs-SCSS decision not documented per component before implementation**
   - Current files are SCSS-heavy but no explicit per-component decision artifact is present.

2. **Cross-layer coupling for overlay reveal logic**
   - Parent selectors control child overlay behavior: `apps/web/src/app/features/media/media-item.component.scss:44` to `apps/web/src/app/features/media/media-item.component.scss:46`
   - Makes ownership and reuse harder.

3. **Rule conflict between global transition guidance and media spec timing**
   - Global guidance: 120-250ms (`.github/instructions/styling.instructions.md`)
   - Media spec and implementation use 80ms (`docs/element-specs/component/media-item.md`, `apps/web/src/app/features/media/media-item.component.scss:38`)

### Medium

1. **Comment volume improves traceability but reduces quick scan speed**
   - Not a blocker; keep contract comments but couple with strict ownership artifacts.

2. **Template-level lint cannot fully detect cross-component interactive nesting**
   - See lint gap section below.

3. **Folder-level grouping can be improved for readability**
   - Current media item subcomponents are all in one folder; optional subfoldering could improve cognitive load.

## ESLint Gate Validation and Gap

### What was validated

- Angular template rules in flat config were hardened.
- `@angular-eslint/template/interactive-supports-focus`: `error`
- `@angular-eslint/template/no-positive-tabindex`: `error`
- Fallback structural guard: `@angular-eslint/template/no-nested-tags`: `error`

### Confirmed limitation

- `@angular-eslint/template/no-nested-interactive` does **not** exist in installed plugin version (`@angular-eslint/eslint-plugin-template@21.0.1`).
- Therefore the exact requested rule cannot be enabled right now.

### TODO (with issue link)

- Track/open upstream issue for a dedicated `no-nested-interactive` template rule:
  - Search open issues: https://github.com/angular-eslint/angular-eslint/issues?q=is%3Aissue%20is%3Aopen%20no-nested-interactive
  - New issue shortcut: https://github.com/angular-eslint/angular-eslint/issues/new?title=feat(template)%3A%20add%20no-nested-interactive%20rule

## Next Gate Before ItemGrid Completion

ItemGrid stack can be considered structurally ready only when all Blocker items in this audit are resolved.

