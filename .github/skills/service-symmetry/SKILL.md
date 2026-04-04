---
name: service-symmetry
description: "Create or refactor services using the Symmetry-Standard with mirrored docs/code modules, local adapters, and scalable single-types design."
argument-hint: "Service module name and scope (e.g., media-download)"
---

# Service Symmetry Skill

Use this skill when creating or refactoring services.

## Mandatory Shape

1. Mirror docs and code:

- `docs/element-specs/[service-name]/`
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
- Do not reference archived files/specs from active specs, blueprints, or implementation docs

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
