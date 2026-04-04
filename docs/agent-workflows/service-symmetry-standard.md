# Service Symmetry Standard

## Goal

Keep service architecture mirrored and predictable by coupling spec and code module layouts.

## Mandatory Mapping

- Docs: `docs/element-specs/[service-name]/`
- Code: `apps/web/src/app/core/[service-name]/`

## Required Module Layout

- `[service-name].service.ts` (facade)
- `[service-name].service.spec.ts` (co-located facade unit tests)
- `[service-name].types.ts` (central module contracts)
- `[service-name].helpers.ts` (pure helper logic)
- `adapters/` (technical adapters)
- `README.md` (index and technical overview)

## Scalable Symmetry

- Keep one `types.ts` per module.
- Keep one `helpers.ts` per module.
- Keep facade short and orchestration-only.
- Push technical details into local `adapters/`.
- Avoid deep nested service sub-structures.

## Archive Protocol

When replacing older code with symmetry modules:

1. Do not hard-delete replaced code.
2. Move legacy snapshots only as a last resort into dated refactor snapshot folders.
3. Keep `.legacy.ts` suffix for TypeScript snapshots.
4. Do not reference archived files/specs from active specs, blueprints, or implementation docs.
