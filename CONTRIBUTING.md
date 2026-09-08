# Contributing

## The gate

One command, run from the repository root, before every commit:

```bash
npm run verify
```

It runs doc links → spec lint → design-system gates → i18n gates → ESLint →
unit tests → `ng build`, keeps going after a failure, and prints one summary.
CI runs the same command ([`.github/workflows/verify.yml`](.github/workflows/verify.yml)),
so a green local run means a green pipeline.

**Do not report work as done without pasting the `verify` output.**

While iterating, re-run a single check instead of the whole gate:

```bash
node scripts/verify.mjs design-system    # doc-links | specs | design-system | i18n | lint | test | build
```

### Known debt

`specs` is a **soft** check: it reports, it does not fail the run. `lint:specs`
carries 201 errors that predate the gate — tracked in
[`docs/specs/SPEC-SIZE-BACKLOG.md`](docs/specs/SPEC-SIZE-BACKLOG.md). Do not add
to it: a spec you touch leaves the linter no worse than you found it.

## Before opening a PR

1. `npm run verify` is green (soft `specs` aside).
2. The change class is declared and its extra requirements are met — see
   [`AGENTS.md`](AGENTS.md) § Change Classification.
3. The PR checklist in [`.github/pull_request_template.md`](.github/pull_request_template.md)
   is filled in.

## Documentation references

- [`docs/design/design-system/master-spec.md`](docs/design/design-system/master-spec.md)
- [`docs/design/design-system/layout-width-breakpoint-scale.md`](docs/design/design-system/layout-width-breakpoint-scale.md)
- [`docs/design/design-system/governance-adoption.md`](docs/design/design-system/governance-adoption.md)
- [`docs/design/design-system/geometry-regression-matrix-wave2.md`](docs/design/design-system/geometry-regression-matrix-wave2.md)
- [`docs/design/design-system/wave-3-contract-standardization.md`](docs/design/design-system/wave-3-contract-standardization.md)

## Notes

- Specs are contracts. Update the doc first when contract behavior changes.
- Do not introduce new panel breakpoints without documenting and registering exceptions.
