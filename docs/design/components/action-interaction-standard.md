# Action & Interaction Standard

Status: Draft v1 (2026-03-17)
Owner: UI Standardization

Primary reference: docs/design/components/action-interaction-kernel.md

## Purpose

This document defines a standard for interactive UI elements in Feldpost with two hard guarantees:

- Functionality parity: no behavior loss during standardization.
- Reactive parity: components remain fully usable with Signals and RxJS Observables.

This first draft prioritizes the user-selected categories:

- Dropdowns
- Toolbars and Action Bars
- Toggles and Chips
- Button style consistency (thin border treatment)

## Sources

- Project design tokens and geometry: docs/design/tokens.md
- Angular signals and reactive context guidance: https://angular.dev/guide/signals
- Angular RxJS interop (toSignal, toObservable, rxResource): https://angular.dev/ecosystem/rxjs-interop
- Angular takeUntilDestroyed API: https://angular.dev/api/core/rxjs-interop/takeUntilDestroyed
- RxJS operator references (debounceTime, switchMap, shareReplay): https://rxjs.dev/api

## Non-Regression Rules

Every UI standardization refactor must pass these invariants:

1. Public component API compatibility

- Keep existing inputs and outputs stable unless migration is explicitly planned.
- Keep output event semantics stable (same trigger moments and payload meaning).

2. Interaction behavior compatibility

- Keep keyboard behavior (Enter, Escape, tab flow) and pointer behavior unchanged.
- Keep drag/drop capabilities where currently present.
- Keep empty/loading/error states and reset/clear actions.

3. Data/reaction compatibility

- Components must continue to work when parent state is signal-driven.
- Components must continue to work when parent state is observable-driven.

4. Accessibility compatibility

- Preserve aria labels, button semantics, focus visibility, and target sizes.

## Reactive Contract (Signals + Observables)

### Component boundary contract

- Inputs are accepted via Angular input() (signal-based input model).
- User interactions are emitted via output().
- Internal state can use signal/computed/effect where useful.

### Observable interoperability contract

Use these patterns when async streams are needed:

- Observable to Signal: use toSignal(source$, { initialValue }) when value is consumed by template/computed logic.
- Signal to Observable: use toObservable(signalValue) when stream operators are needed.
- Subscription cleanup: use takeUntilDestroyed() for explicit subscriptions.
- Shared streams: prefer shareReplay({ bufferSize: 1, refCount: true }) for fan-out streams to avoid duplicate side effects and leaks.
- Query-like interactions: prefer debounceTime + distinctUntilChanged + switchMap for cancelable latest-only requests.

### Guardrails

- Do not recreate toSignal repeatedly for the same source stream.
- Read signals synchronously before async boundaries in effects.
- Avoid deep-mutation of signal objects.

## Visual Standard Direction (from user preference)

Primary style direction for action/interaction components:

- Thin borders over heavy container chrome.
- Cleaner container layering (reduce nested border boxes).
- Small, clear corner radii.
- Accent colors only for active/high-value states.
- Keep strong readability and compact, calm density.

Concrete defaults from user feedback:

- Preferred border weight baseline: 1.5px for interactive controls.
- Radius strategy: context-based hierarchy (outer containers may use larger radius than inner items).
- Accent strategy: use accent for guidance/focus/high-attention actions.
- Hover guidance: light-orange hover is preferred for focus-leading feedback.
- Toolbar button strategy: ghost baseline, thin border on hover/active.

Token and geometry policy:

- Borders: var(--color-border), var(--color-border-strong)
- Accent: var(--color-clay) and semantic accents only where stateful
- Radius: use existing radius tokens from tokens.md
- Elevation: keep semantic elevation layers, avoid ad-hoc shadows

## Category Standards

## 1) Dropdowns

Standard base behavior:

- Optional search field at top.
- Optional reset action in header.
- Section labels and divider support.
- Keyboard support for item activation.
- Empty state text for no-match results.

Standard event model:

- Single value changes emit value payload.
- Multi-select changes emit full selected state snapshot.
- Close actions emitted explicitly from container shell.

Reference components:

- apps/web/src/app/features/map/workspace-pane/workspace-toolbar/sort-dropdown.component.ts
- apps/web/src/app/features/map/workspace-pane/workspace-toolbar/grouping-dropdown.component.ts
- apps/web/src/app/features/map/workspace-pane/workspace-toolbar/projects-dropdown.component.ts
- apps/web/src/app/features/map/workspace-pane/workspace-toolbar/filter-dropdown.component.ts
- apps/web/src/app/shared/dropdown-shell.component.ts

## 2) Toolbars and Action Bars

Standard base behavior:

- Fixed action slot order (high-frequency actions first).
- Compact button geometry with minimum touch target compliance.
- Clear active state and disabled state semantics.
- Overflow strategy for narrow widths (hide low-priority actions first).

Standard button treatment in toolbars:

- Thin border baseline (not heavy filled boxes).
- Accent fill only when active or primary.
- Icon + label pairing where clarity needs it.

Reference components:

- apps/web/src/app/features/map/workspace-pane/workspace-toolbar/workspace-toolbar.component.ts
- apps/web/src/app/features/map/workspace-pane/detail-actions/detail-actions.component.ts
- apps/web/src/app/features/map/workspace-pane/workspace-export-bar.component.ts

## 3) Toggles and Chips

Standard base behavior:

- Toggle controls expose explicit selected/checked value.
- Chip controls expose either id or index payload.
- Keep segmented control and chips visually lightweight.
- Preserve keyboard toggling and focus indication.

Reference components:

- apps/web/src/app/shared/quick-info-chips/quick-info-chips.component.ts
- apps/web/src/app/shared/snap-size-slider/snap-size-slider.component.ts
- apps/web/src/app/features/projects/projects-view-toggle.component.ts

## 4) Dialog Primitives (cross-cutting)

Dialogs are not first priority in this wave, but are included as base standards because many actions terminate in confirm/input/select flows.

Reference components:

- apps/web/src/app/shared/confirm-dialog/confirm-dialog.component.ts
- apps/web/src/app/shared/text-input-dialog/text-input-dialog.component.ts
- apps/web/src/app/shared/project-select-dialog/project-select-dialog.component.ts

## Migration Plan (Wave 1)

1. Dropdown standard first

- Unify row geometry, search header behavior, reset affordance, empty states.
- Keep existing output payloads stable.

2. Toolbar and button standard second

- Normalize thin-border button variants and active states across toolbars.
- Reduce nested borders where visual weight is too high.

3. Toggle and chips third

- Unify spacing, active/hover states, and event signatures.

## Verification Checklist per Refactor

- Build passes.
- Existing behavior in parent feature still works unchanged.
- Keyboard and pointer interactions still work.
- Outputs still emit expected payloads.
- No long-lived subscription leaks.
- Visual style matches token policy and thin-border direction.

## Notes on MCP Sources

Attempted MCP Context7 retrieval for Angular/RxJS API pages, but API key authorization failed in this workspace session. This draft therefore uses:

- Official Angular and RxJS web documentation fetched directly
- Existing project conventions and current component implementations

When Context7 credentials are available, enrich this document with direct API snippets for:

- outputFromObservable and outputToObservable
- toSignal options (initialValue, requireSync, equal)
- takeUntilDestroyed integration templates
