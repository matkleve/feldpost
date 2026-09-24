# feature-flags

Facade: `feature-flags.service.ts`
Types: `feature-flags.types.ts`
Helpers: `feature-flags.helpers.ts`
Adapters: `adapters/`

One flag, `shellGridLayout`, default `true`. Query `ff` wins, then `localStorage`, then the default. The layout does not branch on it.

**Preview:** grid shell UI ships on branch `cursor/grid-shell-preview-c5a8` only — `main` has no `app-grid-shell`. Open `http://localhost:4200/?ff=shellGridLayout` after checking out that branch.

**Off by mistake?** `?ff=-shellGridLayout` or `localStorage.removeItem('feldpost.ui.flag.shellGridLayout')`.
Spec: `docs/specs/service/feature-flags/feature-flags.md`.
