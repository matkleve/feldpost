---
name: component-structure
description: "Prevent component chaos by enforcing ownership matrix, interactive tree safety, wrapper budget, state exclusivity, CSS ownership gate, and Tailwind-vs-SCSS planning before implementation. Use when creating/refactoring Angular components and subcomponents (spec/html/scss/ts)."
argument-hint: "Component or feature scope to validate (e.g., media-item, item-grid)"
---

# Component Structure Hard Gates

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
