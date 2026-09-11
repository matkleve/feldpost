# `.github/skills/` — pointers only

Every `SKILL.md` in this directory is a generated **pointer**. The instructions
live in one place:

**[`.cursor/skills/`](../../.cursor/skills)**

Do not write rules here. `node scripts/check-skills-source.mjs` (part of
`npm run verify`) fails if a skill in this tree carries content of its own.

## Why this tree still exists

`.github/skills/` is a real discovery path — GitHub Copilot's cloud agent, code
review, CLI and IDE agent mode all load project skills from it (alongside
`.claude/skills/` and `.agents/skills/`). Deleting it outright would make every
skill invisible to Copilot. So each skill keeps a stub with the canonical
`name` and `description` in its frontmatter: Copilot still matches the skill by
relevance, and the body sends it to the one copy of the instructions.

## Why `.cursor/skills/` is the canonical tree

- It was already the **richer** copy. Both drifted pairs had diverged in the
  same direction — `component-structure` had an *FSM ↔ CSS ↔ DOM* section and
  `implement-from-spec` a *Stateful / layered UI (FSM)* section that the
  `.github/` copies never got — and `design-audit` existed only there. Choosing
  it means the collapse loses nothing.
- Cursor discovers `.cursor/skills/` and does **not** discover `.github/skills/`,
  and Cursor is the harness in day-to-day use here.
- `AGENTS.md` § Instruction precedence already ranks the `.github/` overlays
  below the primary rule set.

## Adding or changing a skill

1. Edit or create the skill under `.cursor/skills/<name>/SKILL.md`. Supporting
   files (`references/`, scripts) belong there too — this tree holds nothing but
   `SKILL.md`.
2. Run `node scripts/check-skills-source.mjs --fix` to regenerate the stubs.
3. Commit both.

## Removed when this tree became pointers

- `.github/skills/implement-from-spec/references/` and
  `.github/skills/write-element-spec/references/` — byte-identical copies of the
  files under [`.cursor/skills/implement-from-spec/references/`](../../.cursor/skills/implement-from-spec/references)
  and [`.cursor/skills/write-element-spec/references/`](../../.cursor/skills/write-element-spec/references).
- `.github/skills/archive/SKILL.md` — the retired `feldpost-prompt-analyzer-improver`
  skill, kept for reference at
  [`.cursor/skills/archive/feldpost-prompt-analyzer-improver/SKILL.md`](../../.cursor/skills/archive/feldpost-prompt-analyzer-improver/SKILL.md).
  It is not mirrored: its directory name (`archive`) did not match its declared
  `name`, so Copilot would have discovered a retired workflow as a live skill
  called `archive`.

Background: [`docs/audits/2026-09-08-grundriss-adoption.md`](../../docs/audits/2026-09-08-grundriss-adoption.md) § E3.
