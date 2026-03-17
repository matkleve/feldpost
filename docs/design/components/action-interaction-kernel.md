# Action & Interaction Kernel

Status: Canonical Core v1 (2026-03-17)
Scope: All actionable and interactive UI elements

## Why This File Exists

This file is the core design contract for action and interaction elements.
Use it as the single source of truth before implementing or refactoring controls.

## Hard Invariants

1. Functional parity is mandatory.
- Refactors must not remove or change user-visible behavior.
- Existing keyboard, pointer, drag/drop, and reset flows must remain intact.

2. Reactive parity is mandatory.
- Components must remain compatible with signal-based and observable-based parent flows.
- Input/output behavior and payload semantics must stay stable unless an explicit migration is approved.

3. Accessibility is mandatory.
- Keep semantic controls, visible focus, aria labels, and target-size requirements.

## Core Visual Doctrine

1. Calm over chrome.
- Prefer structure from spacing, hierarchy, and typography.
- Avoid decorative container borders.

2. Action-first emphasis.
- Visual emphasis belongs to controls that can be acted on.
- Secondary surfaces should stay quiet.

3. Guided attention.
- Use accent where the UI should guide the user.
- Hover/focus states should lead attention with subtle warm highlight.

## Border Policy (Canonical)

Apply borders only where they communicate direct affordance.

Border allowed:
- Interactive controls: button, select, input, toggle, segmented controls.
- Explicitly actionable chips.

Border usually not allowed:
- Passive containers and section wrappers.
- Header wrappers and grouping shells.
- Read-only previews and static information blocks.

Exception rule:
- Add a non-control border only when required for clarity in dense data layouts and document the reason in the component spec.

Default stroke:
- 1.5px for interactive controls.

## Radius Policy

Radius is hierarchical, not uniform.

- Outer containers can have larger radius.
- Inner actionable rows/items can use smaller radius.
- Keep a clear visual nesting relationship.

## Accent Policy

Use accent intentionally, not decoratively.

Accent is preferred for:
- Active state
- Focus-leading hover states
- High-attention guided actions

Avoid accent for:
- Default passive surfaces
- Non-interactive background decoration

## Button Policy

- Primary actions: filled.
- Secondary actions: ghost.
- Toolbar baseline: ghost + thin border on hover/active.
- Danger actions: semantic danger styling, never ambiguous.

## Reactive Integration Contract

When async/reactive interop is required:

- Observable to signal: toSignal with explicit initial handling.
- Signal to observable: toObservable for operator pipelines.
- Cleanup: takeUntilDestroyed for subscriptions.
- Shared streams: shareReplay with explicit refCount behavior.
- Query streams: debounceTime + distinctUntilChanged + switchMap for latest-only requests.

## Verification Gate For Every UI Refactor

- Build passes.
- No behavior regression in parent flow.
- Outputs unchanged in semantics.
- Keyboard flow unchanged.
- Observable/signal interoperability unchanged.
- Border policy respected (borders only on actionable controls by default).

## Relationship To Other Docs

- Detailed implementation catalog: docs/design/components/action-interaction-standard.md
- Global principles: docs/design/constitution.md
- Tokens and geometry: docs/design/tokens.md
- Motion rules: docs/design/motion.md
