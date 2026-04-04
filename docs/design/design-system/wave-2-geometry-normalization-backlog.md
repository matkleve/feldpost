# Wave 2 Backlog: Geometry and Token Normalization

Back to master: [master-spec.md](./master-spec.md)

## Objective

Execute Wave 2 from [governance-adoption.md](./governance-adoption.md): normalize widths, min-widths, breakpoints, and rail splits through shared token contracts.

## Priority Board

### Critical

#### W2-C1 Workspace pane width contract

Scope:

- Align workspace pane default/min/max to documented contract in [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md)
- Keep user resize support but clamp inside canonical bounds

Evidence source:

- `apps/web/src/app/features/map/map-shell/map-shell.component.ts`

Tasks:

1. Replace golden-ratio default fallback with token-aligned default (360px) when no persisted user width exists.
2. Clamp max width to min(640px, viewport minus map-safe-min).
3. Keep min width 280px.
4. Ensure mobile ignores desktop inline width behavior.

Acceptance:

- Desktop default width is deterministic
- Resize remains functional
- Map safe minimum width preserved

### High

#### W2-H1 Settings overlay width class and rail split

Scope:

- Replace feature-local clamp scatter with shared overlay scale contract
- Normalize left/right rail split to shared token ratios

Evidence source:

- `apps/web/src/app/features/settings-overlay/settings-overlay.component.scss`

Tasks:

1. Introduce shared overlay width variables in global token layer.
2. Replace local width clamps with tokenized bounds.
3. Normalize section/detail rail widths with shared ratio variables.
4. Keep tablet/mobile behavior aligned to canonical breakpoints.

Acceptance:

- Overlay width behavior consistent with large overlay class
- Rail widths predictable across desktop/tablet/mobile

#### W2-H2 Breakpoint registration audit

Scope:

- Identify panel-related media queries outside canonical breakpoint contract

Tasks:

1. Inventory all panel-related `@media` definitions.
2. Flag non-canonical breakpoints.
3. Migrate or register justified exceptions in [layout-width-breakpoint-scale.md](./layout-width-breakpoint-scale.md).

Acceptance:

- No unregistered panel breakpoints in active feature styles

Audit result artifact:

- [breakpoint-audit-wave2.md](./breakpoint-audit-wave2.md)

### Medium

#### W2-M1 Overlay scale tokenization

Scope:

- Introduce reusable small/medium/large overlay sizing variables for feature reuse

Tasks:

1. Add overlay scale token aliases to global style layer.
2. Document usage examples in design-system docs.
3. Validate compatibility with existing dropdown/dialog surfaces.

Acceptance:

- At least settings and one additional overlay consume the same scale tokens

#### W2-M2 Geometry regression checks

Scope:

- Add repeatable snapshot checks for key surfaces at mobile/tablet/desktop

Tasks:

1. Define geometry test matrix for workspace pane and settings overlay.
2. Capture baseline snapshots.
3. Gate regressions with explicit tolerance rules.

Acceptance:

- Geometry regressions become visible during review

Matrix artifact:

- [geometry-regression-matrix-wave2.md](./geometry-regression-matrix-wave2.md)

## Implementation Sequence

1. W2-C1
2. W2-H1
3. W2-H2
4. W2-M1
5. W2-M2

## Risk Notes

- Width normalization may expose hidden assumptions in workspace interactions.
- Overlay rail normalization may affect dense settings content on small tablets.
- Breakpoint cleanup can surface latent layout bugs that were masked by local overrides.

## Exit Criteria (Wave 2)

- Width/min-width/breakpoint contracts enforced for workspace pane and settings overlay
- Shared overlay scale variables available and adopted
- Documented exceptions only; no silent geometry drift
- Regression checks in place for core responsive surfaces
