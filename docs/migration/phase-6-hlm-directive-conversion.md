# Phase 6 — HLM Directive Conversion

**Status:** Planning

**Goal:** Convert all local `hlm*` atom/directive files from SCSS-based styling to `@HostBinding('class')` + Tailwind CVA — matching how spartan's published helm packages work. No component SCSS for atoms.

**Principle:** Every `hlm*` directive that is not a structural component (i.e. no internal DOM template) should carry its visual classes via `host: { class: '...' }` or `@HostBinding('class')` using CVA. Delete companion `.scss` files after conversion.

**Exceptions (keep as components):**
- `hlm-form-field` — has internal template DOM
- `hlm-spinner` — animated visual component  
- `hlm-toast` — visual component with internal structure

**Conversion table:** _To be populated after audit completes._

**Conversion order:**
1. Toggle group (highest priority — SCSS file currently in shared/ui/toggle-group/)
2. Atoms: button, badge, input, label, select, switch, skeleton
3. Molecules: card, tabs, dialog parts, popover, menu
4. Delete `hlm-toggle-group.scss` + remove `@use` from `styles.scss` once directives carry all classes

**Implementation notes:**
- Use `cva()` from `class-variance-authority` for variant-bearing directives
- `twMerge()` for class merging
- `host: { '[class]': 'computedClass()' }` pattern for signal-based class computation
