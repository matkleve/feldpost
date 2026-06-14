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

## User-Approved Reference Elements

The following existing elements are explicit positive references and should guide standardization decisions:

- Sort Dropdown
- Grouping Dropdown
- Snap Size Slider
- New Photos zoom button style (thin-line treatment)

Translate these references into reusable standards:

- Thin, readable strokes over heavy chrome
- Clear but compact radius hierarchy
- Accent used for guidance and focus, not decoration

## Border Policy (Canonical)

Apply borders only where they communicate direct affordance.

Border allowed:

- Interactive controls: button, select, input, toggle, segmented controls.
- Explicitly actionable chips.

Border usually not allowed:

- Passive containers and section wrappers.
- Header wrappers and grouping shells.
- Read-only previews and static information blocks.

Context note from user feedback:

- Settings surfaces should avoid stacked container borders; visual separation should come from spacing, type hierarchy, and subtle surface contrast first.

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

Use **`--accent`** only where a control still maps to shadcn defaults not yet migrated. **Do not** use `--accent` for quiet-button hover — use **Interaction emphasis** (`docs/design/state-visuals.md` § Interaction emphasis).

Avoid accent for:

- Default passive surfaces
- Non-interactive background decoration

## Button Policy

- **Commit CTAs:** `hlmBtn` `variant="default"` — filled `--primary`; `variant="destructive"` — destructive quiet wash + `--destructive` ink (not solid fill).
- **Quiet actions:** `outline` and `ghost` — idle `--muted-foreground`; hover/focus `--primary` + 10% primary wash; selected/on `--interaction-selected-ink` + 10% wash; selected+hover primary wins (see state-visuals).
- **Link-style:** `variant="link"` — primary text + underline on hover.
- **Legacy filled secondary:** `variant="secondary"` — rare; prefer `outline` for new work.
- Toolbar triggers may keep geometry/padding exceptions; colors follow interaction emphasis when open (selected ink) and on hover (primary).
- Danger actions: semantic destructive styling, never ambiguous.
- Icon + label on `hlmBtn`: horizontal padding locks to spacing-2 (`ps-2` / `pe-2`) on both edges for every size and `iconPlacement` (`start` / `end`); set `iconPlacement` for composition semantics; `size="icon"` stays square (`w-10 h-10`).

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
