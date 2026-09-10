# Gates and commands

Every check, what it costs, and how to run one alone. Moved out of root [`AGENTS.md`](../../AGENTS.md) on 2026-09-10 so that file stays under its 150-line cap; nothing here is optional, and `AGENTS.md` § Development points at it.

**The rule stays in `AGENTS.md`: never report work as done without a green `npm run verify` — paste the output.** This file is the detail behind that sentence.

---

## Node version

Pinned at the repository root: [`.nvmrc`](../../.nvmrc) and the `engines` field in [`package.json`](../../package.json). `nvm use` before installing. CI uses the same major (`node-version: 22` in every workflow under `.github/workflows/`).

## The gate

```bash
npm run verify              # everything
node scripts/verify.mjs <name>   # one check
```

Checks, in run order: `doc-links`, `skills-source`, `spec-code-paths`, `specs`, `design-system`, `i18n`, `lint`, `test`, `build`. The runner keeps going after a failure, so one run tells you everything that is wrong. CI runs the identical command (`.github/workflows/verify.yml`) — local and CI cannot drift.

### Soft checks are debt with a number, not an exemption

Some checks are marked `soft: true` in [`scripts/verify.mjs`](../../scripts/verify.mjs): they report loudly and do not fail the run, because they were already red on `main` before the gate existed. Each carries a measured count, and **that count is a ratchet — it may only go down.** Code or a spec you touch leaves its checker no worse than you found it. Making a check soft to get a green run is the one thing that file must never be used for.

The current counts live in `scripts/verify.mjs` (the `debt` string on each check) — they are updated there when the number moves, so this document does not restate them and cannot go stale. As of 2026-09-10 the soft checks are `spec-code-paths`, `specs`, `lint`, and `test`; spec-size debt is tracked in [`docs/specs/SPEC-SIZE-BACKLOG.md`](../specs/SPEC-SIZE-BACKLOG.md). Everything else (`doc-links`, `skills-source`, `design-system`, `i18n`, `build`) fails hard.

## Design-system gates

Part of `npm run verify`. Run alone while iterating on design-system docs, panel SCSS, or geometry logic:

```bash
npm run design-system:check
```

Underlying scripts: `validate-design-system-registry.mjs`, `audit-panel-breakpoints.mjs`, `guard-visual-behavior.mjs`, `lint-design-tokens.mjs`, `guard-interaction-emphasis.mjs`, `audit-theme-contrast.mjs`.

Reference workflow and checklist: `.github/workflows/design-system-check.yml`, `.github/pull_request_template.md`, [`CONTRIBUTING.md`](../../CONTRIBUTING.md).

## i18n gates

Part of `npm run verify`. Run alone while iterating on the translation workbench CSV, the translation catalog, or `seed_i18n.sql`:

```bash
npm run i18n:check
```

After editing non-English translations, normalize first, then regenerate the SQL and commit it with the code:

```bash
node scripts/normalize-i18n-diacritics.mjs
npm run i18n:check
node scripts/import-i18n-csv-to-sql.mjs
```

Full workflow (keys, fallbacks, diacritics registry): [`.cursor/rules/i18n-workflow.mdc`](../../.cursor/rules/i18n-workflow.mdc). CI workflow: `.github/workflows/i18n-check.yml`.

## Spec lint

```bash
node scripts/lint-specs.mjs          # report
node scripts/lint-specs.mjs --fix    # regenerate docs/settings-registry.md
```

Caps, exclusions, and split remedies: [`docs/specs/README.md`](../specs/README.md) § Spec split and organization policy. The linter also asserts the root `AGENTS.md` line cap (`agents-md-max-lines`).

## Creating GitHub issues (required form)

Use the batch script — never call `gh issue create` one-by-one in a loop; it requires an interactive permission prompt per call.

```bash
node scripts/create-github-issues.mjs path/to/issues.json
```

Build the JSON file first (schema in `scripts/create-github-issues.example.json`: `{ title, body, labels?, milestone? }`), then run the script once. Auth resolves from `GITHUB_TOKEN` or `gh auth token`.

## Related

- [`AGENTS.md`](../../AGENTS.md) — § Development, § Change Classification (which gates a change class requires)
- [`implementation-checklist.md`](./implementation-checklist.md) — post-implementation verification
- [`agent-communication.md`](./agent-communication.md) — 🔴 LIVE VERIFICATION, the checks a gate cannot run
