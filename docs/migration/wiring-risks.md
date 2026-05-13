## Phase 5 — Wiring Risks

Callsite migration is not a simple find-and-replace. Each component that uses `UI_PRIMITIVE_DIRECTIVES` needs coordinated changes across template, TypeScript imports, and SCSS. Key risks:

### Risk 1: Barrel import coupling
The `UI_PRIMITIVE_DIRECTIVES` spread barrel is **removed (2026-05-14)**. Remaining risk: importing unused `Ui*` symbols bloats bundles — prefer `HLM_*_IMPORTS` or the minimal `Ui*` set per template.

**Mitigation:** Per component, list only the `Ui*` / `Hlm*` directives referenced in that template's standalone `imports` array.

### Risk 2: Form field triplets
`[uiFieldLabel]` + `[uiInputControl]` + `[uiFieldRow]` must be migrated together within a component. Migrating only the input without the label/row leaves broken layout because `formFieldVariants` and `inputVariants` are designed as a system.

**Mitigation:** Group A migration rule — always migrate all three within one component at a time.

### Risk 3: CSS specificity war
Until a SCSS primitive file is deleted, its rules can override Tailwind CVA classes (`.ui-button` has `!important` fallbacks in some rules, SCSS class selectors outweigh Tailwind's component classes). Expect visual glitches on partially migrated components.

**Mitigation:** Delete the SCSS file immediately after the last callsite in that group is migrated — never leave a half-empty SCSS file.

### Risk 4: Dialog hybrid state
Shared dialogs use `BrnDialogImports` + `HLM_DIALOG_IMPORTS` with **named** `Ui*` shims only where templates still use `uiButton` / `uiInputControl` markers — **no** `UI_PRIMITIVE_DIRECTIVES` barrel (removed 2026-05-14).

### Risk 5: BrnMenu blocked
Group D (dropdowns) depends on `BrnMenu` which is not in `@spartan-ng/brain@0.0.1-alpha.691`. Do not attempt dropdown callsite migration until BrnMenu ships. All dropdown SCSS removal is blocked on this.

### Recommended approach
Run Phase 5 as parallel agents, one per Group (A–G), each owning its full group: template changes + imports update + SCSS deletion + `ng build` verification. Never merge two groups in one agent run.
