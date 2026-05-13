# Phase 1 — Spec Cleanup

**Status:** In Progress

- [ ] **Phase 1** — Spec Cleanup
  - [ ] Resolve primary color decision: `--color-accent-brand` (warm orange) vs `--fp-sys-color-primary` (MD3 gold) as the single brand primary
  - [ ] Write spartan token-override spec: what goes in `:root` to wire Feldpost palette into spartan variables
  - [ ] Update `docs/design/tokens.md` with spartan variable mapping section
  - [ ] Decide: migrate `--fp-sys-color-*` tokens fully OR keep dual system with spartan as an overlay
  - [ ] Decide: CDK overlay CSS stays or is replaced by spartan's CDK usage
  - [ ] Identify if any component specs need the spartan primitive contract (dialog FSM, popover, tabs) before migration
