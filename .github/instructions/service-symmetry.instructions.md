---
name: "Service Symmetry"
description: "Use when creating or refactoring services or service tests to enforce mirrored docs/code module structure, local adapters, colocated tests, and legacy archive protocol."
applyTo: "**/*.{service.ts,service.spec.ts}"
---

# Service Symmetry Standard

For every new service module and every service refactor:

- Mirror docs and code paths:
  - `docs/specs/service/[service-name]/`
  - `apps/web/src/app/core/[service-name]/`
- Required module files:
  - `[service-name].service.ts` (facade, single UI entrypoint)
  - `[service-name].service.spec.ts` (co-located facade unit tests)
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
- Move legacy snapshots only as a last resort, using dated refactor snapshot folders.
- Use `.legacy.ts` suffix for archived TypeScript files.
- Do not reference archived files/specs from active specs, blueprints, or implementation docs.
