---
name: design-audit
description: Audits proposed or existing UI designs before implementation for ownership, wiring, token use, component reuse, overflow risk, accessibility, state coverage, and current external pattern evidence. Use when the user asks to review a design, UI plan, mockup, vibe-coded UI, auth/form layout, component composition, visual treatment, or asks whether to reuse or create UI components.
argument-hint: "Design, component, feature, mockup, spec, or file scope to audit"
---

# Design Audit

## Role

Audit UI designs before code is written or while reviewing existing UI. Produce evidence-backed findings and a concrete recommendation. Do not implement unless the user separately asks for implementation.

This skill complements:

- `component-structure`: hard gates for component implementation.
- `spec-audit`: consistency checks for existing specs.
- `write-element-spec`: creating the implementation contract after the design is approved.

## Required Research-First Protocol

Before recommending code, gather current evidence:

1. Read local sources of truth:
   - Relevant `docs/specs/...`
   - `docs/design/...` and `docs/design/state-visuals.md` when visual states are involved
   - Existing shared UI under `apps/web/src/app/shared/`
   - Existing feature templates/styles for local patterns
   - `apps/web/package.json` before recommending libraries
2. Search for reusable local components/directives first:
   - Containers, cards, dialogs, buttons, fields, inputs, overlays, state frames
   - If a primitive exists, prefer adapting it over creating a new one
   - If only directives exist and the design needs centralized behavior, call out the missing component explicitly
3. Pull current external evidence when the design depends on general web/UI practice:
   - CSS layout safety: box sizing, grid/flex shrink behavior, overflow
   - Accessibility: labels, ARIA descriptions, focus order, keyboard behavior, contrast
   - Library/framework behavior: use current docs
   - AI/vibe-coded UI failure modes: design-system drift, generic visuals, missing states, inaccessible defaults
4. Cite the URLs used in the audit.

## Audit Gates

Run every gate unless it is clearly not applicable. If skipped, say why.

### 1. Ownership

Check whether every visual behavior has one owner:

- Geometry owner: width, height, aspect-ratio, layout, gaps
- State owner: enum/state attribute/class binding
- Visual owner: color, border, shadow, opacity, animation
- Interaction owner: click/focus/keyboard hit area
- Stacking owner: `position: relative`, overlays, z-index layers

Flag duplicate ownership, missing ownership, parent-child leakage, styled intermediate wrappers, and state selectors that change geometry.

### 2. Wiring

Check whether the design can be wired without ambiguity:

- Inputs/outputs/events are named and scoped
- Programmatic states use a single enum visual API where required
- Form controls have stable `id`s and label associations
- Error, loading, empty, success, disabled, and pending states are distinct
- Server/global errors are separate from field-level errors
- Links/buttons are semantically correct and not nested inside other interactive elements

### 3. Tokens and Visual Language

Check whether the design uses existing Feldpost tokens and patterns:

- Colors, spacing, radius, shadows, typography, breakpoints, transitions
- No hardcoded timing/easing/color values unless the design system lacks a token
- No generic AI visual defaults unless they match Feldpost: unmotivated gradients, random rounded corners, mismatched icons, inconsistent padding
- Transition and animation values come from tokens

### 4. Component Reuse Decision

Build a reuse inventory before recommending new code:

- Existing component/directive
- Where used
- What it already owns
- What the proposed design needs
- Gap: none / small extension / new component required

Decision rules:

- Reuse as-is when semantics and ownership match.
- Extend an existing primitive when the gap is styling or one scoped behavior.
- Create a new component only when reuse would overload another component's responsibility or when centralized behavior is required across call sites.
- Do not add a third-party library unless `package.json` already has a matching dependency or the audit proves a strong fit for Angular version, tree shaking, design tokens, i18n, accessibility, and ownership.

### 5. Overflow and Responsive Safety

Check narrow and dense layouts:

- Inputs and content boxes use `box-sizing: border-box`
- Grid/flex children that must shrink have `min-width: 0`
- Grid tracks use `minmax(0, 1fr)` when flexible tracks must not expand from content
- Long labels, placeholders, filenames, addresses, emails, buttons, and links have a defined wrap/truncation behavior
- Scroll regions have a named owner and do not hide focus rings
- Test target widths are named, typically `320px` and `420px` for narrow cards

### 6. Accessibility

Check WCAG-oriented basics:

- Visible labels with programmatic association
- `aria-describedby` for hints and inline errors
- `aria-invalid` only when invalid after validation
- Error summary or `role="alert"` when appropriate
- Keyboard order matches visual order
- Focus visible and focus return are defined
- Icon-only controls have accessible names
- Placeholder text is never the only label
- Color is not the only error/state indicator

### 7. AI/Vibe-Coding Failure Modes

Explicitly check for failures common in AI-generated UI:

- Looks plausible but ignores local components
- Default state exists; loading/error/empty/disabled/focus states are missing
- Desktop layout works; mobile or narrow card overflows
- ARIA is decorative, wrong, or conflicts with visible labels
- Visuals are generic rather than Feldpost-specific
- Implementation plan invents CSS values instead of using tokens
- Prompt/output optimizes screenshots over real interaction

## Output Format

Use this structure:

```markdown
## Research Notes
- [URL] Finding relevant to this design.

## Local Reuse Inventory
| Candidate | Existing use | Owns | Fit | Decision |
| --- | --- | --- | --- | --- |

## Findings
| # | Gate | Area | Finding | Severity | Fix |
| --- | --- | --- | --- | --- | --- |

## Recommendation
Pick one path: reuse existing / extend primitive / create component / reject library / revise design.

## Acceptance Criteria
- Concrete verification checks for layout, keyboard, screen reader labels, tokens, states, and build/test gates.
```

Severity:

- `BLOCKER`: design will be ambiguous, inaccessible, or structurally unsafe.
- `GAP`: missing contract, state, token, component, or acceptance criterion.
- `SMELL`: likely drift or maintenance cost.
- `NOTE`: useful evidence or non-blocking observation.

## Stop Conditions

Stop and ask one question when:

- The design depends on missing domain rules or product intent.
- Two existing components appear to own the same responsibility.
- A third-party library is being considered without a clear acceptance reason.
- The requested visual change conflicts with `AGENTS.md`, specs, RLS/security boundaries, or i18n rules.
