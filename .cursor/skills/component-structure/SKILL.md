---
name: component-structure
description: "Prevent component chaos by enforcing ownership matrix, interactive tree safety, wrapper budget, state exclusivity, CSS ownership gate, and Tailwind-vs-SCSS planning before implementation. Use when creating/refactoring Angular components and subcomponents (spec/html/scss/ts)."
argument-hint: "Component or feature scope to validate (e.g., media-item, item-grid)"
---

# Component Structure Hard Gates

> **Role:** Specialist skill. Produces a structured findings report. Does not create GitHub issues. Returns output to `audit-scope-to-issues` for issue creation.

## Mode

**Standalone** (invoked directly by user):
Run the full audit, then behave like `audit-scope-to-issues`: present findings checkpoint, wait for confirmation, create issues.

**Orchestrated** (invoked by `audit-scope-to-issues`):
Run the audit, return the structured findings report only. Do not create issues. Do not checkpoint with the user.

Detect mode by context: if the user invoked this skill directly, use Standalone. If called as part of an orchestrated audit, use Orchestrated.

These are hard gates. They are not optional guidelines.

## 1) Ownership Matrix (Required Before First HTML)

Create an ownership matrix before writing the first HTML.
No code without matrix.

## 1.1) Visual Behavior Contract (Required Before First HTML)

Define a Visual Behavior Contract before writing the first HTML.
No overlays, states, or interaction layers may be implemented without this contract.

Required checklist:

- Stacking Context: exactly one owner element with `position: relative`
- Layer Order: explicit z-index map for content, upload, selected, quiet actions
- State Ownership: each visual state names exactly one owner element
- Pseudo-CSS: include a minimal contract snippet for `:host`, overlays, and `img`/content

## 1.2) Ownership Triad Rule (Hard Blocker)

Every visual behavior in a component has exactly three owners.
They must be explicitly declared before any HTML or CSS is written.

| Owner          | Responsible for                                                                   | Forbidden from                |
| -------------- | --------------------------------------------------------------------------------- | ----------------------------- |
| Geometry Owner | width, height, aspect-ratio, display                                              | state classes, event bindings |
| State Owner    | state class bindings (`[class.x]`)                                                | geometry properties           |
| Visual Owner   | CSS rules that produce visible output (color, border, shadow, opacity, animation) | geometry of other elements    |

### Core rule (default)

Geometry Owner == State Owner == Visual Owner

By default, all three owners point to the same element.
Any divergence is an exception and must be documented.

### Mandatory declaration format (per component spec)

| Behavior      | Geometry Owner                            | State Owner                                         | Visual Owner                                        | Same element?               |
| ------------- | ----------------------------------------- | --------------------------------------------------- | --------------------------------------------------- | --------------------------- |
| selected ring | `.media-item-render-surface__media-frame` | `.media-item-render-surface__media-frame--selected` | `.media-item-render-surface__media-frame--selected` | ✅                          |
| loading pulse | `.item-state-frame__state-layer--loading` | `.item-state-frame__state-layer--loading`           | `.item-state-frame__state-layer--loading`           | ✅                          |
| hover reveal  | `.media-item__quiet-actions`              | `.media-item--selected` (on parent)                 | `.media-item__quiet-actions`                        | ⚠️ exception — document why |

### Exceptions

- Document the exception in the spec table with reason.
- Use `position: absolute; inset: 0` on the visual owner relative to the geometry owner's stacking context.
- Never duplicate geometry ownership across layers.

## 1.25) FSM ↔ CSS ↔ DOM (layered stateful components)

When the component uses `[attr.data-state]` and **stacked layers** (loading / content / error / empty):

1. **Transition map** in TS — every `goTo(next)` must be a legal edge (grep vs map).
2. **Layer opacity matrix** in spec supplement — one row per state, one column per layer; SCSS implements every cell.
3. **DOM gates** — document any `@if` / computed that mounts content outside `data-state` (e.g. `showSharpContent`).
4. **Live revisit check** — for cache/FSM media work, owner runs map → `/media` twice; see `docs/agent-workflows/agent-communication.md` § LIVE VERIFICATION.

Reference: `.cursor/rules/ui-state-machine.mdc`, `docs/ai-diary/2026-05-25.md`, `media-display.rendering-matrix.supplement.md`.

### Main States vs Transition States

Main states are stable resting states.
Transition states are explicit in-between states used to run choreography safely.

Use as many transition states as needed by visible choreography.
Do not collapse visually distinct steps.

Examples:

- empty -> entering -> ready
- loading -> geometry-morphing -> crossfading -> content
- loading -> geometry-morphing -> placeholder-leaving -> content-entering -> content

### Searchbar Example (Illustrative — Not a Rule)

Searchbar looks simple but has programmatic state and therefore requires FSM.

