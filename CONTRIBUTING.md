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
node scripts/verify.mjs --list           # every check, in run order, each marked hard or soft
node scripts/verify.mjs design-system    # re-run one
```

### Known debt

Some checks are **soft**: they report, they do not fail the run, because they
were red on `main` before the gate existed.

**The counts are not written here on purpose.** They live on each check's `debt`
string in [`scripts/verify.mjs`](scripts/verify.mjs), next to the code that
measures them, and `npm run verify` prints them on every run. This file used to
restate them and was wrong about all three for two weeks — it promised three
soft checks when there were four, and described a test bundle that "does not
compile" long after it compiled and ran 1 710 tests. A number copied away from
its measurement goes stale silently, which is the same failure
[`docs/agent-workflows/gates-and-commands.md`](docs/agent-workflows/gates-and-commands.md)
§ Known debt already refuses to repeat. Read the counts from the run.

What holds regardless of the numbers: the counts are a **ratchet — they may only
go down.** Do not add to them, and never raise a `debt` note to match a worse
reality; establish what regressed instead. A soft check is promoted to hard the
moment its count reaches zero.

## Before opening a PR

1. `npm run verify` passes — green, or green with only the known debt
   `verify` itself prints.
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
