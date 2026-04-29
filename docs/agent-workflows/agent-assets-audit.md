# Agent Asset Audit

Date: 2026-04-29

## Purpose

Inventory Feldpost agent-facing assets, remove proven duplicate prompt entrypoints, and define the remaining canonical workflows for future agents.

## Inventory

| Area | Role | Decision | Rationale |
| --- | --- | --- | --- |
| `.github/agents/` | Canonical task agents for spec writing, planning, implementation, checking, and review | Keep | Richer than matching prompt files, includes handoffs and clearer tool scope. |
| `.github/instructions/` | Scoped instruction overlays | Keep | These are reusable conventions, not standalone task workflows. |
| `.cursor/skills/` | Cursor-invokable mirrors of project skills | Keep in sync with `.github/skills/` | Cursor does not discover `.github/skills/` directly, so every project skill must be mirrored here. |
| `.github/skills/check-spec/` | Check one implementation against one spec | Keep | Narrow checkbox-oriented workflow; not replaced by path-to-issues audit. |
| `.github/skills/spec-audit/` | Audit spec markdown consistency | Keep | Reviews spec internals, not implementation or GitHub issues. |
| `.github/skills/implement-from-spec/` | Implementation workflow | Keep | Skill form remains useful even though prompt duplicate is removed. |
| `.github/skills/write-element-spec/` | Spec authoring workflow | Keep | Skill form remains useful even though prompt duplicate is removed. |
| `.github/skills/component-structure/` | Component structure gates | Keep | Specialized ownership/visual-contract guard. |
| `.github/skills/service-symmetry/` | Service module symmetry | Keep | Specialized service/documentation mirror workflow. |
| `.github/skills/safe-file-split/` | Safe mechanical file splitting | Keep | Specialized high-risk refactor workflow. |
| `.github/skills/feldpost-prompt-analyzer-improver/` | Prompt hardening | Keep | Meta-workflow for prompt quality. |
| `.github/prompts/audit-design.prompt.md` | Design/accessibility audit prompt | Keep | No exact replacement exists; keep until a dedicated design-audit skill supersedes it. |
| `.github/prompts/implement-element.prompt.md` | Implement from spec prompt | Delete | Duplicates `.github/agents/implementer.agent.md`. |
| `.github/prompts/plan-before-build.prompt.md` | Plan from spec prompt | Delete | Duplicates `.github/agents/planner.agent.md`. |
| `.github/prompts/write-spec.prompt.md` | Write spec prompt | Delete | Duplicates `.github/agents/spec-writer.agent.md`. |
| `.github/prompts/review-against-spec.prompt.md` | Review against spec prompt | Delete | Duplicates `.github/agents/reviewer.agent.md` and overlaps `.github/agents/checker.agent.md`. |
| `docs/agent-workflows/` | Human-readable workflow references | Keep | Durable docs and reference material; not direct invocation entrypoints. |

## New Canonical Workflows

| Workflow | Path | Purpose |
| --- | --- | --- |
| Audit scope to issues | `.github/skills/audit-scope-to-issues/SKILL.md` + `.cursor/skills/audit-scope-to-issues/SKILL.md` | Orchestrate specialist reports for a folder/file, checkpoint consolidated findings with the user, then create GitHub issues from approved findings with type and priority labels. |
| Verify issues | `.github/skills/verify-issues/SKILL.md` + `.cursor/skills/verify-issues/SKILL.md` | Re-check open issues against code/spec evidence, verify priority-label metadata, close only complete issues, and comment on incomplete or unverifiable issues. |

## Audit Pipeline

Specialist skills support two modes. In Standalone mode, they run the audit, checkpoint with the user, and create issues using the same flow as `audit-scope-to-issues`. In Orchestrated mode, they produce structured reports only and return control to `audit-scope-to-issues`:

- `spec-audit`
- `check-spec`
- `service-symmetry`
- `component-structure`
- `safe-file-split`

`audit-scope-to-issues` is the only issue-creation skill. It routes by scope, collects specialist reports, asks for user confirmation, resolves unclear findings, and only then runs `gh issue create`.

## Issue Priority Labels

Canonical issue workflows use exactly one priority label per issue:

- `priority:P0`: security, data loss, build-blocking, or release-blocking issue.
- `priority:P1`: user-blocking bug or critical workflow regression.
- `priority:P2`: confirmed bounded bug, spec drift, or missing verification hook.
- `priority:P3`: hypothesis, cleanup, product decision, or larger refactor.

Audit workflows must report folder coverage, including examined and skipped areas, so a small issue count is tied to explicit audit scope rather than early stopping. Suspect but unclear spec/code differences, spec discrepancies, naming drift, or risky code paths must be reported before the created-issues summary with the check needed to confirm them. Issue creation checks priority labels once up front and checks for duplicate open issues before creating each new issue. No issue creation happens before the user checkpoint.

## Cleanup Rules

- Prefer `.github/agents/` for role-based multi-step workflows with handoffs.
- Prefer `.github/skills/` for reusable user-invoked workflows, especially workflows with command-like behavior.
- Mirror every `.github/skills/<name>/` directory to `.cursor/skills/<name>/` so Cursor can invoke the same workflow.
- Keep `.github/instructions/` as narrow overlays only.
- Do not keep a `.github/prompts/` file when a richer agent or skill has the same purpose and stricter constraints.
- Do not delete specialized skills just because they share words like "audit", "spec", or "review"; delete only exact workflow duplicates.

## Verification Notes

- Reference search for the deleted prompt filenames found no in-repo links before deletion.
- This cleanup does not change application code and does not require `ng build`.