```ts
export type SearchbarState =
  | "closed"
  | "opening"
  | "open-empty"
  | "open-loading"
  | "open-results"
  | "open-no-results"
  | "closing";
```

### Multiple Independent State Machines

A component may have multiple independent FSMs when state dimensions are parallel and not causally coupled.

Use two separate signals when:

- dimensions can change independently
- transitions in one dimension do not redefine valid transitions in the other
- example: render-state and upload-state on an upload item

Use one combined enum when:

- dimensions are tightly coupled
- allowed transitions depend on the combined state pair
- you need one authoritative state driver for a single visual choreography

### Universal Media Boundary Rule

`app-universal-media` remains a shared rendering adapter with a structured `MediaRenderState` input.

Required handling at callsites:

- Keep feature component public visual API as one local enum state input.
- Map local enum states to `MediaRenderState` in a computed adapter mapping.
- Do not pass multiple boolean visual-state flags to emulate state at the boundary.
- Document mapping with `Stable state:` comment blocks and `@see docs/specs/...` references.

### Parent-Child State Coordination

If child transitions depend on settled parent geometry, child transition start must be gated by parent readiness.

Pattern:

- parent exposes readiness signal or stateReached output
- child transitions only when readiness condition is true

Use this for:

- overlays entering after parent geometry settles
- child reveal after parent crossfade completes
- staggered grid-item enters after container stabilization

Document coordination contract in both parent and child element specs.

### Geometry Dependency Contract (Required per Component)

Every component spec must declare its geometry dependency contract before any implementation starts. The contract answers who owns width and who owns height.

Declare it as a table with three columns: Dimension, Owner, Mechanism.

Ownership types:

- self-contained: component sets its own size independently
- parent-dictated: component fills space provided by parent, never declares own size
- child-driven: component size is determined by a child via CSS custom property injection

Rules:

- A component may never set both width and height explicitly if one of them is child-driven.
- Child-driven geometry must always flow via a CSS custom property on the child host; never via `@Output()`, never via `ElementRef` measurement fed back as `@Input()`.
- The geometry dependency chain must be traceable from the outermost layout owner to the innermost content element without ambiguity.
- Any component where height is child-driven must document the exact CSS custom property name and fallback value.
- Geometry Dependency Contract declared in spec before any HTML or CSS written.
- If height is child-driven: CSS custom property name and fallback documented.
- No component sets explicit height and reads child-driven height simultaneously.

### Stacking context rule

Exactly one element per component declares `position: relative`.
This element is the geometry owner for all absolutely positioned children.
All overlays, badges, and action layers use `position: absolute; inset: 0` relative to this single owner.

### Correct vs Incorrect Stacking Context Example

Correct:

```css
:host {
  position: relative; /* sole stacking context owner */
}

.upload-overlay,
.selected-overlay,
.quiet-actions {
  position: absolute;
  inset: 0;
}
```

Incorrect:

```css
:host {
  position: static;
}

.state-frame {
  position: relative; /* wrong owner: wrapper takes overlay ownership */
}

.selected-shadow {
  box-shadow: var(--shadow-sm); /* wrong: tile-level wrapper emphasis */
}
```

## 2) Interactive Tree Safety

- No interactive element inside interactive element.
- No button inside button.
- No aria-hidden on nodes with interactive descendants.

## 3) Wrapper Budget

- Maximum 3 HTML nesting levels per component path.
- Every additional level requires a documented exception.

## 4) State Exclusivity

- Loading, Error, Empty are mutually exclusive.
- Each state has exactly one visual owner.

## 5) CSS Ownership Gate

- Each CSS property is owned exactly once per purpose.
- Duplicate ownership is a blocker.

## 6) Tailwind vs SCSS Decision Rule

- Layout and spacing: Tailwind.
- Complex states, animations, pseudo-elements: SCSS.
- Per component, decide before implementation.
- Do not mix without a documented plan.

## 7) Review Severity Levels

### Blocker

- Ownership matrix missing.
- More than 3 nesting levels without documented exception.
- Interactive element nested in interactive element.
- aria-hidden on node with interactive descendants.
- Duplicate CSS ownership for same purpose.
- Loading/Error/Empty not mutually exclusive.
- A state has more than one visual owner.
- Visual Behavior Contract missing before first HTML.
- Multiple stacking-context owners for the same overlay set.
- Overlay z-index map missing or partially implicit.

### High

- Tailwind vs SCSS decision not documented before implementation.
- Tailwind and SCSS mixed without documented plan.

### Medium

- Documentation quality gaps that do not break the hard gates.

## Output (Report to Orchestrator)

In Orchestrated mode, return findings in this structure — do not create issues:

### Confirmed Findings
| Area/File | Spec | Observation | Suggested priority |
|---|---|---|---|

### Unclear Findings
| Area/File | Suspicion | Evidence | Check needed |
|---|---|---|---|

### Not Examined
| Area/File | Reason |
|---|---|
