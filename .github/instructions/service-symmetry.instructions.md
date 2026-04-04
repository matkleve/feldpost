---
name: "Service Symmetry"
description: "Use when creating or refactoring services to enforce mirrored docs/code module structure, local adapters, and legacy archive protocol."
applyTo: "**/*.service.ts"
---

# Service Symmetry Standard

For every new service module and every service refactor:

- Mirror docs and code paths:
  - `docs/element-specs/[service-name]/`
  - `apps/web/src/app/core/[service-name]/`
- Required module files:
  - `[service-name].service.ts` (facade, single UI entrypoint)
  - `[service-name].types.ts` (shared interfaces/enums)
  - `[service-name].helpers.ts` (pure helpers/mappers)
  - `adapters/` (technical integrations/implementations)
  - `README.md` (module index + technical overview)

## Scalable Symmetry (Pragmatic Rule)

- Keep one central `types.ts` per module.
- Keep one central `helpers.ts` per module.
- Keep facade short and delegate heavy logic to local `adapters/` files.
- Do not create deep sub-service folder trees.

## Forbidden Pattern

- Do not create global adapter folders like `apps/web/src/app/core/adapters/`.

## Archive Protocol

When old code is replaced by a symmetry module:

- Never hard-delete immediately.
- Move legacy snapshots to `docs/archive/code-legacy/[YYYY-MM-DD]-[refactor-name]/`.
- Use `.legacy.ts` suffix for archived TypeScript files.
