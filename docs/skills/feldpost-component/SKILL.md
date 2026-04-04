---
name: feldpost-component-system
description: Read this skill before creating, refactoring, or styling any Angular component in Feldpost. Covers the UI State Machine pattern, CSS layer architecture, transition choreography, ownership triad, and ESLint gates. Required reading for any component with visual states, any work touching SCSS, and any new component creation.
---

# Feldpost Component System

This skill is the implementation reference for Angular components in Feldpost.
Read it before writing HTML, TypeScript, or SCSS for a stateful component.

---

## 1. Component Folder Structure

Every component owns its folder. All files related to that component live together:

apps/web/src/app/
shared/
my-component/
my-component.component.ts
my-component.component.html
my-component.component.scss
my-component-state.ts
my-component.spec.ts
features/
some-feature/
some-feature-item/
some-feature-item.component.ts
some-feature-item.component.html
some-feature-item.component.scss
some-feature-item-state.ts

There is no global state-machine folder.
Each component owns its own state machine file beside its implementation files.

---

## 2. State Machine Pattern

### Core Principle

FSM is required whenever a component has programmatic state.
Programmatic state is any condition that cannot be expressed purely through CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`).
CSS pseudo-classes are not FSM states.

Any component with programmatic state must model visual condition with a typed enum state.
Boolean flags are forbidden as visual drivers.

Bad:

- multiple public booleans like isLoading, hasError, isSelected

Required:

- one public state input typed as enum
- one transition map defining allowed state changes
- one guard function enforcing transition validity

Decision test:

- Would a JavaScript variable be needed to track this condition?
- If yes: it is a programmatic state and needs FSM.

### Main States vs Transition States

Main states are stable resting states.
Transition states are explicit in-between states used to run choreography safely.

Use as many transition states as needed by visible choreography.
Do not collapse visually distinct steps.

Examples:

- empty -> entering -> ready
- loading -> geometry-morphing -> crossfading -> content
- loading -> geometry-morphing -> placeholder-leaving -> content-entering -> content

### FSM Scope Rule

FSM is required whenever a component has programmatic state.
Threshold rules like "more than 2 states" are invalid and must not be used.

Does not need FSM:

- components whose only state changes are CSS pseudo-classes (`:hover`, `:focus`, `:disabled`, `:checked`)

Needs FSM:

- any component where JavaScript tracks or switches a condition
- examples: open/closed, loading/loaded/error, selected, uploading, expanded, results/no-results, filled, searching

### Searchbar Example (Programmatic)

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

### State File Shape

my-component-state.ts

- export type MyComponentState = ...
- export const MY_COMPONENT_TRANSITIONS: Record<MyComponentState, MyComponentState[]>
- export function transitionMyComponent(current, next): MyComponentState

Guard behavior:

- reject unlisted transitions
- keep current state on invalid transition
- log warning in non-production only

### Transient State Exit Triggers

Each transient state must define its exit trigger.

Valid exit triggers:

- `transitionend` event
- `animationend` event
- timer driven by matching `--transition-*` token duration

Forbidden:

- `setTimeout` with hardcoded magic-number duration

```ts
// Transient state exit via transitionend
onTransitionEnd(event: TransitionEvent) {
  if (this.state() === 'crossfading') {
    this.goTo('loaded');
  }
}
```

### Component API Rule (Non-Negotiable)

Public inputs representing visual state must be enum state inputs.
Do not expose public visual state as separate booleans.

Bad:

- @Input() isLoading
- @Input() hasError
- @Input() isSelected

Required:

- @Input() state: ComponentState

### Template Driver Rule (Non-Negotiable)

Stateful component root must bind one visual state attribute:

- [attr.data-state]="state()"

State selectors in SCSS read this attribute.

### Universal Media Boundary Rule

`app-universal-media` remains a shared rendering adapter with a structured `MediaRenderState` input.

Required handling at callsites:

- Keep feature component public visual API as one local enum state input.
- Map local enum states to `MediaRenderState` in a computed adapter mapping.
- Do not pass multiple boolean visual-state flags to emulate state at the boundary.
- Document mapping with `Stable state:` comment blocks and `@see docs/element-specs/...` references.

### Stable State Comment Segmentation (Non-Negotiable)

Every stateful component must segment state logic in TypeScript, template, and SCSS with explicit English comment blocks.

Required format:

- Prefix each block with `Stable state:`
- Briefly describe what the user sees in that stable state
- Add a spec reference line: `@see docs/element-specs/...`

Placement contract:

- In `*.component.ts`: place stable-state comments above the state enum/contract and above derived state helpers.
- In `*.component.html`: place stable-state comments immediately before each state branch/region.
- In `*.component.scss`: place stable-state comments immediately above each state selector block.

---

## 3. Parent-Child State Coordination

If child transitions depend on settled parent geometry, child transition start must be gated by parent readiness.

Pattern:

- parent exposes readiness signal or stateReached output
- child transitions only when readiness condition is true

Use this for:

- overlays entering after parent geometry settles
- child reveal after parent crossfade completes
- staggered grid-item enters after container stabilization

Document coordination contract in both parent and child element specs.

---

## 4. Ownership Triad

Every visual behavior has exactly three owners declared before HTML/CSS implementation.

| Owner          | Responsible for                                          | Forbidden from                 |
| -------------- | -------------------------------------------------------- | ------------------------------ |
| Geometry Owner | width, height, aspect-ratio, display, position: relative | state bindings, event handlers |
| State Owner    | state class or data-attribute bindings                   | geometry properties            |
| Visual Owner   | color, border, shadow, opacity, animation output         | geometry of other elements     |

Default rule:

- Geometry Owner == State Owner == Visual Owner

Allowed exception:

- parent state gate driving child visual owner
- exception must be documented in the ownership table with reason

Required ownership table in every element spec:

| Behavior | Geometry Owner | State Owner | Visual Owner | Same element? |
| -------- | -------------- | ----------- | ------------ | ------------- |

No implementation starts without this table.

---

## Geometry Dependency Contract (Required per Component)

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

---

## 5. CSS Layer Architecture

Component-local first migration rule:

- do not require global layer declaration as a prerequisite
- each refactored component uses local layers

Required local layer split in each component stylesheet:

- @layer components { ... }
- @layer states { ... }

Layer responsibilities:

| Layer      | What goes here                                     | Forbidden        |
| ---------- | -------------------------------------------------- | ---------------- |
| components | geometry, layout, base visuals                     | state selectors  |
| states     | [data-state="..."] visuals, state-only transitions | geometry changes |

Core rule:

- state never changes geometry through state selector alone
- geometry is stable in components layer
- geometry may change via data binding (for example CSS custom property values)

---

## 6. Transition and Animation Contract

### Token System (No Magic Numbers)

Use token variables only:

- --transition-geometry
- --transition-fade-out
- --transition-fade-in
- --transition-reveal-delay
- --transition-emphasis

### Choreography Table (Required Before CSS)

Each stateful component spec must include:

| from -> to | step | element | property | timing token | delay |
| ---------- | ---- | ------- | -------- | ------------ | ----- |

Default order:

1. geometry settles
2. outgoing content fades out
3. incoming content fades in after reveal delay

Any deviation must be documented with visual reason.

Forbidden patterns:

- transition: all ...
- hardcoded durations/easing values
- unscoped animation outside state selectors

### Reduced Motion Kill-Switch (Mandatory)

This kill-switch must live in the global stylesheet and requires no per-component implementation.

```scss
@media (prefers-reduced-motion: reduce) {
  * {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
```

---

## 7. HTML Minimum Structure

Two elements may own geometry in one rendered stack:

1. outer layout owner sets space
2. innermost content element fills space

Everything between carries zero geometry ownership.
Overlays use position: absolute; inset: 0 against the layout owner stacking context.

Do not add wrapper elements to solve CSS architecture problems.

---

## 8. Visual State Consistency

Before implementing a visual state treatment:

- check docs/design/state-visuals.md

If canonical treatment exists:

- use it

If canonical treatment does not exist:

- define it in design system docs first, then implement

Do not create one-off component-local treatments for shared semantic states.

---

## 9. Implementation Checklist

### State Machine

- [ ] State enum + transition map in component-local state file
- [ ] Transition guard function implemented
- [ ] FSM is used whenever state is programmatic (not CSS pseudo-class only)
- [ ] Public visual state input is enum, not multiple booleans
- [ ] Component root binds [attr.data-state]
- [ ] No boolean flags drive visual output in template or SCSS
- [ ] Stable-state comments exist in TS/HTML/SCSS with `Stable state:` prefix and `@see docs/element-specs/...` references

### Ownership

- [ ] Ownership triad table completed before HTML/CSS
- [ ] Exceptions documented with explicit reason
- [ ] Exactly one stacking-context owner per component

### Geometry Dependency

- [ ] Geometry Dependency Contract declared in spec before any HTML or CSS written
- [ ] If height is child-driven: CSS custom property name and fallback documented
- [ ] No component sets explicit height and reads child-driven height simultaneously

### HTML

- [ ] Two geometry-owner rule satisfied
- [ ] No intermediate wrapper owns forbidden geometry properties

### CSS

- [ ] Local @layer components and @layer states blocks used
- [ ] Geometry only in components layer
- [ ] State visuals/transitions only in states layer
- [ ] All timings use transition token variables
- [ ] No magic-number timing values

### Visual Consistency

- [ ] Canonical state treatment validated against docs/design/state-visuals.md

### Gates

- [ ] Choreography table present in element spec before CSS implementation
- [ ] ESLint custom state-machine rules pass
- [ ] Stylelint state/layer rules pass
- [ ] ng build clean
- [ ] npm run design-system:check clean
- [ ] npm run lint clean
