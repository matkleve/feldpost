---
name: service-symmetry
description: "Create or refactor services using the Symmetry-Standard with mirrored docs/code modules, local adapters, and scalable single-types design."
argument-hint: "Service module name and scope (e.g., media-download)"
---

# Service Symmetry Skill

> **Role:** Specialist skill. Produces a structured findings report. Does not create GitHub issues. Returns output to `audit-scope-to-issues` for issue creation.

## Mode

**Standalone** (invoked directly by user):
Run the full audit, then behave like `audit-scope-to-issues`: present findings checkpoint, wait for confirmation, create issues.

**Orchestrated** (invoked by `audit-scope-to-issues`):
Run the audit, return the structured findings report only. Do not create issues. Do not checkpoint with the user.

Detect mode by context: if the user invoked this skill directly, use Standalone. If called as part of an orchestrated audit, use Orchestrated.

Use this skill when creating or refactoring services.

## Mandatory Shape

1. Mirror docs and code:

- `docs/specs/service/[service-name]/`
- `apps/web/src/app/core/[service-name]/`

2. Required files inside code module:

- `[service-name].service.ts`
- `[service-name].service.spec.ts`
- `[service-name].types.ts`
- `[service-name].helpers.ts`
- `adapters/`
- `README.md`

3. Archive replaced code:

- Move only as a last resort into dated refactor snapshot folders
- Keep `.legacy.ts` suffix
- Never hard-delete immediately
- Do not reference archived files/specs from active specs or service contracts

## Scalable Symmetry Rules

- One module, one central `types.ts`
- One module, one central `helpers.ts`
- Facade stays slim; heavy work moves into local `adapters/`
- No deep sub-service hierarchies
- No global `core/adapters/` folders

## Execution Checklist

- Update/create spec folder first
- Build module skeleton with required files
- Extract heavy logic into local adapters
- Keep UI callsites on facade only
- Run `get_errors()` and `ng build`

## Output (Report to Orchestrator)

In Orchestrated mode, return findings in this structure — do not create issues:

### Confirmed Findings
| Area/File | Spec | Observation | Suggested priority |
|---|---|---|---|

### Unclear Findings
| Area/File | Suspicion | Evidence | Check needed |
|---|---|---|---|

### Not Examined
| Area/File | Reason |
|---|---|
