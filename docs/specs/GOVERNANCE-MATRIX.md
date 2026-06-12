# Master Ownership-Linkage Matrix

Last updated: 2026-04-15

## Scope Matrix

| Scope                     | Ownership Scope                                                                                      | Link Scope                                                                                     | Exclusions                                                                                             |
| ------------------------- | ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| apps/web/src/app/core     | Service facades, orchestration helpers, and technical adapter boundaries for domain logic.           | docs/specs/service, docs/specs/system, docs/specs/ui where a UI contract consumes core output. | Route/page composition, component-level visual behavior, direct UI rendering contracts.                |
| apps/web/src/app/features | Route-level feature composition, feature shells, and feature-owned UI behavior wiring.               | docs/specs/page, docs/specs/ui, docs/specs/component, core service facades.                    | Backend adapter implementation details, cross-feature shared primitive ownership, migration ownership. |
| apps/web/src/app/shared   | Reusable UI primitives, shared interaction components, and shared presentational behavior contracts. | docs/specs/component, docs/specs/ui, feature composition callers.                              | Route ownership, domain orchestration state machines, service persistence logic.                       |
| docs/specs/service        | Service module contracts, service-adapter boundaries, and service-level acceptance criteria.         | docs/specs/system for orchestration, docs/specs/ui or docs/specs/component for consumers.      | UI visual ownership tables, page-level route orchestration details.                                    |
| docs/specs/ui             | Feature UI systems and integration contracts spanning multiple components.                           | docs/specs/component, docs/specs/page, docs/specs/service.                                     | Service adapter internals, migration policy, repository-wide governance duplication.                   |
| docs/specs/component      | Component-level behavior, FSM, ownership triad, and visual contracts.                                | docs/specs/ui, docs/specs/page, docs/specs/service (consumer/provider references only).        | Route ownership and service internals beyond component API boundaries.                                 |
| docs/specs/page           | Route/page composition and top-level user journey contracts.                                         | docs/specs/ui, docs/specs/component, docs/specs/system.                                        | Service internals, component-local visual ownership details.                                           |
| docs/specs/system         | Cross-cutting orchestration matrices and multi-surface behavior contracts.                           | docs/specs/service, docs/specs/ui, docs/specs/page, docs/specs/component.                      | Owning feature-local implementation details already owned by page/ui/component specs.                  |

## Module Type Matrix (Type-Based Requirements)

| Module Type         | Ownership Scope                                                                        | Link Scope                                                                  | Exclusions                                                      | Required Artifacts                                                                                             |
| ------------------- | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| full-service-module | Complete service API + local technical adapters for one domain.                        | Service consumers in core/features/shared and matching service spec folder. | Feature UI rendering and route composition ownership.           | service.ts, service.spec.ts, types.ts, helpers.ts, adapters/, README.md, mirrored docs/specs/service/<module>/ |
| ui-bound-module     | UI behavior and interaction contract bound to route/feature/shared component surfaces. | docs/specs/ui, docs/specs/component, core facades.                          | Service persistence internals and migration ownership.          | Component files, folder README.md, linked ui/component spec(s).                                                |
| thin-module         | Narrow helper/composition entrypoint with low fan-out and explicit dependency edges.   | Owning scope contracts and one upstream authoritative spec.                 | Becoming implicit ownership sink for unrelated behavior.        | Entrypoint file(s), explicit README.md contract, linked authoritative spec path.                               |
| adapter-module      | Technical integration details for a parent service/module.                             | Parent module facade/types and adapter-specific service spec node.          | Direct UI callsites and independent domain ownership.           | Adapter file(s), adapter README.md, parent-module linkage.                                                     |
| exception-module    | Transitional mixed-responsibility module pending decomposition.                        | Existing consumers until split is complete.                                 | Silent growth of cross-domain behavior without registry update. | README.md with explicit exception rationale, target decomposition direction, governance status in registry.    |

## CI and Governance Gates

| Gate                       | Purpose                                                     | Trigger                                          |
| -------------------------- | ----------------------------------------------------------- | ------------------------------------------------ |
| README coverage            | Ensure every active docs/specs subfolder has README.md.     | Any docs/specs folder change                     |
| Traceability report update | Ensure legacy ref migrations are explicit and reproducible. | Any docs/specs or app ref path update            |
| Module registry update     | Prevent silent renaming/reclassification.                   | Any core/features/shared module structure change |
| Violations report update   | Keep unresolved gaps visible and actionable.                | Any governance-affecting change                  |
